import './theme.css';

const LOCK = ['visualizer-style-select', 'theme-select', 'animation-select', 'toggle-use-custom-color', 'accent-color-picker', 'visualizer-bars-select'];

export default {
    onEnable: (app) => {
        document.body.classList.add('cyberpunk-active');
        document.documentElement.setAttribute('data-theme', 'cyberpunk');
        document.documentElement.style.setProperty('--accent', '#fcee0a');
        if (app.ui && app.ui.updateCachedColor) app.ui.updateCachedColor();

        const intro = document.getElementById('cyberpunk-intro');
        if (intro) {
            intro.classList.add('visible');
            setTimeout(() => intro.classList.remove('visible'), 2800);
        }

        if (app.visualizer) app.visualizer.updateSettings({ style: 'glitch', accentColor: '#fcee0a' });
        if (app.ui && app.ui.updateEmoji) app.ui.updateEmoji('cyber');
        if (app.ui && app.ui.applyAnimationSetting) app.ui.applyAnimationSetting('matrix');

        setTimeout(() => {
            LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
            const animSel = document.getElementById('animation-select');
            if (animSel) animSel.value = 'matrix';
        }, 80);

        // Persistent CRT scanline overlay
        const crt = document.createElement('div');
        crt.id = 'cyber-crt-overlay';
        document.body.appendChild(crt);
    },

    onDisable: (app) => {
        document.body.classList.remove('cyberpunk-active');
        document.documentElement.removeAttribute('data-theme');

        if (app.visualizer) app.visualizer.updateSettings({ accentColor: '#38bdf8' });

        LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });

        const crt = document.getElementById('cyber-crt-overlay');
        if (crt) crt.remove();
    }
};
