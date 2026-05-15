import './theme.css';

const LOCK = ['visualizer-style-select', 'theme-select', 'animation-select', 'toggle-use-custom-color', 'accent-color-picker'];
const TYPEWRITER_TEXT = 'study. relax. repeat.';

let typewriterTimeout = null;

function runTypewriter(el) {
    let i = 0;
    const cursor = document.createElement('span');
    cursor.className = 'lofi-cursor';
    el.appendChild(cursor);

    function type() {
        if (i < TYPEWRITER_TEXT.length) {
            el.insertBefore(document.createTextNode(TYPEWRITER_TEXT[i]), cursor);
            i++;
            typewriterTimeout = setTimeout(type, 80 + Math.random() * 60);
        }
    }
    type();
}

function stopTypewriter() {
    if (typewriterTimeout) { clearTimeout(typewriterTimeout); typewriterTimeout = null; }
}

function startRain() {
    const overlay = document.createElement('div');
    overlay.id = 'lofi-rain-overlay';
    document.body.appendChild(overlay);

    for (let i = 0; i < 60; i++) {
        const drop = document.createElement('div');
        drop.className = 'lofi-drop';
        const h = Math.random() * 60 + 30;
        drop.style.height = h + 'px';
        drop.style.left = Math.random() * 100 + '%';
        const dur = (Math.random() * 0.6 + 0.8).toFixed(2) + 's';
        const delay = (Math.random() * 2).toFixed(2) + 's';
        drop.style.setProperty('--dur', dur);
        drop.style.setProperty('--delay', delay);
        overlay.appendChild(drop);
    }
}

function stopRain() {
    const overlay = document.getElementById('lofi-rain-overlay');
    if (overlay) overlay.remove();
}

export default {
    onEnable: (app) => {
        document.body.classList.add('lofi-cafe-active');
        document.documentElement.setAttribute('data-theme', 'lofi_cafe');
        document.documentElement.style.setProperty('--accent', '#c9a86c');
        if (app.ui && app.ui.updateCachedColor) app.ui.updateCachedColor();

        const intro = document.getElementById('lofi-intro');
        const typeEl = document.getElementById('lofi-typewriter');
        if (intro) {
            intro.classList.add('visible');
            if (typeEl) runTypewriter(typeEl);
            setTimeout(() => {
                intro.classList.remove('visible');
                stopTypewriter();
            }, 4000);
        }

        if (app.visualizer) app.visualizer.updateSettings({ style: 'waveform', accentColor: '#c9a86c' });
        if (app.ui && app.ui.applyAnimationSetting) app.ui.applyAnimationSetting('off');

        setTimeout(() => {
            LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
            const animSel = document.getElementById('animation-select');
            if (animSel) animSel.value = 'off';
        }, 80);

        startRain();
    },

    onDisable: (app) => {
        document.body.classList.remove('lofi-cafe-active');
        document.documentElement.removeAttribute('data-theme');

        if (app.visualizer) app.visualizer.updateSettings({ accentColor: '#38bdf8' });

        LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });

        stopTypewriter();
        stopRain();
    }
};
