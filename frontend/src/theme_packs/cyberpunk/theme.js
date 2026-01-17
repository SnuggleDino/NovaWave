export default {
    onEnable: (app) => {
        document.body.classList.add('cyberpunk-active');
        document.documentElement.setAttribute('data-theme', 'cyberpunk');
        document.documentElement.style.setProperty('--accent', '#fcee0a');
        if (app.ui && app.ui.updateCachedColor) app.ui.updateCachedColor();
        const intro = document.getElementById('cyberpunk-intro');
        if (intro) { intro.classList.add('visible'); setTimeout(() => intro.classList.remove('visible'), 2500); }
        if (app.visualizer) app.visualizer.updateSettings({ style: 'glitch', accentColor: '#fcee0a' });
        if (app.ui && app.ui.updateEmoji) app.ui.updateEmoji('cyber');
    },
    onDisable: (app) => {
        document.body.classList.remove('cyberpunk-active');
        document.documentElement.removeAttribute('data-theme');
        if (app.visualizer) app.visualizer.updateSettings({ accentColor: '#38bdf8' });
    }
};