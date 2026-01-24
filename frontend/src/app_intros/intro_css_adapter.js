import { Intro } from './intro_base.js';

/**
 * Adapter for intros that already exist in index.html and only need to be toggled via CSS class.
 * Automatically resolves after a timeout (handled by manager usually, but we can add hooks here).
 */
export class CssBasedIntro extends Intro {
    constructor(elementId) {
        super(elementId);
    }

    mount() {
        const el = document.getElementById(this.containerId);
        if (el) {
            el.classList.add('visible');
        } else {
            console.warn(`[CssBasedIntro] Element with ID '${this.containerId}' not found.`);
        }
    }

    unmount() {
        const el = document.getElementById(this.containerId);
        if (el) {
            el.classList.remove('visible');
        }
    }
}
export class InteractiveIntro extends CssBasedIntro {
    constructor(elementId, buttonId) {
        super(elementId);
        this.buttonId = buttonId;
        this.resolveFn = null;
        this.boundClickHandler = this.handleClick.bind(this);
    }

    mount() {
        super.mount();
        const btn = document.getElementById(this.buttonId);
        if (btn) {
            btn.addEventListener('click', this.boundClickHandler);
            btn.focus();
        }
    }

    handleClick() {
        if (this.resolveFn) {
            this.resolveFn();
        }
    }

    waitForFinish() {
        return new Promise((resolve) => {
            this.resolveFn = resolve;
        });
    }

    unmount() {
        const btn = document.getElementById(this.buttonId);
        if (btn) {
            btn.removeEventListener('click', this.boundClickHandler);
        }
        super.unmount();
    }
}