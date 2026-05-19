import { Intro } from './intro_base.js';

export class VinylDropIntro extends Intro {
    constructor() {
        super('vinyl-drop-intro');
    }

    mount() {
        const overlay = document.createElement('div');
        overlay.id = this.containerId;
        overlay.className = 'vinyl-drop-overlay';

        overlay.innerHTML = `
            <div class="vd-scene">
                <div class="vd-arm-wrap">
                    <div class="vd-needle-arm"></div>
                </div>
                <div class="vd-vinyl">
                    <div class="vd-grooves"></div>
                    <div class="vd-label">
                        <img src="/src/assets/icon.png" class="vd-label-icon" alt="NW" />
                    </div>
                </div>
                <div class="vd-title">NovaWave</div>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    unmount() {
        super.unmount();
    }
}
