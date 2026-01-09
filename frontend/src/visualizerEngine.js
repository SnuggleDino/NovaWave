// NovaWave Visualizer Engine
// Handles all canvas rendering and audio analysis logic

export class VisualizerEngine {
    constructor(audioElement, canvas, emojiElement, settings) {
        this.audio = audioElement;
        this.canvas = canvas;
        this.emojiElement = emojiElement;
        this.ctx = canvas ? canvas.getContext('2d') : null;
        this.settings = settings || {};
        
        this.audioContext = null;
        this.analyser = null;
        this.sourceNode = null;
        this.dataArray = null;
        this.isRunning = false;
        
        this.bassFilter = null;
        this.trebleFilter = null;
        this.reverbNode = null;
        this.reverbGain = null;
        
        this.lastRenderTime = 0;
        this.frameCount = 0;
        this.peaks = new Array(256).fill(0);
        
        console.log("VisualizerEngine: Instance created", { hasCanvas: !!canvas });
    }

    init() {
        if (this.audioContext || !this.audio || !this.canvas) return;
        try {
            console.log("VisualizerEngine: Initializing AudioContext");
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
            this.analyser = this.audioContext.createAnalyser();

            this.bassFilter = this.audioContext.createBiquadFilter();
            this.bassFilter.type = 'lowshelf';
            this.bassFilter.frequency.value = 120;

            this.trebleFilter = this.audioContext.createBiquadFilter();
            this.trebleFilter.type = 'highshelf';
            this.trebleFilter.frequency.value = 3000;

            this.reverbNode = this.audioContext.createConvolver();
            const buffer = this.createReverbBuffer(2.0);
            if (buffer) this.reverbNode.buffer = buffer;
            
            this.reverbGain = this.audioContext.createGain();
            this.reverbGain.gain.value = 0;

            this.analyser.fftSize = 512;
            this.updateAnalyserSettings();

            // Routing
            this.sourceNode.connect(this.bassFilter);
            this.bassFilter.connect(this.trebleFilter);
            this.trebleFilter.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            this.trebleFilter.connect(this.reverbNode);
            this.reverbNode.connect(this.reverbGain);
            this.reverbGain.connect(this.analyser);

            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            console.log("VisualizerEngine: Init successful");
        } catch (e) {
            console.error("VisualizerEngine: Init Error:", e);
        }
    }

    createReverbBuffer(duration) {
        if (!this.audioContext) return null;
        try {
            const rate = this.audioContext.sampleRate || 44100;
            const len = rate * duration;
            const buffer = this.audioContext.createBuffer(2, len, rate);
            for (let c = 0; c < 2; c++) {
                const channel = buffer.getChannelData(c);
                for (let i = 0; i < len; i++) {
                    channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
                }
            }
            return buffer;
        } catch (e) { return null; }
    }

    updateAnalyserSettings() {
        if (!this.analyser) return;
        const sensitivity = this.settings.visSensitivity || 1.5;
        this.analyser.smoothingTimeConstant = 0.6;
        this.analyser.maxDecibels = -15 - (sensitivity * 15);
    }

    updateAudioEffects() {
        if (!this.audioContext) return;
        const t = this.audioContext.currentTime;
        
        if (this.bassFilter) {
            const val = this.settings.bassBoostEnabled ? (this.settings.bassBoostValue || 6) : 0;
            this.bassFilter.gain.setTargetAtTime(val, t, 0.1);
        }
        if (this.trebleFilter) {
            const val = this.settings.trebleBoostEnabled ? (this.settings.trebleBoostValue || 6) : 0;
            this.trebleFilter.gain.setTargetAtTime(val, t, 0.1);
        }
        if (this.reverbGain) {
            const val = this.settings.reverbEnabled ? ((this.settings.reverbValue || 30) / 100) : 0;
            this.reverbGain.gain.setTargetAtTime(val, t, 0.1);
        }
    }

    updateEmojiAnimation() {
        if (!this.emojiElement || !this.dataArray || isNaN(this.audio.currentTime)) return;
        const blv = (this.dataArray[0] + this.dataArray[1]) / 2;
        const fy = Math.sin(this.audio.currentTime * 2) * 10;
        const boost = 1 + ((this.settings.visSensitivity || 1.5) * 0.1);
        let js = (blv > 180) ? 1 + (Math.min((blv - 180) / 50, 1) * 0.15 * boost) : 1; 
        this.emojiElement.style.transform = `translateY(${fy}px) scale(${js})`;
    }

