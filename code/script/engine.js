/**
 * engine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Simula un motore a combustione interna con:
 *   • Curva di coppia realistica (interpolata via lookup table RPM → Nm)
 *   • Trasmissione automatica a 6 rapporti con logica di cambio UP/DOWN
 *   • Modalità N (Neutral), D (Drive), R (Reverse)
 *   • Freno motore (engine braking) proporzionale ai giri
 *   • Differenziale posteriore semplificato (force split 70 % posteriore)
 *   • API semplice: chiamare engine.update(dt, throttleInput, speedKmh)
 *                   e leggere engine.getWheelForce() / engine.getBrakeForce()
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Curva di coppia ─────────────────────────────────────────────────────────
// Lookup table [rpm, torqueNm] — motore sportivo V8 aspirato ~450 Nm di picco
const TORQUE_CURVE = [
    [700, 180],   // idle
    [1000, 240],
    [1500, 320],
    [2000, 380],
    [2500, 420],
    [3000, 445],
    [3500, 450],   // picco coppia
    [4000, 448],
    [4500, 440],
    [5000, 420],
    [5500, 390],
    [6000, 350],
    [6500, 300],
    [7000, 230],
    [7200, 160],   // redline
];

/** Interpola linearmente la coppia ai RPM dati */
function getTorqueAtRpm(rpm) {
    const curve = TORQUE_CURVE;
    if (rpm <= curve[0][0]) return curve[0][1];
    if (rpm >= curve[curve.length - 1][0]) return curve[curve.length - 1][1];

    for (let i = 0; i < curve.length - 1; i++) {
        const [r0, t0] = curve[i];
        const [r1, t1] = curve[i + 1];
        if (rpm >= r0 && rpm <= r1) {
            const alpha = (rpm - r0) / (r1 - r0);
            return t0 + alpha * (t1 - t0);
        }
    }
    return 0;
}

// ─── Rapporti trasmissione ────────────────────────────────────────────────────
// [rapporto_cambio]  ×  differenziale_finale  = rapporto_totale_alla_ruota
const GEAR_RATIOS = [
    3.82,  // 1ª
    2.20,  // 2ª
    1.52,  // 3ª
    1.14,  // 4ª
    0.87,  // 5ª
    0.69,  // 6ª
];
const FINAL_DRIVE = 3.73;   // rapporto al ponte
const REVERSE_RATIO = 3.15;   // rapporto retromarcia
const TRANSMISSION_EFF = 0.92;   // efficienza meccanica trasmissione

// ─── Parametri motore ─────────────────────────────────────────────────────────
const IDLE_RPM = 700;
const REDLINE_RPM = 7200;
const WHEEL_RADIUS = 0.338;    // m — corrisponde ai valori di physics.js

// ─── Logica cambio automatico ─────────────────────────────────────────────────
// Soglie di upshift e downshift in km/h per ogni rapporto
//   upshift[i]   → passa da marcia i+1 a i+2 quando superi questa velocità
//   downshift[i] → torna da marcia i+2 a i+1 quando scendi sotto questa velocità
const UPSHIFT_KMH = [30, 60, 95, 135, 175]; // 1→2, 2→3, 3→4, 4→5, 5→6
const DOWNSHIFT_KMH = [20, 45, 80, 115, 155]; // 2→1, 3→2, 4→3, 5→4, 6→5

// ─── Freno motore ────────────────────────────────────────────────────────────
// Forza di freno motore in Newton per ogni marcia (scala con i RPM)
const ENGINE_BRAKE_TORQUE_NM = 90;  // Nm di freno motore a giri sostenuti

// ─────────────────────────────────────────────────────────────────────────────

// [Mantieni intatto tutto il codice precedente fino alla riga 176]

export const GEAR_MODE = Object.freeze({ N: 'N', D: 'D', R: 'R', });

