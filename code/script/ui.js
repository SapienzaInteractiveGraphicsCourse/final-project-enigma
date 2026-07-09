import { getMaterialProperty, setMaterialColor, setMaterialProperty } from './color.js';
import { toggleCarLight, startBlink, stopBlink } from './lights.js';
import { toggleAnimationCallback, toggleAnimation, animatePartToState, setSwitchAngle } from './animations.js';
import { playSfx, stopStartupSound } from './audio.js';
import { goToCameraView, toggleCameraMode, setDriverView, setTopDownView } from './camera.js';
import { updateTimeOfDay } from './lights.js';

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

export function initCameraUI(camera, carModel, scene, onTimeChange) {
    document.getElementById('btnViewFront')?.addEventListener('click', () => goToCameraView(camera, 'Front'));
    document.getElementById('btnViewBack')?.addEventListener('click', () => goToCameraView(camera, 'Back'));
    document.getElementById('btnViewLeft')?.addEventListener('click', () => goToCameraView(camera, 'Left'));
    document.getElementById('btnViewRight')?.addEventListener('click', () => goToCameraView(camera, 'Right'));
    document.getElementById('btnViewTop')?.addEventListener('click', () => goToCameraView(camera, 'Top'));

    document.getElementById('btnCompassModeToggle')?.addEventListener('click', (e) => {
        const newMode = toggleCameraMode();
        e.target.textContent = newMode === 'orbit' ? 'Orbit Camera' : 'Free Camera';
    });

    const btnViewDriver = document.getElementById('btnViewDriver');
    if (btnViewDriver) {
        btnViewDriver.addEventListener('click', () => {
            setDriverView(camera, carModel, 'onboard_camera'); 
        });
    }
    const btnViewTopDown = document.getElementById('btnViewTopDown');
    if (btnViewTopDown) {
        btnViewTopDown.addEventListener('click', () => {
            setTopDownView(camera); 
        });
    }

    const timeSlider = document.getElementById('timeSlider');
    const timeDisplay = document.getElementById('timeDisplay');

    if (timeSlider && timeDisplay) {
        timeSlider.addEventListener('input', (e) => {
            const timeValue = Number.parseFloat(e.target.value);
            
            const hours = Math.floor(timeValue);
            const minutes = Math.floor((timeValue - hours) * 60);
            timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
            updateTimeOfDay(timeValue, scene);
            
            const currentDayFactor = updateTimeOfDay(timeValue, scene);
            if (onTimeChange) onTimeChange(currentDayFactor);
        });
    }
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
    const runningLightsSwitch = document.getElementById('checkRunningLights');
    const lowBeamsSwitch = document.getElementById('checkLowBeams');
    const highBeamsSwitch = document.getElementById('checkHighBeams');
    const ambientLightSwitch = document.getElementById('checkAmbientLight');

    const syncLightSwitchKnob = () => {
        if (model.state.lowBeams || model.state.highBeams) {
            setSwitchAngle(model, "Lights_Switch", 112);
        } else if (model.state.runningLights) {
            setSwitchAngle(model, "Lights_Switch", 71);
        } else {
            setSwitchAngle(model, "Lights_Switch", 0);
        }
    };

    const applyRunningLightsState = (isRequestedOn) => {
        model.state.runningLights = isRequestedOn;

        if (isRequestedOn) {
            if (!model.state.lowBeams) {
                toggleCarLight(model.runningLights, true);
                toggleCarLight(model.tailLights, true);
            }
        } else {
            toggleCarLight(model.runningLights, false);
            toggleCarLight(model.tailLights, false);

            if (model.state.lowBeams) {
                model.state.lowBeams = false;
                toggleCarLight(model.lowBeams, false);
                if (lowBeamsSwitch) lowBeamsSwitch.checked = false;
            }

            if (model.state.highBeams) {
                model.state.highBeams = false;
                toggleCarLight(model.highBeams, false);
                if (highBeamsSwitch) highBeamsSwitch.checked = false;
            }
        }

        syncLightSwitchKnob();
    };

    const applyLowBeamsState = (isRequestedOn) => {
        model.state.lowBeams = isRequestedOn;

        if (isRequestedOn) {
            if (!model.state.runningLights) {
                model.state.runningLights = true;
                if (runningLightsSwitch) runningLightsSwitch.checked = true;
            } else {
                toggleCarLight(model.runningLights, false);
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

            if (runningLightsSwitch && runningLightsSwitch.checked) {
                model.state.runningLights = true;
                toggleCarLight(model.runningLights, true);
            }
        }

        syncLightSwitchKnob();
    };

    const applyHighBeamsState = (isRequestedOn) => {
        if (isRequestedOn) {
            if (!model.state.lowBeams) {
                if (lowBeamsSwitch) {
                    lowBeamsSwitch.checked = true;
                    applyLowBeamsState(true);
                }
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

        syncLightSwitchKnob();
    };

    const applyAmbientLightState = (isVisible) => {
        toggleCarLight(model.ambientLights, isVisible);
        model.state.ambientLight = isVisible;
    };

    if (runningLightsSwitch) {
        runningLightsSwitch.checked = model.state.runningLights || false;
        applyRunningLightsState(runningLightsSwitch.checked);
        runningLightsSwitch.addEventListener('change', (event) => {
            applyRunningLightsState(event.target.checked);
        });
    }

    if (lowBeamsSwitch) {
        lowBeamsSwitch.checked = model.state.lowBeams || false;
        applyLowBeamsState(lowBeamsSwitch.checked);
        lowBeamsSwitch.addEventListener('change', (event) => {
            applyLowBeamsState(event.target.checked);
        });
    }

    if (highBeamsSwitch) {
        highBeamsSwitch.checked = model.state.highBeams || false;
        applyHighBeamsState(highBeamsSwitch.checked);
        highBeamsSwitch.addEventListener('change', (event) => {
            applyHighBeamsState(event.target.checked);
        });
    }

    if (ambientLightSwitch) {
        ambientLightSwitch.checked = model.state.ambientLight || false;
        applyAmbientLightState(ambientLightSwitch.checked);
        ambientLightSwitch.addEventListener('change', (event) => {
            applyAmbientLightState(event.target.checked);
        });
    }
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
        const isAnyDoorOpen = (leftDoorSwitch && leftDoorSwitch.checked) || 
                              (rightDoorSwitch && rightDoorSwitch.checked);
        
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

export function setupEngineCallback(model) {
    const engineBtn = document.getElementById('btnEnginePower');
    const statusText = document.getElementById('engineStatusText');
    const runningLightsSwitch = document.getElementById('checkRunningLights');

    const applyEngineLogic = (isRunning) => {
        if (isRunning) {
            playSfx('startup');
            if (engineBtn) engineBtn.classList.add('engine-on');
            if (statusText) statusText.textContent = 'STOP';
        } else {
            stopStartupSound();
            if (engineBtn) engineBtn.classList.remove('engine-on');
            if (statusText) statusText.textContent = 'START';
            
            if (model.runningLights) {
                model.state.runningLights = false;
                toggleCarLight(model.runningLights, false);
                if (runningLightsSwitch) runningLightsSwitch.checked = false;
            }
        }
    };

    applyEngineLogic(model.state.ignitionOn || false);

    if (engineBtn) {

        engineBtn.addEventListener('change', () => {
            applyEngineLogic(model.state.ignitionOn || false);
        });

        engineBtn.addEventListener('click', () => {
            if (typeof toggleAnimation === 'function') {
                toggleAnimation(model, 'Key');
            }
        });
    }
}