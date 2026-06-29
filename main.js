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
import { toggleCarLight, startBlink, stopBlink } from './lights.js';

const clock = new THREE.Clock();

function setLoadingOverlayHidden() {
    document.getElementById('loadingOverlay')?.classList.add('is-hidden');
}

async function prewarmScene(scene, camera, renderer, composer, model) {
    const lowBeams = model.lowBeams ?? [];
    const highBeams = model.highBeams ?? [];
    const allWarmLights = [...lowBeams, ...highBeams];
    const previousVisibility = allWarmLights.map((light) => light.visible);

    allWarmLights.forEach((light) => {
        light.visible = true;
    });

    renderer.compile(scene, camera);
    composer.render();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    composer.render();

    allWarmLights.forEach((light, index) => {
        light.visible = previousVisibility[index];
    });
}

function animate(scene, camera, renderer, composer, steerControl) {
    const dt = clock.getDelta();
    requestAnimationFrame(() => animate(scene, camera, renderer, composer, steerControl));

    updateCameraMovement(camera);
    steerControl.update(dt);
    TWEEN.update();

    composer.render();
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
    const highBeamsSwitch = document.getElementById('checkHighBeams');

    const applyLowBeamsState = (isVisible) => {
        toggleCarLight(model.lowBeams, isVisible);
        model.state.lowBeams = isVisible;
    };

    const applyHighBeamsState = (isVisible) => {
        toggleCarLight(model.highBeams, isVisible);
        model.state.highBeams = isVisible;
    }

    lowBeamsSwitch.checked = model.state.lowBeams;
    applyLowBeamsState(model.state.lowBeams);
    lowBeamsSwitch.addEventListener('change', (event) => {
        applyLowBeamsState(event.target.checked);
    });

    highBeamsSwitch.checked = model.state.highBeams;
    applyHighBeamsState(model.state.highBeams);
    highBeamsSwitch.addEventListener('change', (event) => {
        applyHighBeamsState(event.target.checked);
    });
}

function setupTurnSignalCallbacks(model) {
    const rightSwitch = document.getElementById('checkRightIndicator');
    const leftSwitch  = document.getElementById('checkLeftIndicator');

    rightSwitch.addEventListener('change', (event) => {
        if (event.target.checked) {
            leftSwitch.checked = false;        // disattiva l'altro
            stopBlink(model.turnSignals.left);
            startBlink(model.turnSignals.right);
        } else {
            stopBlink(model.turnSignals.right);
        }
    });

    leftSwitch.addEventListener('change', (event) => {
        if (event.target.checked) {
            rightSwitch.checked = false;       // disattiva l'altro
            stopBlink(model.turnSignals.right);
            startBlink(model.turnSignals.left);
        } else {
            stopBlink(model.turnSignals.left);
        }
    });
}

window.onload = async () => {
    Settings.init();
    const { scene, camera, renderer, composer, environmentReady } = createScene();
    initCameraUI(camera);
    await environmentReady;
    const car_model = await loadModel(CAR_MODEL, scene);
    syncMaterialControls();
    const steerControl = createSteerControl(car_model);
    setupButtonsCallback(car_model);
    setupLightCallbacks(car_model);
    setupTurnSignalCallbacks(car_model);
    enableClickToAnimate(scene, camera, renderer, car_model);

    await prewarmScene(scene, camera, renderer, composer, car_model);
    setLoadingOverlayHidden();

    animate(scene, camera, renderer, composer, steerControl);
};