export function createEngine() {
    let mode = GEAR_MODE.N;
    let gear = 1;
    let rpm = IDLE_RPM;
    let running = false;
    let _wheelForce = 0;
    let _brakeForce = 0;

    function rpmFromSpeed(speedMs, totalRatio) {
        if (totalRatio === 0) return IDLE_RPM;
        const rawRpm = (speedMs * 60 * totalRatio) / (2 * Math.PI * WHEEL_RADIUS);
        return Math.max(IDLE_RPM, rawRpm);
    }

    function activeTotalRatio() {
        if (mode === GEAR_MODE.R) return REVERSE_RATIO * FINAL_DRIVE;
        if (mode === GEAR_MODE.D) return GEAR_RATIOS[gear - 1] * FINAL_DRIVE;
        return 0;
    }

    function autoShift(speedKmh, gasPedal) {
        if (mode !== GEAR_MODE.D) return;
        if (gear < GEAR_RATIOS.length && gasPedal > 0.2 && speedKmh > UPSHIFT_KMH[gear - 1]) gear++;
        if (gear > 1) {
            const kickdown = gasPedal > 0.85 && speedKmh < UPSHIFT_KMH[gear - 2] * 0.9;
            const tooSlow = speedKmh < DOWNSHIFT_KMH[gear - 2];
            if (kickdown || tooSlow) gear--;
        }
    }

    // NUOVA FUNZIONE UPDATE: Riceve i pedali grezzi e gestisce tutta la meccanica
    // NUOVA FUNZIONE UPDATE: Riceve i pedali grezzi e gestisce tutta la meccanica
    function update(dt, gasPedal, brakePedal, speedKmh) {
        if (!running) {
            _wheelForce = 0;
            _brakeForce = brakePedal * 1500; // Puoi frenare anche a motore spento
            rpm = 0;
            return;
        }

        const speedMs = speedKmh / 3.6;
        const absSpeed = Math.abs(speedKmh);
        autoShift(absSpeed, gasPedal);
        const totalRatio = activeTotalRatio();

        // 1. Calcolo RPM: Dipende dalla marcia
        if (mode === GEAR_MODE.N) {
            // In folle il motore sale di giri liberamente in base all'acceleratore
            const targetRpm = IDLE_RPM + gasPedal * (REDLINE_RPM - IDLE_RPM);
            // Salita rapida (15), discesa un po' più lenta (5)
            const response = gasPedal > 0.1 ? 15 : 5;
            rpm += (targetRpm - rpm) * Math.min(1, dt * response);
            _wheelForce = 0;
        } else {
            // Con marcia inserita, i giri sono legati alle ruote (trasmissione in presa)
            const drivenRpm = rpmFromSpeed(Math.abs(speedMs), totalRatio);
            rpm = Math.max(IDLE_RPM, Math.min(REDLINE_RPM, drivedRpm(drivenRpm, gasPedal, rpm, dt)));

            let appliedGas = gasPedal;

            // SIMULAZIONE CREEP: Impedisce l'arresto improvviso a basse velocità
            // Un cambio automatico spinge sempre un po' anche senza gas
            if (gasPedal === 0 && absSpeed < 12) {
                appliedGas = 0.02;
            }

            // Calcolo coppia alle ruote
            let torqueNm = getTorqueAtRpm(rpm) * appliedGas;

            // FRENO MOTORE: Applicato come COPPIA NEGATIVA, non come freno meccanico
            if (gasPedal === 0 && absSpeed >= 12) {
                const BASE_ENGINE_DRAG_NM = 20; // Valore dolce, non bloccherà l'auto
                torqueNm = -BASE_ENGINE_DRAG_NM * (rpm / REDLINE_RPM);
            }

            const wheelTorque = torqueNm * totalRatio * TRANSMISSION_EFF;

            // Inverti la forza se sei in retromarcia (e applica la coppia calcolata)
            _wheelForce = (mode === GEAR_MODE.D ? -1 : 1) * (wheelTorque / WHEEL_RADIUS);
        }

        // 2. Calcolo Freno: ESCLUSIVAMENTE freno a pedale
        // Freno meccanico totale (es: 1500N di pinza freno)
        _brakeForce = brakePedal * 400;
    }

    function drivedRpm(driven, gasPedal, current, dt) {
        const lag = driven > current ? 3.0 : 6.0;
        return current + (driven - current) * Math.min(1, lag * dt);
    }

    return {
        update,
        getWheelForce: () => _wheelForce,
        getBrakeForce: () => _brakeForce,
        getRpm: () => Math.round(rpm),
        getGear: () => gear,
        getMode: () => mode,
        isRunning: () => running,
        setRunning(v) { running = v; if (!v) { rpm = 0; gear = 1; } else rpm = IDLE_RPM; },
        setMode(newMode) { if (Object.values(GEAR_MODE).includes(newMode)) { mode = newMode; gear = 1; } },
        getTorqueCurve: () => TORQUE_CURVE.map(([r, t]) => ({ rpm: r, torque: t })),
        getRedline: () => REDLINE_RPM,
        getIdleRpm: () => IDLE_RPM,
    };
}
