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
                        
                        // Ottimizzazione matrici (che già avevi)
                        child.matrixAutoUpdate = false;
                        child.updateMatrix();

                        // FILTRO PER GLI ALBERI
                        // Assicurati che 'tree' o 'albero' sia il nome che hai dato in Blender
                        if (child.name === 'BOOM4' || child.name === 'BOOM4.001') {
                            
                            // 1. Forza l'illuminazione su entrambi i lati del rettangolo
                            if (child.material) {
                                child.material.side = THREE.DoubleSide;
                                child.material.needsUpdate = true;
                            }

                            // 2. Disabilita le ombre incrociate
                            child.castShadow = false;
                            child.receiveShadow = false; 

                        } else {
                            // Per tutto il resto (asfalto, guardrail, cordoli) mantieni le ombre attive
                            child.receiveShadow = true;
                            child.castShadow = true; 
                        }
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