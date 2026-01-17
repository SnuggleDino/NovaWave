export class AudioExtras {
    constructor(audioElement) {
        this.audio = audioElement;
        this.audioContext = null;
        this.source = null;
        this.analyser = null;
        this.bassFilter = null;
        this.trebleFilter = null;
        this.reverbNode = null;
        this.reverbGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();

            // Source creation
            if (!this.source) {
                this.source = this.audioContext.createMediaElementSource(this.audio);
            }

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;
            this.analyser.smoothingTimeConstant = 0.6;

            // --- Bass Boost (LowShelf) ---
            this.bassFilter = this.audioContext.createBiquadFilter();
            this.bassFilter.type = 'lowshelf';
            this.bassFilter.frequency.value = 120; // Hz
            this.bassFilter.gain.value = 0;

            // --- Crystalizer (HighShelf) ---
            this.trebleFilter = this.audioContext.createBiquadFilter();
            this.trebleFilter.type = 'highshelf';
            this.trebleFilter.frequency.value = 3000; // Hz
            this.trebleFilter.gain.value = 0;

            // --- Reverb (Convolver) ---
            this.reverbNode = this.audioContext.createConvolver();
            this.reverbNode.buffer = this.createReverbBuffer(2.0);
            this.reverbGain = this.audioContext.createGain();
            this.reverbGain.gain.value = 0;

            this.source.connect(this.bassFilter);
            this.bassFilter.connect(this.trebleFilter);

            this.trebleFilter.connect(this.analyser);

            // Reverb Parallel Chain
            this.trebleFilter.connect(this.reverbNode);
            this.reverbNode.connect(this.reverbGain);
            this.reverbGain.connect(this.analyser);

            this.analyser.connect(this.audioContext.destination);

            this.initialized = true;
            console.log("[AudioExtras] initialized successfully.");

        } catch (e) {
            console.error("[AudioExtras] init failed:", e);
        }
    }

    createReverbBuffer(duration) {
        if (!this.audioContext) return null;
        const rate = this.audioContext.sampleRate;
        const len = rate * duration;
        const buffer = this.audioContext.createBuffer(2, len, rate);
        for (let c = 0; c < 2; c++) {
            const channel = buffer.getChannelData(c);
            for (let i = 0; i < len; i++) {
                channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
            }
        }
        return buffer;
    }

    setBass(value, enabled) {
        if (!this.audioContext || !this.bassFilter) return;
        const now = this.audioContext.currentTime;
        const gain = enabled ? (parseFloat(value) || 0) : 0;
        this.bassFilter.gain.cancelScheduledValues(now);
        this.bassFilter.gain.setTargetAtTime(gain, now, 0.1);
    }

    setTreble(value, enabled) {
        if (!this.audioContext || !this.trebleFilter) return;
        const now = this.audioContext.currentTime;
        const gain = enabled ? (parseFloat(value) || 0) : 0;
        this.trebleFilter.gain.cancelScheduledValues(now);
        this.trebleFilter.gain.setTargetAtTime(gain, now, 0.1);
    }

    setReverb(value, enabled) {
        if (!this.audioContext || !this.reverbGain) return;
        const now = this.audioContext.currentTime;
        const val = parseFloat(value) || 0;
        const gain = enabled ? (val / 100) : 0;
        this.reverbGain.gain.cancelScheduledValues(now);
        this.reverbGain.gain.setTargetAtTime(gain, now, 0.1);
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    getAnalyser() {
        return this.analyser;
    }
}
