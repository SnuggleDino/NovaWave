import { Intro } from './intro_base.js';

const BLOCK_COUNT = 26;
const BLOCK_DELAY_MS = 140;
const FIRST_BLOCK_MS = 320;

export class NovaWave95Intro extends Intro {
    constructor() {
        super('nw95-intro');
        this._styleEl = null;
    }

    mount() {
        this._injectStyles();

        const blocks = Array.from({ length: BLOCK_COUNT }, (_, i) =>
            `<div class="nw95-block" style="animation-delay:${FIRST_BLOCK_MS + i * BLOCK_DELAY_MS}ms"></div>`
        ).join('');

        const overlay = document.createElement('div');
        overlay.id = this.containerId;
        overlay.innerHTML = `
            <div class="nw95-cloud nw95-c-big nw95-k1"></div>
            <div class="nw95-cloud nw95-c-mid nw95-k2"></div>
            <div class="nw95-cloud nw95-c-big nw95-k3"></div>
            <div class="nw95-cloud nw95-c-small nw95-k4"></div>
            <div class="nw95-cloud nw95-c-mid nw95-k5"></div>

            <div class="nw95-center">
                <div class="nw95-lock">
                    <span class="nw95-brand">NovaWave</span>
                    <span class="nw95-num">95</span>
                </div>
            </div>

            <div class="nw95-foot">
                <div class="nw95-bar">${blocks}</div>
                <div class="nw95-tag">Starting NovaWave&nbsp;…</div>
            </div>

            <div class="nw95-scanlines"></div>
        `;

        document.body.appendChild(overlay);
    }

