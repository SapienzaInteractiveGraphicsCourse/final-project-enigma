import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export let currentCameraMode = 'orbit';
let orbitControls;

const keys = { w: false, a: false, s: false, d: false, q: false, e: false };
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
const euler = new THREE.Euler(0, 0, 0, 'YXZ');

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = true;
});

window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false;
});

// --- LOGICA BUSSOLA E TRANSIZIONI ---
const views = {
    Front: new THREE.Vector3(0, 1, 6),
    Back: new THREE.Vector3(0, 1, -6),
    Left: new THREE.Vector3(-6, 1, 0),
    Right: new THREE.Vector3(6, 1, 0),
    Top: new THREE.Vector3(0, 6, 0.01) 
};

function animateCameraTransition(camera, targetPosition) {
    if (currentCameraMode !== 'orbit') return; 
    
    let step = 0;
    const startPos = camera.position.clone();
    const startTarget = orbitControls.target.clone();
    const endTarget = new THREE.Vector3(0, 0, 0); 
    
    // Convertiamo le coordinate in Sferiche (Raggio, Inclinazione, Angolo Orizzontale)
    // Questo permette alla telecamera di "orbitare" morbidamente in modo circolare
    const startSpherical = new THREE.Spherical().setFromVector3(startPos);
    const endSpherical = new THREE.Spherical().setFromVector3(targetPosition);

    // Evitiamo che la telecamera faccia giri più lunghi del necessario (es. girare di 270° invece che di 90°)
    let thetaDiff = endSpherical.theta - startSpherical.theta;
    while (thetaDiff > Math.PI) thetaDiff -= Math.PI * 2;
    while (thetaDiff < -Math.PI) thetaDiff += Math.PI * 2;
    endSpherical.theta = startSpherical.theta + thetaDiff;

    function transition() {
        step += 0.025; // Velocità animazione
        if (step <= 1) {
            // Easing "easeInOutCubic" per partenze e arrivi dolci e lenti
            const easeStep = step < 0.5 ? 4 * step * step * step : 1 - Math.pow(-2 * step + 2, 3) / 2;
            
            // Creiamo il punto sferico intermedio calcolando la media pesata degli angoli
            const currentSpherical = new THREE.Spherical(
                THREE.MathUtils.lerp(startSpherical.radius, endSpherical.radius, easeStep),
                THREE.MathUtils.lerp(startSpherical.phi, endSpherical.phi, easeStep),
                THREE.MathUtils.lerp(startSpherical.theta, endSpherical.theta, easeStep)
            );
            
            // Convertiamo di nuovo in X,Y,Z e aggiorniamo la telecamera
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
// -----------------------------

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
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= deltaMove.x * sensitivity;
        euler.x -= deltaMove.y * sensitivity;
        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
        camera.quaternion.setFromEuler(euler);

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
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= deltaMove.x * sensitivity;
        euler.x -= deltaMove.y * sensitivity;
        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
        camera.quaternion.setFromEuler(euler);

        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    window.addEventListener('touchend', () => {
        isDragging = false;
    });

    // Event Listeners per la Bussola
    document.getElementById('btnViewFront')?.addEventListener('click', () => animateCameraTransition(camera, views.Front));
    document.getElementById('btnViewBack')?.addEventListener('click', () => animateCameraTransition(camera, views.Back));
    document.getElementById('btnViewLeft')?.addEventListener('click', () => animateCameraTransition(camera, views.Left));
    document.getElementById('btnViewRight')?.addEventListener('click', () => animateCameraTransition(camera, views.Right));
    document.getElementById('btnViewTop')?.addEventListener('click', () => animateCameraTransition(camera, views.Top));

    document.getElementById('btnCompassModeToggle')?.addEventListener('click', (e) => {
        const newMode = toggleCameraMode();
        e.target.textContent = newMode === 'orbit' ? 'Orbit Camera' : 'First Person';
    });

    return orbitControls;
}

export function toggleCameraMode() {
    if (currentCameraMode === 'orbit') {
        currentCameraMode = 'firstPerson';
        orbitControls.enabled = false;
    } else {
        currentCameraMode = 'orbit';
        orbitControls.enabled = true;
    }
    return currentCameraMode;
}

export function updateCameraMovement(camera) {
    if (currentCameraMode === 'orbit') {
        orbitControls.update();
        return;
    }

    const speed = 0.1;
    const moveVector = new THREE.Vector3();

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.normalize();

    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(camera.quaternion);
    down.normalize();

    if (keys.w) moveVector.add(forward);
    if (keys.s) moveVector.sub(forward);
    if (keys.a) moveVector.sub(right);
    if (keys.d) moveVector.add(right);
    if (keys.q) moveVector.add(down);
    if (keys.e) moveVector.sub(down);

    if (moveVector.lengthSq() > 0) {
        moveVector.normalize().multiplyScalar(speed);

        camera.position.add(moveVector);

        camera.position.x = Math.max(-9.5, Math.min(9.5, camera.position.x));
        camera.position.y = Math.max(0.5, Math.min(10.0, camera.position.y));
        camera.position.z = Math.max(-9.5, Math.min(9.5, camera.position.z));
    }
}