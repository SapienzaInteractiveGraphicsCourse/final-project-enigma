import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function setupCamera(camera, renderer) {
    const cameraControls = new OrbitControls(camera, renderer.domElement);

    cameraControls.enableDamping = true; 
    cameraControls.dampingFactor = 0.05;

    cameraControls.maxPolarAngle = Math.PI / 2 - 0.05;
    cameraControls.minPolarAngle = 0.1;

    cameraControls.minDistance = 3;
    cameraControls.maxDistance = 12;

    cameraControls.enablePan = false; 

    return cameraControls;
}