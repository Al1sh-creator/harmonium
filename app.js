// =============================================
// AUDIO ENGINE
// =============================================
window.AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx, masterGain, reverbGain, dryGain;
const activeOscillators = {};
const droneOscillators = {};

let currentOctave = 4;
let masterVolume = 0.8;

const BASE_NOTES = [
    { name: 'C', type: 'white', baseFreq: 261.63, key: 'a' },
    { name: 'C#', type: 'black', baseFreq: 277.18, key: 'w' },
    { name: 'D', type: 'white', baseFreq: 293.66, key: 's' },
    { name: 'D#', type: 'black', baseFreq: 311.13, key: 'e' },
    { name: 'E', type: 'white', baseFreq: 329.63, key: 'd' },
    { name: 'F', type: 'white', baseFreq: 349.23, key: 'f' },
    { name: 'F#', type: 'black', baseFreq: 369.99, key: 't' },
    { name: 'G', type: 'white', baseFreq: 392.00, key: 'g' },
    { name: 'G#', type: 'black', baseFreq: 415.30, key: 'y' },
    { name: 'A', type: 'white', baseFreq: 440.00, key: 'h' },
    { name: 'A#', type: 'black', baseFreq: 466.16, key: 'u' },
    { name: 'B', type: 'white', baseFreq: 493.88, key: 'j' },
    { name: 'C2', type: 'white', baseFreq: 523.25, key: 'k' },
];

function getFreq(baseFreq) {
    // Transpose from base octave 4
    const octaveDiff = currentOctave - 4;
    return baseFreq * Math.pow(2, octaveDiff);
}

function getNoteName(note) {
    return `${note.name}${currentOctave}`;
}

function initAudio() {
    if (audioCtx) return;
    audioCtx = new AudioContext();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0;

    // Dry/Wet reverb blend
    dryGain = audioCtx.createGain();
    dryGain.gain.value = 0.7;

    reverbGain = audioCtx.createGain();
    reverbGain.gain.value = 0.3;

    // Simple reverb using delay+feedback
    const delay1 = audioCtx.createDelay();
    delay1.delayTime.value = 0.1;
    const feedbackGain = audioCtx.createGain();
    feedbackGain.gain.value = 0.4;
    const delay2 = audioCtx.createDelay();
    delay2.delayTime.value = 0.17;

    masterGain.connect(dryGain);
    masterGain.connect(delay1);
    delay1.connect(feedbackGain);
    feedbackGain.connect(delay1);
    delay1.connect(delay2);
    delay2.connect(reverbGain);

    dryGain.connect(audioCtx.destination);
    reverbGain.connect(audioCtx.destination);
}

function createHarmoniumVoice(freq) {
    // Harmonium tone: sawtooth + slight square detune
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = freq;

    const osc2 = audioCtx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = freq * 1.0025;

    const noteGain = audioCtx.createGain();
    noteGain.gain.setValueAtTime(0, audioCtx.currentTime);
    noteGain.gain.linearRampToValueAtTime(0.28, audioCtx.currentTime + 0.04);

    osc1.connect(noteGain);
    osc2.connect(noteGain);
    noteGain.connect(masterGain);

    osc1.start();
    osc2.start();
    return { osc1, osc2, noteGain };
}

function playNote(noteName, freq) {
    if (!audioCtx) initAudio();
    if (activeOscillators[noteName]) return;
    const voice = createHarmoniumVoice(freq);
    activeOscillators[noteName] = voice;
    const keyEl = document.querySelector(`.key[data-note="${noteName}"]`);
    if (keyEl) keyEl.classList.add('active');
}

function stopNote(noteName) {
    if (!activeOscillators[noteName]) return;
    const { osc1, osc2, noteGain } = activeOscillators[noteName];
    noteGain.gain.setValueAtTime(noteGain.gain.value, audioCtx.currentTime);
    noteGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    setTimeout(() => { try { osc1.stop(); osc2.stop(); } catch (e) { } }, 120);
    delete activeOscillators[noteName];
    const keyEl = document.querySelector(`.key[data-note="${noteName}"]`);
    if (keyEl) keyEl.classList.remove('active');
}

// =============================================
// KEYBOARD UI
// =============================================
const mouseHeldKeys = new Set(); // track which keys are pressed by mouse
let isMouseDown = false;

