import './theme.css';

const LOCK = ['visualizer-style-select', 'theme-select', 'animation-select', 'toggle-use-custom-color', 'accent-color-picker'];

export default {
    onEnable: (app) => {
        document.body.classList.add('racing-drive-active');
        document.documentElement.setAttribute('data-theme', 'racing_drive');
        document.documentElement.style.setProperty('--accent', '#dc2626');
        if (app.ui && app.ui.updateCachedColor) app.ui.updateCachedColor();

        const intro = document.getElementById('racing-drive-intro');
        if (intro) {
            intro.classList.add('visible');
            setTimeout(() => intro.classList.remove('visible'), 7200);
        }

        if (app.visualizer) app.visualizer.updateSettings({ style: 'bars', accentColor: '#dc2626' });
        if (app.ui && app.ui.applyAnimationSetting) app.ui.applyAnimationSetting('off');

        setTimeout(() => {
            LOCK.forEach(id => { const el = document.getElementById(id); if (el) { el.disabled = true; el.closest('.setting-item')?.classList.add('tp-locked'); } });
            const animSel = document.getElementById('animation-select');
            if (animSel) animSel.value = 'off';
        }, 80);

        const speedlines = document.createElement('div');
        speedlines.id = 'racing-speedlines-overlay';
        document.body.appendChild(speedlines);
    },

    onDisable: (app) => {
        document.body.classList.remove('racing-drive-active');
        document.documentElement.removeAttribute('data-theme');

        if (app.visualizer) app.visualizer.updateSettings({ accentColor: '#38bdf8' });
        LOCK.forEach(id => { const el = document.getElementById(id); if (el) { el.disabled = false; el.closest('.setting-item')?.classList.remove('tp-locked'); } });

        const speedlines = document.getElementById('racing-speedlines-overlay');
        if (speedlines) speedlines.remove();
    }
};
