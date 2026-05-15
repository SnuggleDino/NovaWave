import './theme.css';

const LOCK = ['visualizer-style-select', 'theme-select', 'animation-select', 'toggle-use-custom-color', 'accent-color-picker'];

let bubbleInterval = null;

function startBubbles() {
    const overlay = document.createElement('div');
    overlay.id = 'aqua-bubbles-overlay';
    document.body.appendChild(overlay);

    bubbleInterval = setInterval(() => {
        const b = document.createElement('div');
        b.className = 'aqua-bubble';
        const size = Math.random() * 16 + 6;
        b.style.width = size + 'px';
        b.style.height = size + 'px';
        b.style.left = Math.random() * 100 + '%';
        const dur = (Math.random() * 6 + 7).toFixed(1) + 's';
        b.style.setProperty('--dur', dur);
        b.style.setProperty('--drift', (Math.random() * 60 - 30).toFixed(0) + 'px');
        overlay.appendChild(b);
        setTimeout(() => b.remove(), 16000);
    }, 400);
}

function stopBubbles() {
    if (bubbleInterval) { clearInterval(bubbleInterval); bubbleInterval = null; }
    const overlay = document.getElementById('aqua-bubbles-overlay');
    if (overlay) overlay.remove();
}

export default {
    onEnable: (app) => {
        document.body.classList.add('aqua-deep-active');
        document.documentElement.setAttribute('data-theme', 'aqua_deep');
        document.documentElement.style.setProperty('--accent', '#00d4ff');
        if (app.ui && app.ui.updateCachedColor) app.ui.updateCachedColor();

        const intro = document.getElementById('aqua-intro');
        if (intro) {
            intro.classList.add('visible');
            setTimeout(() => intro.classList.remove('visible'), 3200);
        }

        if (app.visualizer) app.visualizer.updateSettings({ style: 'waveform', accentColor: '#00d4ff' });
        if (app.ui && app.ui.applyAnimationSetting) app.ui.applyAnimationSetting('off');

        setTimeout(() => {
            LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
            const animSel = document.getElementById('animation-select');
            if (animSel) animSel.value = 'off';
        }, 80);

        startBubbles();
    },

    onDisable: (app) => {
        document.body.classList.remove('aqua-deep-active');
        document.documentElement.removeAttribute('data-theme');

        if (app.visualizer) app.visualizer.updateSettings({ accentColor: '#38bdf8' });

        LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });

        stopBubbles();
    }
};
