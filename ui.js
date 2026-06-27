import { setMaterialColor } from './color.js';

const BodyColorPicker = document.getElementById('bodyColorPicker');
const CaliperColorPicker = document.getElementById('caliperColorPicker');
const RimColorPicker = document.getElementById('rimColorPicker');
const SeatColorPicker = document.getElementById('seatColorPicker');

if(BodyColorPicker) {
    BodyColorPicker.addEventListener('input', (evento) => {
        const newColor = evento.target.value;
        setMaterialColor('body_paint', newColor);
    });
}

if(CaliperColorPicker) {
    CaliperColorPicker.addEventListener('input', (evento) => {
        const newColor = evento.target.value;
        setMaterialColor('caliper', newColor);
    });
}

if(RimColorPicker) {
    RimColorPicker.addEventListener('input', (evento) => {
        const newColor = evento.target.value;
        setMaterialColor('rim', newColor);
    });
}

if(SeatColorPicker) {
    SeatColorPicker.addEventListener('input', (evento) => {
        const newColor = evento.target.value;
        setMaterialColor('fabric', newColor);
    });
}