import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { setupMaterials } from './color.js';
import { setupCamera, updateCameraMovement, toggleCameraMode } from './camera.js';
import { createFloor } from './floor.js';
import './ui.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
dracoLoader.setDecoderConfig({ type: 'js' });

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
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 5.5);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

setupCamera(camera, renderer);

const floor = createFloor();
scene.add(floor);

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

loader.load(
    'car_1/car.glb', 
    (gltf) => {
        const auto = gltf.scene;

        auto.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        auto.scale.set(1, 1, 1); 
        auto.position.set(0, 0, 0);

        scene.add(auto);
        setupMaterials(auto);
        
        const left_door = auto.getObjectByName('Left_door');
        if(left_door) {
            console.log("Portiera trovata e pronta per l'animazione!");
        }
    },
    (xhr) => {
    },
    (error) => {
        console.error("Errore durante il caricamento del file GLB:", error);
    }
);

window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

document.getElementById('btnCameraMode').addEventListener('click', (e) => {
    const newMode = toggleCameraMode();
    e.target.textContent = newMode === 'orbit' ? 'Switch to First Person' : 'Switch to Orbit';
});

function animate() {
    requestAnimationFrame(animate);
    updateCameraMovement(camera);
    renderer.render(scene, camera);
}

animate();