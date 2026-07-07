import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { loadModel } from './model.js';
import { CAR_MODEL } from './car_model.js';
import { loadEnvironment } from './environment.js';
import { updateCameraMovement } from './camera.js';
import { enableClickToAnimate } from './animations.js'
import { createScene } from './scene.js';
import { createSteerControl } from './steering.js'
import { initCameraUI, syncMaterialControls, setupLightCallbacks, setupButtonsCallback, setupTurnSignalCallbacks, setupDoorLightCallbacks, setupEngineCallback } from './ui.js';
import { Settings } from './settings.js';
import { CubeMapReflections } from './reflections.js';
import { ensureAudioContextResumed } from './audio.js';

const clock = new THREE.Clock();

function setLoadingOverlayHidden() {
    document.getElementById('loadingOverlay')?.classList.add('is-hidden');
}

async function prewarmScene(scene, camera, renderer, model) {
    const lowBeams = model.lowBeams ?? [];
    const highBeams = model.highBeams ?? [];
    const ambientLights = model.ambientLights ?? [];
    const turnLeft = model.turnSignals?.left ?? [];
    const turnRight = model.turnSignals?.right ?? [];

    const forceLightsState = (isOn) => {
        [...lowBeams, ...highBeams, ...ambientLights, ...turnLeft, ...turnRight].forEach(item => {
            if (!item) return;
            
            if (item.light) {
                item.light.visible = true;
                item.light.intensity = isOn ? 5.0 : 0.0; 
            }
            if (item.mesh && item.mesh.material) {
                item.mesh.material.emissiveIntensity = isOn ? 4.0 : 0.0;
            }
        });
    };

    forceLightsState(true);

    renderer.compile(scene, camera);
    for (let i = 0; i < 3; i++) {
        renderer.render(scene, camera);
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    forceLightsState(false);

    model.root.traverse((child) => {
        if (child.isMesh && child.geometry) {
            if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
            if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
        }
    });

    const dummyRaycaster = new THREE.Raycaster();
    dummyRaycaster.set(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
    dummyRaycaster.intersectObject(model.root, true);
    
    renderer.render(scene, camera);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    ensureAudioContextResumed();
}

let reflectionFrameCounter = 0;
function animate(scene, camera, renderer, steerControl, car_model, cubeCamera) {
    const dt = clock.getDelta();
    requestAnimationFrame(() => animate(scene, camera, renderer, steerControl, car_model, cubeCamera));

    updateCameraMovement(camera);
    steerControl.update(dt);
    TWEEN.update();

    reflectionFrameCounter++;
    if (reflectionFrameCounter % 60 === 0) {
        car_model.root.visible = false;
        cubeCamera.update(renderer, scene);
        car_model.root.visible = true;
    }

    renderer.render(scene, camera);
}

window.onload = async () => {
    Settings.init();
    const { scene, camera, renderer } = createScene();

    const [_, car_model] = await Promise.all([
        loadEnvironment(scene),
        loadModel(CAR_MODEL, scene)
    ]);

    car_model.root.rotation.y = THREE.MathUtils.degToRad(-110);

    initCameraUI(camera, car_model);

    syncMaterialControls();
    const steerControl = createSteerControl(car_model);
    setupButtonsCallback(car_model);
    setupLightCallbacks(car_model);
    setupTurnSignalCallbacks(car_model);
    setupDoorLightCallbacks(car_model);
    setupEngineCallback(car_model);
    const cubeCamera = CubeMapReflections(car_model, scene, renderer);
    enableClickToAnimate(scene, camera, renderer, car_model);

    await prewarmScene(scene, camera, renderer, car_model);
    setLoadingOverlayHidden();

    animate(scene, camera, renderer, steerControl, car_model, cubeCamera);
};

window.addEventListener('pointerdown', () => {
    ensureAudioContextResumed();
}, { once: true });