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
        console.log('[Intro] Playing intro:', introKey);

        if (introKey === 'none') {
            return Promise.resolve();
        }

        const IntroClass = this.intros[introKey];
        if (!IntroClass) {
            console.error('[Intro] Unknown intro key:', introKey, 'Available:', Object.keys(this.intros));
            return Promise.resolve();
        }

        this.activeIntro = new IntroClass();
        this.activeIntro.mount();

        return new Promise((resolve) => {
            setTimeout(() => {
                this.stop();
                resolve();
            }, 4000);
        });
    }

    stop() {
        return new Promise((resolve) => {
            if (this.activeIntro) {
                const el = document.getElementById(this.activeIntro.containerId);
                if (el) {
                    el.style.opacity = '0';
                    el.style.transition = 'opacity 0.5s ease';
                    setTimeout(() => {
                        this.activeIntro.unmount();
                        this.activeIntro = null;
                        resolve();
                    }, 500);
                } else {
                    this.activeIntro.unmount();
                    this.activeIntro = null;
                    resolve();
                }
            } else {
                resolve();
            }
        });
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }
}