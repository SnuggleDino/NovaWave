import { Intro } from './intro_base.js';

/**
 * Adapter for intros that already exist in index.html and only need to be toggled via CSS class.
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
        // NOTE: We do NOT remove() the element from DOM as it is static in index.html
    }
}
