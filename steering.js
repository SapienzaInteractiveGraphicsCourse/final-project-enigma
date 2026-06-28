import * as THREE from 'three'
import { continuousAnimationController } from './animations.js'

export function createSteerControl(model) {
    let wheelSpinSpeedRadians = 0;
    let wheelSpinAngleRadians = 0;

    let steerAngleRadians = 0;
    const steerTargetMaxRadians = THREE.MathUtils.degToRad(30);
    const steerResponse = 12;

    // throttle parameters
    const maxThrottle = 1;
    const accel = 10.0;
    const maxRadPerSec = 14;
    const brakeDrag = 12.0;
    const coastingDrag = 2.0;

    const activeKeys = new Set();

    window.addEventListener('keydown', (e) => {
        activeKeys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
        activeKeys.delete(e.code);
    });

    const throttleController = continuousAnimationController({
        model,
        stateKey: "throttle",
        speed: 4,
        applyValue: (_, throttle, dt) => {
            const t = THREE.MathUtils.clamp(throttle, -maxThrottle, maxThrottle);
            const targetSpeed = t * maxRadPerSec;

            if (t !== 0) {
                const delta = targetSpeed - wheelSpinSpeedRadians;
                const step = Math.sign(delta) * Math.min(Math.abs(delta), accel * dt);
                wheelSpinSpeedRadians += step;
            } else {
                const dec = Math.min(Math.abs(wheelSpinSpeedRadians), coastingDrag * dt);
                wheelSpinSpeedRadians -= Math.sign(wheelSpinSpeedRadians) * dec;
            }

            wheelSpinAngleRadians += wheelSpinSpeedRadians * dt;
        }
    });

    // update steering + apply quaternions (new)
    function updateSteerPose(dt) {
        const steerInput = THREE.MathUtils.clamp(model.state.steer, -1, 1);
        const steerTargetRad = steerInput * steerTargetMaxRadians;

        // inertia toward target (holds smoothly while key is down)
        const k = Math.min(1, steerResponse * dt);
        steerAngleRadians += (steerTargetRad - steerAngleRadians) * k;

        const leftFront = model.animations["wheel_LF"].part;
        const rightFront = model.animations["wheel_RF"].part;
        const leftBack = model.animations["wheel_LR"].part;
        const rightBack = model.animations["wheel_RR"].part;
        const steeringWheel = model.animations["Steering_wheel"].part;

        const wheelSteerAxis = new THREE.Vector3(0, 1, 0);
        const steeringWheelAxis = new THREE.Vector3(0, 0, 1);
        const wheelRollAxis = new THREE.Vector3(1, 0, 0); // adjust if needed

        const steerRot = new THREE.Quaternion().setFromAxisAngle(wheelSteerAxis, steerAngleRadians);
        const steeringWheelRatio = 12;
        const steeringWheelRot = new THREE.Quaternion().setFromAxisAngle(
            steeringWheelAxis,
            -steerAngleRadians * steeringWheelRatio / steerTargetMaxRadians
        );

        const spinRot = new THREE.Quaternion().setFromAxisAngle(wheelRollAxis, wheelSpinAngleRadians);

        const leftFrontRest = model.animations["wheel_LF"].restQuaternion;
        const rightFrontRest = model.animations["wheel_RF"].restQuaternion;
        const leftBackRest = model.animations["wheel_LR"].restQuaternion;
        const rightBackRest = model.animations["wheel_RR"].restQuaternion;
        const steeringWheelRest = model.animations["Steering_wheel"].restQuaternion;

        leftFront.quaternion.copy(leftFrontRest).multiply(steerRot).multiply(spinRot);
        rightFront.quaternion.copy(rightFrontRest).multiply(steerRot).multiply(spinRot);
        leftBack.quaternion.copy(leftBackRest).multiply(steerRot).multiply(spinRot);
        rightBack.quaternion.copy(rightBackRest).multiply(steerRot).multiply(spinRot);
        steeringWheel.quaternion.copy(steeringWheelRest).multiply(steeringWheelRot);
    }

    return {
        setInput: (steerV, throttleV = model.state.throttle) => {
            model.state.steer = steerV;
            model.state.throttle = throttleV;
        },
        update: (dt) => {
            let nextThrottle = 0;
            if (activeKeys.has('ArrowUp')) {
                nextThrottle = 1;
            }

            if (activeKeys.has('ArrowDown')) {
                nextThrottle = -1;
            }

            let nextSteer = 0;
            if (activeKeys.has('ArrowLeft')) {
                nextSteer = 1;
            }

            if (activeKeys.has('ArrowRight')) {
                nextSteer = -1;
            }

            model.state.throttle = nextThrottle;
            model.state.steer = nextSteer;
            throttleController.update(dt);
            updateSteerPose(dt);
        }
    };
}
