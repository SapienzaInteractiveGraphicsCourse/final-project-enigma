import * as THREE from 'three'
import { gltfLoader } from './loaders.js';
import { setupMaterials } from './color.js';
import { setupLowBeams, setupHighBeams, setupTurnSignals, setupAmbientLights, setupRunningLights, setupTailLights } from './lights.js'; 


export async function loadModel(modelDescription, scene) {
    const path = modelDescription.path;
    const state = modelDescription.state;
    const animationsDescription = modelDescription.animations;

    let model = {
        state: state,
        animations: {},
    };

    return new Promise((resolve, reject) => {
        gltfLoader.load(
            path,
            (gltf) => {
                const gltf_model = gltf.scene;
                model.root = gltf_model;

                gltf_model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        const nameLower = child.name.toLowerCase();
                        if (nameLower.includes('glass') || nameLower.includes('window')) {
                            child.castShadow = false;
                            child.receiveShadow = false;
                        }
                    }
                });
                    
                gltf_model.scale.set(1, 1, 1);
                gltf_model.position.set(0, 0, 0);

                scene.add(gltf_model);
                setupMaterials(gltf_model);
                model.lowBeams = setupLowBeams(gltf_model);
                model.highBeams = setupHighBeams(gltf_model);
                model.runningLights = setupRunningLights(gltf_model);
                model.ambientLights = setupAmbientLights(gltf_model);
                model.tailLights = setupTailLights(gltf_model);

                model.turnSignals = {
                    right: setupTurnSignals(
                        gltf_model,
                        ['Turn_Lights_RF', 'Turn_Lights_RB'],
                        [
                            [-2, 1, 0],
                            [-2, 1, -2]
                        ]
                    ),
                    left: setupTurnSignals(
                        gltf_model, 
                        ['Turn_Lights_LF', 'Turn_Lights_LB'],
                        [
                            [2, 1, 0],
                            [2, 1, -2]
                        ]
                    ),
                };

                Object.keys(animationsDescription).forEach((animKey) => {
                    const description = animationsDescription[animKey];
                    const targetMeshName = description.partName || animKey;
                    const part = gltf_model.getObjectByName(targetMeshName);

                    if (!part) {
                        console.error(`error: failed to reference ${targetMeshName} in the model`);
                    }

                    let fromPosition = part.position.clone();
                    let toPosition = part.position.clone();
                    if (description.position) {
                        fromPosition = part.position.clone();
                        toPosition = new THREE.Vector3(description.position.x, description.position.y, description.position.z);
                    }

                    let fromQuaternion = part.quaternion.clone();
                    let toQuaternion = part.quaternion.clone();
                    const rotationsList = description.rotations ? description.rotations : (description.rotate ? [description.rotate] : []);

                    rotationsList.forEach(rot => {
                        const localAxis = new THREE.Vector3(
                            rot.axis.x,
                            rot.axis.y,
                            rot.axis.z
                        ).normalize();

                        const worldAxis = localAxis.clone().applyQuaternion(toQuaternion).normalize();
                        const qDelta = new THREE.Quaternion().setFromAxisAngle(worldAxis, rot.angle * Math.PI / 180.0);

                        toQuaternion.multiply(qDelta);
                    });

                    model.animations[animKey] = {
                        part,
                        name: animKey,
                        clickable: description.clickable,
                        stateKey: description.stateKey,
                        uiId: description.uiId,
                        sounds: description.sounds,
                        restPosition: part.position.clone(),
                        restQuaternion: part.quaternion.clone(),
                        fromPosition,
                        toPosition,
                        fromQuaternion,
                        toQuaternion,
                        activeTween: null,
                        milliseconds: description.milliseconds,
                    };
                })

                resolve(model);
            },
            (_xhr) => { },
            (error) => reject(error)
        )
    });
}