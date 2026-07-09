import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export let currentCameraMode = 'orbit';
export let isDriverViewActive = false;
export let isTopDownViewActive = false;

let previousCameraState = { position: new THREE.Vector3(), target: new THREE.Vector3(), mode: 'orbit' };
let orbitControls;

// Variabili per la visuale Pilota (testa)
let driverLookYaw = 0; 
let driverLookPitch = 0;
let targetDriverLookYaw = 0; 
let targetDriverLookPitch = 0;
const lookSpeed = 10.0; // Velocità di rotazione morbida della testa

let previousCarPosition = new THREE.Vector3();
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

// Variabili per il volo libero (Free Fly) fluido
const cameraVelocity = new THREE.Vector3();
const moveAcceleration = 50.0; // Accelerazione WASD
const moveFriction = 10.0; // Attrito per frenata morbida

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

export function animateCameraTransition(camera, targetPosition) {
    if (currentCameraMode !== 'orbit') return; 
    
    let step = 0;
    const startPos = camera.position.clone();
    const startTarget = orbitControls.target.clone();
    const endTarget = new THREE.Vector3(0, 0, 0); 
    
    const startSpherical = new THREE.Spherical().setFromVector3(startPos);
    const endSpherical = new THREE.Spherical().setFromVector3(targetPosition);

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

            camera.position.setFromSpherical(currentSpherical);
            orbitControls.target.lerpVectors(startTarget, endTarget, easeStep);
            
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
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
        if (currentCameraMode !== 'firstPerson' || !isDragging) return;

        const deltaMove = {
            x: e.clientX - previousMousePosition.x,
            y: e.clientY - previousMousePosition.y
        };
        const sensitivity = 0.003;

        if (isDriverViewActive) {
            // Aggiorna il TARGET di destinazione per lo sguardo
            targetDriverLookYaw -= deltaMove.x * sensitivity;
            targetDriverLookPitch -= deltaMove.y * sensitivity;

            targetDriverLookYaw = Math.max(-Math.PI / 1.5, Math.min(Math.PI / 1.5, targetDriverLookYaw));
            targetDriverLookPitch = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, targetDriverLookPitch));
        } else {
            // Se stiamo volando (Free Fly), ruota la telecamera normalmente
            euler.setFromQuaternion(camera.quaternion);
            euler.y -= deltaMove.x * sensitivity;
            euler.x -= deltaMove.y * sensitivity;
            euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
            camera.quaternion.setFromEuler(euler);
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
    }, { passive: true });

    renderer.domElement.addEventListener('touchmove', (e) => {
        if (currentCameraMode !== 'firstPerson' || !isDragging) return;

        const deltaMove = {
            x: e.touches[0].clientX - previousMousePosition.x,
            y: e.touches[0].clientY - previousMousePosition.y
        };
        const sensitivity = 0.004;

        if (isDriverViewActive) {
            targetDriverLookYaw -= deltaMove.x * sensitivity;
            targetDriverLookPitch -= deltaMove.y * sensitivity;
            targetDriverLookYaw = Math.max(-Math.PI / 1.5, Math.min(Math.PI / 1.5, targetDriverLookYaw));
            targetDriverLookPitch = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, targetDriverLookPitch));
        } else {
            euler.setFromQuaternion(camera.quaternion);
            euler.y -= deltaMove.x * sensitivity;
            euler.x -= deltaMove.y * sensitivity;
            euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
            camera.quaternion.setFromEuler(euler);
        }

        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    window.addEventListener('touchend', () => {
        isDragging = false;
    });

    return orbitControls;
}

export function goToCameraView(camera, viewName) {
    isDriverViewActive = false;
    isTopDownViewActive = false; // 🟢 Spegne il drone se cambi vista
    updateDriverButtonVisual();

    if (currentCameraMode !== 'orbit') {
        currentCameraMode = 'orbit';
        orbitControls.enabled = true;
    }

    const targetPosition = views[viewName];
    if (!targetPosition) return;

    animateCameraTransition(camera, targetPosition);
}

export function toggleCameraMode() {
    isTopDownViewActive = false; // 🟢 Spegne il drone se premi Free Cam

    if (currentCameraMode === 'orbit') {
        currentCameraMode = 'firstPerson';
        orbitControls.enabled = false;
    } else {
        currentCameraMode = 'orbit';
        orbitControls.enabled = true;
    }

    if (isDriverViewActive) {
        isDriverViewActive = false;
        updateDriverButtonVisual();
    }

    return currentCameraMode;
}

