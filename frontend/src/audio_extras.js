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
        this.normGain = null;
        this._normInterval = null;
        this.eqFilters = [];
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        // Web Audio (createMediaElementSource) breaks <audio> playback on
        // WebKitGTK/Linux but works on Chromium WebView2 (Windows), so bypass it
        // only on WebKitGTK, detected by the absence of a Chrome/Edg UA token
        // (default to bypass if unsure, so Linux can't silently re-break).
        // window.__novawaveDisableWebAudio forces it on (true) / off (false).
        const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
        const isChromium = /\bChrome\/|\bEdg\//.test(ua);
        const override = (typeof window !== 'undefined') ? window.__novawaveDisableWebAudio : undefined;
        const disableWebAudio = (override !== undefined) ? !!override : !isChromium;
        if (disableWebAudio) {
            console.warn('[AudioExtras] Web Audio chain disabled (WebKitGTK/Linux compatibility) — effects/normalization/visualizer inactive, direct playback only.');
            return;
        }

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

            //--- Equalizer ---------------
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

            this.normGain = this.audioContext.createGain();
            this.normGain.gain.value = 1.0;

            // --- Audio Chain ---
            // source → bass → treble → EQ[0..4] → analyser → normGain → destination
            this.source.connect(this.bassFilter);
            this.bassFilter.connect(this.trebleFilter);

            let lastNode = this.trebleFilter;
            this.eqFilters.forEach(filter => {
                lastNode.connect(filter);
                lastNode = filter;
            });

            // lastNode is now the final EQ filter
            lastNode.connect(this.analyser);

            lastNode.connect(this.reverbNode);
            this.reverbNode.connect(this.reverbGain);
            this.reverbGain.connect(this.analyser);

            this.analyser.connect(this.normGain);
            this.normGain.connect(this.audioContext.destination);
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

    //--- Equalizer ---------------
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

    setNormalization(enabled) {
        if (!this.audioContext || !this.analyser || !this.normGain) return;
        if (this._normInterval) { clearInterval(this._normInterval); this._normInterval = null; }
        if (!enabled) {
            const now = this.audioContext.currentTime;
            this.normGain.gain.cancelAndHoldAtTime(now);
            this.normGain.gain.setTargetAtTime(1.0, now, 0.3);
            return;
        }
        const TARGET_RMS = 0.15;
        const MAX_GAIN = 2.5;
        const buf = new Float32Array(this.analyser.fftSize);
        this._normInterval = setInterval(() => {
            if (!this.audioContext || this.audio.paused) return;
            this.analyser.getFloatTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
            const rms = Math.sqrt(sum / buf.length);
            if (rms < 0.001) return;
            // Chromium scales audio.volume into the MediaElementSource signal - multiply
            // TARGET_RMS by the current volume so normalization doesn't override the
            // user's volume setting.
            const vol = this.audio.volume;
            const adjustedTarget = vol > 0 ? TARGET_RMS * vol : TARGET_RMS;
            const targetGain = Math.min(adjustedTarget / rms, MAX_GAIN);
            const now = this.audioContext.currentTime;
            this.normGain.gain.cancelAndHoldAtTime(now);
            // Faster decay (0.15s) when gain must drop to prevent audible spikes when
            // loud content follows a quiet section with an accumulated high normGain.
            const tc = targetGain < this.normGain.gain.value ? 0.15 : 0.8;
            this.normGain.gain.setTargetAtTime(targetGain, now, tc);
        }, 200);
    }

    resetNormGain() {
        if (!this.audioContext || !this.normGain) return;
        const now = this.audioContext.currentTime;
        this.normGain.gain.cancelAndHoldAtTime(now);
        this.normGain.gain.setTargetAtTime(1.0, now, 0.05);
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(e =>
                console.warn('[AudioExtras] resume failed:', e)
            );
        }
    }

    bindVisibilityResume() {
        this._visibilityHandler = () => {
            if (!document.hidden) this.resume();
        };
        document.addEventListener('visibilitychange', this._visibilityHandler);
    }

    destroy() {
        if (this._normInterval) { clearInterval(this._normInterval); this._normInterval = null; }
        if (this._visibilityHandler) {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
            this._visibilityHandler = null;
        }
        if (this.audioContext) {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
        }
    }

    getAnalyser() {
        return this.analyser;
    }

    getContext() {
        return this.audioContext;
    }
}