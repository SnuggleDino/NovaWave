export default {
    onEnable: (app) => {
        document.body.classList.add('sleeptime-active');
        document.documentElement.setAttribute('data-theme', 'sleeptime');
        document.documentElement.style.setProperty('--accent', '#7b68ee');
        if (app.ui && app.ui.updateCachedColor) app.ui.updateCachedColor();
        const intro = document.getElementById('sleep-intro');
        if (intro) { intro.classList.add('visible'); setTimeout(() => intro.classList.remove('visible'), 3500); }
        if (app.visualizer) app.visualizer.updateSettings({ style: 'moonlight', accentColor: '#7b68ee' });
        if (app.ui && app.ui.updateEmoji) app.ui.updateEmoji('moon');

        // --- Sector: Animation ---
        if (app.ui && app.ui.applyAnimationSetting) app.ui.applyAnimationSetting('nebula');
    },
    onDisable: (app) => {
        document.body.classList.remove('sleeptime-active');
        document.documentElement.removeAttribute('data-theme');
        if (app.visualizer) app.visualizer.updateSettings({ accentColor: '#38bdf8' });
    }
};