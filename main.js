import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { loadModel } from './model.js'
import { setupCamera, updateCameraMovement, toggleCameraMode } from './camera.js';
import { createFloor } from './floor.js';
import './ui.js';

const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
);
camera.position.set(0, 1, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 5.5);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

setupCamera(camera, renderer);

const floor = createFloor();
scene.add(floor);

window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

document.getElementById('btnCameraMode').addEventListener('click', (e) => {
    const newMode = toggleCameraMode();
    e.target.textContent = newMode === 'orbit' ? 'Switch to First Person' : 'Switch to Orbit';
});

function animate() {
    requestAnimationFrame(animate);
    updateCameraMovement(camera);
    TWEEN.update();
    renderer.render(scene, camera);
}

function toggleAnimationCallback(model, buttonName, animationName) {
    const button = document.getElementById(buttonName);

    button.onclick = () => {
        const animation = model.animations[animationName];
        if (!animation) {
            return;
        }

        if (animation.activeTween) {
            animation.activeTween.stop();
            animation.activeTween = null;
        }

        model.state.doorOpen = !model.state.doorOpen;

        const position = animation.part.position;
        const target = !model.state.doorOpen ? animation.to : animation.from;

        const totalDistance = animation.from.distanceTo(animation.to);
        const remainingDistance = position.distanceTo(target);
        const fraction = totalDistance > 0 ? remainingDistance / totalDistance : 1;
        const duration = animation.milliseconds * fraction;

        const tween = new TWEEN.Tween(position).to(target, duration);
        animation.activeTween = tween;
        tween.start();
    };
}

function setupButtonsCallback(model) {
    toggleAnimationCallback(model, 'btnLeftDoor', 'Left_door');
    toggleAnimationCallback(model, 'btnRightDoor', 'Right_door');
}

const CAR_MODEL = {
    path: 'car_1/car.glb',
    state: {
        doorOpen: false,
    },
    animations: {
        "Left_door": {
            to: { x: 2, y: 2, z: 2 },
            milliseconds: 5000,
        },
        "Right_door": {
            to: { x: 2, y: 2, z: 2 },
            milliseconds: 5000,
        }
    }
}

window.onload = () => {
    let car_model = loadModel(CAR_MODEL, scene);

    setupButtonsCallback(car_model);

    animate();
};
