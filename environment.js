import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export function loadEnvironment(scene) {

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    loader.setDRACOLoader(dracoLoader);
    
    loader.load(
        'src/models/garage_1/garage.glb', // Inserisci qui il percorso del tuo file
        (gltf) => {
            const environment = gltf.scene;

            // Opzionale: posiziona il garage correttamente
            environment.position.set(0, 0, 0); 
            environment.scale.set(1, 1, 1);

            // Ottimizzazione: assicura che il garage non blocchi il raycasting
            environment.traverse((child) => {
                if (child.isMesh) {
                    child.receiveShadow = true;
                    // Se il garage ha luci interne "fake" nel modello, 
                    // qui puoi decidere se tenerle o rimuoverle
                }
            });

            scene.add(environment);
            console.log("Garage caricato con successo!");
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% caricato');
        },
        (error) => {
            console.error('Errore durante il caricamento del garage:', error);
        }
    );
}