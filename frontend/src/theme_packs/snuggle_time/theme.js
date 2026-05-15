import './theme.css';

const LOCK = ['visualizer-style-select', 'theme-select', 'animation-select', 'toggle-use-custom-color', 'visualizer-bars-select', 'emoji-select'];
const HEARTS = ['❤️', '💚', '🤍', '💛'];

let heartInterval = null;

function startHearts() {
    const container = document.createElement('div');
    container.id = 'snuggle-hearts-overlay';
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden;';
    document.body.appendChild(container);

    heartInterval = setInterval(() => {
        const heart = document.createElement('div');
        heart.className = 'snuggle-heart';
        heart.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
        heart.style.left = (Math.random() * 95) + '%';
        heart.style.fontSize = (Math.random() * 10 + 12) + 'px';
        const dur = (Math.random() * 3 + 5).toFixed(1) + 's';
        heart.style.setProperty('--dur', dur);
        container.appendChild(heart);
        setTimeout(() => heart.remove(), 8500);
    }, 700);
}

function stopHearts() {
    if (heartInterval) { clearInterval(heartInterval); heartInterval = null; }
    const container = document.getElementById('snuggle-hearts-overlay');
    if (container) container.remove();
}

export default {
    onEnable: (app) => {
        document.body.classList.add('snuggle-time-active');
        document.documentElement.setAttribute('data-theme', 'dinolove');
        document.documentElement.style.setProperty('--accent', '#c1d37f');
        if (app.ui && app.ui.updateCachedColor) app.ui.updateCachedColor();

        const intro = document.getElementById('snuggle-intro');
        if (intro) {
            intro.classList.add('visible');
            setTimeout(() => intro.classList.remove('visible'), 3000);
        }

        if (app.visualizer) app.visualizer.updateSettings({ style: 'retro', accentColor: '#c1d37f' });
        if (app.ui && app.ui.applyAnimationSetting) app.ui.applyAnimationSetting('snowfall');

        setTimeout(() => {
            LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
            const animSel = document.getElementById('animation-select');
            if (animSel) animSel.value = 'snowfall';
            const emojiSel = document.getElementById('emoji-select');
            if (emojiSel) emojiSel.value = 'loving_dinos';
            if (app.ui && app.ui.updateEmoji) app.ui.updateEmoji('loving_dinos');
        }, 80);

        startHearts();
    },

    onDisable: (app) => {
        document.body.classList.remove('snuggle-time-active');

        const savedTheme = localStorage.getItem('theme') || 'blue';
        document.documentElement.setAttribute('data-theme', savedTheme);

        if (app.visualizer) app.visualizer.updateSettings({ accentColor: '#38bdf8' });

        LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });

        stopHearts();
    }
};
