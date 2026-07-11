import { getMaterialProperty, setMaterialColor, setMaterialProperty } from './color.js';
import { toggleCarLight, startBlink, stopBlink } from './lights.js';
import { toggleAnimationCallback, toggleAnimation, animatePartToState, setSwitchAngle } from './animations.js';
import { playSfx, stopStartupSound } from './audio.js';
import { goToCameraView, toggleCameraMode, setDriverView, setTopDownView } from './camera.js';
import { updateTimeOfDay } from './lights.js';
import * as TWEEN from '@tweenjs/tween.js';
import { updateSkyTexture } from './environment.js';

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
    document.getElementById('btnViewFront')?.addEventListener('click', () => goToCameraView(camera, carModel, 'Front'));
    document.getElementById('btnViewBack')?.addEventListener('click', () => goToCameraView(camera, carModel, 'Back'));
    document.getElementById('btnViewLeft')?.addEventListener('click', () => goToCameraView(camera, carModel, 'Left'));
    document.getElementById('btnViewRight')?.addEventListener('click', () => goToCameraView(camera, carModel, 'Right'));
    document.getElementById('btnViewTop')?.addEventListener('click', () => goToCameraView(camera, carModel, 'Top'));

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

    const checkNightMode = document.getElementById('checkNightMode');
    let timeTween = null;
    let currentTime = { val: 12 };
    let isNightTextureSet = false;

    if (checkNightMode) {
        checkNightMode.addEventListener('change', (e) => {
            const isNight = e.target.checked;
            const targetTime = isNight ? 0 : 12;

            if (timeTween) timeTween.stop();

            timeTween = new TWEEN.Tween(currentTime)
                .to({ val: targetTime }, 2000)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => {
                    const isDarkEnoughToSwap = currentTime.val < 6;
                    
                    if (isDarkEnoughToSwap !== isNightTextureSet) {
                        updateSkyTexture(scene, isDarkEnoughToSwap);
                        isNightTextureSet = isDarkEnoughToSwap;
                    }

                    const currentDayFactor = updateTimeOfDay(currentTime.val, scene);
                    if (onTimeChange) onTimeChange(currentDayFactor);
                })
                .start();
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

export function setupEngineCallback(model, physicsController = null) {
    const engineBtn = document.getElementById('btnEnginePower');
    const statusText = document.getElementById('engineStatusText');

    let isCranking = false;

    const applyEngineLogic = (isRunning) => {
        model.state.ignitionOn = isRunning;

        if (physicsController?.setEngineRunning) {
            physicsController.setEngineRunning(isRunning);
        }

        if (isRunning) {
            if (engineBtn) engineBtn.classList.add('engine-on');
            if (statusText) statusText.textContent = 'STOP';
        } else {
            stopStartupSound();
            if (engineBtn) engineBtn.classList.remove('engine-on');
            if (statusText) statusText.textContent = 'START';
        }
    };

    applyEngineLogic(model.state.ignitionOn || false);

    applyEngineLogic(false);

    if (engineBtn) {
        engineBtn.addEventListener('click', (e) => {
            e.stopImmediatePropagation();
            
            if (isCranking) {
                isCranking = false;
                stopStartupSound();
                applyEngineLogic(false);
                animatePartToState(model, 'key', false);
                return;
            }

            const isPhysicallyRunning = physicsController ? physicsController.engine.isRunning() : false;
            const next = !isPhysicallyRunning;

            if (next) {
                isCranking = true;
                if (statusText) statusText.textContent = 'CRANK';
                
                model.state.ignitionOn = true;
                animatePartToState(model, 'key', true);
                
                const source = playSfx('startup');
                
                if (source && source.buffer) {
                    const durationMs = source.buffer.duration * 1000;
                    let hasFired = false;
                    
                    const triggerEngineStart = () => {
                        if (hasFired) return;
                        hasFired = true;
                        
                        if (isCranking) { 
                            isCranking = false;
                            applyEngineLogic(true); 
                        }
                    };

                    source.onended = triggerEngineStart;
                    setTimeout(triggerEngineStart, durationMs + 50);
                    
                } else {
                    isCranking = false;
                    applyEngineLogic(true);
                }
            } 
            else {
                applyEngineLogic(false);
                animatePartToState(model, 'key', false);
            }
        });
    }
}

export function setupGearSelectorCallback(engine) {
    if (!engine) return;

    const buttons = { 
        N: document.getElementById('gearBtnN'), 
        D: document.getElementById('gearBtnD'), 
        R: document.getElementById('gearBtnR') 
    };

    const initialMode = engine.getMode();
    Object.entries(buttons).forEach(([mode, btn]) => {
        if (!btn) return;
        
        if (mode === initialMode) btn.classList.add('active');

        btn.addEventListener('click', () => {
            engine.setMode(mode);
            Object.values(buttons).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

export function updateTelemetryUI(engine, speedKmh = 0) {
    if (!engine) return;

    const hudGear = document.getElementById('hudGear');
    const hudRpm = document.getElementById('hudRpm');
    const revBarFill = document.getElementById('revBarFill');
    const hudSpeed = document.getElementById('hudSpeed');

    if (!hudGear || !hudRpm || !revBarFill) return;

    if (hudSpeed) {
        hudSpeed.textContent = Math.round(Math.abs(speedKmh));
    }

    if (!engine.isRunning()) {
        hudRpm.textContent = '0';
        hudGear.textContent = engine.getMode();
        revBarFill.style.width = '0%';
        return;
    }

    const currentRpm = engine.getRpm();
    const mode = engine.getMode();
    const currentGear = engine.getGear();
    const redline = engine.getRedline();

    hudRpm.textContent = currentRpm;

    if (mode === 'D') {
        hudGear.textContent = currentGear;
    } else {
        hudGear.textContent = mode;
    }

    let rpmPercent = (currentRpm / redline) * 100;
    rpmPercent = Math.max(0, Math.min(100, rpmPercent));
    
    revBarFill.style.width = `${rpmPercent}%`;

    if (rpmPercent > 95) {
        revBarFill.style.background = (Date.now() % 200 < 100) ? '#ff2a3b' : '#ffffff';
    } else {
        revBarFill.style.background = 'linear-gradient(90deg, #32d25a 0%, #e6821e 70%, #ff2a3b 100%)';
    }
}