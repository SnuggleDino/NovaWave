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
                    <img src="./src/assets/icon.png" alt="Logo" class="splash-logo">
                    <h1 class="splash-title">NovaWave</h1>
                    <p class="splash-slogan">Your Music &#8226; Your Style &#8226; Your Rules</p>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    }
}

export class NovaWave95Intro extends Intro {
    constructor() {
        super('splash-95');
    }

    mount() {
        const overlay = document.createElement('div');
        overlay.id = this.containerId;
        overlay.className = 'splash-overlay type-95';
        overlay.innerHTML = `
            <div class="win95-window">
                <div class="win95-title-bar">
                    <div class="win95-title-text">
                        <img src="./src/assets/icon.png" class="win95-mini-icon">
                        ${getIntroTr('introWin95Title')}
                    </div>
                    <div class="win95-title-controls">
                        <button class="win95-btn-small">_</button>
                        <button class="win95-btn-small">X</button>
                    </div>
                </div>
                <div class="win95-body">
                    <div class="win95-upper">
                        <img src="./src/assets/icon.png" class="win95-main-logo">
                        <div class="win95-text-info">
                            <strong>NovaWave Player</strong>
                            <p>${getIntroTr('introWin95Version')}</p>
                            <p>${getIntroTr('introWin95CreatedBy')}</p>
                        </div>
                    </div>
                    <div class="win95-progress-section">
                        <p class="win95-status">${getIntroTr('introWin95Status')}</p>
                        <div class="win95-progress-container">
                            <div class="win95-progress-fill">
                                <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}