import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { loadModel } from './model.js';
import { CAR_MODEL } from './car_model.js';
import { updateCameraMovement } from './camera.js';
import { toggleAnimationCallback } from './animations.js'
import { createScene } from './scene.js';
import { createSteerControl } from './steering.js'
import { initCameraUI, syncMaterialControls } from './ui.js';

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
    toggleAnimationCallback(model, "leftDoorOpen", 'checkLeftDoor', 'Left_door');
    toggleAnimationCallback(model, "rightDoorOpen", 'checkRightDoor', 'Right_door');
    toggleAnimationCallback(model, "hoodOpen", 'checkHood', 'Hood');
    toggleAnimationCallback(model, "wingOpen", 'checkSpoiler', 'Spoiler');
}

window.onload = async () => {
    const { scene, camera, renderer } = createScene();
    initCameraUI(camera);
    const car_model = await loadModel(CAR_MODEL, scene);
    syncMaterialControls();
    const steerControl = createSteerControl(car_model);
    setupButtonsCallback(car_model);

    animate(scene, camera, renderer, steerControl);
};
