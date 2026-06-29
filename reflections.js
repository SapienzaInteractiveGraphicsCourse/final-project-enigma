import * as THREE from 'three';

export function impostaRiflessiLocali(car, scene, renderer) {
    // 1. STAMPA DI DIAGNOSTICA
    console.log("Dati ricevuti da impostaRiflessiLocali:", car);

    let carRoot = null;

    // Se l'oggetto esiste, proviamo a estrarre la scena
    if (car) {
        carRoot = car.scene ? car.scene : car;
    }

    // 2. AUTO-RECUPERO: Se carRoot è indefinito o non ha una posizione, lo cerchiamo nella scena
    if (!carRoot || !carRoot.position) {
        console.warn("La variabile car_model è indefinita o non valida. Tento il recupero direttamente dalla scena...");
        
        // Cerchiamo tra i figli diretti della scena un gruppo che non sia il garage/ambiente
        scene.children.forEach((child) => {
            if (child.isGroup && !child.name.toLowerCase().includes('env') && !child.name.toLowerCase().includes('garage')) {
                carRoot = child; // Abbiamo trovato un gruppo principale che verosimilmente è l'auto
            }
        });
    }

    // 3. BLOCCO DI SICUREZZA FINALE
    if (!carRoot || !carRoot.position) {
        console.error("ERRORE: Impossibile trovare l'auto nella scena. Controlla che la funzione loadModel() effettui correttamente il 'return' del modello caricato.");
        return;
    }

    console.log("Auto identificata per i riflessi:", carRoot.name || "Modello Auto", carRoot);

    // 4. CREAZIONE CUBECAMERA E SCATTO
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, { 
        format: THREE.RGBAFormat, 
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter 
    });
    
    const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
    
    cubeCamera.position.copy(carRoot.position);
    cubeCamera.position.y += 0.8;
    scene.add(cubeCamera);

    scene.updateMatrixWorld(true);

    requestAnimationFrame(() => {
        carRoot.visible = false;
        cubeCamera.update(renderer, scene);
        carRoot.visible = true;

        carRoot.traverse((child) => {
            if (child.isMesh && child.material) {
                if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
                    child.material.envMap = cubeRenderTarget.texture;
                    child.material.envMapIntensity = 2.0; 
                    child.material.needsUpdate = true;
                }
            }
        });
        
        console.log("Riflessi locali applicati con successo!");
    });
}