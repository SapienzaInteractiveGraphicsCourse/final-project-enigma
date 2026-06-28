import { setMaterialColor } from './color.js';
import { goToCameraView, toggleCameraMode } from './camera.js';

const colorPickerBindings = [
    { elementId: 'bodyColorPicker', materialName: 'body_paint' },
    { elementId: 'caliperColorPicker', materialName: 'caliper' },
    { elementId: 'rimColorPicker', materialName: 'rim' },
    { elementId: 'seatColorPicker', materialName: 'fabric' },
    { elementId: 'steeringWheelColorPicker', materialName: 'steer' }
];

colorPickerBindings.forEach(({ elementId, materialName }) => {
    const picker = document.getElementById(elementId);

    if (!picker) return;

    picker.addEventListener('input', (evento) => {
        const newColor = evento.target.value;
        setMaterialColor(materialName, newColor);
    });
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