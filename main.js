import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { loadModel } from './model.js';
import { CAR_MODEL } from './car_model.js';
import { updateCameraMovement } from './camera.js';
import { toggleAnimationCallback, enableClickToAnimate } from './animations.js'
import { createScene } from './scene.js';
import { createSteerControl } from './steering.js'
import { initCameraUI, syncMaterialControls } from './ui.js';
import { Settings } from './settings.js';
import { toggleCarLight } from './lights.js';

const clock = new THREE.Clock();

function animate(scene, camera, renderer, steerControl) {
    const dt = clock.getDelta();
    requestAnimationFrame(() => animate(scene, camera, renderer, steerControl));

    updateCameraMovement(camera);
    steerControl.update(dt);
    TWEEN.update();

    renderer.render(scene, camera);
}

function setupButtonsCallback(model) {
    Object.entries(model.animations).forEach(([name, animation]) => {
        if (animation.uiId) {
            toggleAnimationCallback(model, animation.uiId, name);
        }
    })
}

function setupLightCallbacks(model) {
    const lowBeamsSwitch = document.getElementById('checkLowBeams');

    if (!lowBeamsSwitch) {
        return;
    }

    const applyLowBeamsState = (isVisible) => {
        toggleCarLight(model.lowBeams, isVisible);
        model.state.lowBeams = isVisible;
    };

    lowBeamsSwitch.checked = model.state.lowBeams;
    applyLowBeamsState(model.state.lowBeams);
    lowBeamsSwitch.addEventListener('change', (event) => {
        applyLowBeamsState(event.target.checked);
    });
}

window.onload = async () => {
    Settings.init();
    const { scene, camera, renderer } = createScene();
    initCameraUI(camera);
    const car_model = await loadModel(CAR_MODEL, scene);
    syncMaterialControls();
    const steerControl = createSteerControl(car_model);
    setupButtonsCallback(car_model);
    setupLightCallbacks(car_model);
    enableClickToAnimate(scene, camera, renderer, car_model);

    animate(scene, camera, renderer, steerControl);
};
