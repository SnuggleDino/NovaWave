import './theme.css';

const LOCK = ['visualizer-style-select', 'theme-select', 'animation-select', 'toggle-use-custom-color', 'accent-color-picker'];

export default {
    onEnable: (app) => {
        document.body.classList.add('stardew-valley-active');
        document.documentElement.setAttribute('data-theme', 'stardew_valley');
        document.documentElement.style.setProperty('--accent', '#f59e0b');
        if (app.ui && app.ui.updateCachedColor) app.ui.updateCachedColor();

        const intro = document.getElementById('stardew-intro');
        if (intro) {
            intro.classList.add('visible');
            setTimeout(() => intro.classList.remove('visible'), 7000);
        }

        if (app.visualizer) app.visualizer.updateSettings({ style: 'waveform', accentColor: '#f59e0b' });
        if (app.ui && app.ui.applyAnimationSetting) app.ui.applyAnimationSetting('off');

        setTimeout(() => {
            LOCK.forEach(id => { const el = document.getElementById(id); if (el) { el.disabled = true; el.closest('.setting-item')?.classList.add('tp-locked'); } });
            const animSel = document.getElementById('animation-select');
            if (animSel) animSel.value = 'off';
        }, 80);

        const stars = document.createElement('div');
        stars.id = 'stardew-stars-overlay';
        document.body.appendChild(stars);
    },

    onDisable: (app) => {
        document.body.classList.remove('stardew-valley-active');
        document.documentElement.removeAttribute('data-theme');

        if (app.visualizer) app.visualizer.updateSettings({ accentColor: '#38bdf8' });
        LOCK.forEach(id => { const el = document.getElementById(id); if (el) { el.disabled = false; el.closest('.setting-item')?.classList.remove('tp-locked'); } });

        const stars = document.getElementById('stardew-stars-overlay');
        if (stars) stars.remove();
    }
};
