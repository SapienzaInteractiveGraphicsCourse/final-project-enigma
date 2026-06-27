import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { loadModel } from './model.js';
import { CAR_MODEL } from './car_model.js';
import { updateCameraMovement } from './camera.js';
import { toggleAnimationCallback } from './animations.js'
import { createScene } from './scene.js';
import { createSteerControl } from './steering.js'
import './ui.js';

const clock = new THREE.Clock();

function animate(scene, camera, renderer, steerControl) {
    const dt = clock.getDelta();
    requestAnimationFrame(() => animate(scene, camera, renderer, steerControl));

    updateCameraMovement(camera);
    steerControl.updateInput();
    steerControl.update(dt);
    TWEEN.update();

    renderer.render(scene, camera);
}

function setupButtonsCallback(model) {
    toggleAnimationCallback(model, "leftDoorOpen", 'btnLeftDoor', 'Left_door');
    toggleAnimationCallback(model, "rightDoorOpen", 'btnRightDoor', 'Right_door');
    toggleAnimationCallback(model, "hoodOpen", 'btnHood', 'Hood');
    toggleAnimationCallback(model, "wingOpen", 'btnWing', 'Spoiler');
}

window.onload = async () => {
    const { scene, camera, renderer } = createScene();
    const car_model = await loadModel(CAR_MODEL, scene);
    const steerControl = createSteerControl(car_model);
    setupButtonsCallback(car_model);

    animate(scene, camera, renderer, steerControl);
};
