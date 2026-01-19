/**
 * THEME PACK LISTENER
 * Handles automatic detection and management of theme packs via Vite glob imports.
 */

// Detect theme configurations and logic modules
const themeConfigs = import.meta.glob('./*/theme.json', { eager: true });
const themeModules = import.meta.glob('./*/theme.js', { eager: true });

// Track all available assets for bundling
const themeAssets = import.meta.glob('./**/*.{png,jpg,jpeg,svg,ico,mp3,wav}', { eager: true, as: 'url' });

let activeThemeId = null;
let loadedThemes = {}; 
let currentAppInstance = null;

// Populate theme modules cache
for (const path in themeModules) {
    const dir = path.split('/')[1];
    loadedThemes[dir] = themeModules[path].default;
}

export const ThemePackListener = {
    
    init: function(appInstance) {
        currentAppInstance = appInstance;
        const container = document.getElementById('theme-pack-grid');
        if (!container) return;

        container.innerHTML = '';

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
            
            // Resolve preview image URL via Vite asset map
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

        // Apply custom sort order
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
        if (activeThemeId && activeThemeId !== id) this.disableTheme(activeThemeId, app);

        // Sync UI toggles
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
            console.error(`[ThemeListener] Activation failed for ${id}:`, err);
        }
    },

    disableTheme: function(id, app) {
        if (loadedThemes[id] && loadedThemes[id].onDisable) loadedThemes[id].onDisable(app);
        
        // Return to standard app state
        if (app.ui && app.ui.resetToDefaultTheme) app.ui.resetToDefaultTheme();
        
        if (app.settings && app.ui && app.ui.updateEmoji) {
            app.ui.updateEmoji(app.settings.coverMode || 'note', app.settings.customCoverEmoji || '');
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
    },

    deactivateActivePack: function() {
        if (activeThemeId && currentAppInstance) {
            this.disableTheme(activeThemeId, currentAppInstance);
            // Also uncheck the toggle
            const toggle = document.getElementById(`toggle-${activeThemeId}`);
            if (toggle) toggle.checked = false;
        }
    }
};
