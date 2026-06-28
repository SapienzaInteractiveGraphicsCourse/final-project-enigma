import * as THREE from 'three'
import { continuousAnimationController } from './animations.js'

export function createSteerControl(model) {
    let steerInput = 0;

    const steerControl = continuousAnimationController({
        model,
        stateKey: "steer",
        speed: 4,
        applyValue: (model, steer) => {
            const maxWheelSteerDegrees = 30;
            const steeringWheelRatio = 12;

            const wheelSteerRadians = THREE.MathUtils.degToRad(steer * maxWheelSteerDegrees);
            const steeringWheelRadians = -wheelSteerRadians * steeringWheelRatio;

            const left = model.animations["wheel_LF"].part;
            const right = model.animations["wheel_RF"].part;
            const steeringWheel = model.animations["Steering_wheel"].part;

            const wheelAxis = new THREE.Vector3(0, 1, 0);
            const steeringWheelAxis = new THREE.Vector3(0, 0, 1);

            const wheelRotation = new THREE.Quaternion().setFromAxisAngle(wheelAxis, wheelSteerRadians);
            const steeringWheelRotation = new THREE.Quaternion().setFromAxisAngle(steeringWheelAxis, steeringWheelRadians);

            left.quaternion.copy(model.animations["wheel_LF"].restQuaternion).multiply(wheelRotation);
            right.quaternion.copy(model.animations["wheel_RF"].restQuaternion).multiply(wheelRotation);
            steeringWheel.quaternion.copy(model.animations["Steering_wheel"].restQuaternion).multiply(steeringWheelRotation);
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
