const blinkSound = new Audio('../../src/audio/blinker.wav');
blinkSound.preload = 'auto'; // ← forza il caricamento anticipato
blinkSound.volume = 1.0;
blinkSound.load(); 

export function playTurnSignalSound() {
    if (blinkSound.paused) {
        blinkSound.currentTime = 0; 
        blinkSound.play().catch(e => console.warn("Audio blocked:", e));
    }
}

export function stopTurnSignalSound() {
    blinkSound.pause();
    blinkSound.currentTime = 0;
}

export function primeTurnSignalSound() {
    blinkSound.load();
}
