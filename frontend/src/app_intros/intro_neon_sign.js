import { Intro } from './intro_base.js';

export class NeonSignIntro extends Intro {
    constructor() {
        super('neon-sign-intro');
    }

    mount() {
        const overlay = document.createElement('div');
        overlay.id = this.containerId;
        overlay.className = 'neon-sign-overlay';

        overlay.innerHTML = `
            <div class="ns-container">
                <p class="ns-tagline">Now Playing</p>
                <div class="ns-sign">
                    <span class="ns-text">NovaWave</span>
                </div>
                <div class="ns-underline"></div>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    unmount() {
        super.unmount();
    }
}
