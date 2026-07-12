import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createEngine } from './engine.js';
import { setAnimationState } from './animations.js';

// Scratch objects reused every frame to avoid GC pressure from repeated
// Vector3/Quaternion/CANNON.Vec3 allocation inside the hot update loop.
const _localUp = new CANNON.Vec3(0, 1, 0);
const _worldUpScratch = new CANNON.Vec3();
const _eulerScratch = new CANNON.Vec3();
const _forwardLocal = new CANNON.Vec3(0, 0, 1);
const _forwardWorldScratch = new CANNON.Vec3();

const _axisY = new THREE.Vector3(0, 1, 0);
const _axisX = new THREE.Vector3(1, 0, 0);
const _axisZ = new THREE.Vector3(0, 0, 1);
const _wheelSteerQuat = new THREE.Quaternion();
const _wheelRollQuat = new THREE.Quaternion();
const _steeringWheelQuat = new THREE.Quaternion();
const _rpmQuat = new THREE.Quaternion();
const _speedQuat = new THREE.Quaternion();

const FALL_RESET_Y = -20;

export function createCarPhysics(model, trackMeshes = []) {
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.solver.iterations = 50;

    trackMeshes.forEach((mesh) => {
        mesh.updateMatrixWorld(true);

        if (!mesh.geometry || !mesh.geometry.attributes.position) return;

        const geometry = mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrixWorld);

        const vertices = geometry.attributes.position.array;

        let indices;
        if (geometry.index) {
            indices = Array.from(geometry.index.array);
        } else {
            indices = [];
            for (let i = 0; i < vertices.length / 3; i++) {
                indices.push(i);
            }
        }

        const trimeshShape = new CANNON.Trimesh(vertices, indices);
        const trimeshBody = new CANNON.Body({ mass: 0 });
        trimeshBody.addShape(trimeshShape);

        trimeshBody.position.set(0, 0, 0);
        trimeshBody.quaternion.set(0, 0, 0, 1);

        world.addBody(trimeshBody);
    });

    const chassisShape = new CANNON.Box(new CANNON.Vec3(0.905, 0.595, 2.25));
    const chassisBody = new CANNON.Body({ mass: 1500 });

    const COM_HEIGHT_OFFSET = 0.65;
    chassisBody.addShape(chassisShape, new CANNON.Vec3(0, COM_HEIGHT_OFFSET, 0));

    const SPAWN_POINT = { x: -58.837, y: -4.6549, z: 4.9186 };
    const SPAWN_HEIGHT_MARGIN = 1;
    const SPAWN_ROTATION_DEG = 130;
    const SPAWN_BACK_OFFSET = 3;

    const spawnQuaternion = new CANNON.Quaternion();
    spawnQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), THREE.MathUtils.degToRad(SPAWN_ROTATION_DEG));
    chassisBody.quaternion.copy(spawnQuaternion);

    const forwardDir = spawnQuaternion.vmult(new CANNON.Vec3(0, 0, 1));
    chassisBody.position.set(
        SPAWN_POINT.x - forwardDir.x * SPAWN_BACK_OFFSET,
        SPAWN_POINT.y + SPAWN_HEIGHT_MARGIN,
        SPAWN_POINT.z - forwardDir.z * SPAWN_BACK_OFFSET
    );

    chassisBody.allowSleep = false;
    chassisBody.sleepSpeedLimit = 0.15;
    chassisBody.sleepTimeLimit = 0.5;
    chassisBody.linearDamping = 0.015;
    chassisBody.angularDamping = 0.05;

    world.addBody(chassisBody);

    const vehicle = new CANNON.RaycastVehicle({
        chassisBody: chassisBody,
        indexRightAxis: 0,
        indexUpAxis: 1,
        indexForwardAxis: 2
    });

    const baseWheelOptions = {
        directionLocal: new CANNON.Vec3(0, -1, 0),
        axleLocal: new CANNON.Vec3(-1, 0, 0),
        suspensionRestLength: 0.22,
        maxSuspensionForce: 15000,
        maxSuspensionTravel: 1.0,
    };

    const frontWheelOptions = {
        ...baseWheelOptions,
        radius: 0.338,
        suspensionStiffness: 35,
        suspensionDampingRelaxation: 8.5,
        suspensionDampingCompression: 8.5,
        rollInfluence: 0.01,
        frictionSlip: 4.5,
    };

    const rearWheelOptions = {
        ...baseWheelOptions,
        radius: 0.3445,
        suspensionStiffness: 38,
        suspensionDampingRelaxation: 9.0,
        suspensionDampingCompression: 9.0,
        rollInfluence: 0.01,
        frictionSlip: 4.5,
    };

    const anim = model.animations;

    const halfWidth = 0.9;
    const staticSagCompensation = -0.035;
    const frontWheelY = frontWheelOptions.radius + baseWheelOptions.suspensionRestLength + staticSagCompensation;
    const rearWheelY = rearWheelOptions.radius + baseWheelOptions.suspensionRestLength + staticSagCompensation;

    if (model.root) {
        model.root.position.set(0, 0, 0);
    }

    vehicle.addWheel({
        ...frontWheelOptions,
        chassisConnectionPointLocal: new CANNON.Vec3(halfWidth, frontWheelY, 1.4),
        isFrontWheel: true
    });
    vehicle.addWheel({
        ...frontWheelOptions,
        chassisConnectionPointLocal: new CANNON.Vec3(-halfWidth, frontWheelY, 1.4),
        isFrontWheel: true
    });

    vehicle.addWheel({
        ...rearWheelOptions,
        chassisConnectionPointLocal: new CANNON.Vec3(halfWidth, rearWheelY, -1.2),
        isFrontWheel: false
    });
    vehicle.addWheel({
        ...rearWheelOptions,
        chassisConnectionPointLocal: new CANNON.Vec3(-halfWidth, rearWheelY, -1.2),
        isFrontWheel: false
    });

    for (let i = 0; i < vehicle.wheelInfos.length; i++) {
        vehicle.wheelInfos[i].sliding = true;
    }

    vehicle.addToWorld(world);

    const activeKeys = new Set();
    window.addEventListener('keydown', (e) => activeKeys.add(e.code));
    window.addEventListener('keyup', (e) => activeKeys.delete(e.code));

    const engine = createEngine();

    const ENGINE_FORCE_SCALE = 0.45;
    const BRAKE_FORCE_SCALE = 0.35;
    const LOW_SPEED_LOCK_KMH = 0.8;

    const maxSteerAngle = THREE.MathUtils.degToRad(25);
    const steerSpeed = 5.5;

    let currentSteerAngle = 0;
    let smoothGas = 0;
    let smoothBrake = 0;

    const steeringWheelMesh = anim["Steering_wheel"]?.part;
    const rpmIndicatorMesh = anim["RPM_indicator"]?.part;
    const speedIndicatorMesh = anim["SPEED_indicator"]?.part;

    const displayMesh = model.root ? model.root.getObjectByName('display') : null;
    let displayMaterial = null;
    const originalDisplayColor = new THREE.Color();
    const originalEmissiveColor = new THREE.Color();
    const blackColor = new THREE.Color(0x000000);

    if (displayMesh && displayMesh.material) {
        displayMesh.material = displayMesh.material.clone();
        displayMaterial = displayMesh.material;

        originalDisplayColor.copy(displayMaterial.color);
        if (displayMaterial.emissive) {
            originalEmissiveColor.copy(displayMaterial.emissive);
        }

        displayMaterial.color.copy(blackColor);
        if (displayMaterial.emissive) {
            displayMaterial.emissive.copy(blackColor);
        }
    }

    const nodes = {
        RF: { pivot: model.root.getObjectByName('wheel_RF'), spin: model.root.getObjectByName('Moving_wheel_RF') },
        LF: { pivot: model.root.getObjectByName('wheel_LF'), spin: model.root.getObjectByName('Moving_wheel_LF') },
        RR: { pivot: model.root.getObjectByName('wheel_RR'), spin: model.root.getObjectByName('Moving_wheel_RR') },
        LR: { pivot: model.root.getObjectByName('wheel_LR'), spin: model.root.getObjectByName('Moving_wheel_LR') }
    };

    ['RF', 'LF', 'RR', 'LR'].forEach(key => {
        const n = nodes[key];
        if (n.pivot) {
            if (!n.pivot.userData.restPos) n.pivot.userData.restPos = n.pivot.position.clone();
            if (!n.pivot.userData.restQuat) n.pivot.userData.restQuat = n.pivot.quaternion.clone();
        }
        if (n.spin && !n.spin.userData.restQuat) {
            n.spin.userData.restQuat = n.spin.quaternion.clone();
        }
    });

    return {
        update: (dt) => {
            if (chassisBody.position.y < FALL_RESET_Y) {
                chassisBody.position.y = SPAWN_POINT.y + SPAWN_HEIGHT_MARGIN;
                chassisBody.velocity.set(0, 0, 0);
                chassisBody.angularVelocity.set(0, 0, 0);
            }

            chassisBody.quaternion.vmult(_localUp, _worldUpScratch);
            if (_worldUpScratch.y < -0.2) {
                chassisBody.position.y += 2.5;

                chassisBody.quaternion.toEuler(_eulerScratch);
                chassisBody.quaternion.setFromEuler(0, _eulerScratch.y, 0);

                chassisBody.velocity.set(0, 0, 0);
                chassisBody.angularVelocity.set(0, 0, 0);
            }

            const fixedDt = dt;

            const engineIsOn = engine.isRunning?.() && engine.isRunning !== undefined
                ? engine.isRunning()
                : false;

            if (displayMaterial) {
                const targetColor = engineIsOn ? originalDisplayColor : blackColor;
                const targetEmissive = engineIsOn ? originalEmissiveColor : blackColor;

                const transitionSpeed = 3.0 * fixedDt;

                displayMaterial.color.lerp(targetColor, transitionSpeed);
                if (displayMaterial.emissive) {
                    displayMaterial.emissive.lerp(targetEmissive, transitionSpeed);
                }
            }

            chassisBody.quaternion.vmult(_forwardLocal, _forwardWorldScratch);
            const speedKmh = chassisBody.velocity.dot(_forwardWorldScratch) * 3.6;

            if (speedKmh > 80) {
                if (!model.state.wingOpen && !model.state.manualSpoilerClosed) {
                    setAnimationState(model, "Spoiler", true, true);
                }
            }
            else if (speedKmh < 0.5) {
                model.state.manualSpoilerClosed = false;

                if (model.state.wingOpen && !model.state.manualSpoilerOpen) {
                    setAnimationState(model, "Spoiler", false, true);
                }
            }

            let targetSteer = 0;
            if (activeKeys.has('ArrowLeft')) targetSteer += 1;
            if (activeKeys.has('ArrowRight')) targetSteer -= 1;

            if (targetSteer !== 0) {
                currentSteerAngle += targetSteer * steerSpeed * fixedDt;
            } else {
                currentSteerAngle += (0 - currentSteerAngle) * 6.0 * fixedDt;
            }
            currentSteerAngle = THREE.MathUtils.clamp(currentSteerAngle, -maxSteerAngle, maxSteerAngle);

            let effectiveSteerAngle = currentSteerAngle;

            if (speedKmh > 50) {
                const demandFactor = (Math.abs(currentSteerAngle) / maxSteerAngle) * (speedKmh / 120);

                if (demandFactor > 1.0) {
                    const understeerMultiplier = THREE.MathUtils.clamp(1.5 - demandFactor, 0.15, 1.0);
                    effectiveSteerAngle *= understeerMultiplier;

                    vehicle.wheelInfos[0].frictionSlip = frontWheelOptions.frictionSlip * understeerMultiplier;
                    vehicle.wheelInfos[1].frictionSlip = frontWheelOptions.frictionSlip * understeerMultiplier;
                } else {
                    vehicle.wheelInfos[0].frictionSlip = frontWheelOptions.frictionSlip;
                    vehicle.wheelInfos[1].frictionSlip = frontWheelOptions.frictionSlip;
                }
            }

            vehicle.setSteeringValue(effectiveSteerAngle, 0);
            vehicle.setSteeringValue(effectiveSteerAngle, 1);

            const rawGas = activeKeys.has('ArrowUp') ? 1.0 : 0.0;
            const rawBrake = (activeKeys.has('ArrowDown') || activeKeys.has('Space')) ? 1.0 : 0.0;
            const gasSpeed = rawGas > 0 ? 4.0 : 10.0;
            const brakeSpeed = rawBrake > 0 ? 6.0 : 15.0;
            smoothGas += (rawGas - smoothGas) * gasSpeed * fixedDt;
            smoothBrake += (rawBrake - smoothBrake) * brakeSpeed * fixedDt;
            if (smoothGas < 0.01) smoothGas = 0;
            if (smoothBrake < 0.01) smoothBrake = 0;
            smoothGas = THREE.MathUtils.clamp(smoothGas, 0, 1);
            smoothBrake = THREE.MathUtils.clamp(smoothBrake, 0, 1);

            engine.update(fixedDt, smoothGas, smoothBrake, speedKmh);

            const wheelForce = engine.getWheelForce() * ENGINE_FORCE_SCALE;
            const totalBrake = engine.getBrakeForce() * BRAKE_FORCE_SCALE;

            const engineOff = !engine.isRunning?.() && engine.isRunning !== undefined
                ? !engine.isRunning()
                : false;

            const isNeutral = engine.getMode() === 'N';

            let effectiveBrake = totalBrake;
            let forceOverride = wheelForce;

            if (engineOff || isNeutral) {
                forceOverride = 0;
            }

            if (isNeutral) {
                effectiveBrake = Math.max(effectiveBrake, 5);
            }

            const shouldLock = (smoothGas === 0 && smoothBrake > 0.05);


            if (Math.abs(speedKmh) < LOW_SPEED_LOCK_KMH && shouldLock) {
                chassisBody.velocity.set(0, chassisBody.velocity.y, 0);
                chassisBody.angularVelocity.set(0, 0, 0);
            }

            vehicle.applyEngineForce(forceOverride, 2);
            vehicle.applyEngineForce(forceOverride, 3);
            vehicle.applyEngineForce(0, 0);
            vehicle.applyEngineForce(0, 1);

            for (let i = 0; i < 4; i++) vehicle.setBrake(effectiveBrake, i);

            world.step(1 / 60, dt, 10);

            if (model.root && model.root.parent) {

                // Usiamo .set() per copiare i valori estratti dalle proprietà interpolate di Cannon
                // Questo elimina qualsiasi stuttering grafico senza rompere i quaternioni di Three.js
                model.root.parent.position.set(
                    chassisBody.interpolatedPosition.x,
                    chassisBody.interpolatedPosition.y,
                    chassisBody.interpolatedPosition.z
                );

                model.root.parent.quaternion.set(
                    chassisBody.interpolatedQuaternion.x,
                    chassisBody.interpolatedQuaternion.y,
                    chassisBody.interpolatedQuaternion.z,
                    chassisBody.interpolatedQuaternion.w
                );

                model.root.parent.updateMatrixWorld(true);
            }

            for (let i = 0; i < vehicle.wheelInfos.length; i++) {
                vehicle.updateWheelTransform(i);
                const wheelInfo = vehicle.wheelInfos[i];

                let n = null;
                if (i === 0) n = nodes.RF;
                if (i === 1) n = nodes.LF;
                if (i === 2) n = nodes.RR;
                if (i === 3) n = nodes.LR;

                if (!n) continue;

                if (n.pivot) {
                    const compressionDelta = wheelInfo.suspensionRestLength - wheelInfo.suspensionLength;

                    n.pivot.position.y = n.pivot.userData.restPos.y + compressionDelta;

                    const steerAngle = (i === 0 || i === 1) ? currentSteerAngle : 0;
                    _wheelSteerQuat.setFromAxisAngle(_axisY, steerAngle);
                    n.pivot.quaternion.copy(n.pivot.userData.restQuat).multiply(_wheelSteerQuat);
                }

                if (n.spin) {
                    _wheelRollQuat.setFromAxisAngle(_axisX, -wheelInfo.rotation);
                    n.spin.quaternion.copy(n.spin.userData.restQuat).multiply(_wheelRollQuat);
                }
            }

            if (steeringWheelMesh) {
                _steeringWheelQuat.setFromAxisAngle(_axisZ, -currentSteerAngle * 10);
                steeringWheelMesh.quaternion.copy(anim["Steering_wheel"].restQuaternion).multiply(_steeringWheelQuat);
            }

            if (rpmIndicatorMesh && engine) {
                const currentRpm = engine.isRunning() ? engine.getRpm() : 0;

                let maxRpm = 8000.0;
                let rpmPercent = Math.min(Math.max(currentRpm / maxRpm, 0.0), 1.0);
                let maxAngleRad = THREE.MathUtils.degToRad(260);

                let rpmAngle = rpmPercent * maxAngleRad;

                _rpmQuat.setFromAxisAngle(_axisZ, rpmAngle);

                rpmIndicatorMesh.quaternion.copy(anim["RPM_indicator"].restQuaternion).multiply(_rpmQuat);
            }

            if (speedIndicatorMesh) {
                const currentSpeed = Math.abs(speedKmh);

                const maxSpeed = 330.0;
                const speedPercent = Math.min(Math.max(currentSpeed / maxSpeed, 0.0), 1.0);

                const maxSpeedAngleRad = THREE.MathUtils.degToRad(170);

                const speedAngle = speedPercent * maxSpeedAngleRad;

                _speedQuat.setFromAxisAngle(_axisZ, speedAngle);

                speedIndicatorMesh.quaternion.copy(anim["SPEED_indicator"].restQuaternion).multiply(_speedQuat);
            }
        },
        getSpeed: () => {
            chassisBody.quaternion.vmult(_forwardLocal, _forwardWorldScratch);
            return chassisBody.velocity.dot(_forwardWorldScratch) * 3.6;
        },

        getGasPedal: () => {
            return activeKeys.has('ArrowUp') ? 1.0 : 0.0;
        },

        setEngineRunning: (v) => engine.setRunning(v),
        engine,
    };
}
