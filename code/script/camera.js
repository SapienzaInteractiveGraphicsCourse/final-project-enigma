import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export let currentCameraMode = 'orbit';
export let isDriverViewActive = false;
export let isTopDownViewActive = false;

let previousCameraState = { position: new THREE.Vector3(), target: new THREE.Vector3(), mode: 'orbit' };
let orbitControls;

let driverLookYaw = 0;
let driverLookPitch = 0;
let targetDriverLookYaw = 0;
let targetDriverLookPitch = 0;
const lookSpeed = 10.0;

let freeLookYaw = 0;
let freeLookPitch = 0;
let targetFreeLookYaw = 0;
let targetFreeLookPitch = 0;
let freeLookSynced = false;
const freeLookSpeed = 14.0;

let previousCarPosition = new THREE.Vector3();
let previousCarQuaternion = new THREE.Quaternion();
let isTrackingInitialized = false;
let activeDriverCam = null;

const keys = { w: false, a: false, s: false, d: false, q: false, e: false };
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const forwardVector = new THREE.Vector3();
const rightVector = new THREE.Vector3();
const downVector = new THREE.Vector3();
const moveVector = new THREE.Vector3();

const cameraVelocity = new THREE.Vector3();
const moveAcceleration = 50.0;
const moveFriction = 10.0;

// Filtro passa-basso sul delta grezzo del mouse/touch: assorbe i micro-scatti
// del puntatore prima che diventino input per lo sguardo, per un drag più
// morbido. 1.0 = nessun filtro (comportamento precedente), valori più bassi
// = più smoothing ma anche più "inerzia" percepita nel movimento.
const INPUT_SMOOTHING = 0.5;
let smoothedDeltaX = 0;
let smoothedDeltaY = 0;

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = true;
});

window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false;
});

export const views = {
    Front: new THREE.Vector3(0, 1, 6),
    Back: new THREE.Vector3(0, 1, -6),
    Left: new THREE.Vector3(-6, 1, 0),
    Right: new THREE.Vector3(6, 1, 0),
    Top: new THREE.Vector3(0, 6, 0.01) 
};

function updateDriverButtonVisual() {
    const btn = document.getElementById('btnViewDriver');
    if (btn) {
        if (isDriverViewActive) {
            btn.style.backgroundColor = '#007bff';
            btn.style.color = '#ffffff';
        } else {
            btn.style.backgroundColor = '';
            btn.style.color = '';
        }
    }
}

export function animateCameraTransition(camera, targetPosition, targetLookAt) {
    if (currentCameraMode !== 'orbit') return; 
    
    let step = 0;
    const startPos = camera.position.clone();
    const startTarget = orbitControls.target.clone();
    
    const endTarget = targetLookAt || new THREE.Vector3(0, 0, 0); 
    
    const startRelative = startPos.clone().sub(startTarget);
    const endRelative = targetPosition.clone().sub(endTarget);

    const startSpherical = new THREE.Spherical().setFromVector3(startRelative);
    const endSpherical = new THREE.Spherical().setFromVector3(endRelative);

    let thetaDiff = endSpherical.theta - startSpherical.theta;
    while (thetaDiff > Math.PI) thetaDiff -= Math.PI * 2;
    while (thetaDiff < -Math.PI) thetaDiff += Math.PI * 2;
    endSpherical.theta = startSpherical.theta + thetaDiff;

    function transition() {
        step += 0.025;
        if (step <= 1) {
            const easeStep = step < 0.5 ? 4 * step * step * step : 1 - Math.pow(-2 * step + 2, 3) / 2;

            const currentSpherical = new THREE.Spherical(
                THREE.MathUtils.lerp(startSpherical.radius, endSpherical.radius, easeStep),
                THREE.MathUtils.lerp(startSpherical.phi, endSpherical.phi, easeStep),
                THREE.MathUtils.lerp(startSpherical.theta, endSpherical.theta, easeStep)
            );

            const currentTarget = new THREE.Vector3().lerpVectors(startTarget, endTarget, easeStep);
            
            const currentRelative = new THREE.Vector3().setFromSpherical(currentSpherical);
            camera.position.copy(currentTarget).add(currentRelative);
            
            orbitControls.target.copy(currentTarget);
            orbitControls.update();
            
            requestAnimationFrame(transition);
        } else {
            camera.position.copy(targetPosition);
            orbitControls.target.copy(endTarget);
            orbitControls.update();
        }
    }
    transition();
}

