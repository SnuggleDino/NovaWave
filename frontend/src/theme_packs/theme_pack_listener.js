/**
 * THEME PACK LISTENER
 * -------------------
 * This module automatically detects, registers, and manages Theme Packs.
 * Optimized for Vite and Wails build process.
 */

// 1. Auto-Detect all theme.json files (Eager load to get metadata immediately)
const themeConfigs = import.meta.glob('./*/theme.json', { eager: true });

// 2. Auto-Detect all theme.js files (Eager load to ensure all CSS/Assets are bundled)
const themeModules = import.meta.glob('./*/theme.js', { eager: true });

// 3. Auto-Detect all assets in all subfolders to ensure they are tracked by Vite
const themeAssets = import.meta.glob('./**/*.{png,jpg,jpeg,svg,ico,mp3,wav}', { eager: true, as: 'url' });

// State
let activeThemeId = null;
let loadedThemes = {}; 

// Pre-fill loadedThemes since we use eager loading
for (const path in themeModules) {
    const dir = path.split('/')[1];
    loadedThemes[dir] = themeModules[path].default;
}

export const ThemePackListener = {
    
    /**
     * Initializes the Theme Pack System.
     */
    init: function(appInstance) {
        console.log('[ThemeListener] Scanning for Theme Packs...');
        const container = document.getElementById('theme-pack-grid');
        if (!container) {
            console.error('[ThemeListener] Container #theme-pack-grid not found in HTML!');
            return;
        }

        container.innerHTML = '';

        // Define specific sort order
        const sortOrder = [
            'snuggle_time',
            'cyberpunk',
            'sleep_time',
            'sakura_spirit',
            'sunset_drive',
            '8_bit_theme'
        ];

        const themes = Object.keys(themeConfigs).map(key => {
            const conf = themeConfigs[key].default || themeConfigs[key];
            
            // Resolve the real preview URL from our assets glob
            if (conf.preview_image) {
                const dir = key.split('/')[1];
                const possiblePaths = [
                    `./${dir}/${conf.preview_image}`,
                    `./${dir}/assets/${conf.preview_image}`
                ];
                
                for (const p of possiblePaths) {
                    if (themeAssets[p]) {
                        conf.resolved_preview = themeAssets[p];
                        break;
                    }
                }
            }
            return conf;
        });

        themes.sort((a, b) => {
            const indexA = sortOrder.indexOf(a.id);
            const indexB = sortOrder.indexOf(b.id);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.name.localeCompare(b.name);
        });

        themes.forEach(config => {
            this.renderThemeCard(container, config, appInstance);
        });
    },

    renderThemeCard: function(container, config, app) {
        const card = document.createElement('div');
        card.className = 'theme-card';
        card.id = `${config.id}-pack-item`;

        let previewContent = '';
        if (config.resolved_preview) {
            previewContent = `<div style="width:100%;height:100%;background-image:url('${config.resolved_preview}');background-size:cover;background-position:center;image-rendering:pixelated;"></div>`;
        } else if (config.preview_emoji) {
            const bg = config.preview_bg || 'rgba(0,0,0,0.3)';
            previewContent = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${bg};font-size:1.5rem;">${config.preview_emoji}</div>`;
        }

        card.innerHTML = `
            <div class="theme-preview-box" style="background:#000;overflow:hidden;position:relative;">${previewContent}</div>
            <div class="theme-info-box"><strong>${config.name}</strong><p>${config.description}</p></div>
            <div class="theme-action-box"><label class="toggle-switch"><input type="checkbox" id="toggle-${config.id}"><span class="slider"></span></label></div>
        `;

        container.appendChild(card);

        const toggle = card.querySelector('input[type="checkbox"]');
        toggle.addEventListener('change', (e) => {
            if (e.target.checked) this.enableTheme(config.id, app);
            else this.disableTheme(config.id, app);
        });
    },

    enableTheme: function(id, app) {
        console.log(`[ThemeListener] Enabling ${id}...`);
        if (activeThemeId && activeThemeId !== id) this.disableTheme(activeThemeId, app);

        const allToggles = document.querySelectorAll('.theme-action-box input[type="checkbox"]');
        allToggles.forEach(t => { if (t.id !== `toggle-${id}`) t.checked = false; });

        try {
            const themeModule = loadedThemes[id];
            if (themeModule && themeModule.onEnable) {
                themeModule.onEnable(app);
                activeThemeId = id;
                if (window.api && window.api.setSetting) window.api.setSetting('activeThemePack', id);
            }
        } catch (err) {
            console.error(`[ThemeListener] Failed to activate theme ${id}:`, err);
        }
    },

    disableTheme: function(id, app) {
        console.log(`[ThemeListener] Disabling ${id}...`);
        if (loadedThemes[id] && loadedThemes[id].onDisable) loadedThemes[id].onDisable(app);
        if (app.ui && app.ui.resetToDefaultTheme) app.ui.resetToDefaultTheme();
        
        if (app.settings && app.ui && app.ui.updateEmoji) {
            const defaultEmoji = app.settings.coverMode || 'note';
            app.ui.updateEmoji(defaultEmoji, app.settings.customCoverEmoji || '');
        }

        if (activeThemeId === id) {
            activeThemeId = null;
            if (window.api && window.api.setSetting) window.api.setSetting('activeThemePack', '');
        }
    },

    restoreState: function(savedThemeId, app) {
        if (!savedThemeId) return;
        const toggle = document.getElementById(`toggle-${savedThemeId}`);
        if (toggle) {
            toggle.checked = true;
            this.enableTheme(savedThemeId, app);
        }
    }
};