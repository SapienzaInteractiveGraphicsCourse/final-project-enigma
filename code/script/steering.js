import * as THREE from 'three'
import { continuousAnimationController } from './animations.js'

export function createSteerControl(model) {
    let wheelSpinSpeedRadians = 0;
    let wheelSpinAngleRadians = 0;

    let steerAngleRadians = 0;
    const steerTargetMaxRadians = THREE.MathUtils.degToRad(30);
    const steerResponse = 12;

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

    function updateSteerPose(dt) {
        const steerInput = THREE.MathUtils.clamp(model.state.steer, -1, 1);
        const steerTargetRad = steerInput * steerTargetMaxRadians;

        const k = Math.min(1, steerResponse * dt);
        steerAngleRadians += (steerTargetRad - steerAngleRadians) * k;

        const steerLeftFront = model.animations["wheel_LF"]?.part;
        const steerRightFront = model.animations["wheel_RF"]?.part;
        const spinLeftFront = model.animations["Moving_wheel_LF"]?.part;
        const spinRightFront = model.animations["Moving_wheel_RF"]?.part;
        const spinLeftBack = model.animations["Moving_wheel_LR"]?.part;
        const spinRightBack = model.animations["Moving_wheel_RR"]?.part;
        const steeringWheel = model.animations["Steering_wheel"]?.part;
        
        const throttleAnim = model.animations["Throttle"];
        const brakeAnim = model.animations["Brake"];
        
        const throttlePedal = throttleAnim ? throttleAnim.part : null;
        const brakePedal = brakeAnim ? brakeAnim.part : null;

        const wheelSteerAxis = new THREE.Vector3(0, 1, 0);
        const steeringWheelAxis = new THREE.Vector3(0, 0, 1);
        const wheelRollAxis = new THREE.Vector3(1, 0, 0); 
        
        const pedalAxis = new THREE.Vector3(1, 0, 0); 
        const pedalMaxAngle = THREE.MathUtils.degToRad(20);

        const steerRot = new THREE.Quaternion().setFromAxisAngle(wheelSteerAxis, steerAngleRadians);
        const steeringWheelRatio = 12;
        const steeringWheelRot = new THREE.Quaternion().setFromAxisAngle(
            steeringWheelAxis,
            -steerAngleRadians * steeringWheelRatio / steerTargetMaxRadians
        );

        const spinRot = new THREE.Quaternion().setFromAxisAngle(wheelRollAxis, wheelSpinAngleRadians);

        const currentThrottle = model.state.throttle || 0;
        const throttlePress = Math.max(0, currentThrottle);
        const brakePress = Math.max(0, -currentThrottle);

        const throttleRot = new THREE.Quaternion().setFromAxisAngle(pedalAxis, throttlePress * pedalMaxAngle);
        const brakeRot = new THREE.Quaternion().setFromAxisAngle(pedalAxis, -brakePress * pedalMaxAngle);

        if (steerLeftFront) steerLeftFront.quaternion.copy(model.animations["wheel_LF"].restQuaternion).multiply(steerRot);
        if (steerRightFront) steerRightFront.quaternion.copy(model.animations["wheel_RF"].restQuaternion).multiply(steerRot);

        if (spinLeftFront) spinLeftFront.quaternion.copy(model.animations["Moving_wheel_LF"].restQuaternion).multiply(spinRot);
        if (spinRightFront) spinRightFront.quaternion.copy(model.animations["Moving_wheel_RF"].restQuaternion).multiply(spinRot);
        if (spinLeftBack) spinLeftBack.quaternion.copy(model.animations["Moving_wheel_LR"].restQuaternion).multiply(spinRot);
        if (spinRightBack) spinRightBack.quaternion.copy(model.animations["Moving_wheel_RR"].restQuaternion).multiply(spinRot);
        if (steeringWheel) steeringWheel.quaternion.copy(model.animations["Steering_wheel"].restQuaternion).multiply(steeringWheelRot);
        
        if (throttlePedal && throttleAnim.restQuaternion) {
            throttlePedal.quaternion.copy(throttleAnim.restQuaternion).multiply(throttleRot);
        }
        
        if (brakePedal && brakeAnim.restQuaternion) {
            brakePedal.quaternion.copy(brakeAnim.restQuaternion).multiply(brakeRot);
        }
    }

    return {
        setInput: (steerV, throttleV = model.state.throttle) => {
            model.state.steer = steerV;
            throttleController.setInput(throttleV);
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

            throttleController.setInput(nextThrottle);
            model.state.steer = nextSteer;
            
            throttleController.update(dt);
            updateSteerPose(dt);
        }
    };
}