    start() {
        if (!this.audioContext) this.init();
        if (this.audioContext && this.audioContext.state === 'suspended') this.audioContext.resume();
        if (!this.isRunning) {
            this.isRunning = true;
            this.draw();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.ctx && this.canvas) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw() {
        if (!this.isRunning) return;
        if (document.hidden) { requestAnimationFrame(() => this.draw()); return; }

        const now = performance.now();
        const targetFps = this.settings.targetFps || 60;
        const interval = 1000 / targetFps;
        if (now - this.lastRenderTime < interval) {
            requestAnimationFrame(() => this.draw());
            return;
        }
        this.lastRenderTime = now;
        requestAnimationFrame(() => this.draw());

        if (!this.analyser || !this.ctx) return;

        this.analyser.getByteFrequencyData(this.dataArray);
        this.updateEmojiAnimation();
        
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);
        
        const ac = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#38bdf8';
        const style = this.settings.visualizerStyle || 'bars';
        const boost = 1 + ((this.settings.visSensitivity || 1.5) * 0.1);
        const perfMode = this.settings.performanceMode;

        if (style === 'retro') this.drawRetro(width, height, ac, boost, perfMode);
        else if (style === 'sakura_bloom') this.drawSakura(width, height, ac, boost);
        else if (style === 'bars') this.drawBars(width, height, ac, boost);
        else if (style === 'waveform') this.drawWaveform(width, height, ac);
        else if (style === 'orbit') this.drawOrbit(width, height, ac, boost);
        else if (style === 'glitch') this.drawGlitch(width, height, ac, boost);
        else if (style === 'zen') this.drawZen(width, height, ac, boost);
        else if (style === 'moonlight') this.drawMoonlight(width, height, ac, boost);
    }

    drawRetro(width, height, ac, boost, perfMode) {
        const targetRows = 18;
        const totalBlockHeight = height / targetRows;
        const gapY = 1.5; 
        const blockHeight = totalBlockHeight - gapY;
        const blockWidth = blockHeight * 5.0; 
        const gapX = 3;
        const totalBlockWidth = blockWidth + gapX;
        const centerX = width / 2;
        let maxColumns = Math.min(50, Math.ceil(centerX / totalBlockWidth) + 1);
        const usefulDataLimit = Math.floor(this.dataArray.length * 0.5);

        for (let i = 0; i < maxColumns; i++) {
            const dataIndex = Math.floor((i / maxColumns) * usefulDataLimit); 
            const val = this.dataArray[dataIndex] * boost;
            const numBlocks = Math.floor((val / 255) * targetRows);
            const xRight = centerX + (i * totalBlockWidth);
            const xLeft = centerX - ((i + 1) * totalBlockWidth);

            for (let j = 0; j < numBlocks; j++) {
                 if (j >= targetRows) break;
                 const y = height - ((j + 1) * totalBlockHeight);
                 if (j >= 16) this.ctx.fillStyle = '#ff4444';      
                 else if (j >= 12) this.ctx.fillStyle = '#ffcc00'; 
                 else this.ctx.fillStyle = ac;                    

                 if (!perfMode) {
                    this.ctx.shadowBlur = blockHeight * 0.8; 
                    this.ctx.shadowColor = this.ctx.fillStyle;
                 }
                 this.ctx.fillRect(xLeft, y, blockWidth, blockHeight);
                 this.ctx.fillRect(xRight, y, blockWidth, blockHeight);
            }
        }
        this.ctx.shadowBlur = 0;
    }

    drawSakura(width, height, ac, boost) {
        const centerX = width / 2, centerY = height / 2;
        const count = 14; 
        const radiusBase = Math.min(width, height) / 3;
        for (let i = 0; i < count; i++) {
            const dataIdx = Math.floor((i / count) * (this.dataArray.length * 0.5));
            const val = this.dataArray[dataIdx];
            const angle = (i / count) * Math.PI * 2 + (Date.now() * 0.0003);
            const drift = Math.sin(Date.now() * 0.001 + i) * 25;
            const dist = radiusBase + (val / 255) * (radiusBase * 1.3) * boost + drift;
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;
            const size = 10 + (val / 255) * 18;
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(angle + (Date.now() * 0.0006));
            this.ctx.fillStyle = '#fbcfe8';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#fbcfe8';
            this.ctx.globalAlpha = 0.6 + (val / 255) * 0.4;
            for (let p = 0; p < 5; p++) {
                this.ctx.rotate((Math.PI * 2) / 5);
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.bezierCurveTo(-size/2, -size, -size, -size/2, 0, -size*0.8);
                this.ctx.bezierCurveTo(size, -size/2, size/2, -size, 0, 0);
                this.ctx.fill();
            }
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
            this.ctx.fillStyle = '#fda4af';
            this.ctx.fill();
            this.ctx.restore();
        }
        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowBlur = 0;
    }

