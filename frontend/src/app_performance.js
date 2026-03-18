export const AppPerformance = {
    lastFrameTime: performance.now(),
    frameCount: 0,
    appFrameCount: 0,
    fps: 0,
    avgFps: 60,
    perfHintShown: false,
    performanceMode: false,
    showStatsOverlay: false,
    targetFps: 60,
    lastStatsTime: performance.now(),
    warmupFrames: 0,

    // --- Cached DOM Refs (populated in init) ---
    _fpsEl: null,
    _timeEl: null,
    _lagEl: null,
    _perfInfoEl: null,

    // --- External Refs ---
    visualizer: null,
    settings: {},
    tr: (key) => key,
    saveSetting: () => { },
    applyAnimation: () => { },
    showNotification: () => { },

    init(options = {}) {
        this.visualizer = options.visualizer;
        this.settings = options.settings || {};
        this.tr = options.tr || this.tr;
        this.saveSetting = options.saveSetting || this.saveSetting;
        this.applyAnimation = options.applyAnimation || this.applyAnimation;
        this.showNotification = options.showNotification || this.showNotification;
        this.targetFps = this.settings.targetFps || 60;
        this.showStatsOverlay = !!this.settings.showStatsOverlay;
        this.performanceMode = !!this.settings.performanceMode;

        // Cache DOM elements once instead of querying on every frame
        this._fpsEl = document.getElementById('stat-fps');
        this._timeEl = document.getElementById('stat-time');
        this._lagEl = document.getElementById('stat-lag');
        this._perfInfoEl = document.getElementById('stat-perf-info');

        // FIX #1: Restore Performance Mode state on startup.
        if (this.performanceMode) {
            this.setPerformanceMode(true, true);
        }

        // FIX #2: Register the OK button click handler for the lag hint banner.
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
        requestAnimationFrame(() => this.updateLoop());
    },

    updateLoop() {
        if (document.hidden) {
            requestAnimationFrame(() => this.updateLoop());
            return;
        }

        const now = performance.now();
        const interval = 1000 / this.targetFps;
        const statsInterval = 1000;

        const delta = now - this.lastStatsTime;
        if (delta < interval) {
            requestAnimationFrame(() => this.updateLoop());
            return;
        }
        this.lastStatsTime = now - (delta % interval);
        this.appFrameCount++;
        this.warmupFrames++;

        const timeSinceLastLog = now - this.lastFrameTime;
        if (timeSinceLastLog >= statsInterval) {
            const appFps = Math.round((this.appFrameCount * 1000) / timeSinceLastLog);

            let visFps = 0;
            if (this.visualizer) {
                visFps = Math.round((this.visualizer.getAndResetFrameCount() * 1000) / timeSinceLastLog);
            }
            this.fps = visFps;
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
        const timeEl = this._timeEl;
        const lagEl = this._lagEl;
        const perfInfoEl = this._perfInfoEl;

        if (fpsEl) {
            fpsEl.textContent = `${appFps} (${this.fps || '-'})`;
            if (appFps >= this.targetFps * 0.9) fpsEl.style.color = '#4ade80';
            else if (appFps >= this.targetFps * 0.6) fpsEl.style.color = '#fbbf24';
            else fpsEl.style.color = '#ef4444';
        }

        if (timeEl) timeEl.textContent = frameTime + 'ms';

        if (lagEl) {
            if (this.performanceMode) {
                lagEl.textContent = this.tr('statPowerSave');
                lagEl.style.color = '#38bdf8';
            } else if (this.avgFps < this.targetFps * 0.5) {
                lagEl.textContent = 'LAG';
                lagEl.style.color = '#ef4444';
                this.triggerPerformanceHint();
            } else {
                lagEl.textContent = this.tr('statStable');
                lagEl.style.color = '#4ade80';
            }
        }

        if (perfInfoEl) {
            perfInfoEl.textContent = this.performanceMode
                ? 'Active'
                : `${Math.min(100, Math.round((this.avgFps / this.targetFps) * 100))}%`;
        }
    },

    setPerformanceMode(enabled, silent = false) {
        this.performanceMode = enabled;
        this.saveSetting('performanceMode', enabled);

        const toggle = document.getElementById('toggle-performance-mode');
        if (toggle) toggle.checked = enabled;

        if (enabled) {
            if (this.visualizer) this.visualizer.stop();
            this.applyAnimation('off');
            document.body.classList.add('perf-mode-active');
            if (!silent) this.showNotification(this.tr('perfModeOn'));
        } else {
            if (this.visualizer) this.visualizer.start?.();
            this.applyAnimation(this.settings.animationMode || 'flow');
            document.body.classList.remove('perf-mode-active');
        }
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
    }
};