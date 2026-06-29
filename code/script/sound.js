const blinkSound = new Audio('../../src/audio/blinker.wav');
blinkSound.volume = 1.0; 

export function playTurnSignalSound() {
    blinkSound.currentTime = 0; 
    blinkSound.play().catch(e => console.warn("Audio blocked:", e));
}

export function stopTurnSignalSound() {
    blinkSound.pause();
    blinkSound.currentTime = 0;
}