import './app_settings.css';
import { LangHandler } from '../app_language/lang_handler.js';

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
    },

    performSearch: function (query) {
        const items = document.querySelectorAll('.setting-item');
        const sections = document.querySelectorAll('.settings-tab-content');
        const navBtns = document.querySelectorAll('.settings-nav-btn');
        const titles = document.querySelectorAll('.settings-section-title');

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
            const activeBtn = document.querySelector('.settings-nav-btn.active');
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

        // --- NAVIGATION ---
        const settingTabs = document.querySelectorAll('.settings-nav-btn');
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
        const settingsOverlay = $('settings-overlay');
        const settingsCloseBtn = $('settings-close-btn');

        if (settingsBtn && settingsOverlay) {
            settingsBtn.addEventListener('click', () => settingsOverlay.classList.add('visible'));
        }
        if (settingsCloseBtn && settingsOverlay) {
            settingsCloseBtn.addEventListener('click', () => settingsOverlay.classList.remove('visible'));
        }

        // --- SUB NAVIGATION ---
        const subNavBtns = document.querySelectorAll('.sub-nav-btn');
        subNavBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = btn.dataset.subTarget;
                const parentTab = btn.closest('.settings-tab-content');
                if (!parentTab) return;

                parentTab.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                parentTab.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));
                const targetContent = document.getElementById(targetId);
                if (targetContent) targetContent.classList.add('active');
            });
        });

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

                const customVal = customEmojiInput ? customEmojiInput.value : '';
                if (this.callbacks.onEmojiChange) this.callbacks.onEmojiChange(val, customVal);
            });
        }

        if (customEmojiInput) {
            customEmojiInput.addEventListener('input', (e) => {
                const val = e.target.value;
                this.saveSetting('customCoverEmoji', val);
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

        const setupAudioToggle = (toggleId, containerId, settingKey, callbackKey) => {
            const toggle = $(toggleId);
            const container = $(containerId);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    const enabled = e.target.checked;
                    this.saveSetting(settingKey, enabled);
                    if (container) container.style.display = enabled ? 'flex' : 'none';
                    if (this.callbacks.onAudioEffectChange) this.callbacks.onAudioEffectChange();
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
                });
            }
        };

        setupAudioToggle('toggle-bass-boost', 'bass-boost-slider-container', 'bassBoostEnabled');
        setupAudioSlider('bass-boost-slider', 'bass-boost-value', 'bassBoostValue');

        setupAudioToggle('toggle-treble-boost', 'treble-boost-slider-container', 'trebleBoostEnabled');
        setupAudioSlider('treble-boost-slider', 'treble-boost-value', 'trebleBoostValue');

        setupAudioToggle('toggle-reverb', 'reverb-slider-container', 'reverbEnabled');
        setupAudioSlider('reverb-slider', 'reverb-value', 'reverbValue');

        // Resets
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
                });
            }
        };

        resetAudio('bass-boost-reset-btn', 'bass-boost-slider', 'bass-boost-value', 'bassBoostValue', 6);
        resetAudio('treble-boost-reset-btn', 'treble-boost-slider', 'treble-boost-value', 'trebleBoostValue', 6);
        resetAudio('reverb-reset-btn', 'reverb-slider', 'reverb-value', 'reverbValue', 30);

        // --- 5 BiquadFilterNode ---
        const toggleEq = $('toggle-equalizer');
        const eqContainer = $('eq-sliders-container');
        if (toggleEq) {
            toggleEq.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                this.saveSetting('eqEnabled', enabled);
                if (eqContainer) eqContainer.style.display = enabled ? 'flex' : 'none';
                if (this.callbacks.onAudioEffectChange) this.callbacks.onAudioEffectChange();
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
            });
        }


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
                localStorage.clear();
                location.reload();
            });
        }

        const btnRestartApp = $('btn-restart-app');
        if (btnRestartApp) {
            btnRestartApp.addEventListener('click', () => {
                if (this.api && this.api.restartApp) this.api.restartApp();
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
                if (this.api && this.api.restartApp) this.api.restartApp(); // Or dedicated quit if available
            });
        }
    },

    restoreUIState: function () {
        const s = this.settings;
        const $ = (id) => document.getElementById(id);

        if (!s) return;

        // Appearance
        const themeSelect = $('theme-select');
        if (themeSelect && s.theme) themeSelect.value = s.theme;

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
        if (animationSelect && s.animationMode) animationSelect.value = s.animationMode;

        // Appearance
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


        // Player
        const sleepTimerSelect = $('sleep-timer-select');

        const speedSlider = $('speed-slider');
        const speedValue = $('speed-value');
        if (speedSlider && s.playbackSpeed) {
            speedSlider.value = s.playbackSpeed;
            if (speedValue) speedValue.textContent = s.playbackSpeed.toFixed(1) + 'x';
        }

        const toggleDeleteSongs = $('toggle-delete-songs');
        if (toggleDeleteSongs) toggleDeleteSongs.checked = !!s.deleteSongsEnabled;

        // Downloads
        const dlInput = $('default-download-folder');
        if (dlInput && s.downloadFolder) dlInput.value = s.downloadFolder;

        const qualitySelect = $('audio-quality-select');
        if (qualitySelect && s.audioQuality) qualitySelect.value = s.audioQuality;

        const autoLoadLastFolderToggle = $('toggle-auto-load-last-folder');
        if (autoLoadLastFolderToggle) autoLoadLastFolderToggle.checked = s.autoLoadLastFolder !== false;


        // Audio Extras
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

        // --- 5 BiquadFilterNode ---
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
        }


        // Intros
        if (s.activeIntro) {
            const introCards = document.querySelectorAll('.intro-card');
            introCards.forEach(c => {
                c.classList.toggle('active', c.dataset.intro === s.activeIntro);
            });
        }

        // Extras
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
    },

    renderDesignCards: function () {
        const container = document.getElementById('design-ui-cards');
        if (!container) return;

        // Clear container (Standard Pattern)
        container.innerHTML = '';

        // --- SECTION 1: DESIGN CARDS ---
        const tr = (key) => LangHandler.tr(key);
        const activeUi = localStorage.getItem('uiVersion') || 'legacy';
        const activeBadgeText = tr('designActiveBadge');

        const cards = [
            {
                key: 'legacy',
                label: tr('designLegacyLabel'),
                badge: tr('designLegacyBadge'),
                desc: tr('designLegacyDesc'),
                target: 'index.html'
            },
            {
                key: 'v2',
                label: tr('designV2Label'),
                badge: tr('designV2Badge'),
                desc: tr('designV2Desc'),
                target: 'v2.html'
            }
        ];

        cards.forEach(card => {
            const isActive = card.key === activeUi;

            const cardEl = document.createElement('div');
            cardEl.className = `design-card ${isActive ? 'active' : ''}`;

            // Badge
            const badgeEl = document.createElement('div');
            badgeEl.className = 'design-card-badge';
            badgeEl.textContent = card.badge;

            // Content
            const contentEl = document.createElement('div');
            contentEl.className = 'design-card-content';

            const titleEl = document.createElement('div');
            titleEl.className = 'design-card-title';
            titleEl.textContent = card.label;

            const descEl = document.createElement('div');
            descEl.className = 'design-card-desc';
            descEl.textContent = card.desc;

            contentEl.appendChild(titleEl);
            contentEl.appendChild(descEl);

            cardEl.appendChild(badgeEl);
            cardEl.appendChild(contentEl);

            // Active Status
            if (isActive) {
                const statusEl = document.createElement('div');
                statusEl.className = 'design-card-status';
                statusEl.textContent = activeBadgeText;
                cardEl.appendChild(statusEl);
            }

            // Event Listener (Standard Pattern)
            cardEl.addEventListener('click', () => {
                if (window.switchUI) {
                    window.switchUI(card.key, card.target);
                } else {
                    // Fallback
                    localStorage.setItem('uiVersion', card.key);
                    window.location.href = card.target;
                }
            });

            container.appendChild(cardEl);
        });

        // --- SECTION 2: HOTKEY INFO ---
        const hotkeySection = document.createElement('div');
        hotkeySection.className = 'setting-item';
        hotkeySection.style.marginTop = '24px';
        hotkeySection.style.borderTop = '1px solid var(--border-soft)';
        hotkeySection.style.paddingTop = '24px';
        hotkeySection.style.display = 'block';

        hotkeySection.innerHTML = `
            <div class="setting-label" style="margin-bottom: 15px;">
                <strong>UI Shortcuts</strong>
                <p>Quickly switch between interfaces using your keyboard</p>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border: 1px solid var(--border-soft); display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-size: 0.85rem; font-weight: 600;">Legacy UI</span>
                    <div style="display: flex; gap: 4px;">
                        <kbd style="background: #222; padding: 4px 8px; border-radius: 4px; border: 1px solid #444; font-family: monospace; font-size: 0.8rem; color: var(--accent);">CTRL</kbd>
                        <kbd style="background: #222; padding: 4px 8px; border-radius: 4px; border: 1px solid #444; font-family: monospace; font-size: 0.8rem; color: var(--accent);">U</kbd>
                        <kbd style="background: #222; padding: 4px 8px; border-radius: 4px; border: 1px solid #444; font-family: monospace; font-size: 0.8rem; color: var(--accent);">1</kbd>
                    </div>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border: 1px solid var(--border-soft); display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-size: 0.85rem; font-weight: 600;">NovaWave V2</span>
                    <div style="display: flex; gap: 4px;">
                        <kbd style="background: #222; padding: 4px 8px; border-radius: 4px; border: 1px solid #444; font-family: monospace; font-size: 0.8rem; color: var(--accent);">CTRL</kbd>
                        <kbd style="background: #222; padding: 4px 8px; border-radius: 4px; border: 1px solid #444; font-family: monospace; font-size: 0.8rem; color: var(--accent);">U</kbd>
                        <kbd style="background: #222; padding: 4px 8px; border-radius: 4px; border: 1px solid #444; font-family: monospace; font-size: 0.8rem; color: var(--accent);">2</kbd>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(hotkeySection);
    }
};