export function setTopDownView(camera) {
    // Se è già attiva, torniamo alla visuale Orbit normale
    if (isTopDownViewActive) {
        isTopDownViewActive = false;
        orbitControls.enabled = true;
        return;
    }

    // Attiviamo la modalità Top-Down
    isTopDownViewActive = true;
    orbitControls.enabled = false; 

    // Se eravamo dentro l'abitacolo, usciamo e resettiamo la lente
    if (isDriverViewActive) {
        isDriverViewActive = false;
        activeDriverCam = null;
        camera.fov = 50;
        camera.updateProjectionMatrix();
        updateDriverButtonVisual();
    }
}

// 🟢 FIX: RIORDINO DELLE PRIORITÀ
export function updateCameraMovement(camera, carModel, delta = 0.016) { 
    if (carModel && carModel.root) {
        const currentCarPos = carModel.root.position;

        // Inizializza il tracking la prima volta
        if (!isTrackingInitialized) {
            previousCarPosition.copy(currentCarPos);
            orbitControls.target.copy(currentCarPos);
            isTrackingInitialized = true;
        }

        // 1. PRIORITÀ MASSIMA: VISUALE DALL'ALTO (TOP DOWN)
        if (isTopDownViewActive) {
            // Ci posizioniamo esattamente al centro dell'auto, 15 metri più in alto
            const targetPos = new THREE.Vector3(currentCarPos.x, currentCarPos.y + 15, currentCarPos.z);

            // Lerp protetto per un movimento fluido che non sbanda
            const lerpFactor = Math.min(10.0 * delta, 1.0);
            camera.position.lerp(targetPos, lerpFactor);

            // FIX GIMBAL LOCK: Niente più lookAt()! 
            // Blocchiamo la rotazione in modo che guardi dritta in basso (Pitch a -90 gradi)
            camera.rotation.set(-Math.PI / 2, 0, 0, 'YXZ');

            // Aggiorniamo di nascosto il bersaglio del mouse
            // Così quando disattivi la vista drone, la telecamera non "salta" via!
            orbitControls.target.copy(currentCarPos);

            return; // Ferma tutto il resto
        }

        // 2. PRIORITÀ MEDIA: INSEGUIMENTO IN MODALITÀ DRIVER
        if (isDriverViewActive && activeDriverCam) {
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            
            activeDriverCam.getWorldPosition(worldPos);
            activeDriverCam.getWorldQuaternion(worldQuat);
            
            camera.position.copy(worldPos); 
            camera.quaternion.copy(worldQuat);
            
            // Applica il lerp per ammorbidire il movimento della testa
            driverLookYaw = THREE.MathUtils.lerp(driverLookYaw, targetDriverLookYaw, lookSpeed * delta);
            driverLookPitch = THREE.MathUtils.lerp(driverLookPitch, targetDriverLookPitch, lookSpeed * delta);
            
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
            
            return; // Ferma tutto il resto
        }

        // 3. PRIORITÀ BASSA: INSEGUIMENTO IN MODALITÀ ORBIT
        if (currentCameraMode === 'orbit') {
            const deltaPos = currentCarPos.clone().sub(previousCarPosition);
            
            if (deltaPos.lengthSq() > 0) {
                camera.position.add(deltaPos);
                orbitControls.target.copy(currentCarPos); 
            }
            
            previousCarPosition.copy(currentCarPos);
            
            const wasDamping = orbitControls.enableDamping;
            orbitControls.enableDamping = false;
            orbitControls.update();
            orbitControls.enableDamping = wasDamping;
            
            return;
        }
    }

    // 4. FREE FLY (Eseguito solo se nessuna delle visuali sopra è attiva)
    if (isDriverViewActive || isTopDownViewActive) return;

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

    camera.position.x = Math.max(-9.5, Math.min(9.5, camera.position.x));
    camera.position.y = Math.max(0.5, Math.min(10.0, camera.position.y));
    camera.position.z = Math.max(-9.5, Math.min(9.5, camera.position.z));
}

export function setDriverView(camera, carModel, blenderCameraName) {
    isTopDownViewActive = false; // 🟢 Spegne il drone se entri in macchina

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