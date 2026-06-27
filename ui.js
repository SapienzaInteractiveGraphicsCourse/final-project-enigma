import { setMaterialColor } from './color.js';

const BodyColorPicker = document.getElementById('bodyColorPicker');
const CaliperColorPicker = document.getElementById('caliperColorPicker');

if(BodyColorPicker) {
    BodyColorPicker.addEventListener('input', (evento) => {
        const newColor = evento.target.value;
        console.log("new color:", newColor);
        setMaterialColor('body_paint', newColor);
    });
}

if(CaliperColorPicker) {
    CaliperColorPicker.addEventListener('input', (evento) => {
        const newColor = evento.target.value;
        console.log("new color:", newColor);
        setMaterialColor('caliper', newColor);
    });
}