const TORQUE_CURVE = [
    [800, 220],
    [1500, 260],
    [2000, 290],
    [3000, 350],
    [4000, 400],
    [5000, 440],
    [6000, 470],
    [7000, 460],
    [8000, 430],
    [8500, 390],
    [9000, 340],
    [9200, 150],
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
    4.75,
    3.08,
    2.40,
    2.04,
    1.68,
    1.18,
];
const FINAL_DRIVE = 3.96;
const REVERSE_RATIO = 2.80;
const TRANSMISSION_EFF = 0.98;

const IDLE_RPM = 800;
const REDLINE_RPM = 9000;
const WHEEL_RADIUS = 0.3445;

const BASE_UPSHIFT_RPM = 7000;
const DOWNSHIFT_RPM = 3000;

let lastShiftTime = 0;

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

    function autoShift(gasPedal) {
        if (mode !== GEAR_MODE.D) return;

        const now = performance.now();
        if (now - lastShiftTime < 750) return;

        if (gear < GEAR_RATIOS.length && rpm > BASE_UPSHIFT_RPM) {
            const nextGearRatio = GEAR_RATIOS[gear] * FINAL_DRIVE;
            const currentRatio = activeTotalRatio();
            const predictedRpm = rpm * (nextGearRatio / currentRatio);

            if (predictedRpm > 3500) {
                gear++;
                lastShiftTime = now;
                return;
            }
        }

        if (gear > 1) {
            const targetDownshiftRpm = DOWNSHIFT_RPM + (gasPedal * 1000);
            
            if (rpm < targetDownshiftRpm) {
                const lowerGearRatio = GEAR_RATIOS[gear - 2] * FINAL_DRIVE;
                const currentRatio = activeTotalRatio();
                const predictedRpm = rpm * (lowerGearRatio / currentRatio);

                if (predictedRpm < REDLINE_RPM - 500) {
                    gear--;
                    lastShiftTime = now;
                }
            }
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
        autoShift(gasPedal);
        const totalRatio = activeTotalRatio();

        if (mode === GEAR_MODE.N) {
            const targetRpm = IDLE_RPM + gasPedal * (REDLINE_RPM - IDLE_RPM);
            const response = gasPedal > 0.1 ? 35 : 12; 
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
        const lag = driven > current ? 45.0 : 35.0;
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