import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { playTurnSignalSound } from './audio.js';

export function setupEnvironmentLights(scene) {
    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    // scene.add(ambientLight);

    const createOptimizedLight = (intensity, posX, posY, posZ) => {
        const light = new THREE.DirectionalLight(0xffffff, intensity);
        light.position.set(posX, posY, posZ);
        light.castShadow = true;
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 20;
        light.shadow.camera.left = -5;
        light.shadow.camera.right = 5;
        light.shadow.camera.top = 5;
        light.shadow.camera.bottom = -5;
        light.shadow.bias = -0.001;
        light.shadow.normalBias = 0.05;
        return light;
    };

    scene.add(createOptimizedLight(5.5, 0, 6, 10));
    scene.add(createOptimizedLight(4.5, -10, 6, 0));
}

function upgradeToEmissiveMaterial(mesh, emissiveHex) {
    if (!mesh || !mesh.material) return;
    const oldMat = mesh.material;
    mesh.material = new THREE.MeshPhysicalMaterial({
        color: oldMat.color,
        map: oldMat.map,
        normalMap: oldMat.normalMap,
        roughnessMap: oldMat.roughnessMap,
        metalnessMap: oldMat.metalnessMap,
        emissiveMap: oldMat.map,
        emissive: emissiveHex,
        emissiveIntensity: 0,
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.0
    });
}

function setupRunningLight(modelRoot, meshName) {
    const mesh = modelRoot.getObjectByName(meshName);
    if (!mesh) { console.error(`error: failed to reference ${meshName}`); return null; }

    upgradeToEmissiveMaterial(mesh, 0xd4e3ff);

    const light = new THREE.SpotLight(0xd4e3ff, 50.0, 35.0, Math.PI / 7, 0.6, 2.2);
    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    light.position.copy(worldPos);
    light.castShadow = false;

    const targetObj = new THREE.Object3D();
    targetObj.position.copy(worldPos).add(new THREE.Vector3(0, -0.5, 28));

    modelRoot.add(light, targetObj);
    light.target = targetObj;
    light.visible = true;
    light.intensity = 0;

    return { mesh, light, maxLightInt: 5.0, maxEmissiveInt: 3.0 };
}

function setupLowBeam(modelRoot, meshName) {
    const mesh = modelRoot.getObjectByName(meshName);
    if (!mesh) { console.error(`error: failed to reference ${meshName}`); return null; }

    upgradeToEmissiveMaterial(mesh, 0xd4e3ff);

    const light = new THREE.SpotLight(0xd4e3ff, 50.0, 35.0, Math.PI / 7, 0.6, 2.2);
    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    light.position.copy(worldPos);
    light.castShadow = false;

    const targetObj = new THREE.Object3D();
    targetObj.position.copy(worldPos).add(new THREE.Vector3(0, -0.5, 28));

    modelRoot.add(light, targetObj);
    light.target = targetObj;
    light.visible = true;
    light.intensity = 0;

    return { mesh, light, maxLightInt: 50.0, maxEmissiveInt: 6.0 };
}

function setupHighBeam(modelRoot, meshName) {
    const mesh = modelRoot.getObjectByName(meshName);
    if (!mesh) { console.error(`error: failed to reference ${meshName}`); return null; }

    upgradeToEmissiveMaterial(mesh, 0xd4e3ff);

    const light = new THREE.SpotLight(0xd4e3ff, 180.0, 220.0, Math.PI / 16, 0.2, 1.4);
    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    light.position.copy(worldPos);
    light.castShadow = false;

    const targetObj = new THREE.Object3D();
    targetObj.position.copy(worldPos).add(new THREE.Vector3(0, 0, 120));

    modelRoot.add(light, targetObj);
    light.target = targetObj;
    light.visible = true;
    light.intensity = 0;

    return { mesh, light, maxLightInt: 180.0, maxEmissiveInt: 10.0 };
}

function setupTurnSignal(modelRoot, meshName, targetPos = [0, 0, 1]) {
    const mesh = modelRoot.getObjectByName(meshName);
    if (!mesh) { console.error(`error: failed to reference ${meshName}`); return null; }

    upgradeToEmissiveMaterial(mesh, 0xeb7a34);

    const light = new THREE.SpotLight(0xffaa00, 0, 3, Math.PI / 2, 1.0, 2);
    light.position.set(0, 0, 0);
    if (mesh.name.includes('LF') || mesh.name.includes('LB')) light.position.x += 0.2; 
    else if (mesh.name.includes('RF') || mesh.name.includes('RB')) light.position.x -= 0.2; 
    light.castShadow = false;

    const targetObj = new THREE.Object3D();
    targetObj.position.set(...targetPos); 
    
    mesh.add(targetObj, light);
    light.target = targetObj;
    light.visible = true;
    light.intensity = 0;

    return { mesh, light, maxLightInt: 5.0, maxEmissiveInt: 4.0 };
}

