export const AppPerformance = {
    lastFrameTime: performance.now(),
    appFrameCount: 0,
    visFps: 0,
    avgFps: 60,
    perfHintShown: false,
    performanceMode: false,
    showStatsOverlay: false,
    targetFps: 60,
    lastStatsTime: performance.now(),
    warmupFrames: 0,
    statsInterval: 1000,

    //--- DOM Refs ---------------
    _fpsEl: null,
    _visFpsEl: null,
    _timeEl: null,
    _lagEl: null,
    _perfInfoEl: null,
    _perfBannerEls: [],

    //--- Performance Gating ---------------
    // Controls disabled + greyed while Performance Mode is active.
    _gatedControlIds: [
        // Style tab
        'animation-select',
        'toggle-cinema-mode',
        'toggle-visualizer',
        'visualizer-style-select',
        'visualizer-bars-select',
        'visualizer-bars-reset-btn',
        'visualizer-sensitivity',
        'visualizer-sensitivity-reset-btn',
        // Player tab
        'toggle-crossfade',
        'crossfade-slider',
        'crossfade-reset-btn',
        'toggle-vol-norm',
    ],
    // Whole tabs greyed + click-locked (every control there is performance-heavy).
    _gatedTabIds: ['tab-audio', 'tab-themepacks'],

    //--- External Refs ---------------
    visualizer: null,
    settings: {},
    tr: (key) => key,
    saveSetting: () => { },
    applyAnimation: () => { },
    showNotification: () => { },
    onPerfModeChange: () => { },

    init(options = {}) {
        this.visualizer = options.visualizer;
        this.settings = options.settings || {};
        this.tr = options.tr || this.tr;
        this.saveSetting = options.saveSetting || this.saveSetting;
        this.applyAnimation = options.applyAnimation || this.applyAnimation;
        this.showNotification = options.showNotification || this.showNotification;
        this.onPerfModeChange = options.onPerfModeChange || this.onPerfModeChange;
        this.targetFps = this.settings.targetFps || 60;
        this.showStatsOverlay = !!this.settings.showStatsOverlay;
        this.performanceMode = !!this.settings.performanceMode;

        // Cache DOM elements once instead of querying on every frame
        this._fpsEl = document.getElementById('stat-fps');
        this._visFpsEl = document.getElementById('stat-vis-fps');
        this._timeEl = document.getElementById('stat-time');
        this._lagEl = document.getElementById('stat-lag');
        this._perfInfoEl = document.getElementById('stat-perf-info');
        this._perfBannerEls = Array.from(document.querySelectorAll('.perf-mode-banner'));

        if (this.performanceMode) {
            this.setPerformanceMode(true, true);
        }

        const perfBtn = document.getElementById('enable-perf-mode-btn');
        if (perfBtn) {
            perfBtn.addEventListener('click', () => {
                this.setPerformanceMode(true);
                const hint = document.getElementById('performance-hint');
                if (hint) hint.classList.remove('visible');
            });
        }

        this.startLoop();
    },

    startLoop() {
        // Track visibility changes so updateLoop() can skip the first
        // stale frame after the app is restored from minimize/hide.
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this._wasHidden = true;
            }
        });
        requestAnimationFrame(() => this.updateLoop());
    },

    updateLoop() {
        if (document.hidden) {
            requestAnimationFrame(() => this.updateLoop());
            return;
        }

        if (this._wasHidden) {
            this._wasHidden = false;
            this.lastFrameTime = performance.now();
            this.lastStatsTime = performance.now();
            this.appFrameCount = 0;
            requestAnimationFrame(() => this.updateLoop());
            return;
        }

        const now = performance.now();
        const interval = 1000 / this.targetFps;

        const delta = now - this.lastStatsTime;
        if (delta < interval) {
            requestAnimationFrame(() => this.updateLoop());
            return;
        }
        this.lastStatsTime = now - (delta % interval);
        this.appFrameCount++;
        this.warmupFrames++;

        const timeSinceLastLog = now - this.lastFrameTime;
        if (timeSinceLastLog >= this.statsInterval) {
            const appFps = Math.round((this.appFrameCount * 1000) / timeSinceLastLog);

            if (this.visualizer) {
                this.visFps = Math.round((this.visualizer.getAndResetFrameCount() * 1000) / timeSinceLastLog);
            } else {
                this.visFps = 0;
            }
            this.avgFps = appFps;

            const currentFrameTime = appFps > 0 ? Math.round(1000 / appFps) : 0;

            this.appFrameCount = 0;
            this.lastFrameTime = now;

            if (this.showStatsOverlay || (this.avgFps < this.targetFps * 0.8)) {
                this.updateUI(appFps, currentFrameTime);
            }
        }
        requestAnimationFrame(() => this.updateLoop());
    },

    updateUI(appFps, frameTime) {
        const fpsEl = this._fpsEl;
        const visFpsEl = this._visFpsEl;
        const timeEl = this._timeEl;
        const lagEl = this._lagEl;
        const perfInfoEl = this._perfInfoEl;

        if (fpsEl) {
            fpsEl.textContent = appFps;
            if (appFps >= this.targetFps * 0.9) fpsEl.style.color = '#4ade80';
            else if (appFps >= this.targetFps * 0.6) fpsEl.style.color = '#fbbf24';
            else fpsEl.style.color = '#ef4444';
        }

        if (visFpsEl) {
            let visText;
            if (this.visFps > 0) visText = this.visFps;
            else if (this.performanceMode || !this.settings.visualizerEnabled) visText = 'Off';
            else visText = 'Idle';
            visFpsEl.textContent = visText;
            visFpsEl.style.color = this.visFps > 0 ? '#94a3b8' : '#475569';
        }

        if (timeEl) timeEl.textContent = frameTime > 0 ? frameTime + 'ms' : '--';

        if (lagEl) {
            if (this.performanceMode) {
                lagEl.textContent = this.tr('statPowerSave');
                lagEl.style.color = '#38bdf8';
            } else if (this.avgFps < this.targetFps * 0.6) {
                lagEl.textContent = this.tr('statLag');
                lagEl.style.color = '#ef4444';
                this.triggerPerformanceHint();
            } else if (this.avgFps < this.targetFps * 0.85) {
                lagEl.textContent = this.tr('statLow');
                lagEl.style.color = '#fbbf24';
            } else {
                lagEl.textContent = this.tr('statStable');
                lagEl.style.color = '#4ade80';
            }
        }

        if (perfInfoEl) {
            perfInfoEl.textContent = this.performanceMode ? 'On' : 'Off';
            perfInfoEl.style.color = this.performanceMode ? '#38bdf8' : '#475569';
        }
    },

    // ---- STATS: immediate refresh using the last known values ----
    refreshStats() {
        const ft = this.avgFps > 0 ? Math.round(1000 / this.avgFps) : 0;
        this.updateUI(this.avgFps, ft);
    },

    setPerformanceMode(enabled, silent = false) {
        this.performanceMode = enabled;
        this.saveSetting('performanceMode', enabled);

        const toggle = document.getElementById('toggle-performance-mode');
        if (toggle) toggle.checked = enabled;

        if (enabled) {
            this.applyAnimation('off');
            document.body.classList.add('perf-mode-active');
            if (!silent) this.showNotification(this.tr('perfModeOn'));
        } else {
            this.applyAnimation(this.settings.animationMode || 'flow');
            document.body.classList.remove('perf-mode-active');
        }

        this._applyGating(enabled);
        this.onPerfModeChange(enabled);
    },

    // ---- PERFORMANCE GATING --------------------
    _applyGating(enabled) {
        this._gatedControlIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const item = el.closest('.setting-item');
            if (enabled) {
                el.disabled = true;
                item?.classList.add('perf-locked');
            } else {
                // Never re-enable a control a theme pack still holds locked.
                if (item?.classList.contains('tp-locked')) return;
                el.disabled = false;
                item?.classList.remove('perf-locked');
            }
        });
        this._gatedTabIds.forEach(id => {
            const tab = document.getElementById(id);
            if (tab) tab.classList.toggle('perf-tab-locked', enabled);
        });
        this._perfBannerEls.forEach(el => el.classList.toggle('visible', enabled));
    },

    triggerPerformanceHint(force = false) {
        if (!force && (this.perfHintShown || this.performanceMode)) return;
        if (!force && this.warmupFrames < 1200) return;

        const hint = document.getElementById('performance-hint');
        if (hint) {
            hint.classList.add('visible');
            if (!force) this.perfHintShown = true;
            setTimeout(() => { if (hint) hint.classList.remove('visible'); }, 10000);
        }
    },

    setTargetFps(val) {
        this.targetFps = val;
    },

    setShowStats(enabled) {
        this.showStatsOverlay = enabled;
        if (enabled) this.refreshStats();
    }
};