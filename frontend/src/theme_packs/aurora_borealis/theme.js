import './theme.css';

const LOCK = ['visualizer-style-select', 'theme-select', 'animation-select', 'toggle-use-custom-color', 'accent-color-picker'];

export default {
    onEnable: (app) => {
        document.body.classList.add('aurora-borealis-active');
        document.documentElement.setAttribute('data-theme', 'aurora_borealis');
        document.documentElement.style.setProperty('--accent', '#34d399');
        if (app.ui && app.ui.updateCachedColor) app.ui.updateCachedColor();

        const intro = document.getElementById('aurora-intro');
        if (intro) {
            intro.classList.add('visible');
            setTimeout(() => intro.classList.remove('visible'), 3500);
        }

        if (app.visualizer) app.visualizer.updateSettings({ style: 'waveform', accentColor: '#34d399' });
        if (app.ui && app.ui.applyAnimationSetting) app.ui.applyAnimationSetting('aurora');

        setTimeout(() => {
            LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
            const animSel = document.getElementById('animation-select');
            if (animSel) animSel.value = 'aurora';
        }, 80);
    },

    onDisable: (app) => {
        document.body.classList.remove('aurora-borealis-active');
        document.documentElement.removeAttribute('data-theme');

        if (app.visualizer) app.visualizer.updateSettings({ accentColor: '#38bdf8' });

        LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });
    }
};