function setupAmbientLight(modelRoot, meshName) {
    const rootObj = modelRoot.getObjectByName(meshName);
    if (!rootObj) { console.error(`error: failed to reference ${meshName}`); return null; }

    let actualMesh = rootObj.isMesh ? rootObj : null;
    if (!actualMesh) {
        rootObj.traverse((child) => {
            if (child.isMesh && !actualMesh) actualMesh = child;
        });
    }
    
    if (!actualMesh) { console.error(`error: no mesh found inside ${meshName}`); return null; }

    actualMesh.material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0, 
        roughness: 0.2,
        metalness: 0.1
    });

    const light = new THREE.SpotLight(0xffffff, 0, 5, Math.PI / 2, 0.5, 2);
    light.castShadow = false;

    const worldPos = new THREE.Vector3();
    actualMesh.getWorldPosition(worldPos);
    
    modelRoot.worldToLocal(worldPos);
    
    light.position.copy(worldPos);
    light.position.y -= 0.05;

    const targetObj = new THREE.Object3D();
    targetObj.position.copy(light.position);
    targetObj.position.y -= 1.0; 

    modelRoot.add(light, targetObj);
    light.target = targetObj;

    light.visible = true;

    return { mesh: actualMesh, light: light, maxLightInt: 3.0, maxEmissiveInt: 8.0 };
}

export function setupRunningLights(modelRoot, meshNames = ['Running_lights_RF', 'Running_lights_LF']) {
    return meshNames.map((name) => setupRunningLight(modelRoot, name)).filter(Boolean);
}

export function setupLowBeams(modelRoot, meshNames = ['Low_beam_RF', 'Low_beam_LF']) {
    return meshNames.map((name) => setupLowBeam(modelRoot, name)).filter(Boolean);
}

export function setupHighBeams(modelRoot, meshNames = ['High_beam_RF', 'High_beam_LF']) {
    return meshNames.map((name) => setupHighBeam(modelRoot, name)).filter(Boolean);
}

export function setupTurnSignals(modelRoot, meshNames, targetPositions = []) {
    return meshNames.map((name, i) => setupTurnSignal(modelRoot, name, targetPositions[i])).filter(Boolean);
}

export function setupAmbientLights(modelRoot, meshName = ['ambient_light_model']) {
    return meshName.map((name) => setupAmbientLight(modelRoot, name)).filter(Boolean);
}

export function toggleCarLight(lightObject, isVisible) {
    if (!lightObject) return;

    const applyToggle = (item) => {
        if (item.activeTween) {
            item.activeTween.stop();
        }

        const duration = isVisible ? 100 : 400;

        if (item.mesh || item.light) {
            if (item.light) item.light.visible = true;

            const currentVals = {
                lInt: item.light ? item.light.intensity : 0,
                eInt: item.mesh && item.mesh.material ? item.mesh.material.emissiveIntensity : 0
            };

            const targetLight = isVisible ? (item.maxLightInt ?? 3.0) : 0.0; 
            const targetEmissive = isVisible ? (item.maxEmissiveInt ?? 3.0) : 0.0;

            item.activeTween = new TWEEN.Tween(currentVals)
                .to({ lInt: targetLight, eInt: targetEmissive }, duration)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onUpdate(() => {
                    if (item.light) item.light.intensity = currentVals.lInt;
                    if (item.mesh && item.mesh.material) item.mesh.material.emissiveIntensity = currentVals.eInt;
                })
                .onComplete(() => { item.activeTween = null; })
                .start();
        }
    };

    if (Array.isArray(lightObject)) {
        lightObject.forEach(applyToggle);
    } else {
        applyToggle(lightObject);
    }
}

function setTurnSignalIntensity(signalObj, isOn) {
    if (signalObj.mesh && signalObj.mesh.material) {
        signalObj.mesh.material.emissiveIntensity = isOn ? (signalObj.maxEmissiveInt ?? 4.0) : 0;
    }
    if (signalObj.light) {
        signalObj.light.visible = true;
        signalObj.light.intensity = isOn ? (signalObj.maxLightInt ?? 5.0) : 0; 
    }
}

let activeBlinks = new Map(); 

export function startBlink(signals, id = 'turn_signal') {
    if (activeBlinks.has(id)) return; 

    let blinkState = true;
    signals.forEach(s => setTurnSignalIntensity(s, blinkState));
    playTurnSignalSound();

    const interval = setInterval(() => {
        blinkState = !blinkState;
        signals.forEach(s => setTurnSignalIntensity(s, blinkState));
        if (blinkState) {
            playTurnSignalSound();
        }
    }, 489);

    activeBlinks.set(id, interval);
}

export function stopBlink(signals, id = 'turn_signal') {
    if (activeBlinks.has(id)) {
        clearInterval(activeBlinks.get(id));
        activeBlinks.delete(id);
    }
    signals.forEach(s => setTurnSignalIntensity(s, false));
}