export function goToCameraView(camera, carModel, viewName) {
    isDriverViewActive = false;
    isTopDownViewActive = false; 
    updateDriverButtonVisual();
    updateTopDownButtonVisual();

    if (currentCameraMode !== 'orbit') {
        currentCameraMode = 'orbit';
        orbitControls.enabled = true;
    }

    const localOffset = views[viewName];
    if (!localOffset) return;

    const targetPosition = localOffset.clone();
    
    if (carModel && carModel.root) {
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        
        carModel.root.getWorldPosition(worldPos);
        carModel.root.getWorldQuaternion(worldQuat);
        
        targetPosition.applyQuaternion(worldQuat);
        targetPosition.add(worldPos);
        
        animateCameraTransition(camera, targetPosition, worldPos);
    } else {
        animateCameraTransition(camera, targetPosition, new THREE.Vector3(0, 0, 0));
    }
}

export function setupCamera(camera, renderer) {
    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
    orbitControls.minPolarAngle = 0.1;
    orbitControls.minDistance = 3;
    orbitControls.maxDistance = 12;
    orbitControls.enablePan = false;

    renderer.domElement.addEventListener('mousedown', (e) => {
        if (currentCameraMode !== 'firstPerson') return;
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
        smoothedDeltaX = 0;
        smoothedDeltaY = 0;
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
        if (currentCameraMode !== 'firstPerson' || !isDragging) return;

        const rawDeltaX = e.clientX - previousMousePosition.x;
        const rawDeltaY = e.clientY - previousMousePosition.y;

        smoothedDeltaX += (rawDeltaX - smoothedDeltaX) * INPUT_SMOOTHING;
        smoothedDeltaY += (rawDeltaY - smoothedDeltaY) * INPUT_SMOOTHING;

        const deltaMove = { x: smoothedDeltaX, y: smoothedDeltaY };
        const sensitivity = 0.003;

        if (isDriverViewActive) {
            targetDriverLookYaw -= deltaMove.x * sensitivity;
            targetDriverLookPitch -= deltaMove.y * sensitivity;

            targetDriverLookYaw = Math.max(-Math.PI / 1.5, Math.min(Math.PI / 1.5, targetDriverLookYaw));
            targetDriverLookPitch = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, targetDriverLookPitch));
        } else {
            targetFreeLookYaw -= deltaMove.x * sensitivity;
            targetFreeLookPitch -= deltaMove.y * sensitivity;
            targetFreeLookPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetFreeLookPitch));
        }

        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    renderer.domElement.addEventListener('touchstart', (e) => {
        if (currentCameraMode !== 'firstPerson') return;
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        smoothedDeltaX = 0;
        smoothedDeltaY = 0;
    }, { passive: true });

    renderer.domElement.addEventListener('touchmove', (e) => {
        if (currentCameraMode !== 'firstPerson' || !isDragging) return;

        const rawDeltaX = e.touches[0].clientX - previousMousePosition.x;
        const rawDeltaY = e.touches[0].clientY - previousMousePosition.y;

        smoothedDeltaX += (rawDeltaX - smoothedDeltaX) * INPUT_SMOOTHING;
        smoothedDeltaY += (rawDeltaY - smoothedDeltaY) * INPUT_SMOOTHING;

        const deltaMove = { x: smoothedDeltaX, y: smoothedDeltaY };
        const sensitivity = 0.004;

        if (isDriverViewActive) {
            targetDriverLookYaw -= deltaMove.x * sensitivity;
            targetDriverLookPitch -= deltaMove.y * sensitivity;
            targetDriverLookYaw = Math.max(-Math.PI / 1.5, Math.min(Math.PI / 1.5, targetDriverLookYaw));
            targetDriverLookPitch = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, targetDriverLookPitch));
        } else {
            targetFreeLookYaw -= deltaMove.x * sensitivity;
            targetFreeLookPitch -= deltaMove.y * sensitivity;
            targetFreeLookPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetFreeLookPitch));
        }

        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    window.addEventListener('touchend', () => {
        isDragging = false;
    });

    return orbitControls;
}