    _injectStyles() {
        const style = document.createElement('style');
        style.id = 'nw95-styles';
        style.textContent = `
            #nw95-intro {
                position: fixed;
                inset: 0;
                z-index: 9999;
                overflow: hidden;
                background: linear-gradient(180deg, #1f6fd0 0%, #4a9fe6 45%, #bfe3ff 100%);
            }

            /* --- drifting clouds (gentle left<->right sway, never leave screen) --- */
            #nw95-intro .nw95-cloud {
                position: absolute;
                background: #fff;
                border-radius: 100px;
                opacity: 0.9;
                filter: blur(0.3px);
                will-change: transform;
            }
            #nw95-intro .nw95-cloud::before,
            #nw95-intro .nw95-cloud::after {
                content: "";
                position: absolute;
                background: #fff;
                border-radius: 100px;
            }
            #nw95-intro .nw95-c-big   { width: 190px; height: 48px; }
            #nw95-intro .nw95-c-big::before   { width: 96px; height: 96px; top: -40px; left: 30px; }
            #nw95-intro .nw95-c-big::after    { width: 64px; height: 64px; top: -26px; left: 104px; }
            #nw95-intro .nw95-c-mid   { width: 140px; height: 38px; }
            #nw95-intro .nw95-c-mid::before   { width: 72px; height: 72px; top: -30px; left: 22px; }
            #nw95-intro .nw95-c-mid::after    { width: 50px; height: 50px; top: -18px; left: 80px; }
            #nw95-intro .nw95-c-small { width: 100px; height: 28px; }
            #nw95-intro .nw95-c-small::before { width: 52px; height: 52px; top: -22px; left: 16px; }

            #nw95-intro .nw95-k1 { top: 16%; left: 12%; opacity: 0.95; animation: nw95-sway-lg 19s ease-in-out infinite alternate; }
            #nw95-intro .nw95-k2 { top: 30%; left: 64%; opacity: 0.85; animation: nw95-sway-md 15s ease-in-out infinite alternate; animation-delay: -4s; }
            #nw95-intro .nw95-k3 { top: 52%; left: 26%; opacity: 0.80; animation: nw95-sway-md 23s ease-in-out infinite alternate; animation-delay: -9s; }
            #nw95-intro .nw95-k4 { top: 62%; left: 72%; opacity: 0.70; animation: nw95-sway-sm 17s ease-in-out infinite alternate; animation-delay: -2s; }
            #nw95-intro .nw95-k5 { top: 40%; left: 45%; opacity: 0.60; animation: nw95-sway-lg 27s ease-in-out infinite alternate; animation-delay: -13s; }
            @keyframes nw95-sway-sm { from { transform: translateX(-22px); } to { transform: translateX(22px); } }
            @keyframes nw95-sway-md { from { transform: translateX(-46px); } to { transform: translateX(46px); } }
            @keyframes nw95-sway-lg { from { transform: translateX(-70px); } to { transform: translateX(70px); } }

            /* --- centered brand lockup --- */
            #nw95-intro .nw95-center {
                position: absolute;
                inset: 0;
                z-index: 5;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #nw95-intro .nw95-lock {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                line-height: 0.9;
                animation: nw95-rise 0.9s cubic-bezier(.22, 1, .36, 1) forwards;
            }
            #nw95-intro .nw95-brand {
                font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
                font-size: 4.4rem;
                font-weight: 300;
                color: #fff;
                letter-spacing: 0.04em;
                text-shadow: 0 2px 4px rgba(0, 40, 90, 0.25), 0 8px 26px rgba(0, 40, 90, 0.35);
            }
            #nw95-intro .nw95-num {
                align-self: flex-end;
                font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
                font-size: 5.2rem;
                font-weight: 800;
                letter-spacing: -0.01em;
                color: #fff;
                text-shadow: 0 3px 0 rgba(0, 40, 90, 0.28), 0 6px 2px rgba(0, 40, 90, 0.22), 0 12px 30px rgba(0, 30, 80, 0.40);
            }
            /* shine sweep across the lockup */
            #nw95-intro .nw95-lock::after {
                content: "";
                position: absolute;
                inset: -10px;
                pointer-events: none;
                background: linear-gradient(110deg, transparent 38%, rgba(255, 255, 255, 0.55) 50%, transparent 62%);
                transform: translateX(-130%);
                mix-blend-mode: soft-light;
                animation: nw95-shine 3s ease-in-out 0.9s infinite;
            }
            @keyframes nw95-shine { 0% { transform: translateX(-130%); } 55%, 100% { transform: translateX(130%); } }
            @keyframes nw95-rise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }

            /* --- loading bar (lower third) --- */
            #nw95-intro .nw95-foot {
                position: absolute;
                bottom: 60px;
                left: 0;
                right: 0;
                z-index: 5;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 14px;
            }
            #nw95-intro .nw95-bar {
                display: flex;
                gap: 3px;
                flex-wrap: nowrap;
            }
            #nw95-intro .nw95-block {
                width: 13px;
                height: 14px;
                background: #fff;
                opacity: 0;
                box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.7), inset -1px -1px 0 rgba(0, 60, 120, 0.45);
                animation: nw95-block-appear 0.06s ease forwards;
            }
            #nw95-intro .nw95-tag {
                font-size: 14px;
                color: #eaf4ff;
                letter-spacing: 0.05em;
                text-shadow: 0 1px 4px rgba(0, 40, 90, 0.4);
            }
            @keyframes nw95-block-appear { from { opacity: 0; } to { opacity: 1; } }

            /* --- CRT scanlines overlay --- */
            #nw95-intro .nw95-scanlines {
                position: absolute;
                inset: 0;
                z-index: 6;
                pointer-events: none;
                background: repeating-linear-gradient(
                    0deg,
                    transparent 0px,
                    transparent 2px,
                    rgba(0, 0, 0, 0.10) 2px,
                    rgba(0, 0, 0, 0.10) 4px
                );
            }
        `;
        document.head.appendChild(style);
        this._styleEl = style;
    }

    unmount() {
        if (this._styleEl) {
            this._styleEl.remove();
            this._styleEl = null;
        }
        super.unmount();
    }
}
