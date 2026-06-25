// Nel tuo main.js
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// 1. Riferimento al contenitore HTML creato nel passo precedente
const container = document.getElementById('canvas-container');

// 2. Creazione della Scena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a); // Sfondo grigio scuro per lo showroom

// 3. Configurazione della Telecamera (Prospettica)
// Parametri: Campo visivo (FOV), Aspect Ratio, Distanza Minima (Near), Distanza Massima (Far)
const camera = new THREE.PerspectiveCamera(
    45, 
    container.clientWidth / container.clientHeight, 
    0.1, 
    1000
);
camera.position.set(0, 2, 6); // Posizionata in alto (Y=2) e arretrata (Z=6)

// 4. Creazione del Renderizzatore WebGL
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
// Impostiamo la gestione dei colori lineare per una resa più realistica (fondamentale per PBR)
renderer.outputColorSpace = THREE.SRGBColorSpace; 
container.appendChild(renderer.domElement);

// 5. Configurazione delle Luci (Essenziali per vedere il modello)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Luce diffusa per evitare ombre piatte e nere
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Luce diretta (simula un faro dello showroom)
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// 6. Caricamento del file .obj
const loader = new OBJLoader();
loader.load(
    // Inserisci qui il percorso del tuo file .obj (es. 'models/car.obj')
    'supra.obj', 
    (object) => {
        // Questa funzione viene eseguita quando il modello è caricato correttamente
        object.position.set(0, 0, 0); // Centra l'oggetto nell'origine
        
        /* NOTA DI OTTIMIZZAZIONE: 
           Se il modello è gigantesco o microscopico, puoi ridimensionarlo qui:
           object.scale.set(0.1, 0.1, 0.1);
        */
        
        scene.add(object);
        console.log("Modello caricato con successo nella scena!");
    },
    (error) => {
        // Callback in caso di errori di percorso o di parsing del file
        console.error("Errore durante il caricamento del modello:", error);
    }
);

// 7. Gestione del Ridimensionamento della Finestra (Responsiveness)
window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix(); // Notifica a Three.js il cambio di proporzioni
    renderer.setSize(width, height);
});

// 8. Loop di Rendering Continuo
function animate() {
    requestAnimationFrame(animate);
    
    // [Spazio per le future animazioni JavaScript richieste dal progetto]
    // Esempio: se volessi far ruotare l'intera scena lentamente:
    // scene.rotation.y += 0.005;

    renderer.render(scene, camera);
}

// Avvia il ciclo
animate();