export function toggleCameraMode() {
    isTopDownViewActive = false; 

    if (currentCameraMode === 'orbit') {
        currentCameraMode = 'firstPerson';
        orbitControls.enabled = false;
        updateTopDownButtonVisual();
    } else {
        currentCameraMode = 'orbit';
        orbitControls.enabled = true;
        updateTopDownButtonVisual();
    }

    if (isDriverViewActive) {
        isDriverViewActive = false;
        updateDriverButtonVisual();
        updateTopDownButtonVisual();
    }

    return currentCameraMode;
}

function updateTopDownButtonVisual() {
    const btn = document.getElementById('btnViewTopDown');
    if (btn) {
        if (isTopDownViewActive) {
            btn.classList.add('is-active');
        } else {
            btn.classList.remove('is-active');
        }
    }
}

export function setTopDownView(camera) {
    if (isTopDownViewActive) {
        isTopDownViewActive = false;
        orbitControls.enabled = true;
        updateTopDownButtonVisual();
        return;
    }

    isTopDownViewActive = true;
    orbitControls.enabled = false; 
    updateTopDownButtonVisual();

    if (isDriverViewActive) {
        isDriverViewActive = false;
        activeDriverCam = null;
        camera.fov = 50;
        camera.updateProjectionMatrix();
        updateDriverButtonVisual();
    }
}

export function updateCameraMovement(camera, carModel, delta = 0.016) { 
    if (carModel && carModel.root) {
        carModel.root.updateMatrixWorld(true);

        const currentCarPos = new THREE.Vector3();
        const currentCarQuat = new THREE.Quaternion();
        
        carModel.root.getWorldPosition(currentCarPos);
        carModel.root.getWorldQuaternion(currentCarQuat); 

        if (!isTrackingInitialized) {
            previousCarPosition.copy(currentCarPos);
            previousCarQuaternion.copy(currentCarQuat); 
            orbitControls.target.copy(currentCarPos);
            isTrackingInitialized = true;
        }

        if (isTopDownViewActive) {
            freeLookSynced = false;
            const targetPos = new THREE.Vector3(currentCarPos.x, currentCarPos.y + 15, currentCarPos.z);
            const lerpFactor = Math.min(10.0 * delta, 1.0);
            camera.position.lerp(targetPos, lerpFactor);

            const carForward = new THREE.Vector3(0, 0, 1).applyQuaternion(currentCarQuat).normalize();

            camera.up.copy(carForward);
            
            camera.lookAt(currentCarPos);

            orbitControls.target.copy(currentCarPos);

            previousCarPosition.copy(currentCarPos);
            previousCarQuaternion.copy(currentCarQuat);
            return;
        } else {
            if (camera.up.y !== 1) {
                camera.up.set(0, 1, 0);
            }
        }

        if (isDriverViewActive && activeDriverCam) {
            freeLookSynced = false;
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            
            activeDriverCam.getWorldPosition(worldPos);
            activeDriverCam.getWorldQuaternion(worldQuat);
            
            camera.position.copy(worldPos); 
            camera.quaternion.copy(worldQuat);
            
            const driverLookLerp = 1 - Math.exp(-lookSpeed * delta);
            driverLookYaw = THREE.MathUtils.lerp(driverLookYaw, targetDriverLookYaw, driverLookLerp);
            driverLookPitch = THREE.MathUtils.lerp(driverLookPitch, targetDriverLookPitch, driverLookLerp);
            
            if (driverLookYaw !== 0 || driverLookPitch !== 0) {
                const headRotation = new THREE.Quaternion();
                const eulerOffset = new THREE.Euler(driverLookPitch, driverLookYaw, 0, 'YXZ');
                headRotation.setFromEuler(eulerOffset);
                camera.quaternion.multiply(headRotation);
            }

            if (!isDragging) {
                targetDriverLookYaw = THREE.MathUtils.lerp(targetDriverLookYaw, 0, 5.0 * delta);
                targetDriverLookPitch = THREE.MathUtils.lerp(targetDriverLookPitch, 0, 5.0 * delta);
            }
            
            previousCarPosition.copy(currentCarPos);
            previousCarQuaternion.copy(currentCarQuat);
            return;
        }

        if (currentCameraMode === 'orbit') {
            freeLookSynced = false;
            const deltaQuat = currentCarQuat.clone().multiply(previousCarQuaternion.clone().invert());
            const offset = camera.position.clone().sub(previousCarPosition);
            
            offset.applyQuaternion(deltaQuat);
            camera.position.copy(currentCarPos).add(offset);
            
            orbitControls.target.copy(currentCarPos); 
            
            previousCarPosition.copy(currentCarPos);
            previousCarQuaternion.copy(currentCarQuat);
            
            const wasDamping = orbitControls.enableDamping;
            orbitControls.enableDamping = false;
            orbitControls.update();
            orbitControls.enableDamping = wasDamping;
            
            return;
        }

        previousCarPosition.copy(currentCarPos);
        previousCarQuaternion.copy(currentCarQuat);
    }

    if (isDriverViewActive || isTopDownViewActive) return;

    if (!freeLookSynced) {
        euler.setFromQuaternion(camera.quaternion);
        freeLookYaw = euler.y;
        freeLookPitch = euler.x;
        targetFreeLookYaw = freeLookYaw;
        targetFreeLookPitch = freeLookPitch;
        freeLookSynced = true;
    }

    const freeLookLerp = 1 - Math.exp(-freeLookSpeed * delta);
    freeLookYaw = THREE.MathUtils.lerp(freeLookYaw, targetFreeLookYaw, freeLookLerp);
    freeLookPitch = THREE.MathUtils.lerp(freeLookPitch, targetFreeLookPitch, freeLookLerp);
    camera.quaternion.setFromEuler(new THREE.Euler(freeLookPitch, freeLookYaw, 0, 'YXZ'));

    moveVector.set(0, 0, 0);

    forwardVector.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    rightVector.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    downVector.set(0, -1, 0).applyQuaternion(camera.quaternion).normalize();

    if (keys.w) moveVector.add(forwardVector);
    if (keys.s) moveVector.sub(forwardVector);
    if (keys.a) moveVector.sub(rightVector);
    if (keys.d) moveVector.add(rightVector);
    if (keys.q) moveVector.add(downVector);
    if (keys.e) moveVector.sub(downVector);

    if (moveVector.lengthSq() > 0) {
        moveVector.normalize();
    }

    cameraVelocity.addScaledVector(moveVector, moveAcceleration * delta);
    cameraVelocity.multiplyScalar(Math.max(0, 1 - moveFriction * delta));
    camera.position.addScaledVector(cameraVelocity, delta);

    camera.position.y = Math.max(0.5, camera.position.y);
}

