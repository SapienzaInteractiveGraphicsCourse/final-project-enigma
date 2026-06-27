import * as THREE from 'three'
import { continuousAnimationController } from './animations.js'

export function createSteerControl(model) {
    let steerInput = 0;

    const steerControl = continuousAnimationController({
        model,
        stateKey: "steer",
        speed: 4,
        applyValue: (model, steer) => {
            const maxSteerDegrees = 30;
            const steerRadians = steer * maxSteerDegrees * Math.PI / 180;

            const left = model.animations["wheel_LF"].part;
            const right = model.animations["wheel_RF"].part;

            const axis = new THREE.Vector3(0, 1, 0);
            const q = new THREE.Quaternion().setFromAxisAngle(axis, steerRadians);

            left.quaternion.copy(model.animations["wheel_LF"].restQuaternion).multiply(q);
            right.quaternion.copy(model.animations["wheel_RF"].restQuaternion).multiply(q);
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') steerInput = -1;
        if (e.key === 'ArrowLeft') steerInput = 1;
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowRight' && steerInput === -1) steerInput = 0;
        if (e.key === 'ArrowLeft' && steerInput === 1) steerInput = 0;
    });

    return {
        setInput: (v) => { steerInput = v; },
        updateInput: () => steerControl.setInput(steerInput),
        update: (dt) => steerControl.update(dt),
    };
}