// Global mouseup releases all mouse-held notes (fixes mouse freeze bug)
document.addEventListener('mousedown', () => { isMouseDown = true; });
document.addEventListener('mouseup', () => {
    isMouseDown = false;
    mouseHeldKeys.forEach(noteName => stopNote(noteName));
    mouseHeldKeys.clear();
});

function buildKeyboard() {
    const kb = document.getElementById('keyboard');
    kb.innerHTML = '';
    BASE_NOTES.forEach(note => {
        const key = document.createElement('div');
        const noteName = getNoteName(note);
        key.className = `key ${note.type}`;
        key.dataset.note = noteName;
        key.innerText = note.key.toUpperCase();

        key.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (!audioCtx) initAudio();
            playNote(noteName, getFreq(note.baseFreq));
            mouseHeldKeys.add(noteName);
        });
        // mouseenter while held = glide to next key
        key.addEventListener('mouseenter', () => {
            if (isMouseDown) {
                if (!audioCtx) initAudio();
                playNote(noteName, getFreq(note.baseFreq));
                mouseHeldKeys.add(noteName);
            }
        });
        key.addEventListener('mouseleave', () => {
            if (isMouseDown) {
                stopNote(noteName);
                mouseHeldKeys.delete(noteName);
            }
        });
        key.addEventListener('touchstart', (e) => { e.preventDefault(); if (!audioCtx) initAudio(); playNote(noteName, getFreq(note.baseFreq)); });
        key.addEventListener('touchend', (e) => { e.preventDefault(); stopNote(noteName); });
        kb.appendChild(key);
    });
}
buildKeyboard();

// =============================================
// DRONE KEYBOARD ROW
// =============================================
const DRONE_NOTES_ROW = [
    { label: 'Sa (C)', freq: 130.81, name: 'drone_Sa' },
    { label: 'Re (D)', freq: 146.83, name: 'drone_Re' },
    { label: 'Ga (E)', freq: 164.81, name: 'drone_Ga' },
    { label: 'Ma (F)', freq: 174.61, name: 'drone_Ma' },
    { label: 'Pa (G)', freq: 196.00, name: 'drone_Pa' },
    { label: 'Dha (A)', freq: 220.00, name: 'drone_Dha' },
    { label: 'Ni (B)', freq: 246.94, name: 'drone_Ni' },
];

function toggleDrone(name, freq, el) {
    if (!audioCtx) initAudio();
    if (droneOscillators[name]) {
        const { osc1, osc2, gain } = droneOscillators[name];
        gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
        setTimeout(() => { try { osc1.stop(); osc2.stop(); } catch (e) { } }, 300);
        delete droneOscillators[name];
        el.classList.remove('active');
    } else {
        const osc1 = audioCtx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = freq;
        const osc2 = audioCtx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 2;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.5);
        osc1.connect(gain); osc2.connect(gain);
        gain.connect(audioCtx.destination);
        osc1.start(); osc2.start();
        droneOscillators[name] = { osc1, osc2, gain };
        el.classList.add('active');
    }
}

function buildDroneKeyboard() {
    const row = document.getElementById('drone-key-row');
    row.innerHTML = '';
    DRONE_NOTES_ROW.forEach((d, i) => {
        const key = document.createElement('div');
        key.className = 'drone-key';
        key.dataset.droneName = d.name;
        key.innerHTML = `<kbd class="drone-shortcut">${i + 1}</kbd><span class="dk-label">${d.label}</span>`;
        key.addEventListener('click', () => toggleDrone(d.name, d.freq, key));
        row.appendChild(key);
    });
}
buildDroneKeyboard();

// =============================================
// GLOBAL KEYBOARD HANDLER
// =============================================
let reverbLevel = 0.3;
const reverbSlider = document.getElementById('reverb-slider');
const volumeSlider = document.getElementById('volume-slider');

function changeOctave(dir) {
    const next = currentOctave + dir;
    if (next < 2 || next > 6) return;
    Object.keys(activeOscillators).forEach(n => stopNote(n));
    currentOctave = next;
    document.getElementById('octave-display').textContent = currentOctave;
    buildKeyboard();
}