export function setDriverView(camera, carModel, blenderCameraName) {
    isTopDownViewActive = false;
    updateTopDownButtonVisual();

    if (isDriverViewActive) {
        isDriverViewActive = false;
        activeDriverCam = null;
        updateDriverButtonVisual();

        camera.position.copy(previousCameraState.position);
        orbitControls.target.copy(previousCameraState.target);
        
        if (currentCameraMode !== previousCameraState.mode) {
            toggleCameraMode();
        }
        orbitControls.update();
        return;
    }

    const driverCam = carModel.root.getObjectByName(blenderCameraName);
    
    if (!driverCam) {
        console.warn(`Attenzione: Camera '${blenderCameraName}' non trovata nel modello 3D.`);
        return;
    }

    activeDriverCam = driverCam;

    previousCameraState.position.copy(camera.position);
    previousCameraState.target.copy(orbitControls.target);
    previousCameraState.mode = currentCameraMode;

    isDriverViewActive = true;
    updateDriverButtonVisual();

    const worldPos = new THREE.Vector3();
    driverCam.getWorldPosition(worldPos);
    camera.position.copy(worldPos);

    const worldQuat = new THREE.Quaternion();
    driverCam.getWorldQuaternion(worldQuat);
    camera.quaternion.copy(worldQuat);

    driverLookYaw = 0;
    driverLookPitch = 0;
    targetDriverLookYaw = 0;
    targetDriverLookPitch = 0;

    if (currentCameraMode === 'orbit') {
        currentCameraMode = 'firstPerson';
        orbitControls.enabled = false;
    }
}

export function snapFreeCameraToCar(camera, carModel) {
    if (!carModel || !carModel.root) return;

    const carPos = new THREE.Vector3();
    carModel.root.getWorldPosition(carPos);

    camera.position.set(carPos.x, carPos.y + 3, carPos.z + 6);
    
    camera.lookAt(carPos);

    if (orbitControls) {
        orbitControls.target.copy(carPos);
        orbitControls.update();
    }
}