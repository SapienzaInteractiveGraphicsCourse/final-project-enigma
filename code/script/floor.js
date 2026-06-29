import * as THREE from 'three';

export function createFloor() {
    const textureLoader = new THREE.TextureLoader();

    const colorMap = textureLoader.load('../../src/textures/hangar_concrete_floor_diff_4k.jpg');
    const normalMap = textureLoader.load('../../src/textures/hangar_concrete_floor_nor_gl_4k.jpg');
    const roughnessMap = textureLoader.load('../../src/textures/hangar_concrete_floor_rough_4k.jpg');

    colorMap.wrapS = THREE.RepeatWrapping;
    colorMap.wrapT = THREE.RepeatWrapping;
    colorMap.repeat.set(20, 20);

    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(20, 20);

    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(20, 20);

    const floorGeometry = new THREE.PlaneGeometry(200, 200);
    
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: colorMap,
        normalMap: normalMap,
        roughnessMap: roughnessMap,
        color: 0x5a5a5a,
        metalness: 0.0,
        roughness: 1.0
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;

    return floor;
}