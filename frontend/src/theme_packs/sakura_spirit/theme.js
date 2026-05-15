import './theme.css';

const LOCK = ['visualizer-style-select', 'theme-select', 'animation-select', 'toggle-use-custom-color', 'accent-color-picker'];

let petalInterval = null;

function startPetals(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    petalInterval = setInterval(() => {
        const petal = document.createElement('div');
        petal.className = 'falling-petal';
        petal.style.left = Math.random() * 100 + '%';
        const dur = (Math.random() * 4 + 4).toFixed(1) + 's';
        petal.style.setProperty('--petal-dur', dur);
        petal.style.animationDelay = (Math.random() * 2).toFixed(1) + 's';
        petal.style.fontSize = (Math.random() * 6 + 8) + 'px';
        container.appendChild(petal);
        setTimeout(() => petal.remove(), 8500);
    }, 280);
}

function stopPetals() {
    if (petalInterval) { clearInterval(petalInterval); petalInterval = null; }
}

export default {
    onEnable: (app) => {
        document.body.classList.add('sakura-active');
        document.documentElement.setAttribute('data-theme', 'sakura');
        document.documentElement.style.setProperty('--accent', '#fbcfe8');
        if (app.ui && app.ui.updateCachedColor) app.ui.updateCachedColor();

        const intro = document.getElementById('sakura-intro');
        if (intro) {
            startPetals('sakura-falling-container');
            intro.classList.add('visible');
            setTimeout(() => {
                intro.classList.remove('visible');
                stopPetals();
                // Start persistent petals in the persistent container
                startPetals('sakura-persistent-petals');
            }, 4000);
        } else {
            startPetals('sakura-persistent-petals');
        }

        if (app.visualizer) app.visualizer.updateSettings({ style: 'sakura_bloom', accentColor: '#fbcfe8' });
        if (app.ui && app.ui.updateEmoji) app.ui.updateEmoji('sakura_flower');
        if (app.ui && app.ui.applyAnimationSetting) app.ui.applyAnimationSetting('off');

        setTimeout(() => {
            LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
            const animSel = document.getElementById('animation-select');
            if (animSel) animSel.value = 'off';
        }, 80);

        // Create persistent petal container
        if (!document.getElementById('sakura-persistent-petals')) {
            const persistentContainer = document.createElement('div');
            persistentContainer.id = 'sakura-persistent-petals';
            document.body.appendChild(persistentContainer);
        }
    },

    onDisable: (app) => {
        document.body.classList.remove('sakura-active');
        document.documentElement.removeAttribute('data-theme');

        if (app.visualizer) app.visualizer.updateSettings({ accentColor: '#38bdf8' });

        LOCK.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });

        stopPetals();
        const persistentContainer = document.getElementById('sakura-persistent-petals');
        if (persistentContainer) persistentContainer.remove();

        const intro = document.getElementById('sakura-intro');
        if (intro) intro.classList.remove('visible');
    }
};
