import './app_settings.css';
import { LangHandler } from '../app_language/lang_handler.js';

const EQ_PRESETS = {
    flat:      [0,  0,  0,  0,  0],
    pop:       [-1, 2,  4,  3, -1],
    rock:      [4,  2, -1,  2,  4],
    classical: [5,  3, -2,  2,  5],
    jazz:      [3,  0,  1,  2,  1],
    bass:      [6,  5,  0,  0,  0],
};

const AUDIO_PRESETS = {
    warm:   { bassBoostEnabled: true,  bassBoostValue: 7, trebleBoostEnabled: false,               reverbEnabled: false,              eqEnabled: true, eqValues: [3,  2,  0, -1, -2] },
    bright: { bassBoostEnabled: false,                    trebleBoostEnabled: true, trebleBoostValue: 8, reverbEnabled: false,         eqEnabled: true, eqValues: [-2, -1,  0,  3,  5] },
    studio: { bassBoostEnabled: true,  bassBoostValue: 5, trebleBoostEnabled: true, trebleBoostValue: 6, reverbEnabled: true, reverbValue: 20, eqEnabled: true, eqValues: [2,  1, -1,  2,  3] },
    hall:   { bassBoostEnabled: false,                    trebleBoostEnabled: true, trebleBoostValue: 4, reverbEnabled: true, reverbValue: 65, eqEnabled: true, eqValues: [1,  0,  0,  1,  3] },
};

// --- Icons for Design Cards ---
const LEGACY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18"/>
    <path d="M9 21V9"/>
</svg>`;

const V2_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
</svg>`;

