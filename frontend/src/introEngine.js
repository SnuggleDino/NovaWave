import iconPng from './assets/icon.png';
import { translations } from './translations.js';

function getIntroTr(key) {
    const lang = document.documentElement.lang || 'de';
    const dict = translations[lang] || translations.de;
    return dict[key] || key;
}

export class Intro {
    constructor(containerId) {
        this.containerId = containerId;
    }

    mount() {
    }

    unmount() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.remove();
        }
    }
}

export class WaterdropIntro extends Intro {
    constructor() {
        super('splash-screen');
    }

    mount() {
        const overlay = document.createElement('div');
        overlay.id = this.containerId;
        overlay.className = 'splash-overlay';

        overlay.innerHTML = `
            <div class="pulse-container">
                <div class="pulse-ring"></div>
                <div class="intro-content">
                    <img src="${iconPng}" alt="Logo" class="splash-logo">
                    <h1 class="splash-title">NovaWave</h1>
                    <p class="splash-slogan">Your Music &#8226; Your Style &#8226; Your Rules</p>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    }
}

export class EightBitIntro extends Intro {
    constructor() {
        super('splash-8bit');
    }

    mount() {
        const overlay = document.createElement('div');
        overlay.id = this.containerId;
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: #000; z-index: 999999; display: flex;
            flex-direction: column; align-items: center; justify-content: center;
            font-family: 'Courier New', monospace; color: white;
            image-rendering: pixelated;
        `;
        
        // Inject keyframes
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
            .press-start-btn {
                background: transparent; border: 2px solid #39ff14; color: #39ff14;
                padding: 10px 20px; font-family: inherit; font-size: 24px; cursor: pointer;
                animation: blink 1s infinite; text-transform: uppercase; margin-top: 40px;
                box-shadow: 4px 4px 0 #39ff14;
            }
            .press-start-btn:hover { background: #39ff14; color: #000; box-shadow: 4px 4px 0 #fff; }
            .intro-8bit-title {
                font-size: 40px; margin: 0; color: #fff; text-shadow: 4px 4px 0 #39ff14;
            }
        `;
        document.head.appendChild(style);
        this.styleEl = style;

        overlay.innerHTML = `
            <div style="text-align: center;">
                <img src="${iconPng}" style="width: 100px; height: 100px; margin-bottom: 20px;">
                <h1 class="intro-8bit-title">NOVAWAVE</h1>
                <p style="color: #ccc; font-size: 14px; margin-top: 10px; font-family: monospace;">&copy; 2026 THEME CORP</p>
                <button class="press-start-btn" id="btn-press-start">PRESS START</button>
            </div>
        `;

        document.body.appendChild(overlay);

        const btn = overlay.querySelector('#btn-press-start');
        btn.onclick = () => {
            this.playSound();
        };
        // Audio context requires user interaction to resume
    }

    playSound() {
         try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch(e) {}
    }

    unmount() {
        super.unmount();
        if (this.styleEl) this.styleEl.remove();
    }
}