document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    // Don't intercept if focus is on a slider or input
    if (e.target.tagName === 'INPUT') return;

    // ---- Bellows ----
    if (e.code === 'Space') {
        if (!audioCtx) initAudio();
        manualPressure = Math.min(1.2, manualPressure + 0.45);
        return;
    }

    // ---- Drone notes: 1-7 ----
    const droneIndex = parseInt(e.key) - 1;
    if (droneIndex >= 0 && droneIndex < DRONE_NOTES_ROW.length) {
        if (!audioCtx) initAudio();
        const d = DRONE_NOTES_ROW[droneIndex];
        const el = document.querySelector(`.drone-key[data-drone-name="${d.name}"]`);
        if (el) toggleDrone(d.name, d.freq, el);
        // sync panel buttons too
        const panelBtn = document.querySelector(`.drone-btn[data-note="${d.name.replace('drone_', '')}"]`);
        if (panelBtn) panelBtn.classList.toggle('active', el?.classList.contains('active'));
        return;
    }

    // ---- Octave: Arrow Up / Arrow Down ----
    if (e.code === 'ArrowUp') { e.preventDefault(); changeOctave(+1); return; }
    if (e.code === 'ArrowDown') { e.preventDefault(); changeOctave(-1); return; }

    // ---- Reverb: [ decrease ] increase ----
    if (e.code === 'BracketLeft') { reverbLevel = Math.max(0, reverbLevel - 0.1); syncReverb(); return; }
    if (e.code === 'BracketRight') { reverbLevel = Math.min(1, reverbLevel + 0.1); syncReverb(); return; }

    // ---- Volume: - decrease = increase ----
    if (e.code === 'Minus') { masterVolume = Math.max(0, masterVolume - 0.1); syncVolume(); return; }
    if (e.code === 'Equal') { masterVolume = Math.min(1, masterVolume + 0.1); syncVolume(); return; }

    // ---- Notes ----
    const keyChar = e.key.toLowerCase();
    const note = BASE_NOTES.find(n => n.key === keyChar);
    if (note) playNote(getNoteName(note), getFreq(note.baseFreq));
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') return;
    if (e.target.tagName === 'INPUT') return;
    const keyChar = e.key.toLowerCase();
    const note = BASE_NOTES.find(n => n.key === keyChar);
    if (note) stopNote(getNoteName(note));
});

function syncReverb() {
    if (reverbGain && audioCtx) {
        reverbGain.gain.setTargetAtTime(reverbLevel, audioCtx.currentTime, 0.05);
        dryGain.gain.setTargetAtTime(1 - reverbLevel * 0.5, audioCtx.currentTime, 0.05);
    }
    if (reverbSlider) reverbSlider.value = reverbLevel;
}
function syncVolume() {
    if (volumeSlider) volumeSlider.value = masterVolume;
}

// =============================================
// OCTAVE CONTROLS
// =============================================
const octaveDisplay = document.getElementById('octave-display');
document.getElementById('octave-up-btn').addEventListener('click', () => {
    if (currentOctave >= 6) return;
    // Stop all active notes before changing octave
    Object.keys(activeOscillators).forEach(n => stopNote(n));
    currentOctave++;
    octaveDisplay.textContent = currentOctave;
    buildKeyboard();
});
document.getElementById('octave-down-btn').addEventListener('click', () => {
    if (currentOctave <= 2) return;
    Object.keys(activeOscillators).forEach(n => stopNote(n));
    currentOctave--;
    octaveDisplay.textContent = currentOctave;
    buildKeyboard();
});

// =============================================
// REVERB SLIDER
// =============================================
document.getElementById('reverb-slider').addEventListener('input', (e) => {
    const rev = parseFloat(e.target.value);
    if (reverbGain) {
        reverbGain.gain.setTargetAtTime(rev, audioCtx.currentTime, 0.05);
        dryGain.gain.setTargetAtTime(1 - rev * 0.5, audioCtx.currentTime, 0.05);
    }
});

// =============================================
// MASTER VOLUME SLIDER
// =============================================
document.getElementById('volume-slider').addEventListener('input', (e) => {
    masterVolume = parseFloat(e.target.value);
});

// =============================================
// DRONE NOTES
// =============================================
document.querySelectorAll('.drone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!audioCtx) initAudio();
        const freq = parseFloat(btn.dataset.freq);
        const noteName = btn.dataset.note;

        if (droneOscillators[noteName]) {
            // Stop drone
            const { osc1, osc2, gain } = droneOscillators[noteName];
            gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
            setTimeout(() => { try { osc1.stop(); osc2.stop(); } catch (e) { } }, 300);
            delete droneOscillators[noteName];
            btn.classList.remove('active');
        } else {
            // Start drone (low octave, quiet, always on)
            const osc1 = audioCtx.createOscillator();
            osc1.type = 'sawtooth';
            osc1.frequency.value = freq; // One octave lower

            const osc2 = audioCtx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.value = freq * 2; // Add an octave harmonic

            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.5);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(audioCtx.destination); // Drone bypasses bellows (always audible)

            osc1.start();
            osc2.start();
            droneOscillators[noteName] = { osc1, osc2, gain };
            btn.classList.add('active');
        }
    });
});

