import './theme.css';

const LOCK = ['visualizer-style-select', 'theme-select', 'animation-select', 'toggle-use-custom-color', 'accent-color-picker'];

let smokeInterval = null;

function startSmoke() {
    const overlay = document.createElement('div');
    overlay.id = 'jazz-smoke-overlay';
    document.body.appendChild(overlay);

    smokeInterval = setInterval(() => {
        const s = document.createElement('div');
        s.className = 'jazz-smoke';
        const size = Math.random() * 80 + 60;
        s.style.width = size + 'px';
        s.style.height = size + 'px';
        s.style.left = (Math.random() * 80 + 10) + '%';
        const dur = (Math.random() * 6 + 8).toFixed(1) + 's';
        s.style.setProperty('--dur', dur);
        s.style.setProperty('--drift', (Math.random() * 100 - 50).toFixed(0) + 'px');
        overlay.appendChild(s);
        setTimeout(() => s.remove(), 16000);
    }, 1200);
}

function stopSmoke() {
    if (smokeInterval) { clearInterval(smokeInterval); smokeInterval = null; }
    const overlay = document.getElementById('jazz-smoke-overlay');
    if (overlay) overlay.remove();
}

export default {
    onEnable: (app) => {
        document.body.classList.add('jazz-bourbon-active');
        document.documentElement.setAttribute('data-theme', 'jazz_bourbon');
        document.documentElement.style.setProperty('--accent', '#d97706');
        if (app.ui && app.ui.updateCachedColor) app.ui.updateCachedColor();

        const intro = document.getElementById('jazz-intro');
        if (intro) {
            intro.classList.add('visible');
            setTimeout(() => intro.classList.remove('visible'), 3500);
        }

        if (app.visualizer) app.visualizer.updateSettings({ style: 'bars', accentColor: '#d97706' });
        if (app.ui && app.ui.applyAnimationSetting) app.ui.applyAnimationSetting('flow');

        setTimeout(() => {
            LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
            const animSel = document.getElementById('animation-select');
            if (animSel) animSel.value = 'flow';
        }, 80);

        startSmoke();
    },

    onDisable: (app) => {
        document.body.classList.remove('jazz-bourbon-active');
        document.documentElement.removeAttribute('data-theme');

        if (app.visualizer) app.visualizer.updateSettings({ accentColor: '#38bdf8' });

        LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });

        stopSmoke();
    }
};
