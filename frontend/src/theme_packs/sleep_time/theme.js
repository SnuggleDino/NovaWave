import './theme.css';

const LOCK = ['visualizer-style-select', 'theme-select', 'animation-select', 'toggle-use-custom-color', 'accent-color-picker'];

let starInterval = null;

function startStars() {
    const container = document.createElement('div');
    container.id = 'sleep-stars-overlay';
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden;';
    document.body.appendChild(container);

    starInterval = setInterval(() => {
        const star = document.createElement('div');
        star.className = 'sleep-star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 90 + '%';
        const dur = (Math.random() * 2 + 1.5).toFixed(2) + 's';
        const delay = (Math.random() * 2).toFixed(2) + 's';
        star.style.setProperty('--dur', dur);
        star.style.setProperty('--delay', delay);
        container.appendChild(star);
        setTimeout(() => star.remove(), 5500);
    }, 250);
}

function stopStars() {
    if (starInterval) { clearInterval(starInterval); starInterval = null; }
    const container = document.getElementById('sleep-stars-overlay');
    if (container) container.remove();
}

export default {
    onEnable: (app) => {
        document.body.classList.add('sleeptime-active');
        document.documentElement.setAttribute('data-theme', 'sleeptime');
        document.documentElement.style.setProperty('--accent', '#7b68ee');
        if (app.ui && app.ui.updateCachedColor) app.ui.updateCachedColor();

        const intro = document.getElementById('sleep-intro');
        if (intro) {
            intro.classList.add('visible');
            setTimeout(() => intro.classList.remove('visible'), 3500);
        }

        if (app.visualizer) app.visualizer.updateSettings({ style: 'orbit', accentColor: '#7b68ee' });
        if (app.ui && app.ui.updateEmoji) app.ui.updateEmoji('moon');
        if (app.ui && app.ui.applyAnimationSetting) app.ui.applyAnimationSetting('nebula');

        setTimeout(() => {
            LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
            const animSel = document.getElementById('animation-select');
            if (animSel) animSel.value = 'nebula';
        }, 80);

        startStars();
    },

    onDisable: (app) => {
        document.body.classList.remove('sleeptime-active');
        document.documentElement.removeAttribute('data-theme');

        if (app.visualizer) app.visualizer.updateSettings({ accentColor: '#38bdf8' });

        LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });

        stopStars();
    }
};
