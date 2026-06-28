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
}

export function toggleCarLight(lightObject, isVisible) {
    if (lightObject) {
        lightObject.visible = isVisible;
    }
}