    drawBars(width, height, ac, boost) {
        const bl = this.dataArray.length / 2;
        const bw = (width / bl) * 0.8;
        for (let i = 0; i < bl; i++) {
            const bh = (this.dataArray[i] / 255) * height * 0.8 * boost;
            this.ctx.fillStyle = ac;
            this.ctx.fillRect(i * (width / bl), height - bh, bw, bh);
        }
    }

    drawWaveform(width, height, ac) {
        this.ctx.beginPath();
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = ac;
        const sliceWidth = width / this.dataArray.length;
        let x = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = (v * height) / 2;
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
            x += sliceWidth;
        }
        this.ctx.stroke();
    }

    drawOrbit(width, height, ac, boost) {
        const centerX = width / 2, centerY = height / 2;
        for (let i = 0; i < 4; i++) {
            const val = this.dataArray[i * 8];
            const radius = (height / 6) + (val / 255) * (height / 3) * boost;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = i === 0 ? ac : `${ac}44`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            const angle = (Date.now() * 0.001 * (i + 1)) % (Math.PI * 2);
            this.ctx.beginPath();
            this.ctx.arc(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius, 4, 0, Math.PI * 2);
            this.ctx.fillStyle = "#fff";
            this.ctx.fill();
        }
    }

    drawGlitch(width, height, ac, boost) {
        const bars = 30, bw = width / bars;
        for (let i = 0; i < bars; i++) {
            const val = this.dataArray[i * 3];
            const bh = (val / 255) * height * 0.9 * boost;
            this.ctx.fillStyle = ac;
            this.ctx.globalAlpha = 0.8;
            this.ctx.fillRect(i * bw, height - bh, bw - 4, bh);
            if (val > 210 && Math.random() > 0.9) {
                this.ctx.fillStyle = "#fff";
                this.ctx.globalAlpha = 1.0;
                this.ctx.fillRect(i * bw - 5, height - bh - 10, bw + 10, 3);
            }
        }
        this.ctx.globalAlpha = 1.0;
    }

    drawZen(width, height, ac, boost) {
        const centerX = width / 2, centerY = height / 2;
        const blv = (this.dataArray[0] + this.dataArray[2]) / 2;
        const count = 16;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const dist = (blv / 255) * (height / 2.2) * boost;
            this.ctx.beginPath();
            this.ctx.arc(centerX + Math.cos(angle) * dist, centerY + Math.sin(angle) * dist, 4, 0, Math.PI * 2);
            this.ctx.fillStyle = ac;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = ac;
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0;
    }

    drawMoonlight(width, height, ac, boost) {
        const centerX = width / 2, centerY = height / 2, moonRadius = Math.min(width, height) / 4.5;
        const blv = (this.dataArray[0] + this.dataArray[1] + this.dataArray[2]) / 3;
        const pulse = (blv / 255) * 25 * boost;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, moonRadius + pulse + 20, 0, Math.PI * 2);
        this.ctx.fillStyle = `${ac}11`;
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, moonRadius + (pulse * 0.5), 0, Math.PI * 2);
        this.ctx.fillStyle = ac;
        this.ctx.shadowBlur = 40 + pulse;
        this.ctx.shadowColor = ac;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        for (let i = 0; i < this.dataArray.length; i += 4) {
            const val = this.dataArray[i];
            if (val > 80) {
                const angle = (i / this.dataArray.length) * Math.PI * 2 + (Date.now() * 0.0003);
                const orbitDist = moonRadius + 30 + (val / 255) * (width / 4);
                const x = centerX + Math.cos(angle) * orbitDist;
                const y = centerY + Math.sin(angle) * orbitDist;
                this.ctx.beginPath();
                this.ctx.arc(x, y, (val / 255) * 4, 0, Math.PI * 2);
                this.ctx.fillStyle = i % 8 === 0 ? "#fff" : ac;
                this.ctx.globalAlpha = val / 255;
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
            }
        }
    }
}
