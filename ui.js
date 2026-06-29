import { getMaterialProperty, setMaterialColor, setMaterialProperty } from './color.js';
import { goToCameraView, toggleCameraMode } from './camera.js';

const materialBindings = [
    { prefix: 'body', materialName: 'body_paint.001' },
    { prefix: 'caliper', materialName: 'caliper' },
    { prefix: 'rim', materialName: 'rim' },
    { prefix: 'seat', materialName: 'fabric' },
    { prefix: 'steeringWheel', materialName: 'steer' }
];

materialBindings.forEach(({ prefix, materialName }) => {
    const colorPicker = document.getElementById(`${prefix}ColorPicker`);

    if (colorPicker) {
        colorPicker.addEventListener('input', (evento) => {
            const newColor = evento.target.value;
            setMaterialColor(materialName, newColor);
        });
    }

    const metallicSlider = document.getElementById(`${prefix}Metallic`);
    if (metallicSlider) {
        metallicSlider.addEventListener('input', (evento) => {
            setMaterialProperty(materialName, 'metalness', Number.parseFloat(evento.target.value));
        });
    }

    const roughnessSlider = document.getElementById(`${prefix}Roughness`);
    if (roughnessSlider) {
        roughnessSlider.addEventListener('input', (evento) => {
            setMaterialProperty(materialName, 'roughness', Number.parseFloat(evento.target.value));
        });
    }
});

export function initCameraUI(camera) {
    document.getElementById('btnViewFront')?.addEventListener('click', () => goToCameraView(camera, 'Front'));
    document.getElementById('btnViewBack')?.addEventListener('click', () => goToCameraView(camera, 'Back'));
    document.getElementById('btnViewLeft')?.addEventListener('click', () => goToCameraView(camera, 'Left'));
    document.getElementById('btnViewRight')?.addEventListener('click', () => goToCameraView(camera, 'Right'));
    document.getElementById('btnViewTop')?.addEventListener('click', () => goToCameraView(camera, 'Top'));

    document.getElementById('btnCompassModeToggle')?.addEventListener('click', (e) => {
        const newMode = toggleCameraMode();
        e.target.textContent = newMode === 'orbit' ? 'Orbit Camera' : 'Free Camera';
    });
}

export function syncMaterialControls() {
    materialBindings.forEach(({ prefix, materialName }) => {
        
        // ← aggiungi questo blocco per il colore
        const colorPicker = document.getElementById(`${prefix}ColorPicker`);
        if (colorPicker) {
            const color = getMaterialProperty(materialName, 'color');
            if (color) {
                // converte il colore THREE.js in hex per il color picker
                colorPicker.value = '#' + color.getHexString();
            }
        }

        const metallicSlider = document.getElementById(`${prefix}Metallic`);
        if (metallicSlider) {
            const metallicValue = getMaterialProperty(materialName, 'metalness');
            if (metallicValue !== null) {
                metallicSlider.value = metallicValue;
            }
        }

        const roughnessSlider = document.getElementById(`${prefix}Roughness`);
        if (roughnessSlider) {
            const roughnessValue = getMaterialProperty(materialName, 'roughness');
            if (roughnessValue !== null) {
                roughnessSlider.value = roughnessValue;
            }
        }
    });
    }

        