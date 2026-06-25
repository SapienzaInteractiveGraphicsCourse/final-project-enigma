import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { setupCamera } from './camera.js';

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

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

const controls = setupCamera(camera, renderer);

// Istanziamo il caricatore
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

        console.log("Auto caricata con successo! Ecco la struttura:", auto);

        const portieraSinistra = auto.getObjectByName('Portiera_Sinistra');
        if(portieraSinistra) {
            console.log("Portiera trovata e pronta per l'animazione!");
        }
    },
    (xhr) => {
        console.log( Math.round(xhr.loaded / xhr.total * 100) + '% caricato' );
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

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();