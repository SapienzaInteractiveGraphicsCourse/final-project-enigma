import * as TWEEN from '@tweenjs/tween.js'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { setupMaterials } from './color.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
dracoLoader.setDecoderConfig({ type: 'js' });

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

export function loadModel(path, state, animationsDescription, scene) {
    let model = {
        state: state,
        animations: {},
    };

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
                const from = part.position.clone();
                const to = new THREE.Vector3(description.to.x, description.to.y, description.to.z);
                model.animations[partName] = {
                    part,
                    name: partName,
                    from,
                    to,
                    activeTween: null,
                    milliseconds: description.milliseconds,
                };
            })
        },
        (_xhr) => { },
        (error) => {
            console.error(`error: failed to load gltf model: ${error}`)
        }
    )

    return model;
}
