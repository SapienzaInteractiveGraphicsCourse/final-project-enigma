import * as THREE from 'three';
import { gltfLoader } from './loaders.js';
import { setupTrackLights } from './lights.js'

let dayTexture = null;
let nightTexture = null;

export function updateSkyTexture(scene, isNight) {
    if (isNight && nightTexture) {
        scene.background = nightTexture;
        scene.environment = nightTexture;
    } else if (!isNight && dayTexture) {
        scene.background = dayTexture;
        scene.environment = dayTexture;
    }
}

export async function loadEnvironment(scene) {
    const textureLoader = new THREE.TextureLoader();

    const loadTex = (url) => new Promise((resolve) => {
        textureLoader.load(url, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            resolve(texture);
        });
    });

    const [day, night] = await Promise.all([
        loadTex('../../src/textures/day_sky.jpg'),
        loadTex('../../src/textures/night_sky.jpg')
    ]);

    dayTexture = day;
    nightTexture = night;

    scene.background = dayTexture;
    scene.environment = dayTexture;

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
                        child.layers.enable(1);
                        const nameLower = child.name.toLowerCase();

                        if (/\b(tree|albero)\b/.test(nameLower)) {
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
                            child.updateMatrixWorld(true);
                            child.matrixAutoUpdate = false;
                            child.updateMatrix();
                            child.receiveShadow = true;
                            child.castShadow = true;
                            child.userData.isPhysical = true;
                        }
                    }
                });

                scene.trackLights = setupTrackLights(environment, scene);

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
                const initialState = document.getElementById('checkDisableShadows')?.checked;
                if (initialState) {
                    environment.traverse((child) => {
                        if (child.isMesh && child.userData.isPhysical) {
                            child.castShadow = false;
                            child.receiveShadow = false;
                        }
                    });
                }

                window.addEventListener('toggleTrackShadows', (e) => {
                    const disableShadows = e.detail;
                    environment.traverse((child) => {
                        if (child.isMesh && child.userData.isPhysical) {
                            child.castShadow = !disableShadows;
                            
                            if (child.receiveShadow !== !disableShadows) {
                                child.receiveShadow = !disableShadows;
                                
                                if (child.material) {
                                    if (Array.isArray(child.material)) {
                                        child.material.forEach(mat => mat.needsUpdate = true);
                                    } else {
                                        child.material.needsUpdate = true;
                                    }
                                }
                            }
                        }
                    });
                });
                resolve(environment);
            },
            (_xhr) => { },
            (error) => {
                reject(error);
            }
        );
    });
}
