import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { loadModel } from './model.js';
import { CAR_MODEL } from './car_model.js';
import { updateCameraMovement, snapFreeCameraToCar } from './camera.js';
import { enableClickToAnimate } from './animations.js'
import { createScene } from './scene.js';
import { createCarPhysics } from './physics.js'
import { initCameraUI, syncMaterialControls, setupLightCallbacks, setupButtonsCallback, setupTurnSignalCallbacks, setupDoorLightCallbacks, setupBrakeLightCallbacks, setupEngineCallback, setupGearSelectorCallback, updateTelemetryUI } from './ui.js';
import { Settings } from './settings.js';
import { CubeMapReflections } from './reflections.js';
import { ensureAudioContextResumed, loadEngineSamples, createEngineSoundSystem } from './audio.js';
import { loadEnvironment, updateSkyTexture } from './environment.js';
import { updateSunShadow } from './lights.js';
import { createBestLapTracker } from './bestLap.js';

let frameCount = 0;
let lastTime = performance.now();
const fpsDisplay = document.getElementById('fpsCounter');

const clock = new THREE.Clock();

function setLoadingOverlayHidden() {
    document.getElementById('loadingOverlay')?.classList.add('is-hidden');
}

document.getElementById('btnCompassModeToggle').addEventListener('click', () => {
    snapFreeCameraToCar(camera, carModel);
});

async function prewarmScene(scene, camera, renderer, model, reflectionController) {
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

    updateSkyTexture(scene, true);
    renderer.compile(scene, camera);
    renderer.render(scene, camera);

    updateSkyTexture(scene, false);

    renderer.compile(scene, camera);
    for (let i = 0; i < 3; i++) {
        if (reflectionController) reflectionController.update();
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

    if (reflectionController) reflectionController.update();
    renderer.render(scene, camera);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    ensureAudioContextResumed();
}

let reflectionFrameCounter = 0;

function animate(
    scene,
    camera,
    renderer,
    steerControl,
    car_model,
    reflectionController,
    engineAudioSystem,
    bestLapTracker,
) {
    frameCount++;
    const currentTime = performance.now();
    if (currentTime - lastTime >= 1000) {
        if (fpsDisplay) fpsDisplay.textContent = `FPS: ${frameCount}`;
        frameCount = 0;
        lastTime = currentTime;
    }

    const dt = clock.getDelta();
    requestAnimationFrame(() => animate(scene, camera, renderer, steerControl, car_model, reflectionController, engineAudioSystem, bestLapTracker));

    steerControl.update(dt);
    if (steerControl.engine) {
        const speedKmh = steerControl.getSpeed ? steerControl.getSpeed() : 0;
        updateTelemetryUI(steerControl.engine, speedKmh);

        if (engineAudioSystem) {
            const isRunning = steerControl.engine.isRunning();

            if (isRunning) {
                const currentRpm = steerControl.engine.getRpm();
                const gasPedal = steerControl.getGasPedal ? steerControl.getGasPedal() : 0.0;
                engineAudioSystem.start();
                engineAudioSystem.update(currentRpm, gasPedal);
            } else {
                engineAudioSystem.stop();
            }
        }
    }

    if (car_model && car_model.root) {
        const carPos = new THREE.Vector3();
        car_model.root.getWorldPosition(carPos);
        updateSunShadow(carPos);
    }

    updateCameraMovement(camera, car_model, dt);

    TWEEN.update();

    if (reflectionController) {
        reflectionController.update();

        if (reflectionController.camera.userData.forceUpdate) {
            car_model.root.visible = false;
            reflectionController.camera.update(renderer, scene);
            car_model.root.visible = true;
            reflectionController.camera.userData.forceUpdate = false;
        }
    }

    if (scene.trackLights) {
        let carWorldPos = new THREE.Vector3();
        car_model.root.getWorldPosition(carWorldPos);
        scene.trackLights.update(carWorldPos);
    }

    if (bestLapTracker) {
        let carWorldPos = new THREE.Vector3();
        car_model.root.getWorldPosition(carWorldPos);
        bestLapTracker.update(carWorldPos);
    }

    renderer.render(scene, camera);
    console.log("Draw Calls:", renderer.info.render.calls, "Poligoni:", renderer.info.render.triangles);

}

window.onload = async () => {
    Settings.init();
    const { scene, camera, renderer } = createScene();

    const [env_model, car_model] = await Promise.all([
        loadEnvironment(scene),
        loadModel(CAR_MODEL, scene)
    ]);

    const carPhysicsNode = new THREE.Group();
    scene.add(carPhysicsNode);
    carPhysicsNode.add(car_model.root);

    const trackMeshes = [];
    if (env_model) {
        env_model.traverse((child) => {
            if (child.isMesh && child.userData.isPhysical) {
                trackMeshes.push(child);
            }
        });
    }

    syncMaterialControls();

    const steerControl = createCarPhysics(car_model, trackMeshes);
    setupGearSelectorCallback(steerControl.engine);
    setupButtonsCallback(car_model);
    setupLightCallbacks(car_model);
    setupTurnSignalCallbacks(car_model);
    setupDoorLightCallbacks(car_model);
    setupBrakeLightCallbacks(car_model);
    setupEngineCallback(car_model, steerControl);
    const reflectionController = CubeMapReflections(car_model.root, scene, renderer);

    let engineAudioSystem = null;
    try {
        const sampleMap = await loadEngineSamples();
        engineAudioSystem = createEngineSoundSystem(sampleMap);
    } catch (e) {
        console.warn("Impossibile caricare i sample del motore", e);
    }

    const checkStaticReflections = document.getElementById('checkStaticReflections');
    if (checkStaticReflections) {
        checkStaticReflections.addEventListener('change', (e) => {
            reflectionController.setStaticMode(e.target.checked);
        });
    }

    enableClickToAnimate(scene, camera, renderer, car_model);

    initCameraUI(camera, car_model, scene, (time) => {
        reflectionController.camera.userData.forceUpdate = true;
        reflectionController.updateIntensity(time.dayFactor);
        scene.trackLights.setTime(time.isNight);
    });

    await prewarmScene(scene, camera, renderer, car_model, reflectionController);
    setLoadingOverlayHidden();

    let bestLapTracker = createBestLapTracker(env_model);

    animate(
        scene,
        camera,
        renderer,
        steerControl,
        car_model,
        reflectionController,
        engineAudioSystem,
        bestLapTracker
    );
};

window.addEventListener('pointerdown', () => {
    ensureAudioContextResumed();
}, { once: true });
