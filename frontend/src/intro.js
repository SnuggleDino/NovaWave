// intro.js
// Manages the selection and lifecycle of startup intros

import { WaterdropIntro } from './introEngine.js';

export class IntroManager {
    constructor(settings) {
        this.settings = settings || {};
        this.activeIntro = null;
        this.intros = {
            'waterdrop': WaterdropIntro,
            // Future intros can be added here
        };
    }

    play() {
        // 1. Determine which intro to show
        // Default to 'waterdrop' if nothing set, or if set to 'none' handle that.
        const introKey = this.settings.activeIntro || 'waterdrop';
        
        if (introKey === 'none') {
            return Promise.resolve();
        }

        const IntroClass = this.intros[introKey];
        if (!IntroClass) {
            console.warn(`Intro '${introKey}' not found. Falling back to Waterdrop.`);
            // Fallback
            this.activeIntro = new WaterdropIntro();
        } else {
            this.activeIntro = new IntroClass();
        }

        // 2. Mount (Render) the intro
        this.activeIntro.mount();

        // 3. Wait for animation to finish
        // Standard duration for NovaWave intros is ~2.5 - 3 seconds
        return new Promise((resolve) => {
            setTimeout(() => {
                this.stop();
                resolve();
            }, 2600); // 2.6s matches the CSS animation timings + buffer
        });
    }

    stop() {
        if (this.activeIntro) {
            const el = document.getElementById(this.activeIntro.containerId);
            if (el) {
                // Fade out effect
                el.style.opacity = '0';
                el.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    this.activeIntro.unmount();
                    this.activeIntro = null;
                }, 500);
            } else {
                this.activeIntro.unmount();
                this.activeIntro = null;
            }
        }
    }
    
    // Helper to update settings dynamically if needed later
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }
}
