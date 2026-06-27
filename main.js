import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { CAR_MODEL } from './car_model.js';
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

function toggleAnimationCallback(model, stateKey, buttonName, animationName) {
    const button = document.getElementById(buttonName);

    button.onclick = () => {
        const animation = model.animations[animationName];
        if (!animation || !(stateKey in model.state)) {
            return;
        }

        if (animation.activeTween) {
            animation.activeTween.stop();
            animation.activeTween = null;
        }

        const state = model.state[stateKey];
        const targetPosition = !state ? animation.toPosition : animation.fromPosition;
        const targetQuaternion = !state ? animation.toQuaternion : animation.fromQuaternion;

        model.state[stateKey] = !model.state[stateKey];

        const position = animation.part.position;

        const totalDistance = animation.fromPosition.distanceTo(animation.toPosition);
        const remainingDistance = position.distanceTo(targetPosition);
        const fraction = totalDistance > 0 ? remainingDistance / totalDistance : 1;
        const duration = animation.milliseconds * Math.max(0, Math.min(1, fraction));

        const rotationProgress = { t: 0 };
        const fromQuaternion = animation.part.quaternion.clone();

        const tween = new TWEEN.Tween(rotationProgress)
            .to({ t: 1 }, duration)
            .onStart(() => {
                new TWEEN.Tween(position).to(targetPosition, duration).start();
            })
            .onUpdate(({ t }) => {
                animation.part.quaternion.slerpQuaternions(fromQuaternion, targetQuaternion, t);
            })
            .onComplete(() => {
                animation.activeTween = null;
            })

        animation.activeTween = tween;
        tween.start();
    };
}

function setupButtonsCallback(model) {
    toggleAnimationCallback(model, "leftDoorOpen", 'btnLeftDoor', 'Left_door');
    toggleAnimationCallback(model, "rightDoorOpen", 'btnRightDoor', 'Right_door');
    toggleAnimationCallback(model, "hoodOpen", 'btnHood', 'Hood');
}

window.onload = () => {
    let car_model = loadModel(CAR_MODEL, scene);

    setupButtonsCallback(car_model);

    animate();
};
