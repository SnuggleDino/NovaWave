export default {
    onEnable: (app) => {
        document.body.classList.add('sunset-active');
        document.documentElement.setAttribute('data-theme', 'sunset');
        document.documentElement.style.setProperty('--accent', '#f97316');
        if (app.ui && app.ui.updateCachedColor) app.ui.updateCachedColor();
        const intro = document.getElementById('sunset-intro');
        if (intro) { intro.classList.add('visible'); setTimeout(() => intro.classList.remove('visible'), 3000); }
        if (app.visualizer) app.visualizer.updateSettings({ style: 'bars', accentColor: '#f97316' }); // Retrowave bars
        if (app.ui && app.ui.updateEmoji) app.ui.updateEmoji('sunset_sun');

        // --- Sector: Animation ---
        if (app.ui && app.ui.applyAnimationSetting) app.ui.applyAnimationSetting('plasma');
    },
    onDisable: (app) => {
        document.body.classList.remove('sunset-active');
        document.documentElement.removeAttribute('data-theme');
        if (app.visualizer) app.visualizer.updateSettings({ accentColor: '#38bdf8' });
    }
};