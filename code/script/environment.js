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

                const instanceGroups = {};
                const objectsToRemove = [];

                environment.traverse((child) => {
                    if (child.isMesh) {
                        child.layers.enable(1);
                        const nameLower = child.name.toLowerCase();

                        const isTree = /\b(tree|albero)\b/.test(nameLower);
                        const isLamp = nameLower.includes("lamppost7_sub0");

                        if (isTree || isLamp) {

                            const baseName = child.name.split('.')[0];

                            if (!instanceGroups[baseName]) {
                                instanceGroups[baseName] = {
                                    geometry: child.geometry,
                                    material: child.material,
                                    transforms: [],
                                    isLamp: isLamp
                                };
                            }

                            child.updateMatrixWorld(true);
                            instanceGroups[baseName].transforms.push(child.matrixWorld.clone());
                            objectsToRemove.push(child);

                        } else {
                            child.updateMatrixWorld(true);
                            child.matrixAutoUpdate = false;
                            child.updateMatrix();
                            child.receiveShadow = true;
                            child.castShadow = true;
                            const isRoad = /\b(1grass|1road|1kerb|1pits-zone_sub)\b/.test(nameLower);
    
                            if (isRoad) {
                                child.userData.isPhysical = true;
                            } else {
                                child.userData.isPhysical = false;
                            }
                        }
                    }
                });

                scene.trackLights = setupTrackLights(environment, scene);

                objectsToRemove.forEach(obj => {
                    if (obj.parent) obj.parent.remove(obj);
                });

                Object.keys(instanceGroups).forEach(key => {
                    const group = instanceGroups[key];
                    const totalInstances = group.transforms.length;

                    const instancedMesh = new THREE.InstancedMesh(group.geometry, group.material, totalInstances);
                    instancedMesh.castShadow = false;
                    instancedMesh.receiveShadow = false;

                    const position = new THREE.Vector3();
                    const quaternion = new THREE.Quaternion();
                    const scale = new THREE.Vector3();

                    group.transforms.forEach((matrix, index) => {
                        if (group.isLamp) {
                            instancedMesh.setMatrixAt(index, matrix);
                        } else {
                            matrix.decompose(position, quaternion, scale);

                            const randomY = Math.random() * Math.PI * 2;
                            const randomRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), randomY);
                            quaternion.multiply(randomRotation);

                            const randomScale = 0.8 + (Math.random() * 0.4);
                            scale.multiplyScalar(randomScale);

                            const newMatrix = new THREE.Matrix4();
                            newMatrix.compose(position, quaternion, scale);

                            instancedMesh.setMatrixAt(index, newMatrix);
                        }
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