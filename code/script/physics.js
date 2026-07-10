import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createEngine } from './engine.js';

export function createCarPhysics(model, trackMeshes = []) {
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.solver.iterations = 12;

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

    const chassisShape = new CANNON.Box(new CANNON.Vec3(0.85, 0.25, 2.1));
    const chassisBody = new CANNON.Body({ mass: 1505 });
    const roofSphere = new CANNON.Sphere(0.4);
    chassisBody.addShape(roofSphere, new CANNON.Vec3(0, 0.4, 1.5));
    chassisBody.addShape(roofSphere, new CANNON.Vec3(0, 0.4, -1.5));
    chassisBody.addShape(roofSphere, new CANNON.Vec3(0, 0.4, 0));

    const COM_HEIGHT_OFFSET = 0.18; // was 0.45
    chassisBody.addShape(chassisShape, new CANNON.Vec3(0, COM_HEIGHT_OFFSET, 0));
    chassisBody.position.set(0, 1.5, 0);

    chassisBody.allowSleep = true;
    chassisBody.sleepSpeedLimit = 0.15;
    chassisBody.sleepTimeLimit = 0.5;
    chassisBody.linearDamping = 0.05;
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
        suspensionRestLength: 0.3,
        maxSuspensionForce: 100000,
        maxSuspensionTravel: 0.3,
    };

    const frontWheelOptions = {
        ...baseWheelOptions,
        radius: 0.338,
        suspensionStiffness: 45,
        suspensionDampingRelaxation: 3.2,
        suspensionDampingCompression: 4.8,
        rollInfluence: 0.03,
        frictionSlip: 3.2,
    };

    const rearWheelOptions = {
        ...baseWheelOptions,
        radius: 0.3445,
        suspensionStiffness: 32,
        suspensionDampingRelaxation: 2.8,
        suspensionDampingCompression: 4.2,
        rollInfluence: 0.06,
        frictionSlip: 2.4,
    };

    const anim = model.animations;

    const halfWidth = 0.85;
    const frontWheelY = -0.15;
    const rearWheelY = -0.15;

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

    vehicle.addToWorld(world);

    const activeKeys = new Set();
    window.addEventListener('keydown', (e) => activeKeys.add(e.code));
    window.addEventListener('keyup', (e) => activeKeys.delete(e.code));
    const engine = createEngine();

    const ENGINE_FORCE_SCALE = 0.35;
    const BRAKE_FORCE_SCALE = 0.35;

    const LOW_SPEED_LOCK_KMH = 0.8;

    const maxSteerAngle = THREE.MathUtils.degToRad(38);
    const steerSpeed = 5.5;

    let currentSteerAngle = 0;
    let smoothGas = 0;
    let smoothBrake = 0;

    const meshLF = anim["wheel_LF"]?.part;
    const meshRF = anim["wheel_RF"]?.part;
    const spinLF = anim["Moving_wheel_LF"]?.part;
    const spinRF = anim["Moving_wheel_RF"]?.part;
    const spinLR = anim["Moving_wheel_LR"]?.part;
    const spinRR = anim["Moving_wheel_RR"]?.part;
    const steeringWheelMesh = anim["Steering_wheel"]?.part;

    return {
        update: (dt) => {
            const localUp = new CANNON.Vec3(0, 1, 0);
            const worldUp = chassisBody.quaternion.vmult(localUp);

            if (worldUp.y < -0.2) {
                chassisBody.position.y += 2.5;

                const euler = new CANNON.Vec3();
                chassisBody.quaternion.toEuler(euler);
                chassisBody.quaternion.setFromEuler(0, euler.y, 0);

                chassisBody.velocity.set(0, 0, 0);
                chassisBody.angularVelocity.set(0, 0, 0);
            }

            const fixedDt = Math.min(dt, 0.03);

            let targetSteer = 0;
            if (activeKeys.has('ArrowLeft')) targetSteer += 1;
            if (activeKeys.has('ArrowRight')) targetSteer -= 1;

            if (targetSteer !== 0) {
                currentSteerAngle += targetSteer * steerSpeed * fixedDt;
            } else {
                currentSteerAngle += (0 - currentSteerAngle) * 6.0 * fixedDt;
            }
            currentSteerAngle = THREE.MathUtils.clamp(currentSteerAngle, -maxSteerAngle, maxSteerAngle);

            vehicle.setSteeringValue(currentSteerAngle, 0);
            vehicle.setSteeringValue(currentSteerAngle, 1);

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

            const speedKmh = (() => {
                const vel = chassisBody.velocity;
                const dir = chassisBody.quaternion.vmult(new CANNON.Vec3(0, 0, 1));
                return vel.dot(dir) * 3.6;
            })();

            engine.update(fixedDt, smoothGas, smoothBrake, speedKmh);

            const wheelForce = engine.getWheelForce() * ENGINE_FORCE_SCALE;
            const totalBrake = engine.getBrakeForce() * BRAKE_FORCE_SCALE;

            const engineOff = !engine.isRunning?.() && engine.isRunning !== undefined
                ? !engine.isRunning()
                : false;

            let effectiveBrake = totalBrake;
            let forceOverride = wheelForce;

            if (engineOff && Math.abs(speedKmh) < 2) {
                effectiveBrake = Math.max(effectiveBrake, 400);
                forceOverride = 0;
            }

            if (Math.abs(speedKmh) < LOW_SPEED_LOCK_KMH && (smoothBrake > 0.05 || (engineOff && Math.abs(speedKmh) < 2))) {
                chassisBody.velocity.set(0, chassisBody.velocity.y, 0);
                chassisBody.angularVelocity.set(0, 0, 0);
            }

            vehicle.applyEngineForce(forceOverride, 2);
            vehicle.applyEngineForce(forceOverride, 3);
            vehicle.applyEngineForce(0, 0);
            vehicle.applyEngineForce(0, 1);

            for (let i = 0; i < 4; i++) vehicle.setBrake(effectiveBrake, i);

            world.step(1 / 120, dt, 3);

            if (model.root && model.root.parent) {
                model.root.parent.position.copy(chassisBody.position);
                model.root.parent.quaternion.copy(chassisBody.quaternion);
            }

            for (let i = 0; i < vehicle.wheelInfos.length; i++) {
                vehicle.updateWheelTransform(i);
                const wheelInfo = vehicle.wheelInfos[i];

                if (i === 0 && meshLF) {
                    const localTurn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), currentSteerAngle);
                    meshLF.quaternion.copy(anim["wheel_LF"].restQuaternion).multiply(localTurn);
                }
                if (i === 1 && meshRF) {
                    const localTurn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), currentSteerAngle);
                    meshRF.quaternion.copy(anim["wheel_RF"].restQuaternion).multiply(localTurn);
                }

                let targetSpinMesh = null;
                if (i === 0) targetSpinMesh = spinLF;
                if (i === 1) targetSpinMesh = spinRF;
                if (i === 2) targetSpinMesh = spinLR;
                if (i === 3) targetSpinMesh = spinRR;

                if (targetSpinMesh) {
                    const rollQuat = new THREE.Quaternion().setFromAxisAngle(
                        new THREE.Vector3(1, 0, 0),
                        -wheelInfo.rotation
                    );
                    targetSpinMesh.quaternion.copy(anim[targetSpinMesh.name].restQuaternion).multiply(rollQuat);
                }
            }

            if (steeringWheelMesh) {
                const swRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -currentSteerAngle * 10);
                steeringWheelMesh.quaternion.copy(anim["Steering_wheel"].restQuaternion).multiply(swRot);
            }
        },
        getSpeed: () => {
            const velocity = chassisBody.velocity;
            const direction = chassisBody.quaternion.vmult(new CANNON.Vec3(0, 0, 1));
            return velocity.dot(direction) * 3.6;
        },

        getGasPedal: () => {
            return activeKeys.has('ArrowUp') ? 1.0 : 0.0;
        },

        setEngineRunning: (v) => engine.setRunning(v),
        engine,
    };
}
