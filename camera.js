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
