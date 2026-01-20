import { Intro } from './intro_base.js';
import iconPng from '../assets/icon.png';

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
