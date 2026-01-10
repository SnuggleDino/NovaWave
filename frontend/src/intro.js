// intro.js
// Manages the selection and lifecycle of startup intros

import { WaterdropIntro, NovaWave95Intro } from './introEngine.js';

export class IntroManager {
    constructor(settings) {
        this.settings = settings || {};
        this.activeIntro = null;
        this.intros = {
            'waterdrop': WaterdropIntro,
            'novawave95': NovaWave95Intro
        };
    }

    play() {
        const introKey = this.settings.activeIntro || 'waterdrop';
        
        if (introKey === 'none') {
            return Promise.resolve();
        }

        const IntroClass = this.intros[introKey];
        if (!IntroClass) {
            this.activeIntro = new WaterdropIntro();
        } else {
            this.activeIntro = new IntroClass();
        }

        this.activeIntro.mount();

        // 3. Wait for animation to finish
        // We increased this to 4s to give complex intros like Win95 enough time
        return new Promise((resolve) => {
            setTimeout(() => {
                this.stop();
                resolve();
            }, 4000); 
        });
    }

    stop() {
        if (this.activeIntro) {
            const el = document.getElementById(this.activeIntro.containerId);
            if (el) {
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
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }
}