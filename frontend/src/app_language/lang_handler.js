import { de_DE } from './language/de_DE.js';
import { en_EN } from './language/en_EN.js';
import { tr_TR } from './language/tr_TR.js';
import { es_ES } from './language/es_ES.js';
import { fr_FR } from './language/fr_FR.js';
import { it_IT } from './language/it_IT.js';

export const LangHandler = {
    languages: {
        'de': de_DE,
        'en': en_EN,
        'tr': tr_TR,
        'es': es_ES,
        'fr': fr_FR,
        'it': it_IT
    },
    
    currentLang: localStorage.getItem('language') || 'de',

    init: function(lang) {
        if (lang && this.languages[lang]) {
            this.currentLang = lang;
        }
        document.documentElement.lang = this.currentLang;
    },

    setLanguage: function(lang) {
        if (this.languages[lang]) {
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            document.documentElement.lang = lang;
            return true;
        }
        return false;
    },

    tr: function(key, ...args) {
        const langData = this.languages[this.currentLang] || this.languages['de'];
        let text = langData[key] || this.languages['de'][key] || key;
        
        if (typeof text === 'function') {
            return text(...args);
        }

        // Support for {} placeholders
        if (args.length > 0 && typeof text === 'string') {
            args.forEach(arg => {
                text = text.replace('{}', arg);
            });
        }
        
        return text;
    },

    getAvailableLanguages: function() {
        return [
            { code: 'de', label: 'Deutsch' },
            { code: 'en', label: 'English' },
            { code: 'tr', label: 'T\u00FCrk\u00E7e' },
            { code: 'es', label: 'Espa\u00F1ol' },
            { code: 'fr', label: 'Fran\u00E7ais' },
            { code: 'it', label: 'Italiano' }
        ];
    }
};
