import * as THREE from 'three';
import { playTurnSignalSound, stopTurnSignalSound } from './sound.js';

export function setupEnvironmentLights(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // const frontLight = new THREE.DirectionalLight(0xffffff, 3.5);
    // frontLight.position.set(0, 6, 10);
    // frontLight.castShadow = true;
    // frontLight.shadow.mapSize.width = 2048;
    // frontLight.shadow.mapSize.height = 2048;
    // frontLight.shadow.camera.near = 0.5;
    // frontLight.shadow.camera.far = 25;
    // frontLight.shadow.camera.left = -10;
    // frontLight.shadow.camera.right = 10;
    // frontLight.shadow.camera.top = 10;
    // frontLight.shadow.camera.bottom = -10;
    // frontLight.shadow.bias = -0.001; 
    // frontLight.shadow.normalBias = 0.05; 
    // scene.add(frontLight);

    // const backLight = new THREE.DirectionalLight(0xffffff, 3.5);
    // backLight.position.set(0, 6, -10);
    // backLight.castShadow = false;
    // scene.add(backLight);

    // const leftLight = new THREE.DirectionalLight(0xffffff, 2.5);
    // leftLight.position.set(-10, 6, 0);
    // leftLight.castShadow = false;
    // scene.add(leftLight);

    // const rightLight = new THREE.DirectionalLight(0xffffff, 2.5);
    // rightLight.position.set(10, 6, 0);
    // rightLight.castShadow = false;
    // scene.add(rightLight);
}

function setupLowBeam(modelRoot, emptyName) {
    const anchor = modelRoot.getObjectByName(emptyName);
    if (!anchor) {
        console.error(`error: failed to reference ${emptyName} in the model`);
        return null;
    }

    const beamGroup = new THREE.Group();
    anchor.add(beamGroup);

    const lowbeam = new THREE.SpotLight(0xd4e3ff, 50.0, 35.0, Math.PI / 7, 0.6, 2.2);
    lowbeam.position.set(0, 0, 0);
    lowbeam.shadow.bias = -0.001; 
    beamGroup.add(lowbeam);

    const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 12, 12),
        new THREE.MeshStandardMaterial({
            color: 0x111111,
            emissive: 0xffffff,
            emissiveIntensity: 20,
            roughness: 0.3,
            metalness: 0.0,
        })
    );
    beamGroup.add(bulb);

    const target = new THREE.Object3D();
    target.position.set(0, -0.5, 28); 
    beamGroup.add(target);
    lowbeam.target = target;

    return beamGroup;
}

function setupHighBeam(modelRoot, emptyName) {
    const anchor = modelRoot.getObjectByName(emptyName);
    if (!anchor) {
        console.error(`error: failed to reference ${emptyName} in the model`);
        return null;
    }

    const beamGroup = new THREE.Group();
    anchor.add(beamGroup);

    const highbeam = new THREE.SpotLight(0xd4e3ff, 180.0, 220.0, Math.PI / 16, 0.2, 1.4);
    highbeam.position.set(0, 0, 0);
    highbeam.shadow.bias = -0.001; 
    beamGroup.add(highbeam);

    const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 12, 12),
        new THREE.MeshStandardMaterial({
            color: 0x111111,
            emissive: 0xffffff,
            emissiveIntensity: 20,
            roughness: 0.3,
            metalness: 0.0,
        })
    );
    beamGroup.add(bulb);

    const target = new THREE.Object3D();
    target.position.set(0, 0, 120); 
    beamGroup.add(target);
    highbeam.target = target;

    return beamGroup;
}

function setupTurnSignal(modelRoot, meshName, targetPos = [0, 0, 1]) {
    const mesh = modelRoot.getObjectByName(meshName);

    if (!mesh) {
        console.error(`error: failed to reference ${meshName} in the model`);
        return null;
    }

    if (mesh.material) {
        mesh.material = mesh.material.clone();
        mesh.material.color.setHex(0xffaa00);
        mesh.material.emissive.setHex(0xfc4103);
        mesh.material.emissiveIntensity = 0;
    }

    const light = new THREE.SpotLight(0xffaa00, 0, 3, Math.PI / 2, 1.0, 2);
    light.position.set(0, 0, 0);
    if (mesh.name.includes('LF') || mesh.name.includes('LB')) {
        light.position.x += 0.2; 
    }
    else if (mesh.name.includes('RF') || mesh.name.includes('RB')) {
        light.position.x -= 0.2; 
    }

    light.castShadow = false;

    const targetObj = new THREE.Object3D();

    targetObj.position.set(targetPos[0], targetPos[1], targetPos[2]); 
    
    mesh.add(targetObj);
    light.target = targetObj;

    light.visible = false;
    mesh.add(light);

    return { mesh, light };
}

export function setupLowBeams(modelRoot, emptyNames = ['Low_beam_R', 'Low_beam_L']) {
    return emptyNames.map((emptyName) => setupLowBeam(modelRoot, emptyName)).filter(Boolean);
}

export function setupHighBeams(modelRoot, emptyNames = ['High_beam_R', 'High_beam_L']) {
    return emptyNames.map((emptyName) => setupHighBeam(modelRoot, emptyName)).filter(Boolean);
}

export function setupTurnSignals(modelRoot, meshNames, targetPositions = []) {
    return meshNames.map((name, i) => setupTurnSignal(
        modelRoot, 
        name, 
        targetPositions[i]
    )).filter(Boolean);
}

export function toggleCarLight(lightObject, isVisible) {
    if (lightObject) {
        if (Array.isArray(lightObject)) {
            lightObject.forEach((light) => light.visible = isVisible);
        } else {
            lightObject.visible = isVisible;
        }
    }
}

function setTurnSignalIntensity(signalObj, isOn) {
    if (signalObj.mesh && signalObj.mesh.material) {
        signalObj.mesh.material.emissiveIntensity = isOn ? 15 : 0;
    }
    if (signalObj.light) {
        signalObj.light.visible = isOn;
        signalObj.light.intensity = isOn ? 5.0 : 0; 
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
        playTurnSignalSound(); 
    }, 500);

    activeBlinks.set(id, interval);
}

export function stopBlink(signals, id = 'turn_signal') {
    if (activeBlinks.has(id)) {
        clearInterval(activeBlinks.get(id));
        activeBlinks.delete(id);
    }
    signals.forEach(s => setTurnSignalIntensity(s, false)); 
    stopTurnSignalSound();
}