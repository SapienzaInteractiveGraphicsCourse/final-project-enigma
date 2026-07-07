import * as THREE from 'three'
import { continuousAnimationController } from './animations.js'

export function createSteerControl(model, trackMeshes = []) {
    let wheelSpinSpeedRadians = 0;
    let wheelSpinAngleRadians = 0;
    let steerAngleRadians = 0;

    let smoothedPitch = 0;
    let smoothedRoll = 0;

    const steerTargetMaxRadians = THREE.MathUtils.degToRad(30);
    const steerResponse = 6; 

    // Parametri fisici della Carrera
    const mass = 1505;              
    const wheelRadius = 0.357;      
    const wheelBase = 2.45;         
    const maxEngineForce = 9500;    
    const maxBrakeForce = 18000;    
    const aeroDragCoeff = 0.35;     
    const rollingResistance = 250;  
    
    let carLinearSpeed = 0;         
    let currentAcceleration = 0;    

    // Inizializzazione dei Raycaster per collisioni e terreno
    const groundRaycaster = new THREE.Raycaster();
    const wallRaycaster = new THREE.Raycaster();
    const carUpVector = new THREE.Vector3(0, 1, 0);
    const downDirection = new THREE.Vector3(0, -1, 0);

    const activeKeys = new Set();
    window.addEventListener('keydown', (e) => { activeKeys.add(e.code); });
    window.addEventListener('keyup', (e) => { activeKeys.delete(e.code); });
    window.addEventListener('blur', () => { activeKeys.clear(); });

    const throttleController = continuousAnimationController({
        model,
        stateKey: "throttle",
        speed: 4.0,
        applyValue: () => {} 
    });

    function updateSteerPose(dt) {
        const steerInput = THREE.MathUtils.clamp(model.state.steer, -1, 1);

        // ----------------------------------------------------
        // NUOVO: STERZO SENSIBILE ALLA VELOCITÀ
        // ----------------------------------------------------
        // Definiamo una velocità di riferimento (es. 15 m/s, circa 54 km/h) 
        // oltre la quale lo sterzo inizia a diventare più rigido e limitato
        const thresholdSpeed = 10; 
        
        const speedFactor = Math.max(0.4, 1.0 - Math.max(0, Math.abs(carLinearSpeed) - thresholdSpeed) / 40.0);

        // Applichiamo il fattore di riduzione all'angolo massimo di 30 gradi
        const adjustedMaxRadians = steerTargetMaxRadians * speedFactor;
        const steerTargetRad = steerInput * adjustedMaxRadians;

        // Il resto della funzione rimane identico per l'interpolazione fluida
        const k = Math.min(1, steerResponse * dt);
        steerAngleRadians += (steerTargetRad - steerAngleRadians) * k;

        // Recupero animazioni originali delle ruote e volante
        const steerLeftFront = model.animations["wheel_LF"]?.part;
        const steerRightFront = model.animations["wheel_RF"]?.part;
        const spinLeftFront = model.animations["Moving_wheel_LF"]?.part;
        const spinRightFront = model.animations["Moving_wheel_RF"]?.part;
        const spinLeftBack = model.animations["Moving_wheel_LR"]?.part;
        const spinRightBack = model.animations["Moving_wheel_RR"]?.part;
        const steeringWheel = model.animations["Steering_wheel"]?.part;

        const steerRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), steerAngleRadians);
        const spinRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), wheelSpinAngleRadians);

        if (steerLeftFront) steerLeftFront.quaternion.copy(model.animations["wheel_LF"].restQuaternion).multiply(steerRot);
        if (steerRightFront) steerRightFront.quaternion.copy(model.animations["wheel_RF"].restQuaternion).multiply(steerRot);
        if (spinLeftFront) spinLeftFront.quaternion.copy(model.animations["Moving_wheel_LF"].restQuaternion).multiply(spinRot);
        if (spinRightFront) spinRightFront.quaternion.copy(model.animations["Moving_wheel_RF"].restQuaternion).multiply(spinRot);
        if (spinLeftBack) spinLeftBack.quaternion.copy(model.animations["Moving_wheel_LR"].restQuaternion).multiply(spinRot);
        if (spinRightBack) spinRightBack.quaternion.copy(model.animations["Moving_wheel_RR"].restQuaternion).multiply(spinRot);
        
        if (steeringWheel) {
            const steeringWheelRot = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 0, 1),
                -steerAngleRadians * 12 / steerTargetMaxRadians
            );
            steeringWheel.quaternion.copy(model.animations["Steering_wheel"].restQuaternion).multiply(steeringWheelRot);
        }

        // Effetto visivo peso ammortizzatori (Rollio e Beccheggio dinamico)
        const bodyMesh = model.root?.getObjectByName('body'); 
        if (bodyMesh) {
            const targetPitch = currentAcceleration * 0.0035; 
            const centrifugalForce = (carLinearSpeed * carLinearSpeed * (steerAngleRadians / wheelBase)) * 0.1;
            const targetRoll = THREE.MathUtils.clamp(centrifugalForce * 0.0008, -0.05, 0.05);

            smoothedPitch += (targetPitch - smoothedPitch) * Math.min(1, 12 * dt);
            smoothedRoll += (targetRoll - smoothedRoll) * Math.min(1, 12 * dt);
            bodyMesh.rotation.set(smoothedPitch, 0, smoothedRoll);
        }
    }

    // FUNZIONE DI SENSORI FRONTALI PER MURO
   function checkWallCollisions() {
        if (!model.root || trackMeshes.length === 0) return false;

        const forwardDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(model.root.quaternion).normalize();
        
        // Direzioni delle antenne di rilevamento (Centro, Sinistra, Destra)
        const directions = [
            forwardDirection,
            forwardDirection.clone().applyAxisAngle(carUpVector, THREE.MathUtils.degToRad(25)),
            forwardDirection.clone().applyAxisAngle(carUpVector, THREE.MathUtils.degToRad(-25))
        ];

        // CORREZIONE 1: Alziamo il punto di partenza (y += 0.5) all'altezza dei fari/paraurti
        // così i raggi volano sopra l'asfalto senza toccarlo
        const rayStart = model.root.position.clone().add(forwardDirection.clone().multiplyScalar(1.5));
        rayStart.y += 0.5; 

        const safetyDistance = 1.2; // Distanza di attivazione del freno da muro

        for (let dir of directions) {
            wallRaycaster.set(rayStart, dir);
            const intersections = wallRaycaster.intersectObjects(trackMeshes, true);

            if (intersections.length > 0) {
                const hit = intersections[0];
                
                // Convertiamo la normale del poligono colpito nello spazio del mondo reale
                const worldNormal = hit.face.normal.clone();
                worldNormal.applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();

                // CORREZIONE 2: Se la superficie colpita punta verso l'alto (worldNormal.y > 0.5), 
                // significa che è l'asfalto della pista o una salita, NON un muro! Usiamo 'continue' per ignorarla.
                if (worldNormal.y > 0.5) continue; 

                // Se arriviamo qui, abbiamo colpito un vero muro verticale
                if (hit.distance < safetyDistance) {
                    if (carLinearSpeed > 2) {
                        // Rimbalzo elastico
                        carLinearSpeed = -carLinearSpeed * 0.3; 
                        model.root.position.add(worldNormal.multiplyScalar(0.15));
                    } else {
                        carLinearSpeed = 0;
                    }
                    return true;
                }
            }
        }
        return false;
    }
    // FUNZIONE DI CLAMPING AL PAVIMENTO
   // FUNZIONE DI CLAMPING AL PAVIMENTO CON MATRICE DI BASE (Soluzione definitiva al rollio laterale)
    function clampToGround(dt) {
        if (!model.root || trackMeshes.length === 0) return;

        // Alza il punto di partenza del raggio sopra la macchina per evitare di mancare il suolo
        const rayStart = model.root.position.clone();
        rayStart.y += 1.5; 

        groundRaycaster.set(rayStart, downDirection);
        const intersections = groundRaycaster.intersectObjects(trackMeshes, true);

        if (intersections.length > 0) {
            const hit = intersections[0];
            // Incolliamo l'altezza della Porsche al punto esatto di intersezione
            model.root.position.y = hit.point.y;

            // 1. TRASFORMAZIONE DELLA NORMALE IN SPAZIO MONDO
            // Questo converte la normale locale della pista nelle coordinate reali del mondo 3D
            const worldNormal = hit.face.normal.clone();
            worldNormal.applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();

            // 2. RECUPERO DELLA DIREZIONE ATTUALE DI MARCIA
            // Capiamo dove sta guardando la macchina in questo millisecondo
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(model.root.quaternion).normalize();

            // 3. COSTRUZIONE DI UN SISTEMA DI ASSI ORTOGONALI PERFETTI
            // L'asse Destra (X) deve essere perpendicolare sia alla normale del terreno che alla direzione di marcia
            const right = new THREE.Vector3().crossVectors(worldNormal, forward).normalize();
            
            // L'asse Avanti (Z) viene ricalcolato matematicamente per giacere piatto sulla pendenza esatta della pista
            const correctedForward = new THREE.Vector3().crossVectors(right, worldNormal).normalize();

            // 4. CREAZIONE DELLA MATRICE DI ROTAZIONE ASSOLUTA
            // Creiamo un orientamento puro che contiene simultaneamente Direzione, Pendenza e Rollio della pista
            const matrix = new THREE.Matrix4().makeBasis(right, worldNormal, correctedForward);
            const targetQuat = new THREE.Quaternion().setFromRotationMatrix(matrix);

            // 5. ALLINEAMENTO FLUIDO AMMORTIZZATO
            // Lo slerp allinea la macchina senza scatti. 15 è la rigidità degli ammortizzatori.
            // Quando l'auto è ferma, targetQuat rimane identico e l'auto sta perfettamente immobile.
            model.root.quaternion.slerp(targetQuat, Math.min(1, 15 * dt));
        }
    }

    return {
        setInput: (steerV, throttleV = model.state.throttle) => {
            model.state.steer = steerV;
            throttleController.setInput(throttleV);
        },
        update: (dt) => {
            let nextThrottle = 0;
            if (activeKeys.has('ArrowUp')) nextThrottle += 1;
            if (activeKeys.has('ArrowDown')) nextThrottle -= 1;

            let nextSteer = 0;
            if (activeKeys.has('ArrowLeft')) nextSteer += 1;
            if (activeKeys.has('ArrowRight')) nextSteer -= 1;

            throttleController.setInput(nextThrottle);
            model.state.steer = nextSteer;
            throttleController.update(dt);

            const isAccelerating = activeKeys.has('ArrowUp');
            const isBraking = activeKeys.has('ArrowDown');

            let propulsionForce = 0;
            let brakeForce = 0;

            if (isAccelerating) {
                if (carLinearSpeed >= -0.1) propulsionForce = maxEngineForce;
                else brakeForce = maxBrakeForce;
            } else if (isBraking) {
                if (carLinearSpeed <= 0.1) propulsionForce = -maxEngineForce * 0.5;
                else brakeForce = maxBrakeForce;
            }

            const dragForce = aeroDragCoeff * carLinearSpeed * carLinearSpeed * Math.sign(carLinearSpeed);
            const rollingForce = rollingResistance * Math.sign(carLinearSpeed);
            let totalForce = propulsionForce - dragForce;

            if (!isAccelerating && !isBraking) {
                const engineBrakeForce = 5500; 
                if (carLinearSpeed > 0.1) totalForce -= (engineBrakeForce + rollingForce);
                else if (carLinearSpeed < -0.1) totalForce += (engineBrakeForce + rollingForce);
                else totalForce = 0;
            } else if (carLinearSpeed > 0) {
                totalForce -= (brakeForce + rollingForce);
            } else if (carLinearSpeed < 0) {
                totalForce += (brakeForce - rollingForce);
            }

            currentAcceleration = totalForce / mass;
            carLinearSpeed += currentAcceleration * dt;

            if (Math.abs(carLinearSpeed) < 0.15) {
                if (brakeForce > 0 || (!isAccelerating && !isBraking)) {
                    carLinearSpeed = 0;
                    currentAcceleration = 0;
                }
            }

            carLinearSpeed = THREE.MathUtils.clamp(carLinearSpeed, -14, 81.5);
            wheelSpinSpeedRadians = carLinearSpeed / wheelRadius;
            wheelSpinAngleRadians += wheelSpinSpeedRadians * dt;

            updateSteerPose(dt);

            // CONTROLLO DELLE COLLISIONI PRIMA DI SPOSTARE LA MACCHINA
            if (carLinearSpeed > 0.05) {
                checkWallCollisions();
            }

            // SPOSTAMENTO REALE 3D
            // SPOSTAMENTO REALE 3D CORRETTO
            const distanceThisFrame = carLinearSpeed * dt;
            if (Math.abs(distanceThisFrame) > 0.001) {
                
                // NUOVO: Simulatore di perdita di aderenza. 
                // A 0 km/h aderenza = 100%. A 230+ km/h aderenza = 25%.
                // Questo allarga le curve ad alta velocità impedendo i testacoda irreali.
                const gripFactor = Math.max(0.25, 1.0 - (Math.abs(carLinearSpeed) / 65.0));
                
                // Moltiplichiamo il risultato per il gripFactor!
                const turnAngleThisFrame = (distanceThisFrame / wheelBase) * Math.tan(steerAngleRadians) * gripFactor;
                
                if (model.root) {
                    model.root.rotateY(turnAngleThisFrame);
                    model.root.translateZ(distanceThisFrame); 
                }
            }
            

            // CORREZIONE ALTEZZA: Incolliamo l'auto al suolo dopo lo spostamento orizzontale
            clampToGround(dt);
        }
    };
}