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

export function createEngineSoundSystem(sampleMap) {
    let nodes = [];
    let isPlaying = false;
    
    // Master globale del motore
    const masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
    masterGain.gain.value = 0.5; // Configura il volume massimo desiderato

    // I due canali paralleli per la gestione del carico (FMOD Style)
    let onThrottleGroup;
    let offThrottleGroup;

    function init() {
        onThrottleGroup = audioCtx.createGain();
        offThrottleGroup = audioCtx.createGain();

        onThrottleGroup.connect(masterGain);
        offThrottleGroup.connect(masterGain);

        nodes = sampleMap.map(sample => {
            const source = audioCtx.createBufferSource();
            source.buffer = sample.buffer;
            source.loop = true;

            // Questo gain gestisce UNICAMENTE il crossfade dei giri (RPM)
            const rpmGainNode = audioCtx.createGain();
            rpmGainNode.gain.value = 0;

            source.connect(rpmGainNode);
            
            // MULTI-ROUTING: Sdoppiamo il segnale del campione su entrambi i canali di carico
            rpmGainNode.connect(onThrottleGroup);
            rpmGainNode.connect(offThrottleGroup);

            return {
                rpm: sample.rpm,
                source: source,
                gain: rpmGainNode
            };
        });
    }

    return {
        start: () => {
            ensureAudioContextResumed();
            if (!isPlaying) {
                init();
                nodes.forEach(n => n.source.start(0));
                isPlaying = true;
            }
        },
        
        stop: () => {
            if (isPlaying) {
                nodes.forEach(n => {
                    try { n.source.stop(); } catch(e) {}
                });
                nodes = [];
                isPlaying = false;
            }
        },
        
        update: (currentRpm, gasPedal) => {
            if (!isPlaying || nodes.length === 0) return;

            const now = audioCtx.currentTime;
            const rpmTimeConstant = 0.03;       // Smoothing crossfade giri
            const throttleTimeConstant = 0.06;  // Smoothing transizione carico pedale

            // ─── GESTIONE CARICO (On-Throttle / Off-Throttle) ───
            // Canale di Accelerazione: segue linearmente il pedale (0..1)
            onThrottleGroup.gain.setTargetAtTime(gasPedal, now, throttleTimeConstant);

            // Canale di Rilascio (Coast): si attiva quando rilasci il gas (1 - gasPedal)
            // Moltiplichiamo per un coefficiente (es: 0.35) per renderlo marcatamente più basso
            const coastVolume = (1.0 - gasPedal) * 0.35; 
            offThrottleGroup.gain.setTargetAtTime(coastVolume, now, throttleTimeConstant);


            // ─── LOGICA DI CROSSFADE REAALISTICA RPM ───
            let lower = nodes[0];
            let upper = nodes[nodes.length - 1];

            for (let i = 0; i < nodes.length - 1; i++) {
                if (currentRpm >= nodes[i].rpm && currentRpm <= nodes[i + 1].rpm) {
                    lower = nodes[i];
                    upper = nodes[i + 1];
                    break;
                }
            }

            if (currentRpm <= lower.rpm) {
                nodes.forEach(n => n.gain.gain.setTargetAtTime(n === lower ? 1 : 0, now, rpmTimeConstant));
                lower.source.playbackRate.setTargetAtTime(currentRpm / lower.rpm, now, rpmTimeConstant);
                return;
            }

            if (currentRpm >= upper.rpm) {
                nodes.forEach(n => n.gain.gain.setTargetAtTime(n === upper ? 1 : 0, now, rpmTimeConstant));
                upper.source.playbackRate.setTargetAtTime(currentRpm / upper.rpm, now, rpmTimeConstant);
                return;
            }

            const range = upper.rpm - lower.rpm;
            const blend = (currentRpm - lower.rpm) / range;

            nodes.forEach(n => {
                if (n !== lower && n !== upper) {
                    n.gain.gain.setTargetAtTime(0, now, rpmTimeConstant);
                }
            });

            const lowerVolume = Math.cos(blend * 0.5 * Math.PI);
            const upperVolume = Math.cos((1.0 - blend) * 0.5 * Math.PI);

            lower.gain.gain.setTargetAtTime(lowerVolume, now, rpmTimeConstant);
            upper.gain.gain.setTargetAtTime(upperVolume, now, rpmTimeConstant);

            lower.source.playbackRate.setTargetAtTime(currentRpm / lower.rpm, now, rpmTimeConstant);
            upper.source.playbackRate.setTargetAtTime(currentRpm / upper.rpm, now, rpmTimeConstant);
        }
    };
}

export async function loadEngineSamples() {
    const rpmPoints = [900, 2294, 4139, 6025, 8198];
    const sampleMap = [];

    for (const rpm of rpmPoints) {
        const response = await fetch(`../../src/audio/${rpm}.wav`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        sampleMap.push({ rpm: rpm, buffer: buffer });
    }
    return sampleMap.sort((a, b) => a.rpm - b.rpm);
}