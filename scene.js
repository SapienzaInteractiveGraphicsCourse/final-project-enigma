import * as THREE from 'three';
import { createFloor } from './floor.js'
import { setupCamera } from './camera.js'
import { setupEnvironmentLights } from './lights.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export function createScene() {
    const container = document.getElementById('canvas-container');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    const camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 1, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    new RGBELoader()
        .setPath('src/textures/') // Assicurati che il percorso sia corretto
        .load('sunset_forest_2k.hdr', function (texture) {
            // FONDAMENTALE: Diciamo a Three.js di mappare l'immagine a 360° per i riflessi
            texture.mapping = THREE.EquirectangularReflectionMapping;
            
            // Imposta lo sfondo visibile
            scene.background = texture;  
            
            // Imposta la fonte di luce e di riflesso per la macchina
            scene.environment = texture; 
        });

    scene.fog = new THREE.FogExp2(0x8eb3d9, 0.015);

    setupEnvironmentLights(scene);

    setupCamera(camera, renderer);

    const floor = createFloor();
    scene.add(floor);

    window.addEventListener('resize', () => {
        const width = container.clientWidth;
        const height = container.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });

    return { scene, camera, renderer };
}

