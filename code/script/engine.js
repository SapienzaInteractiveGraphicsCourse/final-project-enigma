const TORQUE_CURVE = [
    [900, 180],
    [1000, 240],
    [1500, 320],
    [2000, 380],
    [2500, 420],
    [3000, 445],
    [3500, 450],
    [4000, 448],
    [4500, 440],
    [5000, 420],
    [5500, 390],
    [6000, 350],
    [6500, 300],
    [7000, 230],
    [7200, 160], 
];

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

const GEAR_RATIOS = [
    3.82,
    2.20,
    1.52,
    1.14,
    0.87,
    0.69,
];
const FINAL_DRIVE = 3.73;
const REVERSE_RATIO = 3.15;
const TRANSMISSION_EFF = 0.92;

const IDLE_RPM = 700;
const REDLINE_RPM = 7200;
const WHEEL_RADIUS = 0.338;

const UPSHIFT_KMH = [30, 60, 95, 135, 175];
const DOWNSHIFT_KMH = [20, 45, 80, 115, 155];

const ENGINE_BRAKE_TORQUE_NM = 90;

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

    function update(dt, gasPedal, brakePedal, speedKmh) {
        if (!running) {
            _wheelForce = 0;
            _brakeForce = brakePedal * 1500;
            rpm = 0;
            return;
        }

        const speedMs = speedKmh / 3.6;
        const absSpeed = Math.abs(speedKmh);
        autoShift(absSpeed, gasPedal);

        if (mode === GEAR_MODE.N) {
            const targetRpm = IDLE_RPM + gasPedal * (REDLINE_RPM - IDLE_RPM);
            const response = gasPedal > 0.1 ? 15 : 5;
            rpm += (targetRpm - rpm) * Math.min(1, dt * response);
            _wheelForce = 0;
        } else {
            const drivenRpm = rpmFromSpeed(Math.abs(speedMs), totalRatio);
            rpm = Math.max(IDLE_RPM, Math.min(REDLINE_RPM, drivedRpm(drivenRpm, gasPedal, rpm, dt)));

            let appliedGas = gasPedal;
            if (gasPedal === 0 && absSpeed < 12) {
                appliedGas = 0.02;
            }

            let torqueNm = getTorqueAtRpm(rpm) * appliedGas;

            if (gasPedal === 0 && absSpeed >= 12) {
                const BASE_ENGINE_DRAG_NM = 20;
                torqueNm = -BASE_ENGINE_DRAG_NM * (rpm / REDLINE_RPM);
            }

            const wheelTorque = torqueNm * totalRatio * TRANSMISSION_EFF;
            _wheelForce = (mode === GEAR_MODE.D ? -1 : 1) * (wheelTorque / WHEEL_RADIUS);
        }
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
