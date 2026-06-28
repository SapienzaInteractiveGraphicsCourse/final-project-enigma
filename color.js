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
}

export function setMaterialColor(materialName, coloreHex) {
    if (MaterialSet[materialName]) {
        MaterialSet[materialName].color.set(coloreHex);
    }
    else {
        console.warn(`Material ${materialName} not found.`);
    }
}

export function setMaterialProperty(materialName, propertyName, value) {
    if (MaterialSet[materialName] && propertyName in MaterialSet[materialName]) {
        MaterialSet[materialName][propertyName] = value;
        MaterialSet[materialName].needsUpdate = true;
    }
    else {
        console.warn(`Material ${materialName} or property ${propertyName} not found.`);
    }
}

export function getMaterialProperty(materialName, propertyName) {
    if (MaterialSet[materialName] && propertyName in MaterialSet[materialName]) {
        return MaterialSet[materialName][propertyName];
    }

    return null;
}