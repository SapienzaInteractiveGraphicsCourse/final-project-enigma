const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const audioBuffers = new Map();

const defaultGainNode = audioCtx.createGain();
defaultGainNode.gain.value = 0.1;
defaultGainNode.connect(audioCtx.destination);

const blinkGainNode = audioCtx.createGain();
blinkGainNode.gain.value = 0.1;
blinkGainNode.connect(audioCtx.destination);

let currentStartupSource = null;

export async function loadAudio(name, path) {
    try {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await audioCtx.decodeAudioData(arrayBuffer);
        audioBuffers.set(name, buffer);
    } catch (e) {
        console.error(`Errore nel caricamento del suono [${name}]:`, e);
    }
}

const SOUND_FILES = {
    'turn_signal': '../../src/audio/turn_signal.wav',
    'door_open': '../../src/audio/door_open.wav',
    'door_close': '../../src/audio/door_close.wav',
    'startup': '../../src/audio/startup.wav'
};

Object.entries(SOUND_FILES).forEach(([name, path]) => {
    loadAudio(name, path);
});

export function ensureAudioContextResumed() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

export function playAudio(name, gainNode = defaultGainNode) {
    if (!audioBuffers.has(name)) return null;

    ensureAudioContextResumed();

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffers.get(name);
    source.loop = false;
    source.connect(gainNode);
    source.start(0);

    return source;
}

export function playTurnSignalSound() {
    playAudio('turn_signal', blinkGainNode);
}

export function playSfx(soundName) {
    const source = playAudio(soundName, defaultGainNode);
    
    if (soundName === 'startup') {
        currentStartupSource = source;
    }
}

export function stopStartupSound() {
    if (currentStartupSource) {
        try {
            currentStartupSource.stop();
        } catch (e) {
        }
        currentStartupSource = null;
    }
}

export function setTurnSignalVolume(volumeLevel) {
    blinkGainNode.gain.setTargetAtTime(volumeLevel, audioCtx.currentTime, 0.01);
}