import * as THREE from 'three';

let bodyMaterial = null;

export function setupMaterials(auto) {
    auto.traverse((child) => {
        if (child.isMesh) {

            if (child.name === 'Body_Paint_Jet_Black1_waike_t_0') {
                if (!bodyMaterial) {
                    bodyMaterial = child.material;
                }
            }
        }
    });

    console.log("Materiali inizializzati e pronti!");
}

export function setBodyColor(coloreHex) {
    if (bodyMaterial) {
        bodyMaterial.color.set(coloreHex);
    }
}