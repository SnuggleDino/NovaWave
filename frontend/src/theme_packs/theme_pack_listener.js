/**
 * THEME PACK LISTENER
 * -------------------
 * This module automatically detects, registers, and manages Theme Packs.
 * It removes the need to manually edit index.html or main.js when adding a new theme.
 */

// 1. Auto-Detect all theme.json files (Eager load to get metadata immediately)
const themeConfigs = import.meta.glob('./*/theme.json', { eager: true });

// 2. Auto-Detect all theme.js files (Lazy load for performance)
const themeModules = import.meta.glob('./*/theme.js');

// State
let activeThemeId = null;
let loadedThemes = {}; // Cache for loaded JS modules

export const ThemePackListener = {
    
    /**
     * Initializes the Theme Pack System.
     * 1. Scans for themes.
     * 2. Builds the UI in the Settings menu.
     * 3. Binds event listeners.
     */
    init: function(appInstance) {
        console.log('[ThemeListener] Scanning for Theme Packs...');
        const container = document.getElementById('theme-pack-grid');
        if (!container) {
            console.error('[ThemeListener] Container #theme-pack-grid not found in HTML!');
            return;
        }

        // Clear container to be safe (or if re-initialized)
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

        // Convert Glob object to Array and Sort
        const themes = Object.keys(themeConfigs).map(key => {
            const conf = themeConfigs[key].default || themeConfigs[key];
            return conf;
        });

        themes.sort((a, b) => {
            const indexA = sortOrder.indexOf(a.id);
            const indexB = sortOrder.indexOf(b.id);
            
            // If both are in the list, sort by index
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            // If only A is in list, A comes first
            if (indexA !== -1) return -1;
            // If only B is in list, B comes first
            if (indexB !== -1) return 1;
            // If neither, sort alphabetically by name
            return a.name.localeCompare(b.name);
        });

        // Render sorted themes
        themes.forEach(config => {
            this.renderThemeCard(container, config, appInstance);
        });

        // Restore active theme from Settings if needed
        // (This is usually handled by main.js loading settings, but we can hook in here if needed)
    },

    /**
     * Renders a single Theme Card into the DOM.
     */
    renderThemeCard: function(container, config, app) {
        const card = document.createElement('div');
        card.className = 'theme-card';
        card.id = `${config.id}-pack-item`;

        let previewContent = '';
        
        // Option A: Image Preview
        if (config.preview_image) {
            const basePath = `/src/theme_packs/${config.id}/`;
            const previewUrl = basePath + config.preview_image;
            previewContent = `
                <div style="
                    width: 100%; height: 100%; 
                    background-image: url('${previewUrl}'); 
                    background-size: cover; 
                    background-position: center; 
                    image-rendering: pixelated;">
                </div>`;
        } 
        // Option B: Emoji Preview (Legacy Style)
        else if (config.preview_emoji) {
            // Map legacy classes based on ID or config, or just use generic style
            const bg = config.preview_bg || 'rgba(0,0,0,0.3)';
            previewContent = `
                <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:${bg}; font-size:1.5rem;">
                    ${config.preview_emoji}
                </div>`;
        }

        // HTML Structure
        card.innerHTML = `
            <div class="theme-preview-box" style="background: #000; overflow: hidden; position: relative;">
                ${previewContent}
            </div>
            <div class="theme-info-box">
                <strong>${config.name}</strong>
                <p>${config.description}</p>
            </div>
            <div class="theme-action-box">
                <label class="toggle-switch">
                    <input type="checkbox" id="toggle-${config.id}">
                    <span class="slider"></span>
                </label>
            </div>
        `;

        container.appendChild(card);

        // Bind Toggle Logic
        const toggle = card.querySelector('input[type="checkbox"]');
        
        // Check if currently active in settings (main.js passes settings usually, or we read DOM)
        // For now, main.js syncs this. We just handle the click.
        
        // Listen for changes
        toggle.addEventListener('change', async (e) => {
            if (e.target.checked) {
                await this.enableTheme(config.id, app);
            } else {
                this.disableTheme(config.id, app);
            }
        });
    },

    /**
     * Activates a Theme Pack.
     * Handles deactivating others and loading the JS module.
     */
    enableTheme: async function(id, app) {
        console.log(`[ThemeListener] Enabling ${id}...`);

        // 1. Deactivate ANY active theme (Strict Exclusive Mode)
        // We iterate through all known themes to be safe
        for (const otherId in loadedThemes) {
            if (otherId !== id) {
                // If we don't know if it's active, we disable it anyway to be safe
                // or check our state. 
                // Better: Just disable the currently tracked one.
            }
        }
        
        if (activeThemeId && activeThemeId !== id) {
            this.disableTheme(activeThemeId, app);
            // Visual sync is handled below
        }

        // Visually uncheck all other toggles
        const allToggles = document.querySelectorAll('.theme-action-box input[type="checkbox"]');
        allToggles.forEach(t => {
            if (t.id !== `toggle-${id}`) t.checked = false;
        });

        // 2. Load the Module logic dynamically
        // Construct the key for the glob map
        const moduleKey = `./${id}/theme.js`;
        
        if (!themeModules[moduleKey]) {
            console.error(`[ThemeListener] Module not found for ${id}`);
            return;
        }

        try {
            // Import the module
            const module = await themeModules[moduleKey]();
            loadedThemes[id] = module.default;

            // 3. Run onEnable
            if (loadedThemes[id] && loadedThemes[id].onEnable) {
                loadedThemes[id].onEnable(app);
                activeThemeId = id;
                
                // Save setting via App API if available
                if (window.api && window.api.setSetting) {
                    window.api.setSetting('activeThemePack', id);
                }
            }
        } catch (err) {
            console.error(`[ThemeListener] Failed to load theme ${id}:`, err);
        }
    },

    /**
     * Deactivates a Theme Pack.
     */
    disableTheme: function(id, app) {
        console.log(`[ThemeListener] Disabling ${id}...`);
        
        if (loadedThemes[id] && loadedThemes[id].onDisable) {
            loadedThemes[id].onDisable(app);
        }
        
        // Restore Defaults (Global Cleanup)
        if (app.settings && app.ui && app.ui.updateEmoji) {
            const defaultEmoji = app.settings.coverMode || 'note';
            // Restore custom emoji if mode is custom
            const custom = app.settings.customCoverEmoji || '';
            app.ui.updateEmoji(defaultEmoji, custom);
        }

        if (activeThemeId === id) {
            activeThemeId = null;
            // Clear setting (Use empty string instead of null to please Go backend)
            if (window.api && window.api.setSetting) {
                window.api.setSetting('activeThemePack', '');
            }
        }
    },

    /**
     * Called by main.js on startup to restore the saved theme.
     */
    restoreState: function(savedThemeId, app) {
        if (!savedThemeId) return;
        
        const toggle = document.getElementById(`toggle-${savedThemeId}`);
        if (toggle) {
            toggle.checked = true;
            this.enableTheme(savedThemeId, app);
        }
    }
};
