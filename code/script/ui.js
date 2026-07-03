import { getMaterialProperty, setMaterialColor, setMaterialProperty } from './color.js';
import { goToCameraView, toggleCameraMode } from './camera.js';
import { toggleCarLight, startBlink, stopBlink } from './lights.js';
import { toggleAnimationCallback, animatePartToState } from './animations.js';

const materialBindings = [
    { prefix: 'body', materialName: 'body_paint' },
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

export function setupButtonsCallback(model) {
    Object.entries(model.animations).forEach(([name, animation]) => {
        if (animation.uiId) {
            toggleAnimationCallback(model, animation.uiId, name);
        }
    })
}

export function setupLightCallbacks(model) {
    const lowBeamsSwitch = document.getElementById('checkLowBeams');
    const highBeamsSwitch = document.getElementById('checkHighBeams');
    const ambientLightSwitch = document.getElementById('checkAmbientLight');

    const applyLowBeamsState = (isRequestedOn) => {
        model.state.lowBeams = isRequestedOn;

        if (isRequestedOn) {
            if (model.animations["Lights_Switch"]) {
                animatePartToState(model, "Lights_Switch", true);
            }
            if (!model.state.highBeams) {
                toggleCarLight(model.lowBeams, true);
            }
        } else {
            toggleCarLight(model.lowBeams, false);
            if (model.state.highBeams) {
                model.state.highBeams = false;
                toggleCarLight(model.highBeams, false);
                if (highBeamsSwitch) highBeamsSwitch.checked = false;
            }
            if (model.animations["Lights_Switch"]) {
                animatePartToState(model, "Lights_Switch", false);
            }
        }
    };

    const applyHighBeamsState = (isRequestedOn) => {
        if (isRequestedOn) {
            if (!model.state.lowBeams) {
                if (highBeamsSwitch) highBeamsSwitch.checked = false;
                return;
            }
            model.state.highBeams = true;
            toggleCarLight(model.highBeams, true);
            toggleCarLight(model.lowBeams, false);
        } else {
            model.state.highBeams = false;
            toggleCarLight(model.highBeams, false);
            if (model.state.lowBeams) {
                toggleCarLight(model.lowBeams, true);
            }
        }
    };

    const applyAmbientLightState = (isVisible) => {
        toggleCarLight(model.ambientLights, isVisible);
        model.state.ambientLight = isVisible;
    }

    lowBeamsSwitch.checked = model.state.lowBeams;
    applyLowBeamsState(model.state.lowBeams);
    lowBeamsSwitch.addEventListener('change', (event) => {
        applyLowBeamsState(event.target.checked);
    });

    highBeamsSwitch.checked = model.state.highBeams;
    applyHighBeamsState(model.state.highBeams);
    highBeamsSwitch.addEventListener('change', (event) => {
        applyHighBeamsState(event.target.checked);
    });

    ambientLightSwitch.checked = model.state.ambientLight;
    applyAmbientLightState(model.state.ambientLight);
    ambientLightSwitch.addEventListener('change', (event) => {
        applyAmbientLightState(event.target.checked);
    });
}

export function setupTurnSignalCallbacks(model) {
    const rightSwitch = document.getElementById('checkRightIndicator');
    const leftSwitch  = document.getElementById('checkLeftIndicator');
    const hazardSwitch = document.getElementById('checkHazard');

    const allSignals = [...model.turnSignals.left, ...model.turnSignals.right];

    rightSwitch.addEventListener('change', (event) => {
        if (event.target.checked) {
            leftSwitch.checked = false;
            if (hazardSwitch) hazardSwitch.checked = false;
            
            stopBlink(model.turnSignals.left, 'left');
            stopBlink(allSignals, 'hazard');

            startBlink(model.turnSignals.right, 'right');
        } else {
            stopBlink(model.turnSignals.right, 'right');
        }
    });

    leftSwitch.addEventListener('change', (event) => {
        if (event.target.checked) {
            rightSwitch.checked = false;
            if (hazardSwitch) hazardSwitch.checked = false;
            stopBlink(model.turnSignals.right, 'right');
            stopBlink(allSignals, 'hazard');

            startBlink(model.turnSignals.left, 'left');
        } else {
            stopBlink(model.turnSignals.left, 'left');
        }
    });

    if (hazardSwitch) {
        hazardSwitch.addEventListener('change', (event) => {
            if (event.target.checked) {
                leftSwitch.checked = false;
                rightSwitch.checked = false;
                stopBlink(model.turnSignals.left, 'left');
                stopBlink(model.turnSignals.right, 'right');
                startBlink(allSignals, 'hazard');
            } else {
                stopBlink(allSignals, 'hazard');
            }
        });
    }
}

export function setupDoorLightCallbacks(model) {
    const leftDoorSwitch = document.getElementById('checkLeftDoor');
    const rightDoorSwitch = document.getElementById('checkRightDoor');
    const ambientSwitch = document.getElementById('checkAmbientLight'); 
    
    let lightTimer = null;

    const handleDoorChange = () => {
        const isAnyDoorOpen = leftDoorSwitch.checked || rightDoorSwitch.checked;
        
        if (lightTimer) clearTimeout(lightTimer);
        
        lightTimer = setTimeout(() => {
            toggleCarLight(model.ambientLights, isAnyDoorOpen);
            
            model.state.ambientLight = isAnyDoorOpen; 

            if (ambientSwitch) {
                ambientSwitch.checked = isAnyDoorOpen; 
            }
        }, 200);
    };

    if (leftDoorSwitch) leftDoorSwitch.addEventListener('change', handleDoorChange);
    if (rightDoorSwitch) rightDoorSwitch.addEventListener('change', handleDoorChange);
}