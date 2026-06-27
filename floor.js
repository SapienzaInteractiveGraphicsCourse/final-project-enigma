import * as THREE from 'three';

export function createFloor() {
    const textureLoader = new THREE.TextureLoader();

    const colorMap = textureLoader.load('src/textures/asphalt_color.jpg');
    const normalMap = textureLoader.load('src/textures/asphalt_normal.jpg');
    const roughnessMap = textureLoader.load('src/textures/asphalt_roughness.jpg');

    colorMap.wrapS = THREE.RepeatWrapping;
    colorMap.wrapT = THREE.RepeatWrapping;
    colorMap.repeat.set(2, 2);

    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(2, 2);

    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(2, 2);

    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: colorMap,
        normalMap: normalMap,
        roughnessMap: roughnessMap
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;

    return floor;
}