const LITE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="10 8 16 12 10 16 10 8"/>
</svg>`;

export const AppSettings = {

    init: function (api, settings, callbacks = {}, uiRefs = {}) {
        this.api = api;
        this.settings = settings;
        this.callbacks = callbacks;
        this.ui = uiRefs;

        this.setupEventListeners();
        this.restoreUIState();
        this.initSearch();
        this.renderDesignCards();
    },

    initSearch: function () {
        const searchInput = document.getElementById('settings-search-input');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            this.performSearch(query);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                this.performSearch('');
                searchInput.blur();
            }
        });

        // Inject breadcrumb labels into each tab content
        document.querySelectorAll('.settings-tab-content').forEach(tab => {
            if (tab.querySelector('.search-breadcrumb')) return;
            const crumb = document.createElement('div');
            crumb.className = 'search-breadcrumb';
            const btn = document.querySelector(`.drawer-tab-btn[data-target="${tab.id}"]`);
            const label = btn?.querySelector('.drawer-tab-label')?.textContent?.trim() || '';
            crumb.textContent = label;
            tab.insertBefore(crumb, tab.firstChild);
        });
    },

    performSearch: function (query) {
        const items = document.querySelectorAll('.setting-item');
        const sections = document.querySelectorAll('.settings-tab-content');
        const navBtns = document.querySelectorAll('.drawer-tab-btn');
        const titles = document.querySelectorAll('.settings-section-title');
        const countEl = document.getElementById('search-count');

        items.forEach(item => {
            item.classList.remove('search-match', 'search-hidden');
        });

        navBtns.forEach(btn => {
            btn.classList.remove('search-match');
        });

        sections.forEach(sec => {
            sec.classList.remove('search-hidden', 'search-active');
        });

        titles.forEach(t => {
            t.classList.remove('search-hidden');
        });

        if (!query) {
            if (countEl) countEl.style.display = 'none';
            const activeBtn = document.querySelector('.drawer-tab-btn.active');
            if (activeBtn) {
                const target = activeBtn.dataset.target;
                const targetContent = document.getElementById(target);
                if (targetContent) targetContent.classList.add('active');
            }
            return;
        }

        navBtns.forEach(btn => btn.classList.remove('active-during-search'));
        sections.forEach(sec => sec.classList.remove('active'));

        const matchedTabs = new Set();

        items.forEach(item => {
            const text = item.innerText.toLowerCase();
            const isMatch = text.includes(query);

            if (isMatch) {
                item.classList.add('search-match');
                const parentTab = item.closest('.settings-tab-content');
                if (parentTab) matchedTabs.add(parentTab.id);
            } else {
                item.classList.add('search-hidden');
            }
        });

        navBtns.forEach(btn => {
            const target = btn.dataset.target;
            if (matchedTabs.has(target)) {
                btn.classList.add('search-match');
            }
        });

        sections.forEach(sec => {
            if (matchedTabs.has(sec.id)) {
                sec.classList.add('search-active');
            } else {
                sec.classList.add('search-hidden');
            }
        });

        titles.forEach(t => {
            const parentTab = t.closest('.settings-tab-content');
            if (parentTab && !matchedTabs.has(parentTab.id)) {
                t.classList.add('search-hidden');
            }
        });

        if (countEl) {
            const matchCount = document.querySelectorAll('.setting-item.search-match').length;
            countEl.textContent = matchCount;
            countEl.style.display = matchCount > 0 ? 'inline-flex' : 'none';
        }
    },

    saveSetting: function (key, value) {
        if (this.settings) this.settings[key] = value;
        if (this.api && this.api.setSetting) {
            this.api.setSetting(key, value);
        }
        if (key === 'activeIntro' || key === 'theme' || key === 'language') {
            localStorage.setItem(key, value);
        }
    },

    setupEventListeners: function () {
        const $ = (id) => document.getElementById(id);

        const settingTabs = document.querySelectorAll('.drawer-tab-btn');
        const settingContents = document.querySelectorAll('.settings-tab-content');

        settingTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                settingTabs.forEach(t => t.classList.remove('active'));
                settingContents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const targetId = tab.dataset.target;
                const targetContent = document.getElementById(targetId);
                if (targetContent) targetContent.classList.add('active');
                if (targetId === 'tab-design') {
                    this.renderDesignCards();
                }
            });
        });

        const settingsBtn = $('settings-btn');
        const settingsDrawer = $('settings-drawer');
        const settingsBackdrop = $('settings-drawer-backdrop');
        const settingsCloseBtn = $('settings-close-btn');

        const openDrawer = () => {
            if (settingsDrawer) settingsDrawer.classList.add('open');
            if (settingsBackdrop) settingsBackdrop.classList.add('open');
        };
        const closeDrawer = () => {
            if (settingsDrawer) settingsDrawer.classList.remove('open');
            if (settingsBackdrop) settingsBackdrop.classList.remove('open');
        };

        if (settingsBtn) settingsBtn.addEventListener('click', openDrawer);
        if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', closeDrawer);
        if (settingsBackdrop) settingsBackdrop.addEventListener('click', closeDrawer);

        this._openDrawer = openDrawer;
        this._closeDrawer = closeDrawer;

        // --- APPEARANCE TAB ---

        const themeSelect = $('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                document.documentElement.setAttribute('data-theme', val);
                this.saveSetting('theme', val);
                if (this.callbacks.onThemeChange) this.callbacks.onThemeChange(val);
            });
        }

        const toggleUseCustomColor = $('toggle-use-custom-color');
        const accentColorContainer = $('accent-color-container');
        if (toggleUseCustomColor) {
            toggleUseCustomColor.addEventListener('change', (e) => {
                const checked = e.target.checked;
                this.saveSetting('useCustomColor', checked);
                if (accentColorContainer) accentColorContainer.classList.toggle('hidden', !checked);

                if (checked) {
                    const color = this.settings.customAccentColor || '#38bdf8';
                    document.documentElement.style.setProperty('--accent', color);
                } else {
                    document.documentElement.style.removeProperty('--accent');
                }

                if (this.callbacks.onAccentColorChange) this.callbacks.onAccentColorChange();
            });
        }

        const accentColorPicker = $('accent-color-picker');
        if (accentColorPicker) {
            accentColorPicker.addEventListener('input', (e) => {
                const color = e.target.value;
                document.documentElement.style.setProperty('--accent', color);
                if (this.callbacks.onAccentColorChange) this.callbacks.onAccentColorChange();
                this.saveSetting('customAccentColor', color);
            });
            accentColorPicker.addEventListener('change', (e) => {
                this.saveSetting('customAccentColor', e.target.value);
            });
        }

        const toggleGradientTitle = $('toggle-gradient-title');
        if (toggleGradientTitle) {
            toggleGradientTitle.addEventListener('change', (e) => {
                this.saveSetting('gradientTitleEnabled', e.target.checked);
                document.body.classList.toggle('gradient-title-active', e.target.checked);
            });
        }

        const animationSelect = $('animation-select');
        if (animationSelect) {
            animationSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                this.saveSetting('animationMode', val);
                if (this.callbacks.onAnimationChange) this.callbacks.onAnimationChange(val);
            });
        }

        const visualizerToggle = $('toggle-visualizer');
        if (visualizerToggle) {
            visualizerToggle.addEventListener('change', (e) => {
                const checked = e.target.checked;
                this.saveSetting('visualizerEnabled', checked);
                if (this.callbacks.onVisualizerToggle) this.callbacks.onVisualizerToggle(checked);
            });
        }

        const visualizerStyleSelect = $('visualizer-style-select');
        if (visualizerStyleSelect) {
            visualizerStyleSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                this.saveSetting('visualizerStyle', val);
                if (this.callbacks.onVisualizerStyleChange) this.callbacks.onVisualizerStyleChange(val);
            });
        }

        const visualizerSensitivity = $('visualizer-sensitivity');
        if (visualizerSensitivity) {
            visualizerSensitivity.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.saveSetting('visSensitivity', val);
                if (this.callbacks.onVisualizerSensitivityChange) this.callbacks.onVisualizerSensitivityChange(val);
            });
        }

        const visSensResetBtn = $('visualizer-sensitivity-reset-btn');
        if (visSensResetBtn) {
            visSensResetBtn.addEventListener('click', () => {
                const def = 1.5;
                if (visualizerSensitivity) visualizerSensitivity.value = def;
                this.saveSetting('visSensitivity', def);
                if (this.callbacks.onVisualizerSensitivityChange) this.callbacks.onVisualizerSensitivityChange(def);
            });
        }

        const visualizerBarsSelect = $('visualizer-bars-select');
        const visualizerBarsResetBtn = $('visualizer-bars-reset-btn');

        if (visualizerBarsSelect) {
            visualizerBarsSelect.addEventListener('change', (e) => {
                const val = parseInt(e.target.value);
                this.saveSetting('visualizerBars', val);
                if (this.callbacks.onVisualizerBarsChange) this.callbacks.onVisualizerBarsChange(val);
            });
        }

        if (visualizerBarsResetBtn) {
            visualizerBarsResetBtn.addEventListener('click', () => {
                const def = 64;
                if (visualizerBarsSelect) visualizerBarsSelect.value = def;
                this.saveSetting('visualizerBars', def);
                if (this.callbacks.onVisualizerBarsChange) this.callbacks.onVisualizerBarsChange(def);
            });
        }

        const emojiSelect = $('emoji-select');
        const customEmojiContainer = $('custom-emoji-container');
        const customEmojiInput = $('custom-emoji-input');

        if (emojiSelect) {
            emojiSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (customEmojiContainer) customEmojiContainer.style.display = val === 'custom' ? 'flex' : 'none';
                this.saveSetting('coverMode', val);

                if (val !== 'auto') {
                    this.saveSetting('lastCoverEmoji', val);
                }

                const customVal = customEmojiInput ? customEmojiInput.value : '';
                if (this.callbacks.onEmojiChange) this.callbacks.onEmojiChange(val, customVal);
            });
        }

        if (customEmojiInput) {
            customEmojiInput.addEventListener('input', (e) => {
                const val = e.target.value;
                this.saveSetting('customCoverEmoji', val);
                this.saveSetting('lastCoverEmoji', 'custom');
                if (this.callbacks.onEmojiChange) this.callbacks.onEmojiChange('custom', val);
            });
        }

        // --- PLAYER TAB ---

        const sleepTimerSelect = $('sleep-timer-select');
        if (sleepTimerSelect) {
            sleepTimerSelect.addEventListener('change', (e) => {
                const mins = parseInt(e.target.value);
                if (this.callbacks.onSleepTimerChange) this.callbacks.onSleepTimerChange(mins);
            });
        }

        const speedSlider = $('speed-slider');
        const speedValue = $('speed-value');
        const speedResetBtn = $('speed-reset-btn');

        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                if (speedValue) speedValue.textContent = v.toFixed(1) + 'x';
                this.saveSetting('playbackSpeed', v);
                if (this.callbacks.onSpeedChange) this.callbacks.onSpeedChange(v);
            });
        }

        if (speedResetBtn) {
            speedResetBtn.addEventListener('click', () => {
                const def = 1.0;
                if (speedSlider) speedSlider.value = def;
                if (speedValue) speedValue.textContent = def.toFixed(1) + 'x';
                this.saveSetting('playbackSpeed', def);
                if (this.callbacks.onSpeedChange) this.callbacks.onSpeedChange(def);
            });
        }

        const toggleDeleteSongs = $('toggle-delete-songs');
        if (toggleDeleteSongs) {
            toggleDeleteSongs.addEventListener('change', (e) => {
                this.saveSetting('deleteSongsEnabled', e.target.checked);
                if (this.callbacks.onDeleteSongsToggle) this.callbacks.onDeleteSongsToggle(e.target.checked);
            });
        }

        // --- DOWNLOADS TAB ---

        const changeFolderBtn = $('change-download-folder-btn');
        if (changeFolderBtn) {
            changeFolderBtn.addEventListener('click', async () => {
                const nf = await this.api.selectFolder();
                if (nf) {
                    const dlInput = $('default-download-folder');
                    if (dlInput) dlInput.value = nf;
                    this.saveSetting('downloadFolder', nf);
                }
            });
        }

        const qualitySelect = $('audio-quality-select');
        if (qualitySelect) {
            qualitySelect.addEventListener('change', (e) => this.saveSetting('audioQuality', e.target.value));
        }

        const refreshFolderBtn = $('refresh-folder-btn');
        if (refreshFolderBtn) {
            refreshFolderBtn.addEventListener('click', () => {
                if (this.callbacks.onRefreshFolder) this.callbacks.onRefreshFolder();
            });
        }

        const autoLoadLastFolderToggle = $('toggle-auto-load-last-folder');
        if (autoLoadLastFolderToggle) {
            autoLoadLastFolderToggle.addEventListener('change', (e) => {
                this.saveSetting('autoLoadLastFolder', e.target.checked);
                if (e.target.checked && this.settings.currentFolderPath) {
                    this.saveSetting('currentFolderPath', this.settings.currentFolderPath);
                }
            });
        }

        // --- AUDIO EXTRAS TAB ---

        const setupAudioToggle = (toggleId, containerId, settingKey) => {
            const toggle = $(toggleId);
            const container = $(containerId);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    const enabled = e.target.checked;
                    this.saveSetting(settingKey, enabled);
                    if (container) container.style.display = enabled ? 'flex' : 'none';
                    if (this.callbacks.onAudioEffectChange) this.callbacks.onAudioEffectChange();
                    this._updateAudioPresetChips(this._findActiveAudioPreset());
                });
            }
        };

        const setupAudioSlider = (sliderId, valueDisplayId, settingKey) => {
            const slider = $(sliderId);
            const display = $(valueDisplayId);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    this.saveSetting(settingKey, val);
                    const suffix = settingKey.includes('Value') && settingKey.includes('reverb') ? '%' : 'dB';
                    if (display) display.textContent = val + suffix;
                    if (this.callbacks.onAudioEffectChange) this.callbacks.onAudioEffectChange();
                    this._updateAudioPresetChips(this._findActiveAudioPreset());
                });
            }
        };

        setupAudioToggle('toggle-bass-boost', 'bass-boost-slider-container', 'bassBoostEnabled');
        setupAudioSlider('bass-boost-slider', 'bass-boost-value', 'bassBoostValue');

        setupAudioToggle('toggle-treble-boost', 'treble-boost-slider-container', 'trebleBoostEnabled');
        setupAudioSlider('treble-boost-slider', 'treble-boost-value', 'trebleBoostValue');

        setupAudioToggle('toggle-reverb', 'reverb-slider-container', 'reverbEnabled');
        setupAudioSlider('reverb-slider', 'reverb-value', 'reverbValue');

        const resetAudio = (btnId, sliderId, displayId, settingKey, defVal) => {
            const btn = $(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    const slider = $(sliderId);
                    const display = $(displayId);
                    if (slider) slider.value = defVal;
                    const suffix = settingKey.includes('reverb') ? '%' : 'dB';
                    if (display) display.textContent = defVal + suffix;
                    this.saveSetting(settingKey, defVal);
                    if (this.callbacks.onAudioEffectChange) this.callbacks.onAudioEffectChange();
                    this._updateAudioPresetChips(this._findActiveAudioPreset());
                });
            }
        };

        resetAudio('bass-boost-reset-btn', 'bass-boost-slider', 'bass-boost-value', 'bassBoostValue', 6);
        resetAudio('treble-boost-reset-btn', 'treble-boost-slider', 'treble-boost-value', 'trebleBoostValue', 6);
        resetAudio('reverb-reset-btn', 'reverb-slider', 'reverb-value', 'reverbValue', 30);

        //--- Equalizer ---------------
        const toggleEq = $('toggle-equalizer');
        const eqContainer = $('eq-sliders-container');
        if (toggleEq) {
            toggleEq.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                this.saveSetting('eqEnabled', enabled);
                if (eqContainer) eqContainer.style.display = enabled ? 'flex' : 'none';
                if (this.callbacks.onAudioEffectChange) this.callbacks.onAudioEffectChange();
                this._updateAudioPresetChips(this._findActiveAudioPreset());
            });
        }

        const eqSliders = document.querySelectorAll('.eq-slider');
        eqSliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const band = parseInt(e.target.dataset.band);
                const val = parseFloat(e.target.value);
                if (!this.settings.eqValues) this.settings.eqValues = [0, 0, 0, 0, 0];
                this.settings.eqValues[band] = val;

                const valueDisplay = slider.parentElement.querySelector('.eq-value');
                if (valueDisplay) valueDisplay.textContent = val + 'dB';

                this.saveSetting('eqValues', this.settings.eqValues);
                if (this.callbacks.onAudioEffectChange) this.callbacks.onAudioEffectChange();
                this._updateEqPresetChips(this.settings.eqValues);
                this._updateAudioPresetChips(this._findActiveAudioPreset());
            });
        });

        const eqResetBtn = $('eq-reset-btn');
        if (eqResetBtn) {
            eqResetBtn.addEventListener('click', () => {
                const defValues = [0, 0, 0, 0, 0];
                this.saveSetting('eqValues', defValues);
                eqSliders.forEach((s, i) => {
                    s.value = 0;
                    const valDisp = s.parentElement.querySelector('.eq-value');
                    if (valDisp) valDisp.textContent = '0dB';
                });
                if (this.callbacks.onAudioEffectChange) this.callbacks.onAudioEffectChange();
                this._updateEqPresetChips([0, 0, 0, 0, 0]);
                this._updateAudioPresetChips(this._findActiveAudioPreset());
            });
        }

        document.querySelectorAll('.eq-preset-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const values = EQ_PRESETS[chip.dataset.preset];
                if (!values) return;
                this._applyEqPreset(values);
            });
        });

        document.querySelectorAll('.audio-preset-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const key = chip.dataset.preset;
                if (!AUDIO_PRESETS[key]) return;
                this._applyAudioPreset(key);
            });
        });

        // --- INTROS TAB ---
        const introCards = document.querySelectorAll('.intro-card');
        introCards.forEach(card => {
            const btn = card.querySelector('.apply-intro-btn');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    introCards.forEach(c => c.classList.remove('active'));
                    card.classList.add('active');

                    if (this.callbacks.onLangUpdate) this.callbacks.onLangUpdate();

                    const introKey = card.dataset.intro;
                    this.saveSetting('activeIntro', introKey);
                });
            }
        });

        // --- EXTRAS TAB ---

        const toggleCinemaMode = $('toggle-cinema-mode');
        if (toggleCinemaMode) {
            toggleCinemaMode.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                this.saveSetting('cinemaMode', enabled);
                document.body.classList.toggle('cinema-mode', enabled);
            });
        }

        const togglePerformanceMode = $('toggle-performance-mode');
        if (togglePerformanceMode) {
            togglePerformanceMode.addEventListener('change', (e) => {
                if (this.callbacks.onPerformanceModeChange) this.callbacks.onPerformanceModeChange(e.target.checked);
            });
        }

        const fpsInput = $('fps-input');
        if (fpsInput) {
            const updateFps = (val) => {
                let v = parseInt(val);
                if (isNaN(v)) return;
                let clamped = Math.max(15, Math.min(120, v));
                this.saveSetting('targetFps', clamped);
                if (this.callbacks.onFpsChange) this.callbacks.onFpsChange(clamped);
            };
            fpsInput.addEventListener('input', (e) => updateFps(e.target.value));
            fpsInput.addEventListener('blur', (e) => {
                updateFps(e.target.value);
                if (this.settings.targetFps) fpsInput.value = this.settings.targetFps;
            });
        }

        const toggleShowStats = $('toggle-show-stats');
        if (toggleShowStats) {
            toggleShowStats.addEventListener('change', (e) => {
                const checked = e.target.checked;
                this.saveSetting('showStatsOverlay', checked);
                const overlay = $('stats-overlay');
                if (overlay) overlay.classList.toggle('hidden', !checked);
                if (this.callbacks.onStatsToggle) this.callbacks.onStatsToggle(checked);
            });
        }

        const toggleFavoritesOption = $('toggle-favorites-option');
        if (toggleFavoritesOption) {
            toggleFavoritesOption.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                this.saveSetting('enableFavoritesPlaylist', enabled);
                if (this.callbacks.onFavoritesOptionToggle) this.callbacks.onFavoritesOptionToggle(enabled);
            });
        }

        const playlistPositionSelect = $('playlist-position-select');
        if (playlistPositionSelect) {
            playlistPositionSelect.addEventListener('change', (e) => {
                const pos = e.target.value;
                this.saveSetting('playlistPosition', pos);
                if (pos === 'left') document.body.classList.add('playlist-left');
                else document.body.classList.remove('playlist-left');
            });
        }

        const btnExportPlaylist = $('btn-export-playlist');
        if (btnExportPlaylist) {
            btnExportPlaylist.addEventListener('click', () => {
                if (this.callbacks.onExportPlaylist) this.callbacks.onExportPlaylist();
            });
        }

        const btnClearCache = $('btn-clear-cache');
        if (btnClearCache) {
            btnClearCache.addEventListener('click', () => {
                if (window.showNotification) window.showNotification('Clearing Cache...', 'loading', 1500);
                setTimeout(() => {
                    localStorage.clear();
                    location.reload();
                }, 1500);
            });
        }

        const btnRestartApp = $('btn-restart-app');
        if (btnRestartApp) {
            btnRestartApp.addEventListener('click', () => {
                if (window.showNotification) window.showNotification('Restarting App...', 'loading', 1500);
                setTimeout(() => {
                    if (this.callbacks && this.callbacks.onRestartApp) {
                        this.callbacks.onRestartApp();
                    } else if (this.api && this.api.restartApp) {
                        this.api.restartApp();
                    }
                }, 1500);
            });
        }

        const btnResetApp = $('btn-reset-app');
        if (btnResetApp) {
            btnResetApp.addEventListener('click', async () => {
                const confirmMsg = LangHandler.tr('resetWarning');
                if (confirm(confirmMsg)) {
                    if (this.api && this.api.resetConfig) {
                        const res = await this.api.resetConfig();
                        if (res.success) {
                            localStorage.clear();
                            location.reload();
                        }
                    }
                }
            });
        }

        const btnQuitApp = $('btn-quit-app');
        if (btnQuitApp) {
            btnQuitApp.addEventListener('click', () => {
                if (window.showNotification) window.showNotification('Shutting down...', 'info', 1000);
                setTimeout(() => {
                    if (this.callbacks && this.callbacks.onShutdownApp) {
                        this.callbacks.onShutdownApp();
                    } else if (this.api && this.api.shutdownApp) {
                        this.api.shutdownApp();
                    }
                }, 1000);
            });
        }
    },

    restoreUIState: function () {
        const s = this.settings;
        const $ = (id) => document.getElementById(id);

        if (!s) return;
        window._isRestoring = true;

        const themeSelect = $('theme-select');
        if (themeSelect && s.theme) {
            themeSelect.value = s.theme;
            document.documentElement.setAttribute('data-theme', s.theme);
        }

        const toggleUseCustomColor = $('toggle-use-custom-color');
        const accentColorContainer = $('accent-color-container');
        if (toggleUseCustomColor) {
            toggleUseCustomColor.checked = !!s.useCustomColor;
            if (accentColorContainer) accentColorContainer.classList.toggle('hidden', !s.useCustomColor);
        }

        const accentColorPicker = $('accent-color-picker');
        if (accentColorPicker && s.customAccentColor) accentColorPicker.value = s.customAccentColor;

        const toggleGradientTitle = $('toggle-gradient-title');
        if (toggleGradientTitle) toggleGradientTitle.checked = !!s.gradientTitleEnabled;

        const animationSelect = $('animation-select');
        if (animationSelect && s.animationMode) {
            animationSelect.value = s.animationMode;
            if (this.callbacks.onAnimationChange) this.callbacks.onAnimationChange(s.animationMode);
        }

        const visualizerToggle = $('toggle-visualizer');
        if (visualizerToggle) visualizerToggle.checked = s.visualizerEnabled !== false;

        const visualizerStyleSelect = $('visualizer-style-select');
        if (visualizerStyleSelect && s.visualizerStyle) visualizerStyleSelect.value = s.visualizerStyle;

        const visualizerSensitivity = $('visualizer-sensitivity');
        if (visualizerSensitivity && s.visSensitivity) visualizerSensitivity.value = s.visSensitivity;

        const visualizerBarsSelect = $('visualizer-bars-select');
        if (visualizerBarsSelect) {
            visualizerBarsSelect.value = s.visualizerBars || 64;
        }

        const emojiSelect = $('emoji-select');
        const customEmojiContainer = $('custom-emoji-container');
        const customEmojiInput = $('custom-emoji-input');
        if (emojiSelect && s.coverMode) {
            emojiSelect.value = s.coverMode;
            if (customEmojiContainer) customEmojiContainer.style.display = s.coverMode === 'custom' ? 'flex' : 'none';
        }
        if (customEmojiInput && s.customCoverEmoji) customEmojiInput.value = s.customCoverEmoji;

        if (emojiSelect && s.coverMode) {
            const customVal = customEmojiInput ? customEmojiInput.value : '';
            if (this.callbacks.onEmojiChange) this.callbacks.onEmojiChange(s.coverMode, customVal);
        }

        const sleepTimerSelect = $('sleep-timer-select');

        const speedSlider = $('speed-slider');
        const speedValue = $('speed-value');
        if (speedSlider && s.playbackSpeed) {
            speedSlider.value = s.playbackSpeed;
            if (speedValue) speedValue.textContent = s.playbackSpeed.toFixed(1) + 'x';
        }

        const toggleDeleteSongs = $('toggle-delete-songs');
        if (toggleDeleteSongs) toggleDeleteSongs.checked = !!s.deleteSongsEnabled;

        const dlInput = $('default-download-folder');
        if (dlInput && s.downloadFolder) dlInput.value = s.downloadFolder;

        const qualitySelect = $('audio-quality-select');
        if (qualitySelect && s.audioQuality) qualitySelect.value = s.audioQuality;

        const autoLoadLastFolderToggle = $('toggle-auto-load-last-folder');
        if (autoLoadLastFolderToggle) autoLoadLastFolderToggle.checked = s.autoLoadLastFolder !== false;

        const restoreAudio = (toggleId, containerId, sliderId, displayId, enabledKey, valueKey, suffix) => {
            const toggle = $(toggleId);
            const container = $(containerId);
            const slider = $(sliderId);
            const display = $(displayId);

            if (toggle) toggle.checked = !!s[enabledKey];
            if (container) container.style.display = s[enabledKey] ? 'flex' : 'none';
            if (slider && s[valueKey] !== undefined) slider.value = s[valueKey];
            if (display && s[valueKey] !== undefined) display.textContent = s[valueKey] + suffix;
        };

        restoreAudio('toggle-bass-boost', 'bass-boost-slider-container', 'bass-boost-slider', 'bass-boost-value', 'bassBoostEnabled', 'bassBoostValue', 'dB');
        restoreAudio('toggle-treble-boost', 'treble-boost-slider-container', 'treble-boost-slider', 'treble-boost-value', 'trebleBoostEnabled', 'trebleBoostValue', 'dB');
        restoreAudio('toggle-reverb', 'reverb-slider-container', 'reverb-slider', 'reverb-value', 'reverbEnabled', 'reverbValue', '%');

        //--- Equalizer ---------------
        const toggleEq = $('toggle-equalizer');
        const eqContainer = $('eq-sliders-container');
        if (toggleEq) {
            toggleEq.checked = !!s.eqEnabled;
            if (eqContainer) eqContainer.style.display = s.eqEnabled ? 'flex' : 'none';
        }
        if (s.eqValues) {
            const eqSliders = document.querySelectorAll('.eq-slider');
            eqSliders.forEach((slider, i) => {
                const val = s.eqValues[i] || 0;
                slider.value = val;
                const valDisp = slider.parentElement.querySelector('.eq-value');
                if (valDisp) valDisp.textContent = val + 'dB';
            });
            this._updateEqPresetChips(s.eqValues);
        }

        this._updateAudioPresetChips(this._findActiveAudioPreset());

        if (s.activeIntro) {
            const introCards = document.querySelectorAll('.intro-card');
            introCards.forEach(c => {
                c.classList.toggle('active', c.dataset.intro === s.activeIntro);
            });
        }

        const toggleCinemaMode = $('toggle-cinema-mode');
        if (toggleCinemaMode) toggleCinemaMode.checked = !!s.cinemaMode;

        const togglePerformanceMode = $('toggle-performance-mode');
        if (togglePerformanceMode) togglePerformanceMode.checked = !!s.performanceMode;

        const fpsInput = $('fps-input');
        if (fpsInput && s.targetFps) fpsInput.value = s.targetFps;

        const toggleShowStats = $('toggle-show-stats');
        const statsOverlay = $('stats-overlay');
        if (toggleShowStats) {
            toggleShowStats.checked = !!s.showStatsOverlay;
            if (statsOverlay) statsOverlay.classList.toggle('hidden', !s.showStatsOverlay);
        }

        const toggleFavoritesOption = $('toggle-favorites-option');
        if (toggleFavoritesOption) toggleFavoritesOption.checked = !!s.enableFavoritesPlaylist;

        const playlistPositionSelect = $('playlist-position-select');
        if (playlistPositionSelect && s.playlistPosition) playlistPositionSelect.value = s.playlistPosition;

        window._isRestoring = false;
    },

    _applyAudioPreset: function (presetKey) {
        const p = AUDIO_PRESETS[presetKey];
        if (!p) return;
        const $ = (id) => document.getElementById(id);

        const applyToggle = (toggleId, containerId, enabled) => {
            const toggle = $(toggleId);
            const container = $(containerId);
            if (toggle) toggle.checked = enabled;
            if (container) container.style.display = enabled ? 'flex' : 'none';
        };

        const applySlider = (sliderId, displayId, val, suffix) => {
            const slider = $(sliderId);
            const display = $(displayId);
            if (slider) slider.value = val;
            if (display) display.textContent = val + suffix;
        };

        applyToggle('toggle-bass-boost', 'bass-boost-slider-container', p.bassBoostEnabled);
        if (p.bassBoostValue !== undefined) {
            applySlider('bass-boost-slider', 'bass-boost-value', p.bassBoostValue, 'dB');
            this.saveSetting('bassBoostValue', p.bassBoostValue);
        }
        this.saveSetting('bassBoostEnabled', p.bassBoostEnabled);

        applyToggle('toggle-treble-boost', 'treble-boost-slider-container', p.trebleBoostEnabled);
        if (p.trebleBoostValue !== undefined) {
            applySlider('treble-boost-slider', 'treble-boost-value', p.trebleBoostValue, 'dB');
            this.saveSetting('trebleBoostValue', p.trebleBoostValue);
        }
        this.saveSetting('trebleBoostEnabled', p.trebleBoostEnabled);

        applyToggle('toggle-reverb', 'reverb-slider-container', p.reverbEnabled);
        if (p.reverbValue !== undefined) {
            applySlider('reverb-slider', 'reverb-value', p.reverbValue, '%');
            this.saveSetting('reverbValue', p.reverbValue);
        }
        this.saveSetting('reverbEnabled', p.reverbEnabled);

        const toggleEq = $('toggle-equalizer');
        const eqContainer = $('eq-sliders-container');
        if (toggleEq) toggleEq.checked = p.eqEnabled;
        if (eqContainer) eqContainer.style.display = p.eqEnabled ? 'flex' : 'none';
        this.saveSetting('eqEnabled', p.eqEnabled);

        if (p.eqValues) {
            if (!this.settings.eqValues) this.settings.eqValues = [0, 0, 0, 0, 0];
            document.querySelectorAll('.eq-slider').forEach((slider, i) => {
                const val = p.eqValues[i] ?? 0;
                slider.value = val;
                this.settings.eqValues[i] = val;
                const valDisp = slider.parentElement.querySelector('.eq-value');
                if (valDisp) valDisp.textContent = val + 'dB';
            });
            this.saveSetting('eqValues', [...p.eqValues]);
            this._updateEqPresetChips(p.eqValues);
        }

        if (this.callbacks.onAudioEffectChange) this.callbacks.onAudioEffectChange();
        this._updateAudioPresetChips(presetKey);
    },

    _findActiveAudioPreset: function () {
        const s = this.settings;
        for (const [key, p] of Object.entries(AUDIO_PRESETS)) {
            if (!!s.bassBoostEnabled !== p.bassBoostEnabled) continue;
            if (p.bassBoostEnabled && s.bassBoostValue !== p.bassBoostValue) continue;
            if (!!s.trebleBoostEnabled !== p.trebleBoostEnabled) continue;
            if (p.trebleBoostEnabled && s.trebleBoostValue !== p.trebleBoostValue) continue;
            if (!!s.reverbEnabled !== p.reverbEnabled) continue;
            if (p.reverbEnabled && s.reverbValue !== p.reverbValue) continue;
            if (!!s.eqEnabled !== p.eqEnabled) continue;
            if (p.eqEnabled && s.eqValues && !p.eqValues.every((v, i) => v === s.eqValues[i])) continue;
            return key;
        }
        return null;
    },

    _updateAudioPresetChips: function (activeKey) {
        document.querySelectorAll('.audio-preset-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.preset === activeKey);
        });
    },

    _applyEqPreset: function (values) {
        const toggleEq = document.getElementById('toggle-equalizer');
        const eqContainer = document.getElementById('eq-sliders-container');
        if (toggleEq && !toggleEq.checked) {
            toggleEq.checked = true;
            this.saveSetting('eqEnabled', true);
            if (eqContainer) eqContainer.style.display = 'flex';
        }

        if (!this.settings.eqValues) this.settings.eqValues = [0, 0, 0, 0, 0];
        document.querySelectorAll('.eq-slider').forEach((slider, i) => {
            const val = values[i] ?? 0;
            slider.value = val;
            this.settings.eqValues[i] = val;
            const valDisp = slider.parentElement.querySelector('.eq-value');
            if (valDisp) valDisp.textContent = val + 'dB';
        });

        this.saveSetting('eqValues', [...this.settings.eqValues]);
        if (this.callbacks.onAudioEffectChange) this.callbacks.onAudioEffectChange();
        this._updateEqPresetChips(values);
    },

    _updateEqPresetChips: function (currentValues) {
        document.querySelectorAll('.eq-preset-chip').forEach(chip => {
            const preset = EQ_PRESETS[chip.dataset.preset];
            const isMatch = preset && currentValues.length === preset.length &&
                currentValues.every((v, i) => v === preset[i]);
            chip.classList.toggle('active', isMatch);
        });
    },

    renderDesignCards: function () {
        const container = document.getElementById('design-ui-cards');
        if (!container) return;

        container.className = 'duc-list';
        container.innerHTML = '';

        const tr = (key) => LangHandler.tr(key);

        const isV2 = window.location.pathname.includes('v2.html');
        const isLite = window.location.pathname.includes('lite.html');
        const activeUi = isV2 ? 'v2' : isLite ? 'lite' : 'legacy';

        const cards = [
            {
                key: 'legacy',
                label: tr('designLegacyLabel'),
                badge: tr('designLegacyBadge') || 'STABLE',
                desc: tr('designLegacyDesc'),
                icon: LEGACY_ICON,
                target: 'index.html'
            },
            {
                key: 'v2',
                label: tr('designV2Label'),
                badge: tr('designV2Badge') || 'V2-PRO',
                desc: tr('designV2Desc'),
                icon: V2_ICON,
                target: 'v2.html'
            },
            {
                key: 'lite',
                label: tr('designLiteLabel'),
                badge: tr('designLiteBadge') || 'LITE',
                desc: tr('designLiteDesc'),
                icon: LITE_ICON,
                target: 'lite.html'
            }
        ];

        cards.forEach(card => {
            const isActive = card.key === activeUi;

            const cardEl = document.createElement('div');
            cardEl.className = `duc-card${isActive ? ' active' : ''}`;

            cardEl.innerHTML = `
                <div class="duc-card-top">
                    <div class="duc-icon">${card.icon}</div>
                    <div class="duc-info">
                        <div class="duc-header">
                            <span class="duc-title">${card.label}</span>
                            <span class="duc-badge">${card.badge}</span>
                        </div>
                        <p class="duc-desc">${card.desc}</p>
                    </div>
                </div>
                <button class="duc-btn" ${isActive ? 'disabled' : ''}>
                    ${isActive ? tr('designBtnActive') : tr('designBtnSwitch')}
                </button>
            `;

            if (!isActive) {
                cardEl.addEventListener('click', () => {
                    if (window.switchUI) {
                        window.switchUI(card.key, card.target);
                    } else {
                        localStorage.setItem('uiVersion', card.key);
                        window.location.href = card.target;
                    }
                });
            }

            container.appendChild(cardEl);
        });

        const existingShortcuts = container.parentElement.querySelector('.ui-shortcuts-section');
        if (existingShortcuts) existingShortcuts.remove();

        const shortcutSection = document.createElement('div');
        shortcutSection.className = 'ui-shortcuts-section';
        shortcutSection.innerHTML = `
            <div class="setting-label">
                <strong>UI Shortcuts</strong>
                <p>Quickly switch between interfaces using your keyboard</p>
            </div>
            <div class="duc-shortcuts">
                ${this._renderShortcutItem('Legacy UI', '1')}
                ${this._renderShortcutItem('NovaWave V2', '2')}
                ${this._renderShortcutItem('Lite UI', '3')}
            </div>
        `;
        container.parentElement.appendChild(shortcutSection);
    },

    _renderShortcutItem: function (label, key) {
        return `
            <div class="duc-shortcut-row">
                <span class="duc-shortcut-label">${label}</span>
                <div class="duc-shortcut-keys">
                    <kbd>CTRL</kbd><kbd>U</kbd><kbd>${key}</kbd>
                </div>
            </div>
        `;
    }
};
