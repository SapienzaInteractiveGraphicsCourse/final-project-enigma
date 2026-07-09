import * as THREE from 'three'
import { continuousAnimationController } from './animations.js'

export function createSteerControl(model, trackMeshes = []) {
    let wheelSpinSpeedRadians = 0; //velocità della ruota in rad
    let wheelSpinAngleRadians = 0;//posizione della ruota in rad
    let steerAngleRadians = 0;

    let smoothedPitch = 0; //beccheggio
    let smoothedRoll = 0; //rollio
    let smoothedThrottleInput = 0; // rampa graduale dell'acceleratore (-1..1)

    const steerTargetMaxRadians = THREE.MathUtils.degToRad(30);
    const steerResponse = 1.5; //quanto velocemento le ruote raggiungono i 30 gradi

    // Parametri fisici della Carrera
    const mass = 1505;
    const wheelRadius = 0.357;
    const wheelBase = 2.45;
    const maxEngineForce = 5500;
    const maxBrakeForce = 18000;
    const aeroDragCoeff = 0.35; //resistenza areodinamica
    const rollingResistance = 250; //attrito degli pneumatici

    let carLinearSpeed = 0;
    let currentAcceleration = 0;

    // Raycaster
    const groundRaycaster = new THREE.Raycaster();
    const wallRaycaster = new THREE.Raycaster();
    const carUpVector = new THREE.Vector3(0, 1, 0); //verso dove si trova il cielo
    const downDirection = new THREE.Vector3(0, -1, 0); //verso della gravità

    // ── Oggetti riutilizzabili — creati una volta sola, mai dentro i loop ────

    // updateSteerPose
    const _steerAxis = new THREE.Vector3(0, 1, 0); //le ruote sterzano attorno a un asse verticale
    const _spinAxis  = new THREE.Vector3(1, 0, 0); //le ruote girano attorno all'asse x
    const _swAxis    = new THREE.Vector3(0, 0, 1); //come gira il volante
    
    //gradi per la grafica 3D
    const _steerRot  = new THREE.Quaternion();
    const _spinRot   = new THREE.Quaternion();
    const _swRot     = new THREE.Quaternion();

    // checkWallCollisions-->non sono inizializzati perhce i valori variano da frame a frame in base alle decisioni dell'utente
    const _forwardDir   = new THREE.Vector3(); //direzione avanti
    const _rightDir     = new THREE.Vector3(); //direzione destra
    const _rayStart     = new THREE.Vector3(); //da dove partono i raggi
    const _worldNormal  = new THREE.Vector3(); //è la normale del volume della pista
    const _normalMatrix = new THREE.Matrix3(); //orienta la normale in modo che abbia senso nella pista
    
    const _rayOrigins   = Array(7).fill().map(() => new THREE.Vector3()); //i punti di partenza dei raggi
    const _wallDirs = Array(7).fill().map(() => new THREE.Vector3()); // le direzioni

    // clampToGround-->incolla l'auto alla pista e inclina correttamente quando affronti salite/discese
    const _groundRayStart      = new THREE.Vector3(); //per capire a che altezza si trova il pavimento
    const _groundNormal        = new THREE.Vector3(); //la normale al terreno
    const _groundNormalMatrix  = new THREE.Matrix3(); //serve a convertire l'inclinazione del terreno in un inclinazione globale

    //servono a capire le nuove direzioni (avanti,destra) in salita/discesa
    const _groundForward       = new THREE.Vector3();
    const _groundRight         = new THREE.Vector3();
    const _correctedForward    = new THREE.Vector3();

    const _groundMatrix        = new THREE.Matrix4();
    const _targetQuat          = new THREE.Quaternion(); //converte '_groungMatrix' in un Quaternione

    // Cache bodyMesh — evita getObjectByName ogni frame
    let _bodyMesh = null;
    //funzione che viene chiamata quando bisogna muovere la carrozzeria dell'auto
    function getBodyMesh() {
        if (!_bodyMesh && model.root) {
            _bodyMesh = model.root.getObjectByName('body') ?? null;
        }
        return _bodyMesh;
    }


    const activeKeys = new Set();

    function onKeyDown(e) { activeKeys.add(e.code); }
    function onKeyUp(e) { activeKeys.delete(e.code); }
    function onBlur() { activeKeys.clear(); }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    const throttleController = continuousAnimationController({
        model,
        stateKey: "throttle",
        speed: 2.0,  //più il numero è alto, più l'animazione è scattante
        applyValue: () => {}
    });

    // ── Funzioni interne ──────────────────────────────────────────────────────
    //1.Gestisce il volante e il suo orientamento graduale
    //2.Collega le ruote allo sterzo
    //3.Simula Beccheggio e Rollio

    function updateSteerPose(dt) {
        const steerInput = THREE.MathUtils.clamp(model.state.steer, -1, 1);

        // Sterzo sensibile alla velocità
        const thresholdSpeed = 10;
        const speedFactor = Math.max(0.4, 1.0 - Math.max(0, Math.abs(carLinearSpeed) - thresholdSpeed) / 40.0);
        const steerTargetRad = steerInput * steerTargetMaxRadians * speedFactor;

        const k = Math.min(1, steerResponse * dt);
        steerAngleRadians += (steerTargetRad - steerAngleRadians) * k;

        // Quaternioni riutilizzati — nessun "new" ogni frame
        _steerRot.setFromAxisAngle(_steerAxis, steerAngleRadians);
        _spinRot.setFromAxisAngle(_spinAxis, wheelSpinAngleRadians);

        const anim = model.animations;
        const steerLF = anim["wheel_LF"]?.part;
        const steerRF = anim["wheel_RF"]?.part;
        const spinLF  = anim["Moving_wheel_LF"]?.part;
        const spinRF  = anim["Moving_wheel_RF"]?.part;
        const spinLR  = anim["Moving_wheel_LR"]?.part;
        const spinRR  = anim["Moving_wheel_RR"]?.part;
        const sw      = anim["Steering_wheel"]?.part;

        if (steerLF) steerLF.quaternion.copy(anim["wheel_LF"].restQuaternion).multiply(_steerRot);
        if (steerRF) steerRF.quaternion.copy(anim["wheel_RF"].restQuaternion).multiply(_steerRot);
        if (spinLF)  spinLF.quaternion.copy(anim["Moving_wheel_LF"].restQuaternion).multiply(_spinRot);
        if (spinRF)  spinRF.quaternion.copy(anim["Moving_wheel_RF"].restQuaternion).multiply(_spinRot);
        if (spinLR)  spinLR.quaternion.copy(anim["Moving_wheel_LR"].restQuaternion).multiply(_spinRot);
        if (spinRR)  spinRR.quaternion.copy(anim["Moving_wheel_RR"].restQuaternion).multiply(_spinRot);

        if (sw) {
            _swRot.setFromAxisAngle(_swAxis, -steerAngleRadians * 12 / steerTargetMaxRadians);
            sw.quaternion.copy(anim["Steering_wheel"].restQuaternion).multiply(_swRot);
        }

        // Rollio e beccheggio dinamico
        const bodyMesh = getBodyMesh();
        if (bodyMesh) {
            const targetPitch = currentAcceleration * 0.0035;
            const centrifugalForce = carLinearSpeed * carLinearSpeed * (steerAngleRadians / wheelBase) * 0.1;
            const targetRoll = THREE.MathUtils.clamp(centrifugalForce * 0.0008, -0.05, 0.05);

            smoothedPitch += (targetPitch - smoothedPitch) * Math.min(1, 12 * dt);
            smoothedRoll  += (targetRoll  - smoothedRoll)  * Math.min(1, 12 * dt);
            bodyMesh.rotation.set(smoothedPitch, 0, smoothedRoll);
        }
    }
    
    //Gesisce l'impatto con gli ostacoli
   function checkWallCollisions(dt) {
        if (!model.root || trackMeshes.length === 0) return false;

        _forwardDir.set(0, 0, 1).applyQuaternion(model.root.quaternion).normalize();
        _rightDir.crossVectors(carUpVector, _forwardDir).normalize();

        const frontOffset = 2.6; // (Il valore che hai modificato prima)
        const halfWidth = 1.4;   // (Il valore che hai modificato prima)

        _rayStart.copy(model.root.position);
        _rayStart.y += 0.5; 

        for (let i = 0; i < 7; i++) {
            const lateralFactor = (i / 3) - 1; 
            _rayOrigins[i].copy(_rayStart).addScaledVector(_rightDir, lateralFactor * halfWidth);
            _wallDirs[i].copy(_forwardDir);
            
            if (i === 0) _wallDirs[i].applyAxisAngle(carUpVector, THREE.MathUtils.degToRad(20));
            if (i === 6) _wallDirs[i].applyAxisAngle(carUpVector, THREE.MathUtils.degToRad(-20));
        }

        // ----------------------------------------------------
        // FIX PER LA RETROMARCIA
        // ----------------------------------------------------
        // Se l'auto si sta muovendo all'indietro (velocità negativa), 
        // disattiviamo il paraurti anteriore per permetterle di disincastrarsi.
        if (carLinearSpeed < -0.01) {
            return false; 
        }

        const predictedTravelDistance = Math.abs(carLinearSpeed) * dt;
        const lookAheadDistance = frontOffset + predictedTravelDistance + 0.5;
        const bumperBuffer = 0.05; 
        const collisionThreshold = frontOffset + predictedTravelDistance + bumperBuffer;

        for (let i = 0; i < 7; i++) {
            wallRaycaster.set(_rayOrigins[i], _wallDirs[i]); 
            wallRaycaster.far = lookAheadDistance;
            const intersections = wallRaycaster.intersectObjects(trackMeshes, true);

            if (intersections.length > 0) {
                const hit = intersections[0];

                _worldNormal.copy(hit.face.normal);
                _normalMatrix.getNormalMatrix(hit.object.matrixWorld);
                _worldNormal.applyMatrix3(_normalMatrix).normalize();

                if (_worldNormal.y > 0.5) continue; // Ignora asfalto/salite

                if (hit.distance <= collisionThreshold) {
                    
                    // Snap-to-Wall: Se ci stiamo per scontrare, teletrasportiamo il muso a 5cm dal muro
                    // prima di innescare il rimbalzo.
                    if (hit.distance > frontOffset + bumperBuffer) {
                        const snapDistance = hit.distance - (frontOffset + bumperBuffer);
                        model.root.position.addScaledVector(_forwardDir, snapDistance);
                    }

                    const impactDot = _forwardDir.dot(_worldNormal);

                    if (impactDot < 0) {
                        const impactSeverity = Math.abs(impactDot); 
                        carLinearSpeed *= (1.0 - (impactSeverity * 0.9));

                        if (impactSeverity > 0.75 && Math.abs(carLinearSpeed) > 5) {
                            carLinearSpeed = -carLinearSpeed * 0.3; 
                        }
                    }

                    // Anti-compenetrazione: Se il muso dell'auto è già finito DENTRO il muro,
                    // lo spingiamo in fuori usando la direzione della parete.
                    if (hit.distance < frontOffset + bumperBuffer) {
                        const penetration = (frontOffset + bumperBuffer) - hit.distance;
                        model.root.position.addScaledVector(_worldNormal, penetration);
                    }

                    return true;
                }
            }
        }
        return false;
    }

    //E' ciò che tiene attaccata l'auto alla pista
    function clampToGround(dt) {
        if (!model.root || trackMeshes.length === 0) return;

        _groundRayStart.copy(model.root.position);
        _groundRayStart.y += 1.5;
        groundRaycaster.far = 4.0;

        groundRaycaster.set(_groundRayStart, downDirection);
        const intersections = groundRaycaster.intersectObjects(trackMeshes, true);

        if (intersections.length > 0) {
            const hit = intersections[0];
            model.root.position.y = hit.point.y;

            _groundNormal.copy(hit.face.normal);
            _groundNormalMatrix.getNormalMatrix(hit.object.matrixWorld);
            _groundNormal.applyMatrix3(_groundNormalMatrix).normalize();

            _groundForward.set(0, 0, 1).applyQuaternion(model.root.quaternion).normalize();
            _groundRight.crossVectors(_groundNormal, _groundForward).normalize();
            _correctedForward.crossVectors(_groundRight, _groundNormal).normalize();

            _groundMatrix.makeBasis(_groundRight, _groundNormal, _correctedForward);
            _targetQuat.setFromRotationMatrix(_groundMatrix);

            model.root.quaternion.slerp(_targetQuat, Math.min(1, 15 * dt));
        }
    }

    // ── API pubblica ──────────────────────────────────────────────────────────
    return {
        setInput: (steerV, throttleV = model.state.throttle) => {
            model.state.steer = steerV;
            throttleController.setInput(throttleV);
        },

        update: (dt) => {
            // ----------------------------------------------------
            // 1. GESTIONE DELL'ACCELERATORE (Rampa Graduale)
            // ----------------------------------------------------
            let nextThrottle = 0;
            if (activeKeys.has('ArrowUp'))   nextThrottle += 1;
            if (activeKeys.has('ArrowDown')) nextThrottle -= 1;

            const throttleRampUpSpeed = 1;    // 1/s — salita: più basso = partenza più morbida
            const throttleReleaseSpeed = 15;  // 1/s — rilascio/inversione: alto per fermare la spinta quasi subito
            const targetThrottleInput = nextThrottle;

            const isReleasingOrReversing =
                targetThrottleInput === 0 ||
                Math.abs(targetThrottleInput) < Math.abs(smoothedThrottleInput) ||
                Math.sign(targetThrottleInput) !== Math.sign(smoothedThrottleInput);

            const throttleRampSpeed = isReleasingOrReversing ? throttleReleaseSpeed : throttleRampUpSpeed;
            smoothedThrottleInput += (targetThrottleInput - smoothedThrottleInput) * Math.min(1, throttleRampSpeed * dt);

            // Evita una coda asintotica infinitesima
            if (Math.abs(smoothedThrottleInput) < 0.01) smoothedThrottleInput = 0;

            throttleController.setInput(smoothedThrottleInput);
            throttleController.update(dt);

            const isAccelerating = smoothedThrottleInput > 0.02;
            const isBraking      = smoothedThrottleInput < -0.02;

            // ----------------------------------------------------
            // 2. GESTIONE DELLO STERZO (Joystick Virtuale / Ritorno al Centro)
            // ----------------------------------------------------
            let targetSteer = 0;
            if (activeKeys.has('ArrowLeft'))  targetSteer += 1;
            if (activeKeys.has('ArrowRight')) targetSteer -= 1;

            const steerSpeed = 0.8;       // Velocità di sterzata
            const centerReturnSpeed = 2.5; // Velocità di ritorno al centro quando lasci i tasti

            if (targetSteer !== 0) {
                // Il giocatore sta premendo la freccia
                model.state.steer += targetSteer * steerSpeed * dt;
            } else {
                // Il giocatore ha RILASCIATO i tasti: Ritorno automatico al centro
                if (model.state.steer > 0) {
                    model.state.steer = Math.max(0, model.state.steer - centerReturnSpeed * dt);
                } else if (model.state.steer < 0) {
                    model.state.steer = Math.min(0, model.state.steer + centerReturnSpeed * dt);
                }
            }

            // Assicuriamoci che il valore non superi mai i limiti -1 e 1
            model.state.steer = THREE.MathUtils.clamp(model.state.steer, -1, 1);


            // ----------------------------------------------------
            // 3. CALCOLO FORZE E VELOCITÀ (Fisica Lineare)
            // ----------------------------------------------------
            let propulsionForce = 0;
            let brakeForce = 0;

            if (isAccelerating) {
                if (carLinearSpeed >= -0.1) propulsionForce = maxEngineForce * smoothedThrottleInput;
                else brakeForce = maxBrakeForce;
            } else if (isBraking) {
                if (carLinearSpeed <= 0.1) propulsionForce = maxEngineForce * 0.5 * smoothedThrottleInput;
                else brakeForce = maxBrakeForce;
            }

            const dragForce    = aeroDragCoeff * carLinearSpeed * carLinearSpeed * Math.sign(carLinearSpeed);
            const rollingForce = rollingResistance * Math.sign(carLinearSpeed);
            let totalForce     = propulsionForce - dragForce;

            if (!isAccelerating && !isBraking) {
                const engineBrakeForce = 5500;
                if      (carLinearSpeed >  0.1) totalForce -= (engineBrakeForce + rollingForce);
                else if (carLinearSpeed < -0.1) totalForce += (engineBrakeForce + rollingForce);
                else totalForce = 0;
            } else if (carLinearSpeed > 0) {
                totalForce -= (brakeForce + rollingForce);
            } else if (carLinearSpeed < 0) {
                totalForce += (brakeForce - rollingForce);
            }

            currentAcceleration = totalForce / mass;
            carLinearSpeed += currentAcceleration * dt;

            // Dead-stop: evita micro-oscillazioni attorno a zero
            if (Math.abs(carLinearSpeed) < 0.15) {
                if (brakeForce > 0 || (!isAccelerating && !isBraking)) {
                    carLinearSpeed = 0;
                    currentAcceleration = 0;
                }
            }

            carLinearSpeed = THREE.MathUtils.clamp(carLinearSpeed, -14, 81.5);
            wheelSpinSpeedRadians  = carLinearSpeed / wheelRadius;
            wheelSpinAngleRadians += wheelSpinSpeedRadians * dt;

            // ----------------------------------------------------
            // 4. AGGIORNAMENTO GRAFICO E COLLISIONI
            // ----------------------------------------------------
            updateSteerPose(dt);

            if (Math.abs(carLinearSpeed) > 0.05) {
                checkWallCollisions(dt);
            }

            // Spostamento con perdita di aderenza ad alta velocità
            const distanceThisFrame = carLinearSpeed * dt;
            if (Math.abs(distanceThisFrame) > 0.001 && model.root) {
                const gripFactor = Math.max(0.25, 1.0 - Math.abs(carLinearSpeed) / 65.0);
                const turnAngleThisFrame = (distanceThisFrame / wheelBase) * Math.tan(steerAngleRadians) * gripFactor;
                model.root.rotateY(turnAngleThisFrame);
                model.root.translateZ(distanceThisFrame);
            }

            clampToGround(dt);
        },

        // Espone la velocità per HUD, cronometro, ecc.
        getSpeed: () => carLinearSpeed,

        dispose: () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
            activeKeys.clear();
        },
    };
}