import { Intro } from './intro_base.js';

export class TerminalBootIntro extends Intro {
    constructor() {
        super('terminal-boot-intro');
        this._timers = [];
    }

    mount() {
        const overlay = document.createElement('div');
        overlay.id = this.containerId;
        overlay.className = 'terminal-boot-overlay';

        overlay.innerHTML = `
            <div class="tb-window">
                <div class="tb-titlebar"><span>NovaWave Terminal</span></div>
                <div class="tb-body">
                    <div id="tb-lines"></div>
                    <div id="tb-logo" class="tb-logo">NovaWave</div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this._runSequence(overlay);
    }

    _typeLine(container, text, showCursor) {
        const line = document.createElement('p');
        line.className = 'tb-line';
        container.appendChild(line);

        let i = 0;
        const interval = setInterval(() => {
            line.textContent = text.slice(0, i + 1);
            i++;
            if (i >= text.length) {
                clearInterval(interval);
                if (showCursor) {
                    const cur = document.createElement('span');
                    cur.className = 'tb-cursor';
                    line.appendChild(cur);
                }
            }
        }, 36);
    }

    _runSequence(overlay) {
        const linesEl = overlay.querySelector('#tb-lines');
        const logoEl  = overlay.querySelector('#tb-logo');

        const lines  = ['> Initializing NovaWave...', '> Loading audio library...', '> Ready.'];
        const delays = [400, 1550, 2750];

        lines.forEach((text, i) => {
            const t = setTimeout(() => {
                this._typeLine(linesEl, text, i === lines.length - 1);
            }, delays[i]);
            this._timers.push(t);
        });

        const t = setTimeout(() => {
            if (logoEl) logoEl.classList.add('tb-logo--visible');
        }, 3600);
        this._timers.push(t);
    }

    unmount() {
        this._timers.forEach(clearTimeout);
        this._timers = [];
        super.unmount();
    }
}
