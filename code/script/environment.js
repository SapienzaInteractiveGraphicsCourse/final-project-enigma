import * as THREE from 'three';
import { gltfLoader } from './loaders.js'

export async function loadEnvironment(scene) {

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('../../src/textures/panoramic-view-sea.jpg', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
        scene.environment = texture;
    });

    return new Promise((resolve, reject) => {
        gltfLoader.load(
            '../../src/models/track_1/track_1.glb',
            (gltf) => {
                const environment = gltf.scene;
                environment.position.set(0, 0, 0);
                environment.scale.set(1, 1, 1);
                environment.traverse((child) => {
                    if (child.isMesh) {

                        child.matrixAutoUpdate = false;
                        child.updateMatrix();
                        child.receiveShadow = true;
                        child.castShadow = true; 
                    }
                });

                scene.add(environment);
                resolve(environment);
            },
            (_xhr) => { },
            (error) => {
                reject(error);
            }
        );
    });
}