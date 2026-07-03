import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { playTurnSignalSound } from './audio.js';

export function setupEnvironmentLights(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

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

    const frontLight = createOptimizedLight(5.5, 0, 6, 10);
    scene.add(frontLight);

    const leftLight = createOptimizedLight(4.5, -10, 6, 0);
    scene.add(leftLight);
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
        const oldMat = mesh.material;

        mesh.material = new THREE.MeshPhysicalMaterial({
            color: oldMat.color,
            map: oldMat.map,
            normalMap: oldMat.normalMap,
            roughnessMap: oldMat.roughnessMap,
            metalnessMap: oldMat.metalnessMap,

            emissiveMap: oldMat.map,
            
            emissive: 0xeb7a34,
            emissiveIntensity: 0,

            roughness: 0.2,
            metalness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.0
        });
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

function setupAmbientLight(modelRoot, meshName) {
    const mesh = modelRoot.getObjectByName(meshName);

    if (mesh.material) {

        mesh.material = new THREE.MeshPhysicalMaterial({
            emissive: 0xf9f9f9,
            emissiveIntensity: 0,
            roughness: 0.2,
            metalness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.0
        });
    }

    const light = new THREE.SpotLight(0xffffff, 1, 3, Math.PI / 2, 1.0, 2);
    light.position.set(0, 0, 0);
    light.castShadow = false;

    const targetObj = new THREE.Object3D();
    targetObj.position.set(0, 0, 1);
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

export function setupAmbientLights(modelRoot, meshName = ['ambient_light_model']) {
    return meshName.map((name) => setupAmbientLight(modelRoot, name)).filter(Boolean);
}

export function toggleCarLight(lightObject, isVisible) {
    if (!lightObject) return;

    const applyToggle = (item) => {
        if (item instanceof THREE.Object3D) {
            item.visible = isVisible;
            
        } else if (item.mesh || item.light) {
            if (item.activeTween) {
                item.activeTween.stop();
            }

            const targetLight = isVisible ? 3.0 : 0.0; 
            const targetEmissive = isVisible ? 3.0 : 0.0;
            if (isVisible && item.light) {
                item.light.visible = true;
            }

            const currentVals = {
                lInt: item.light ? item.light.intensity : 0,
                eInt: item.mesh && item.mesh.material ? item.mesh.material.emissiveIntensity : 0
            };

            item.activeTween = new TWEEN.Tween(currentVals)
                .to({ lInt: targetLight, eInt: targetEmissive }, 600)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => {
                    if (item.light) item.light.intensity = currentVals.lInt;
                    if (item.mesh && item.mesh.material) item.mesh.material.emissiveIntensity = currentVals.eInt;
                })
                .onComplete(() => {
                    if (!isVisible && item.light) {
                        item.light.visible = false;
                    }
                    item.activeTween = null;
                })
                .start();
                
        } else {
            item.visible = isVisible;
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
        signalObj.mesh.material.emissiveIntensity = isOn ? 4.0 : 0;
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