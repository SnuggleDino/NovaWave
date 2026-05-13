import { Intro } from './intro_base.js';
import iconPng from '../assets/icon.png';

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
            <div class="nw95-scanlines"></div>
            <div class="nw95-stage">
                <div class="nw95-logo-row">
                    <img src="${iconPng}" alt="NovaWave" class="nw95-icon">
                    <div class="nw95-wordmark">
                        <span class="nw95-brand">NovaWave</span>
                        <span class="nw95-num">95</span>
                    </div>
                </div>
                <div class="nw95-bar-row">
                    <div class="nw95-bar">${blocks}</div>
                </div>
            </div>
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
                background: #000;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }

            .nw95-scanlines {
                position: absolute;
                inset: 0;
                background: repeating-linear-gradient(
                    0deg,
                    transparent 0px,
                    transparent 2px,
                    rgba(0, 0, 0, 0.18) 2px,
                    rgba(0, 0, 0, 0.18) 4px
                );
                pointer-events: none;
                z-index: 1;
            }

            .nw95-stage {
                position: relative;
                z-index: 2;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 44px;
                animation: nw95-fadein 0.55s ease forwards;
            }

            .nw95-logo-row {
                display: flex;
                align-items: center;
                gap: 22px;
            }

            .nw95-icon {
                width: 84px;
                height: 84px;
                object-fit: contain;
                filter: drop-shadow(0 0 16px rgba(56, 189, 248, 0.3));
            }

            .nw95-wordmark {
                display: flex;
                flex-direction: column;
                line-height: 1;
                gap: 0;
            }

            .nw95-brand {
                font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
                font-size: 2.1rem;
                font-weight: 300;
                color: #fff;
                letter-spacing: 0.06em;
            }

            .nw95-num {
                font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
                font-size: 2.8rem;
                font-weight: 700;
                color: #fff;
                letter-spacing: -0.03em;
                margin-top: -6px;
            }

            .nw95-bar-row {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0;
            }

            .nw95-bar {
                display: flex;
                gap: 3px;
            }

            .nw95-block {
                width: 13px;
                height: 13px;
                background: #0D47B8;
                opacity: 0;
                box-shadow:
                    inset 1px 1px 0 rgba(255, 255, 255, 0.28),
                    inset -1px -1px 0 rgba(0, 0, 0, 0.45);
                animation: nw95-block-appear 0.06s ease forwards;
            }

            @keyframes nw95-fadein {
                from { opacity: 0; }
                to   { opacity: 1; }
            }

            @keyframes nw95-block-appear {
                from { opacity: 0; }
                to   { opacity: 1; }
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
