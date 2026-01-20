import { WaterdropIntro } from './intro_waterdrop.js';
import { CssBasedIntro } from './intro_css_adapter.js';

export class IntroManager {
    constructor(settings) {
        this.settings = settings || {};
        this.activeIntro = null;
        
        // Registry of available intros
        this.intros = {
            'waterdrop': WaterdropIntro,
            // 8bit removed
            
            // Factory functions for CSS-based intros (Static HTML)
            'dino_love': () => new CssBasedIntro('dino-intro'),
            'rocket': () => new CssBasedIntro('rocket-intro'),
            'sleep': () => new CssBasedIntro('sleep-intro'),
            'snuggle': () => new CssBasedIntro('snuggle-intro'),
            'cyberpunk': () => new CssBasedIntro('cyberpunk-intro'),
            'sunset': () => new CssBasedIntro('sunset-intro'),
            'sakura': () => new CssBasedIntro('sakura-intro'),
            
            // Fallback / Rename handling
            'novawave95': WaterdropIntro // Placeholder if Win95 Logic is missing or we map it to standard for now
        };
    }

    play() {
        const introKey = this.settings.activeIntro || 'waterdrop';
        console.log('[IntroManager] Playing intro:', introKey);

        if (introKey === 'none') {
            return Promise.resolve();
        }

        let IntroClassOrFactory = this.intros[introKey];
        
        // Fallback for intros not yet in the map but existing in HTML (legacy support logic)
        if (!IntroClassOrFactory) {
             // Try to map key to ID convention (e.g. 'snuggle' -> 'snuggle-intro')
             const potentialId = introKey.endsWith('-intro') ? introKey : introKey + '-intro';
             if (document.getElementById(potentialId)) {
                 IntroClassOrFactory = () => new CssBasedIntro(potentialId);
             } else {
                 console.error('[IntroManager] Unknown intro key:', introKey);
                 // Fallback to Waterdrop instead of nothing, feels safer
                 IntroClassOrFactory = WaterdropIntro; 
             }
        }

        // Instantiate
        if (typeof IntroClassOrFactory === 'function' && !(IntroClassOrFactory.prototype instanceof Object)) {
            // It's a factory function (arrow func)
            this.activeIntro = IntroClassOrFactory();
        } else {
            // It's a class constructor
            this.activeIntro = new IntroClassOrFactory();
        }

        this.activeIntro.mount();

        return new Promise((resolve) => {
            // Default duration 4.5s
            setTimeout(() => {
                this.stop();
                resolve();
            }, 4500); 
        });
    }

    stop() {
        return new Promise((resolve) => {
            if (this.activeIntro) {
                // Try to fade out if element exists
                const el = document.getElementById(this.activeIntro.containerId);
                if (el) {
                    el.style.opacity = '0';
                    el.style.transition = 'opacity 0.5s ease';
                    setTimeout(() => {
                        this.activeIntro.unmount();
                        // Reset style for next usage (important for static elements!)
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
