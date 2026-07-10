import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createEngine, GEAR_MODE } from './engine.js';

export function createCarPhysics(model, trackMeshes = []) {
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.solver.iterations = 10;

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
    
    chassisBody.addShape(chassisShape, new CANNON.Vec3(0, 0.45, 0));
    chassisBody.position.set(0, 1.5, 0);
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
        suspensionRestLength: 0.15, 
        suspensionStiffness: 60,
        suspensionDampingRelaxation: 4.5,
        suspensionDampingCompression: 8.5,
        maxSuspensionForce: 100000,
        rollInfluence: 0.05,
        frictionSlip: 1.5
    };

    const frontWheelOptions = {
        ...baseWheelOptions,
        radius: 0.338
    };

    const rearWheelOptions = {
        ...baseWheelOptions,
        radius: 0.3445
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

    // ── Trasmissione realistica ───────────────────────────────────────────
    const engine = createEngine();

    const maxBrakeForce  = 1000;
    const maxSteerAngle  = THREE.MathUtils.degToRad(30);

    let currentSteerAngle = 0;

    const meshLF = anim["wheel_LF"]?.part;
    const meshRF = anim["wheel_RF"]?.part;
    const spinLF = anim["Moving_wheel_LF"]?.part;
    const spinRF = anim["Moving_wheel_RF"]?.part;
    const spinLR = anim["Moving_wheel_LR"]?.part;
    const spinRR = anim["Moving_wheel_RR"]?.part;
    const steeringWheelMesh = anim["Steering_wheel"]?.part;

    return {
        update: (dt) => {
            const fixedDt = Math.min(dt, 0.03);

            let targetSteer = 0;
            if (activeKeys.has('ArrowLeft')) targetSteer += 1;
            if (activeKeys.has('ArrowRight')) targetSteer -= 1;

            if (targetSteer !== 0) {
                currentSteerAngle += targetSteer * 4.0 * fixedDt;
            } else {
                currentSteerAngle += (0 - currentSteerAngle) * 6.0 * fixedDt;
            }
            currentSteerAngle = THREE.MathUtils.clamp(currentSteerAngle, -maxSteerAngle, maxSteerAngle);

            vehicle.setSteeringValue(currentSteerAngle, 0);
            vehicle.setSteeringValue(currentSteerAngle, 1);

            // ── Throttle / freno dal controller motore ────────────────────
            const speedKmh = (() => {
                const vel = chassisBody.velocity;
                const dir = chassisBody.quaternion.vmult(new CANNON.Vec3(0, 0, 1));
                return vel.dot(dir) * 3.6;
            })();

            const isForward  = activeKeys.has('ArrowUp');
            const isReverse  = activeKeys.has('ArrowDown');
            const isBraking  = activeKeys.has('Space');

            // Throttle: 0..1 — solo quando il motore gira e la marcia è coerente
            const mode = engine.getMode();
            let throttle = 0;
            if (engine.isRunning()) {
                if (isForward && mode === GEAR_MODE.D) throttle = 1.0;
                if (isReverse && mode === GEAR_MODE.R) throttle = 1.0;
            }

            engine.update(fixedDt, throttle, speedKmh);

            const wheelForce = engine.getWheelForce();   // N, firmato
            const engineBrake = engine.getBrakeForce();  // N, positivo = freno

            // Trasmissione posteriore (RWD): forza solo alle ruote 2 e 3
            vehicle.applyEngineForce(wheelForce, 2);
            vehicle.applyEngineForce(wheelForce, 3);
            vehicle.applyEngineForce(0, 0);
            vehicle.applyEngineForce(0, 1);

            // Freno: freno motore + freno a pedale (Space)
            const brakePedal = isBraking ? maxBrakeForce : 0;
            const totalBrake = brakePedal + engineBrake * 0.15; // scala engineBrake a forza Cannon
            for (let i = 0; i < 4; i++) vehicle.setBrake(totalBrake, i);

            world.step(1 / 60, dt, 3);

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

        setEngineRunning: (v) => engine.setRunning(v),
        engine,
    };
}