import * as THREE from 'three';

let MaterialSet = {};

export function setupMaterials(auto) {
    auto.traverse((child) => {
        if (child.isMesh && child.material) {

            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material) => {
                const materialName = material.name;

                if (materialName && !MaterialSet[materialName]) {
                    MaterialSet[materialName] = material;
                }
            });
        }
    });

    console.log("Materials ready.");
    console.log("MaterialSet:", MaterialSet);
}

export function setMaterialColor(materialName, coloreHex) {
    if (MaterialSet[materialName]) {
        MaterialSet[materialName].color.set(coloreHex);
    }
    else {
        console.warn(`Material ${materialName} not found.`);
    }
}