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
        this.eqFilters = [];
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();

            if (!this.source) {
                this.source = this.audioContext.createMediaElementSource(this.audio);
            }

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;
            this.analyser.smoothingTimeConstant = 0.6;

            this.bassFilter = this.audioContext.createBiquadFilter();
            this.bassFilter.type = 'lowshelf';
            this.bassFilter.frequency.value = 120;
            this.bassFilter.gain.value = 0;

            this.trebleFilter = this.audioContext.createBiquadFilter();
            this.trebleFilter.type = 'highshelf';
            this.trebleFilter.frequency.value = 3000;
            this.trebleFilter.gain.value = 0;

            // --- 5 BiquadFilterNode ---
            const eqFrequencies = [60, 230, 910, 4000, 14000];
            this.eqFilters = eqFrequencies.map(freq => {
                const filter = this.audioContext.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1.0;
                filter.gain.value = 0;
                return filter;
            });

            this.reverbNode = this.audioContext.createConvolver();
            this.reverbNode.buffer = this.createReverbBuffer(2.0);
            this.reverbGain = this.audioContext.createGain();
            this.reverbGain.gain.value = 0;

            // --- Audio Chain ---
            // source → bass → treble → EQ[0..4] → analyser → destination
            this.source.connect(this.bassFilter);
            this.bassFilter.connect(this.trebleFilter);

            let lastNode = this.trebleFilter;
            this.eqFilters.forEach(filter => {
                lastNode.connect(filter);
                lastNode = filter;
            });

            // lastNode is now the final EQ filter
            lastNode.connect(this.analyser);

            // FIX: Reverb was previously branched off this.trebleFilter (before
            // the EQ filters), meaning EQ had no effect on the reverb signal.
            // It is now correctly branched off lastNode (after the full EQ chain),
            // so Bass + Treble + EQ all feed into the reverb as intended.
            lastNode.connect(this.reverbNode);
            this.reverbNode.connect(this.reverbGain);
            this.reverbGain.connect(this.analyser);

            this.analyser.connect(this.audioContext.destination);
            this.initialized = true;
        } catch (e) {
            console.error("[AudioExtras] init error:", e);
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
        this.bassFilter.gain.setTargetAtTime(gain, now, 0.1);
    }

    setTreble(value, enabled) {
        if (!this.audioContext || !this.trebleFilter) return;
        const now = this.audioContext.currentTime;
        const gain = enabled ? (parseFloat(value) || 0) : 0;
        this.trebleFilter.gain.setTargetAtTime(gain, now, 0.1);
    }

    // --- 5 BiquadFilterNode ---
    setEq(values, enabled) {
        if (!this.audioContext || !this.eqFilters.length) return;
        const now = this.audioContext.currentTime;
        this.eqFilters.forEach((filter, i) => {
            const val = enabled ? (parseFloat(values[i]) || 0) : 0;
            filter.gain.setTargetAtTime(val, now, 0.1);
        });
    }

    setReverb(value, enabled) {
        if (!this.audioContext || !this.reverbGain) return;
        const now = this.audioContext.currentTime;
        const val = parseFloat(value) || 0;
        const gain = enabled ? (val / 100) : 0;
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