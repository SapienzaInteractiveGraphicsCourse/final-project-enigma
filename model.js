import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { setupMaterials } from './color.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
dracoLoader.setDecoderConfig({ type: 'js' });

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

export async function loadModel(modelDescription, scene) {
    const path = modelDescription.path;
    const state = modelDescription.state;
    const animationsDescription = modelDescription.animations;

    let model = {
        state: state,
        animations: {},
    };

    return new Promise((resolve, reject) => {
        loader.load(
            path,
            (gltf) => {
                const gltf_model = gltf.scene;

                gltf_model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                gltf_model.scale.set(1, 1, 1);
                gltf_model.position.set(0, 0, 0);

                scene.add(gltf_model);
                setupMaterials(gltf_model);

                Object.keys(animationsDescription).forEach((partName) => {
                    const part = gltf_model.getObjectByName(partName)
                    if (!part) {
                        console.error(`error: failed to reference ${partName} in the model`);
                    }

                    const description = animationsDescription[partName];

                    let fromPosition = part.position.clone();
                    let toPosition = part.position.clone();
                    if (description.position) {
                        fromPosition = part.position.clone();
                        toPosition = new THREE.Vector3(description.position.x, description.position.y, description.position.z);
                    }

                    let fromQuaternion = part.quaternion.clone();
                    let toQuaternion = part.quaternion.clone();
                    if (description.rotate) {
                        const localAxis = new THREE.Vector3(
                            description.rotate.axis.x,
                            description.rotate.axis.y,
                            description.rotate.axis.z
                        ).normalize();

                        const worldAxis = localAxis.clone().applyQuaternion(part.quaternion).normalize();

                        const qDelta = new THREE.Quaternion().setFromAxisAngle(worldAxis, description.rotate.angle * Math.PI / 180.0);
                        toQuaternion = fromQuaternion.clone().multiply(qDelta);
                    }

                    model.animations[partName] = {
                        part,
                        name: partName,
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
            (error) => {
                reject(error);
            }
        )
    });
}
