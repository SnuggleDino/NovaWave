export class Visualizer {
    constructor(audioElement, canvasId) {
        this.audio = audioElement;
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.isRunning = false;
        
        this.audioContext = null;
        this.source = null;
        this.analyser = null;
        this.bassFilter = null;
        this.trebleFilter = null;
        this.reverbNode = null;
        this.reverbGain = null;
        this.dataArray = null;
        
        this.style = 'bars'; 
        this.accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#38bdf8';
        
        if (this.canvas) {
            new ResizeObserver(() => this.resize()).observe(this.canvas.parentElement);
        }
    }

    init() {
        if (this.audioContext) return;
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        
        this.source = this.audioContext.createMediaElementSource(this.audio);
        this.analyser = this.audioContext.createAnalyser();
        
        this.bassFilter = this.audioContext.createBiquadFilter();
        this.bassFilter.type = 'lowshelf';
        this.bassFilter.frequency.value = 120;
        this.bassFilter.gain.value = 0;

        this.trebleFilter = this.audioContext.createBiquadFilter();
        this.trebleFilter.type = 'highshelf';
        this.trebleFilter.frequency.value = 3000;
        this.trebleFilter.gain.value = 0;

        this.reverbNode = this.audioContext.createConvolver();
        this.reverbNode.buffer = this.createReverbBuffer(2.0);
        this.reverbGain = this.audioContext.createGain();
        this.reverbGain.gain.value = 0;

        this.source.connect(this.bassFilter);
        this.bassFilter.connect(this.trebleFilter);
        this.trebleFilter.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        this.trebleFilter.connect(this.reverbNode);
        this.reverbNode.connect(this.reverbGain);
        this.reverbGain.connect(this.analyser);

        this.analyser.fftSize = 128; 
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    createReverbBuffer(duration) {
        const rate = this.audioContext.sampleRate;
        const length = rate * duration;
        const buffer = this.audioContext.createBuffer(2, length, rate);
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        return buffer;
    }

    setAudioEffects(bass, treble, reverbMix) {
        if (!this.audioContext) return;
        const t = this.audioContext.currentTime;
        if (this.bassFilter) this.bassFilter.gain.setTargetAtTime(bass, t, 0.1);
        if (this.trebleFilter) this.trebleFilter.gain.setTargetAtTime(treble, t, 0.1);
        if (this.reverbGain) this.reverbGain.gain.setTargetAtTime(reverbMix, t, 0.1);
    }

    start() {
        if (!this.canvas || !this.audioContext) this.init();
        if (this.audioContext && this.audioContext.state === 'suspended') this.audioContext.resume();
        if (!this.isRunning) {
            this.isRunning = true;
            this.resize();
            this.draw();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    resize() {
        if (this.canvas && this.canvas.parentElement) {
            this.canvas.width = this.canvas.parentElement.clientWidth;
            this.canvas.height = this.canvas.parentElement.clientHeight;
        }
    }

    updateColor() {
        this.accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    }

    draw() {
        if (!this.isRunning) return;
        requestAnimationFrame(this.draw.bind(this));

        this.analyser.getByteFrequencyData(this.dataArray);
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);
        
        const centerX = width / 2;
        const bufferLength = this.dataArray.length; 
        const usableDataCount = Math.floor(bufferLength * 0.7); 
        const barWidth = (width / 2) / usableDataCount; 

        for (let i = 0; i < usableDataCount; i++) {
            const value = this.dataArray[i];
            const percent = value / 255;
            const barHeight = (percent * height) * 0.9; 

            this.ctx.fillStyle = this.accentColor;
            this.ctx.fillRect(centerX + (i * barWidth), height - barHeight, barWidth - 1, barHeight);
            this.ctx.fillRect(centerX - ((i + 1) * barWidth), height - barHeight, barWidth - 1, barHeight);
        }
    }
}