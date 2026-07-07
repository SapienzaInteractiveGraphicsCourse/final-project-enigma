import * as THREE from 'three';
import { gltfLoader } from './loaders.js'

export async function loadEnvironment(scene) {

    return new Promise((resolve, reject) => {
        gltfLoader.load(
            '../../src/models/track_1/track_1.glb',
            (gltf) => {
                const environment = gltf.scene;
                environment.position.set(0, 0, 0);
                environment.scale.set(1, 1, 1);
                environment.traverse((child) => {
                    if (child.isMesh) {
                        child.receiveShadow = true;
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