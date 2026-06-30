import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { loadModel } from './model.js';
import { CAR_MODEL } from './car_model.js';
import { loadEnvironment } from './environment.js';
import { updateCameraMovement } from './camera.js';
import { toggleAnimationCallback, enableClickToAnimate } from './animations.js'
import { createScene } from './scene.js';
import { createSteerControl } from './steering.js'
import { initCameraUI, syncMaterialControls, setupLightCallbacks, setupButtonsCallback, setupTurnSignalCallbacks } from './ui.js';
import { Settings } from './settings.js';
import { CubeMapReflections } from './reflections.js';

const clock = new THREE.Clock();

function setLoadingOverlayHidden() {
    document.getElementById('loadingOverlay')?.classList.add('is-hidden');
}

async function prewarmScene(scene, camera, renderer, model) {
    const lowBeams = model.lowBeams ?? [];
    const highBeams = model.highBeams ?? [];
    const allWarmLights = [...lowBeams, ...highBeams];
    const previousVisibility = allWarmLights.map((light) => light.visible);

    allWarmLights.forEach((light) => {
        light.visible = true;
    });

    renderer.compile(scene, camera);
    renderer.render(scene, camera);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    renderer.render(scene, camera);

    allWarmLights.forEach((light, index) => {
        light.visible = previousVisibility[index];
    });
}

function animate(scene, camera, renderer, steerControl) {
    const dt = clock.getDelta();
    requestAnimationFrame(() => animate(scene, camera, renderer, steerControl));

    updateCameraMovement(camera);
    steerControl.update(dt);
    TWEEN.update();

    renderer.render(scene, camera);
}

window.onload = async () => {
    Settings.init();
    const { scene, camera, renderer } = createScene();

    initCameraUI(camera);
    await loadEnvironment(scene);
    const car_model = await loadModel(CAR_MODEL, scene);
    syncMaterialControls();
    const steerControl = createSteerControl(car_model);
    setupButtonsCallback(car_model);
    setupLightCallbacks(car_model);
    setupTurnSignalCallbacks(car_model);
    CubeMapReflections(car_model, scene, renderer);
    enableClickToAnimate(scene, camera, renderer, car_model);

    await prewarmScene(scene, camera, renderer, car_model);
    setLoadingOverlayHidden();

    animate(scene, camera, renderer, steerControl);
};