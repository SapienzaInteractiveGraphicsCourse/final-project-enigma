const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

let blinkBuffer = null;
let doorOpenBuffer = null;
let doorCloseBuffer = null;

const blinkGainNode = audioCtx.createGain();
blinkGainNode.gain.value = 0.1;
blinkGainNode.connect(audioCtx.destination);

const sfxBuffers = new Map();
const sfxGainNode = audioCtx.createGain();
sfxGainNode.gain.value = 0.1;
sfxGainNode.connect(audioCtx.destination);

async function loadBlinkAudio() {
    try {
        const response = await fetch('../../src/audio/turn_signal.wav');
        const arrayBuffer = await response.arrayBuffer();
        blinkBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.error("Error loading turn signal:", e);
    }
}

const SFX_FILES = {
    'door_open': '../../src/audio/door_open.wav',
    'door_close': '../../src/audio/door_close.wav',
};

async function loadAllSfx() {
    for (const [name, path] of Object.entries(SFX_FILES)) {
        try {
            const response = await fetch(path);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await audioCtx.decodeAudioData(arrayBuffer);
            sfxBuffers.set(name, buffer);
        } catch (e) {
            console.warn(`Error loading SFX [${name}]:`, e);
        }
    }
}

loadBlinkAudio();
loadAllSfx();

export function ensureAudioContextResumed() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

export function playTurnSignalSound() {
    if (!blinkBuffer) return;

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const source = audioCtx.createBufferSource();
    source.buffer = blinkBuffer;
    source.loop = false;
    source.connect(blinkGainNode);
    source.start(0);
}

export function playSfx(soundName) {
    if (!soundName || !sfxBuffers.has(soundName)) return;

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const source = audioCtx.createBufferSource();
    source.buffer = sfxBuffers.get(soundName);
    source.loop = false;
    source.connect(sfxGainNode);
    source.start(0);
}

export function setTurnSignalVolume(volumeLevel) {
    blinkGainNode.gain.setTargetAtTime(volumeLevel, audioCtx.currentTime, 0.01);
}