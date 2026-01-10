export class VisualizerEngine {
    constructor(audioElement, canvasElement, options = {}) {
        this.audio = audioElement;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        
        this.visualizerEnabled = options.enabled || true;
        this.style = options.style || 'bars';
        this.sensitivity = options.sensitivity || 1.5;
        this.accentColor = options.accentColor || '#38bdf8';
        this.targetFps = options.targetFps || 60;
        this.musicEmojiEl = options.musicEmojiEl || null; 

        this.isRunning = false;
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        
        this.bassFilter = null;
        this.trebleFilter = null;
        this.reverbNode = null;
        this.reverbGain = null;

        this.lastRenderTime = 0;
        this.animationFrameId = null;
        this.frameCount = 0; 
    }

    init() {
        if (this.audioContext) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            if (!this.source) {
                this.source = this.audioContext.createMediaElementSource(this.audio);
            }

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
            
            this.trebleFilter.connect(this.reverbNode);
            this.reverbNode.connect(this.reverbGain);
            this.reverbGain.connect(this.analyser);

            this.analyser.connect(this.audioContext.destination);

            this.updateAnalyserSettings();
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        } catch (e) {
            console.error("VisualizerEngine init error:", e);
            this.visualizerEnabled = false;
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

    updateSettings(newSettings) {
        if (newSettings.style !== undefined) this.style = newSettings.style;
        if (newSettings.sensitivity !== undefined) {
            this.sensitivity = newSettings.sensitivity;
            this.updateAnalyserSettings();
        }
        if (newSettings.accentColor !== undefined) this.accentColor = newSettings.accentColor;
        if (newSettings.targetFps !== undefined) this.targetFps = newSettings.targetFps;
        if (newSettings.enabled !== undefined) this.visualizerEnabled = newSettings.enabled;
        
        this.updateAudioEffects(newSettings);
    }

    updateAudioEffects(settings) {
        if (!this.audioContext) return;
        const t = this.audioContext.currentTime;

        if (this.bassFilter && settings.bassBoostEnabled !== undefined) {
            const bg = settings.bassBoostEnabled ? (parseFloat(settings.bassBoostValue) || 6) : 0;
            this.bassFilter.gain.cancelScheduledValues(t);
            this.bassFilter.gain.setTargetAtTime(bg, t, 0.1);
        }

        if (this.trebleFilter && settings.trebleBoostEnabled !== undefined) {
            const tg = settings.trebleBoostEnabled ? (parseFloat(settings.trebleBoostValue) || 6) : 0;
            this.trebleFilter.gain.cancelScheduledValues(t);
            this.trebleFilter.gain.setTargetAtTime(tg, t, 0.1);
        }

        if (this.reverbGain && settings.reverbEnabled !== undefined) {
            const val = parseFloat(settings.reverbValue) || 30;
            const rg = settings.reverbEnabled ? (val / 100) : 0;
            this.reverbGain.gain.cancelScheduledValues(t);
            this.reverbGain.gain.setTargetAtTime(rg, t, 0.1);
        }
    }

    updateAnalyserSettings() {
        if (!this.analyser) return;
        this.analyser.smoothingTimeConstant = 0.6;
        this.analyser.fftSize = 512;
        const dbValue = -15 - (this.sensitivity * 15);
        this.analyser.maxDecibels = dbValue;
    }

    resize() {
        if (this.canvas && this.canvas.parentElement) {
            this.canvas.width = this.canvas.parentElement.clientWidth;
            this.canvas.height = this.canvas.parentElement.clientHeight;
        }
    }

    start() {
        if (!this.visualizerEnabled) return;
        if (!this.audioContext) this.init();
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        if (!this.isRunning) {
            this.isRunning = true;
            this.draw();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    draw() {
        if (!this.isRunning) return;

        const now = performance.now();
        const interval = 1000 / this.targetFps;
        const delta = now - this.lastRenderTime;

        if (delta < interval) {
            this.animationFrameId = requestAnimationFrame(() => this.draw());
            return;
        }

        this.lastRenderTime = now - (delta % interval);
        this.animationFrameId = requestAnimationFrame(() => this.draw());
        this.frameCount++; 

        const width = this.canvas.width;
        const height = this.canvas.height;
        this.ctx.clearRect(0, 0, width, height);

        if (!this.analyser) return;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        const boost = 1 + (this.sensitivity * 0.1);
        const ac = this.accentColor;

        if (this.style === 'bars') this.drawBars(width, height, ac, boost);
        else if (this.style === 'waveform') this.drawWaveform(width, height, ac);
        else if (this.style === 'orbit') this.drawOrbit(width, height, ac, boost);
        else if (this.style === 'glitch') this.drawGlitch(width, height, ac, boost);
        else if (this.style === 'retro') this.drawRetro(width, height, ac, boost);
        else if (this.style === 'sakura_bloom') this.drawSakura(width, height, ac, boost);
        else if (this.style === 'zen') this.drawZen(width, height, ac, boost);
        else if (this.style === 'moonlight') this.drawMoonlight(width, height, ac, boost);

        if (this.musicEmojiEl && !this.audio.paused) {
            const blv = (this.dataArray[0] + this.dataArray[1]) / 2;
            const fy = Math.sin(this.audio.currentTime * 2) * 10;
            let js = (blv > 180) ? 1 + (Math.min((blv - 180) / 50, 1) * 0.15) : 1;
            this.musicEmojiEl.style.transform = `translateY(${fy}px) scale(${js})`;
        }
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

    drawRetro(width, height, ac, boost) {
        const targetRows = 18;
        const totalBlockHeight = height / targetRows;
        const gapY = 1.5; 
        const blockHeight = totalBlockHeight - gapY;
        const blockWidth = blockHeight * 5.0; 
        const gapX = 3;
        const totalBlockWidth = blockWidth + gapX;
        const centerX = width / 2;
        const maxColumns = Math.ceil(centerX / totalBlockWidth) + 1;
        const usefulDataLimit = Math.floor(this.dataArray.length * 0.5);

        for (let i = 0; i < maxColumns; i++) {
            const dataIndex = Math.floor((i / maxColumns) * usefulDataLimit); 
            let val = this.dataArray[dataIndex] * boost;
            const numBlocks = Math.floor((val / 255) * targetRows);
            const xRight = centerX + (i * totalBlockWidth);
            const xLeft = centerX - ((i + 1) * totalBlockWidth);

            for (let j = 0; j < numBlocks; j++) {
                 if (j >= targetRows) break;
                 const y = height - ((j + 1) * totalBlockHeight);
                 
                 if (j >= 16) this.ctx.fillStyle = '#ff4444';      
                 else if (j >= 12) this.ctx.fillStyle = '#ffcc00'; 
                 else this.ctx.fillStyle = ac;                    

                 this.ctx.shadowBlur = blockHeight * 0.8; 
                 this.ctx.shadowColor = this.ctx.fillStyle;
                 
                 this.ctx.fillRect(xLeft, y, blockWidth, blockHeight);
                 this.ctx.fillRect(xRight, y, blockWidth, blockHeight);
            }
        }
        this.ctx.shadowBlur = 0;
    }

    drawSakura(width, height, ac, boost) {
        const centerX = width / 2, centerY = height / 2;
        const count = 12;
        const radiusBase = Math.min(width, height) / 3;
        
        for (let i = 0; i < count; i++) {
            const dataIdx = Math.floor((i / count) * (this.dataArray.length * 0.5));
            const val = this.dataArray[dataIdx];
            const angle = (i / count) * Math.PI * 2 + (Date.now() * 0.0003);
            const drift = Math.sin(Date.now() * 0.001 + i) * 20;
            const dist = radiusBase + (val / 255) * (radiusBase * 1.2) * boost + drift;
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;
            const size = 8 + (val / 255) * 15;
            
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(angle + (Date.now() * 0.0008));
            this.ctx.fillStyle = '#fbcfe8';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#fbcfe8';
            this.ctx.globalAlpha = 0.6 + (val / 255) * 0.4;

            for (let p = 0; p < 5; p++) {
                this.ctx.rotate((Math.PI * 2) / 5);
                this.ctx.beginPath();
                this.ctx.ellipse(0, -size, size * 0.6, size, 0, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
            this.ctx.fillStyle = '#fda4af';
            this.ctx.fill();
            this.ctx.restore();
        }
        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowBlur = 0;
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

    getAndResetFrameCount() {
        const count = this.frameCount;
        this.frameCount = 0;
        return count;
    }
}