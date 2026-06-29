const blinkSound = new Audio('./src/audio/blinker.wav');
blinkSound.volume = 0.5; 

export function playTurnSignalSound() {
    blinkSound.currentTime = 0; 
    blinkSound.play().catch(e => console.warn("Audio bloccato dal browser:", e));
}

export function stopTurnSignalSound() {
    blinkSound.pause(); // Mette in pausa l'audio
    blinkSound.currentTime = 0; // Lo riavvolge all'inizio
}