import { setBodyColor } from './color.js';

const BodyColorPicker = document.getElementById('colorPicker');

if(BodyColorPicker) {
    BodyColorPicker.addEventListener('input', (evento) => {
        const newColor = evento.target.value;
        console.log("new color:", newColor);
        setBodyColor(newColor);
    });
}