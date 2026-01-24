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

                    // Settings
                if (app.visualizer) {
                    app.visualizer.updateSettings({ 
                        enabled: true, 
                        style: 'retro',
                        accentColor: '#c1d37f' 
                    });
                }
        
                // --- Sector: Animation ---
                if (app.ui && app.ui.applyAnimationSetting) app.ui.applyAnimationSetting('snowfall');
                
                // Lock
                setTimeout(() => {
                    const elements = ['visualizer-style-select', 'theme-select', 'animation-select', 'toggle-use-custom-color', 'visualizer-bars-input'];
                    elements.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.disabled = true;
                    });
                    const anim = document.getElementById('animation-select');
                    if (anim) anim.value = 'snowfall';
                    
                    // Emoji
                    const emojiSelect = document.getElementById('emoji-select');            if (emojiSelect) {
                emojiSelect.value = 'loving_dinos';
                emojiSelect.disabled = true;
                if (app.ui && app.ui.updateEmoji) app.ui.updateEmoji('loving_dinos');
            }
        }, 50);
    },

    onDisable: (app) => {
        document.body.classList.remove('snuggle-time-active');
        document.documentElement.removeAttribute('data-theme');

        if (app.visualizer) {
            app.visualizer.updateSettings({ accentColor: '#38bdf8' });
        }

        // Unlock
        const elements = ['visualizer-style-select', 'theme-select', 'animation-select', 'toggle-use-custom-color', 'emoji-select', 'visualizer-bars-input'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = false;
        });
    }
};