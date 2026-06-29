import * as THREE from 'three';
import { createFloor } from './floor.js'
import { setupCamera } from './camera.js'
import { setupEnvironmentLights } from './lights.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

export function createScene() {
    RectAreaLightUniformsLib.init();
    
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

    const renderScene = new RenderPass(scene, camera);

    const pixelRatio = window.devicePixelRatio || 1;

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth * pixelRatio, container.clientHeight * pixelRatio),
        0.4,  // Forza
        0.8,  // Raggio
        1.0   // Soglia
    );

    const renderTarget = new THREE.WebGLRenderTarget(
        container.clientWidth * pixelRatio,
        container.clientHeight * pixelRatio,
        {
            type: THREE.HalfFloatType,
            samples: 8
        }
    );
    
    const composer = new EffectComposer(renderer, renderTarget);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    new RGBELoader()
        .setPath('src/textures/')
        .load('sunset_forest_2k.hdr', function (texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.background = texture;  
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
        composer.setSize(width, height);
    });

    return { scene, camera, renderer, composer };
}

