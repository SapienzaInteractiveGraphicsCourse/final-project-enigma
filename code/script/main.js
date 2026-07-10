import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { loadModel } from './model.js';
import { CAR_MODEL } from './car_model.js';
import { updateCameraMovement, snapFreeCameraToCar } from './camera.js';
import { enableClickToAnimate } from './animations.js'
import { createScene } from './scene.js';
import { createCarPhysics } from './physics.js'
import { initCameraUI, syncMaterialControls, setupLightCallbacks, setupButtonsCallback, setupTurnSignalCallbacks, setupDoorLightCallbacks, setupEngineCallback, setupGearSelectorCallback, updateTelemetryUI } from './ui.js';
import { Settings } from './settings.js';
import { CubeMapReflections } from './reflections.js';
import { ensureAudioContextResumed, loadEngineSamples, createEngineSoundSystem } from './audio.js';
import { loadEnvironment, updateSkyTexture } from './environment.js';

const clock = new THREE.Clock();

function setLoadingOverlayHidden() {
    document.getElementById('loadingOverlay')?.classList.add('is-hidden');
}

document.getElementById('btnCompassModeToggle').addEventListener('click', () => {
    snapFreeCameraToCar(camera, carModel);
});

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

    updateSkyTexture(scene, true);
    renderer.compile(scene, camera);
    renderer.render(scene, camera);
    
    updateSkyTexture(scene, false);

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

function animate(scene, camera, renderer, steerControl, car_model, reflectionController, engineAudioSystem) {
    const dt = clock.getDelta();
    requestAnimationFrame(() => animate(scene, camera, renderer, steerControl, car_model, reflectionController, engineAudioSystem));

    steerControl.update(dt);
    if (steerControl.engine) {
        updateTelemetryUI(steerControl.engine);
        if (engineAudioSystem) {
        const isRunning = steerControl.engine.isRunning();
        
        if (isRunning) {
            const currentRpm = steerControl.engine.getRpm();
            // Recuperiamo il valore istantaneo del gas (0.0 o 1.0)
            const gasPedal = steerControl.getGasPedal ? steerControl.getGasPedal() : 0.0;
            
            engineAudioSystem.start(); 
            // Passiamo sia i giri che l'intensità dell'acceleratore
            engineAudioSystem.update(currentRpm, gasPedal);
        } else {
            engineAudioSystem.stop();
        }
    }
    }
    
    updateCameraMovement(camera, car_model, dt); 
    
    TWEEN.update();

    reflectionFrameCounter++;
    
    if (reflectionController.camera.userData.forceUpdate) { 
        car_model.root.visible = false;
        reflectionController.camera.update(renderer, scene);
        car_model.root.visible = true;
        
        reflectionController.camera.userData.forceUpdate = false; 
        reflectionFrameCounter = 0; 
    }
    renderer.render(scene, camera);
}

window.onload = async () => {
    Settings.init();
    const { scene, camera, renderer } = createScene();

    const [env_model, car_model] = await Promise.all([
        loadEnvironment(scene),
        loadModel(CAR_MODEL, scene)
    ]);

    // car_model.root.rotation.y = THREE.MathUtils.degToRad(-110);
    
    const carPhysicsNode = new THREE.Group();
    scene.add(carPhysicsNode);
    car_model.root.position.set(0, -0.60, 0);
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
    setupEngineCallback(car_model, steerControl);
    const reflectionController = CubeMapReflections(car_model.root, scene, renderer);
    enableClickToAnimate(scene, camera, renderer, car_model);

    let engineAudioSystem = null;
    try {
        const sampleMap = await loadEngineSamples(); 
        engineAudioSystem = createEngineSoundSystem(sampleMap);
    } catch (e) {
        console.warn("Impossibile caricare i sample del motore", e);
    }

    initCameraUI(camera, car_model, scene, (dayFactor) => {
        reflectionController.camera.userData.forceUpdate = true;
        reflectionController.updateIntensity(dayFactor);
    });

    await prewarmScene(scene, camera, renderer, car_model);
    setLoadingOverlayHidden();

    animate(scene, camera, renderer, steerControl, car_model, reflectionController, engineAudioSystem);
};

window.addEventListener('pointerdown', () => {
    ensureAudioContextResumed();
}, { once: true });