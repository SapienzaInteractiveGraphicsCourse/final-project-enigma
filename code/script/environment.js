import * as THREE from 'three';
import { gltfLoader } from './loaders.js';

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
                
                const treeGroups = {};
                const treesToRemove = [];

                environment.traverse((child) => {
                    if (child.isMesh) {
                        const nameLower = child.name.toLowerCase();
                        
                        if (nameLower.includes('tree') || nameLower.includes('albero')) {
                            const baseName = child.name.split('.')[0];
                            
                            if (!treeGroups[baseName]) {
                                treeGroups[baseName] = {
                                    geometry: child.geometry,
                                    material: child.material,
                                    transforms: []
                                };
                            }
                            
                            child.updateMatrixWorld(true);
                            treeGroups[baseName].transforms.push(child.matrixWorld.clone());
                            treesToRemove.push(child);
                            
                        } else {
                            child.matrixAutoUpdate = false;
                            child.updateMatrix();
                            child.receiveShadow = true;
                            child.castShadow = true; 
                        }
                    }
                });

                treesToRemove.forEach(tree => {
                    if (tree.parent) tree.parent.remove(tree);
                });

                Object.keys(treeGroups).forEach(key => {
                    const group = treeGroups[key];
                    const totalInstances = group.transforms.length;
                    
                    const instancedMesh = new THREE.InstancedMesh(group.geometry, group.material, totalInstances);
                    instancedMesh.castShadow = false;
                    instancedMesh.receiveShadow = false;
                    
                    const position = new THREE.Vector3();
                    const quaternion = new THREE.Quaternion();
                    const scale = new THREE.Vector3();
                    
                    group.transforms.forEach((matrix, index) => {
                        matrix.decompose(position, quaternion, scale);
                        
                        const randomY = Math.random() * Math.PI * 2;
                        const randomRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), randomY);
                        quaternion.multiply(randomRotation);
                        
                        const randomScale = 0.8 + (Math.random() * 0.4);
                        scale.multiplyScalar(randomScale);
                        
                        const newMatrix = new THREE.Matrix4();
                        newMatrix.compose(position, quaternion, scale);
                        
                        instancedMesh.setMatrixAt(index, newMatrix);
                    });
                    
                    instancedMesh.instanceMatrix.needsUpdate = true;
                    environment.add(instancedMesh);
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