import { WaterdropIntro } from './intro_waterdrop.js';
import { CssBasedIntro, InteractiveIntro } from './intro_css_adapter.js';
import { RocketIntro } from './intro_rocket.js';

export class IntroManager {
    constructor(settings) {
        this.settings = settings || {};
        this.activeIntro = null;

        this.intros = {
            'waterdrop': WaterdropIntro,

            'dino_love': () => new CssBasedIntro('dino-intro'),

            'rocket': () => new RocketIntro(),

            '8bit': () => new InteractiveIntro('8bit-intro', 'btn-8bit-start'),

            'sleep': () => new CssBasedIntro('sleep-intro'),
            'snuggle': () => new CssBasedIntro('snuggle-intro'),
            'cyberpunk': () => new CssBasedIntro('cyberpunk-intro'),
            'sunset': () => new CssBasedIntro('sunset-intro'),
            'sakura': () => new CssBasedIntro('sakura-intro'),

            'novawave95': WaterdropIntro
        };
    }

    play() {
        const introKey = this.settings.activeIntro || 'waterdrop';
        console.log('[IntroManager] Playing intro:', introKey);

        if (introKey === 'none') {
            return Promise.resolve();
        }

        let IntroClassOrFactory = this.intros[introKey];

        if (!IntroClassOrFactory) {
            const potentialId = introKey.endsWith('-intro') ? introKey : introKey + '-intro';
            if (document.getElementById(potentialId)) {
                IntroClassOrFactory = () => new CssBasedIntro(potentialId);
            } else {
                console.error('[IntroManager] Unknown intro key:', introKey);
                IntroClassOrFactory = WaterdropIntro;
            }
        }

        if (typeof IntroClassOrFactory === 'function' && !(IntroClassOrFactory.prototype instanceof Object)) {
            this.activeIntro = IntroClassOrFactory();
        } else {
            this.activeIntro = new IntroClassOrFactory();
        }

        this.activeIntro.mount();

        if (this.activeIntro instanceof InteractiveIntro) {
            return this.activeIntro.waitForFinish().then(() => {
                return this.stop();
            });
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                this.stop();
                resolve();
            }, 4500);
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
                        el.style.opacity = '';
                        el.style.transition = '';

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
}