// =============================================
// BELLOWS PRESSURE SYSTEM
// =============================================
let manualPressure = 0;
let cameraPressure = 0;
let isPumpHeld = false;

const pressureFill = document.getElementById('pressure-fill');
const bellowsSvg = document.getElementById('bellows-svg');

// Click-and-hold pump button
const pumpBtn = document.getElementById('pump-btn');

function startPump() {
    if (!audioCtx) initAudio();
    isPumpHeld = true;
    pumpBtn.classList.add('pumping');
}
function endPump() {
    isPumpHeld = false;
    pumpBtn.classList.remove('pumping');
}

pumpBtn.addEventListener('mousedown', startPump);
pumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startPump(); });
document.addEventListener('mouseup', endPump);
document.addEventListener('touchend', endPump);

// Continuous bellows update loop
function updateBellows() {
    // While pump is held, build pressure. Otherwise decay.
    if (isPumpHeld) {
        manualPressure = Math.min(1, manualPressure + 0.035);
    } else {
        manualPressure = Math.max(0, manualPressure - 0.018);
    }

    const totalPressure = Math.min(1, Math.max(manualPressure, cameraPressure));

    // Apply to UI
    pressureFill.style.width = `${totalPressure * 100}%`;

    // Animate bellows SVG - compress/expand horizontally with pressure
    const scaleX = 1 - totalPressure * 0.35;
    bellowsSvg.style.transform = `scaleX(${scaleX})`;

    // Apply to audio
    if (masterGain && audioCtx) {
        const targetGain = totalPressure * masterVolume;
        masterGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.04);
    }

    requestAnimationFrame(updateBellows);
}
requestAnimationFrame(updateBellows);

// =============================================
// CAMERA MODE (fallback)
// =============================================
const video = document.getElementById('camera-feed');
const canvas = document.getElementById('camera-canvas');
const ctx2d = canvas.getContext('2d', { willReadFrequently: true });
const btnCamera = document.getElementById('start-camera-btn');
const statusDot = document.getElementById('camera-status');
const statusText = document.getElementById('camera-status-text');

let isCameraActive = false;
let baselineBrightness = -1;

btnCamera.addEventListener('click', async () => {
    if (!isCameraActive) {
        initAudio();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth / 4;
                canvas.height = video.videoHeight / 4;
                isCameraActive = true;
                statusDot.classList.add('active');
                statusText.innerText = 'Camera Active';
                btnCamera.innerText = '📷 Disable Camera';
                btnCamera.classList.add('active-btn');
                requestAnimationFrame(processCamera);
            };
        } catch (err) {
            alert('Camera access denied or unavailable.');
        }
    } else {
        const tracks = video.srcObject?.getTracks();
        if (tracks) tracks.forEach(t => t.stop());
        video.srcObject = null;
        isCameraActive = false;
        cameraPressure = 0;
        baselineBrightness = -1;
        statusDot.classList.remove('active');
        statusText.innerText = 'Inactive';
        btnCamera.innerText = '📷 Camera Mode';
        btnCamera.classList.remove('active-btn');
    }
});

let lastFrameTime = 0;
function processCamera(time) {
    if (!isCameraActive) { cameraPressure = 0; return; }
    if (time - lastFrameTime > 33) {
        ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);
        const data = ctx2d.getImageData(0, 0, canvas.width, canvas.height).data;
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
            total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        const avg = total / (canvas.width * canvas.height);
        if (baselineBrightness === -1 || avg > baselineBrightness) baselineBrightness = avg;
        let p = 0;
        if (baselineBrightness > 0) {
            p = Math.max(0, Math.min(1, (baselineBrightness - avg) / baselineBrightness));
            p = Math.min(1, Math.pow(p, 1.5) * 1.5);
        }
        cameraPressure = p;
        lastFrameTime = time;
    }
    requestAnimationFrame(processCamera);
}
