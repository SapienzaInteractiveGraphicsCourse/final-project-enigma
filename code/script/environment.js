import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export function loadEnvironment(scene) {

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    loader.setDRACOLoader(dracoLoader);
    
    loader.load(
        '../../src/models/garage_1/garage.glb',
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
        },
        (error) => {
        }
    );
}