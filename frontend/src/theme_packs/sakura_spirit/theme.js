let sakuraInterval;

function createSakuraPetals() {
    const container = document.getElementById('sakura-falling-container');
    if (!container) return; 
    
    container.innerHTML = '';
    sakuraInterval = setInterval(() => {
        const petal = document.createElement('div');
        petal.classList.add('falling-petal');
        petal.textContent = '🌸';
        petal.style.left = Math.random() * 100 + '%';
        petal.style.animationDuration = (Math.random() * 3 + 2) + 's';
        petal.style.opacity = Math.random();
        petal.style.fontSize = (Math.random() * 10 + 15) + 'px';
        container.appendChild(petal);
        
        setTimeout(() => petal.remove(), 5000);
    }, 300);
}

function stopSakuraPetals() {
    if (sakuraInterval) clearInterval(sakuraInterval);
    const container = document.getElementById('sakura-falling-container');
    if (container) container.innerHTML = '';
}

export default {
    onEnable: (app) => {
        document.body.classList.add('sakura-active');
        document.documentElement.setAttribute('data-theme', 'sakura');
        document.documentElement.style.setProperty('--accent', '#ffb7b2');
        if (app.ui && app.ui.updateCachedColor) app.ui.updateCachedColor();
        
        const intro = document.getElementById('sakura-intro');
        if (intro) { 
            intro.classList.add('visible'); 
            setTimeout(() => intro.classList.remove('visible'), 4000); 
        }
        
        if (app.visualizer) app.visualizer.updateSettings({ style: 'sakura_bloom', accentColor: '#ffb7b2' });
        if (app.ui && app.ui.updateEmoji) app.ui.updateEmoji('sakura_flower');
        
        // --- Sector: Animation ---
        if (app.ui && app.ui.applyAnimationSetting) app.ui.applyAnimationSetting('off');

        createSakuraPetals();
    },
    onDisable: (app) => {
        document.body.classList.remove('sakura-active');
        document.documentElement.removeAttribute('data-theme');
        stopSakuraPetals();
        
        if (app.visualizer) app.visualizer.updateSettings({ accentColor: '#38bdf8' }); // Restore default
    }
};