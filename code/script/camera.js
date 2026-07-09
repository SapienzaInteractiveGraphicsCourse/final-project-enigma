import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export let currentCameraMode = 'orbit';
export let isDriverViewActive = false;
let previousCameraState = { position: new THREE.Vector3(), target: new THREE.Vector3(), mode: 'orbit' };
let orbitControls;
let driverLookYaw = 0; 
let driverLookPitch = 0;
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
            // Se siamo in auto, il mouse gira solo "la testa"
            driverLookYaw -= deltaMove.x * sensitivity;
            driverLookPitch -= deltaMove.y * sensitivity;

            // Limiti: non puoi girare la testa a 360 gradi come un gufo!
            driverLookYaw = Math.max(-Math.PI / 1.5, Math.min(Math.PI / 1.5, driverLookYaw));
            driverLookPitch = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, driverLookPitch));
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
            driverLookYaw -= deltaMove.x * sensitivity;
            driverLookPitch -= deltaMove.y * sensitivity;
            driverLookYaw = Math.max(-Math.PI / 1.5, Math.min(Math.PI / 1.5, driverLookYaw));
            driverLookPitch = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, driverLookPitch));
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

export function updateCameraMovement(camera, carModel) { 
    if (carModel && carModel.root) {
        const currentCarPos = carModel.root.position;

        // Inizializza il tracking la prima volta
        if (!isTrackingInitialized) {
            previousCarPosition.copy(currentCarPos);
            orbitControls.target.copy(currentCarPos);
            isTrackingInitialized = true;
        }

        // 1. INSEGUIMENTO IN MODALITÀ ORBIT
        if (currentCameraMode === 'orbit') {
            const deltaPos = currentCarPos.clone().sub(previousCarPosition);
            
            if (deltaPos.lengthSq() > 0) {
                camera.position.add(deltaPos);
                // Invece di sommare il delta, è più sicuro ancorare il target esattamente all'auto
                orbitControls.target.copy(currentCarPos); 
            }
            
            previousCarPosition.copy(currentCarPos);
            
            // FIX: Spegniamo temporaneamente il damping per questo singolo frame!
            // Questo permette alla telecamera di muoversi istantaneamente con l'auto,
            // mantenendo però l'inerzia fluida quando usi il mouse.
            const wasDamping = orbitControls.enableDamping;
            orbitControls.enableDamping = false;
            orbitControls.update();
            orbitControls.enableDamping = wasDamping;
            
            return;
        }

        // 2. INSEGUIMENTO IN MODALITÀ DRIVER
      if (isDriverViewActive && activeDriverCam) {
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            
            activeDriverCam.getWorldPosition(worldPos);
            activeDriverCam.getWorldQuaternion(worldQuat);
            
            // 1. Incolla la telecamera al sedile
            camera.position.copy(worldPos); 
            
            // 2. Fai guardare la telecamera dove punta l'auto
            camera.quaternion.copy(worldQuat);
            
            // 3. Se il giocatore sta girando la testa col mouse, aggiungi la rotazione
            if (driverLookYaw !== 0 || driverLookPitch !== 0) {
                const headRotation = new THREE.Quaternion();
                // Ordine YXZ: prima gira a dx/sx (Y), poi su/giù (X)
                const eulerOffset = new THREE.Euler(driverLookPitch, driverLookYaw, 0, 'YXZ');
                headRotation.setFromEuler(eulerOffset);
                
                // Moltiplica la rotazione dell'auto per la rotazione della testa locale
                camera.quaternion.multiply(headRotation);
            }

            // 4. (Opzionale) Se rilasci il mouse, la testa torna dritta morbidamente
            if (!isDragging) {
                driverLookYaw = THREE.MathUtils.lerp(driverLookYaw, 0, 0.08);
                driverLookPitch = THREE.MathUtils.lerp(driverLookPitch, 0, 0.08);
                
                // Se è quasi dritta, forzala a zero per evitare micro-calcoli
                if (Math.abs(driverLookYaw) < 0.001) driverLookYaw = 0;
                if (Math.abs(driverLookPitch) < 0.001) driverLookPitch = 0;
            }
            
            return;
        }
    }

    if (isDriverViewActive) return;

    // 3. FREE FLY (Il tuo codice esistente)
    const speed = 0.1;
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
        moveVector.normalize().multiplyScalar(speed);
        camera.position.add(moveVector);

        camera.position.x = Math.max(-9.5, Math.min(9.5, camera.position.x));
        camera.position.y = Math.max(0.5, Math.min(10.0, camera.position.y));
        camera.position.z = Math.max(-9.5, Math.min(9.5, camera.position.z));
    }
}

export function setDriverView(camera, carModel, blenderCameraName) {
    if (isDriverViewActive) {
        isDriverViewActive = false;
        activeDriverCam = null; // Resetta il riferimento quando usciamo
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

    activeDriverCam = driverCam; // SALVIAMO IL RIFERIMENTO QUI

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

    //euler.setFromQuaternion(camera.quaternion);
    //driverBaseY = euler.y;
    driverLookYaw = 0;
    driverLookPitch = 0;

    if (currentCameraMode === 'orbit') {
        currentCameraMode = 'firstPerson';
        orbitControls.enabled = false;
    }
}