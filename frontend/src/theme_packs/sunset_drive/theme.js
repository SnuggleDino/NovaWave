import './theme.css';

const LOCK = ['visualizer-style-select', 'theme-select', 'animation-select', 'toggle-use-custom-color', 'accent-color-picker'];

export default {
    onEnable: (app) => {
        document.body.classList.add('sunset-active');
        document.documentElement.setAttribute('data-theme', 'sunset');
        document.documentElement.style.setProperty('--accent', '#f97316');
        if (app.ui && app.ui.updateCachedColor) app.ui.updateCachedColor();

        const intro = document.getElementById('sunset-intro');
        if (intro) {
            intro.classList.add('visible');
            setTimeout(() => intro.classList.remove('visible'), 3200);
        }

        if (app.visualizer) app.visualizer.updateSettings({ style: 'bars', accentColor: '#f97316' });
        if (app.ui && app.ui.updateEmoji) app.ui.updateEmoji('sunset_sun');
        if (app.ui && app.ui.applyAnimationSetting) app.ui.applyAnimationSetting('plasma');

        setTimeout(() => {
            LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
            const animSel = document.getElementById('animation-select');
            if (animSel) animSel.value = 'plasma';
        }, 80);

        // Persistent neon horizon line
        const horizon = document.createElement('div');
        horizon.id = 'sunset-horizon-overlay';
        document.body.appendChild(horizon);
    },

    onDisable: (app) => {
        document.body.classList.remove('sunset-active');
        document.documentElement.removeAttribute('data-theme');

        if (app.visualizer) app.visualizer.updateSettings({ accentColor: '#38bdf8' });

        LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });

        const horizon = document.getElementById('sunset-horizon-overlay');
        if (horizon) horizon.remove();
    }
};
