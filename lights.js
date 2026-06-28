import * as THREE from 'three';

export function setupEnvironmentLights(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 3.5);
    frontLight.position.set(0, 6, 10);
    frontLight.castShadow = true;
    frontLight.shadow.mapSize.width = 2048;
    frontLight.shadow.mapSize.height = 2048;
    frontLight.shadow.camera.near = 0.5;
    frontLight.shadow.camera.far = 25;
    frontLight.shadow.camera.left = -10;
    frontLight.shadow.camera.right = 10;
    frontLight.shadow.camera.top = 10;
    frontLight.shadow.camera.bottom = -10;
    frontLight.shadow.bias = -0.001; 
    frontLight.shadow.normalBias = 0.05; 
    scene.add(frontLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 3.5);
    backLight.position.set(0, 6, -10);
    backLight.castShadow = true;
    backLight.shadow.mapSize.width = 2048;
    backLight.shadow.mapSize.height = 2048;
    backLight.shadow.camera.near = 0.5;
    backLight.shadow.camera.far = 25;
    backLight.shadow.camera.left = -10;
    backLight.shadow.camera.right = 10;
    backLight.shadow.camera.top = 10;
    backLight.shadow.camera.bottom = -10;
    backLight.shadow.bias = -0.001; 
    backLight.shadow.normalBias = 0.05;
    scene.add(backLight);

    const leftLight = new THREE.DirectionalLight(0xffffff, 2.5);
    leftLight.position.set(-10, 6, 0);
    leftLight.castShadow = true;
    leftLight.shadow.mapSize.width = 2048;
    leftLight.shadow.mapSize.height = 2048;
    leftLight.shadow.camera.near = 0.5;
    leftLight.shadow.camera.far = 25;
    leftLight.shadow.camera.left = -10;
    leftLight.shadow.camera.right = 10;
    leftLight.shadow.camera.top = 10;
    leftLight.shadow.camera.bottom = -10;
    leftLight.shadow.bias = -0.001;
    leftLight.shadow.normalBias = 0.05;
    scene.add(leftLight);

    const rightLight = new THREE.DirectionalLight(0xffffff, 2.5);
    rightLight.position.set(10, 6, 0);
    rightLight.castShadow = true;
    rightLight.shadow.mapSize.width = 2048;
    rightLight.shadow.mapSize.height = 2048;
    rightLight.shadow.camera.near = 0.5;
    rightLight.shadow.camera.far = 25;
    rightLight.shadow.camera.left = -10;
    rightLight.shadow.camera.right = 10;
    rightLight.shadow.camera.top = 10;
    rightLight.shadow.camera.bottom = -10;
    rightLight.shadow.bias = -0.001;
    rightLight.shadow.normalBias = 0.05;
    scene.add(rightLight);
}

export function toggleCarLight(lightObject, isVisible) {
    if (lightObject) {
        lightObject.visible = isVisible;
    }
}