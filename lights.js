import * as THREE from 'three';
import { playTurnSignalSound, stopTurnSignalSound } from './sound.js';

export function setupEnvironmentLights(scene) {
    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    // scene.add(ambientLight);

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
    // backLight.castShadow = true;
    // backLight.shadow.mapSize.width = 2048;
    // backLight.shadow.mapSize.height = 2048;
    // backLight.shadow.camera.near = 0.5;
    // backLight.shadow.camera.far = 25;
    // backLight.shadow.camera.left = -10;
    // backLight.shadow.camera.right = 10;
    // backLight.shadow.camera.top = 10;
    // backLight.shadow.camera.bottom = -10;
    // backLight.shadow.bias = -0.001; 
    // backLight.shadow.normalBias = 0.05;
    // scene.add(backLight);

    // const leftLight = new THREE.DirectionalLight(0xffffff, 2.5);
    // leftLight.position.set(-10, 6, 0);
    // leftLight.castShadow = true;
    // leftLight.shadow.mapSize.width = 2048;
    // leftLight.shadow.mapSize.height = 2048;
    // leftLight.shadow.camera.near = 0.5;
    // leftLight.shadow.camera.far = 25;
    // leftLight.shadow.camera.left = -10;
    // leftLight.shadow.camera.right = 10;
    // leftLight.shadow.camera.top = 10;
    // leftLight.shadow.camera.bottom = -10;
    // leftLight.shadow.bias = -0.001;
    // leftLight.shadow.normalBias = 0.05;
    // scene.add(leftLight);

    // const rightLight = new THREE.DirectionalLight(0xffffff, 2.5);
    // rightLight.position.set(10, 6, 0);
    // rightLight.castShadow = true;
    // rightLight.shadow.mapSize.width = 2048;
    // rightLight.shadow.mapSize.height = 2048;
    // rightLight.shadow.camera.near = 0.5;
    // rightLight.shadow.camera.far = 25;
    // rightLight.shadow.camera.left = -10;
    // rightLight.shadow.camera.right = 10;
    // rightLight.shadow.camera.top = 10;
    // rightLight.shadow.camera.bottom = -10;
    // rightLight.shadow.bias = -0.001;
    // rightLight.shadow.normalBias = 0.05;
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
    lowbeam.castShadow = true;

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
    bulb.position.set(0, 0, 0);
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

    const highbeam = new THREE.SpotLight(0xffffff, 180.0, 220.0, Math.PI / 16, 0.2, 1.4);
    highbeam.position.set(0, 0, 0);
    highbeam.castShadow = true;

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
    bulb.position.set(0, 0, 0);
    beamGroup.add(bulb);

    const target = new THREE.Object3D();

    target.position.set(0, 0, 120); 
    
    beamGroup.add(target);
    highbeam.target = target;

    return beamGroup;
}

function setupTurnSignal(modelRoot, emptyName, rotationY = 0, positionZ = -0.05, width = 0.35, height = 0.04) {
    const anchor = modelRoot.getObjectByName(emptyName);

    if (!anchor) {
        console.error(`error: failed to reference ${emptyName} in the model`);
        return null;
    }

    const signalGroup = new THREE.Group();
    signalGroup.rotation.y = rotationY;
    signalGroup.position.z = positionZ; // ← ora è un parametro
    signalGroup.visible = false;
    anchor.add(signalGroup);

    const light = new THREE.RectAreaLight(0xff8800, 80.0, width, height);
    light.position.set(0, 0, 0);
    light.lookAt(0, 0, 1);
    signalGroup.add(light);

    const bulb = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, 0.01),
        new THREE.MeshStandardMaterial({
            color: 0xff6600,
            emissive: 0xff8800,
            emissiveIntensity: 15,
            roughness: 0.3,
            metalness: 0.0,
        })
    );
    signalGroup.add(bulb);

    return signalGroup;
}


export function setupLowBeams(modelRoot, emptyNames = ['Low_beam_R', 'Low_beam_L']) {
    return emptyNames.map((emptyName) => setupLowBeam(modelRoot, emptyName)).filter(Boolean);
}

export function setupHighBeams(modelRoot, emptyNames = ['High_beam_R', 'High_beam_L']) {
    return emptyNames.map((emptyName) => setupHighBeam(modelRoot, emptyName)).filter(Boolean);
}

export function setupTurnSignals(modelRoot, emptyNames, rotationsY = [], positionsZ = [], widths = [], heights = []) {
    return emptyNames.map((name, i) => setupTurnSignal(
        modelRoot,
        name,
        rotationsY[i] ?? 0,
        positionsZ[i] ?? -0.05,
        widths[i] ?? 0.35,
        heights[i] ?? 0.04
    )).filter(Boolean);
}

export function toggleCarLight(lightObject, isVisible) {
    if (lightObject) {
        if (Array.isArray(lightObject)) {
            lightObject.forEach((light) => {
                light.visible = isVisible;
            });
        } else {
            lightObject.visible = isVisible;
        }
    }
}

let blinkInterval = null;
let blinkState = false;

const activeBlinks = new Map(); 

export function startBlink(signals, id = 'turn_signal') {
    if (activeBlinks.has(id)) return; 

    // 1. Azione IMMEDIATA al click: accendiamo la luce e suoniamo
    let blinkState = true;
    signals.forEach(s => { s.visible = blinkState; });
    playTurnSignalSound(); // Essendo legato al click, il browser non lo bloccherà più!

    // 2. Facciamo partire il loop per i lampeggi successivi
    const interval = setInterval(() => {
        blinkState = !blinkState;
        signals.forEach(s => { s.visible = blinkState; });
        playTurnSignalSound(); 
    }, 500);

    activeBlinks.set(id, interval);
}

export function stopBlink(signals, id = 'turn_signal') {
    if (activeBlinks.has(id)) {
        clearInterval(activeBlinks.get(id));
        activeBlinks.delete(id);
    }
    
    // Assicuriamoci che le luci siano spente
    signals.forEach(s => { s.visible = false; }); 
    
    // FORZA LO STOP DEL SUONO IMMEDIAMENTE
    stopTurnSignalSound();
}