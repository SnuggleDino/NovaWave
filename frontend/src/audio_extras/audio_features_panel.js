function _tr(key) {
    if (typeof window !== 'undefined' && typeof window.tr === 'function') return window.tr(key);
    return key;
}

export class AudioFeaturesPanel {
    constructor() {
        this.container = null;
        this.speedPanel = null;
        this.isVisible = false;
        this.isSpeedPanelVisible = false;
        this.onSpeedChange = null;
    }

    init() {
        this.createElements();
        this.setupEventListeners();
    }

    createElements() {
        const panel = document.createElement('div');
        panel.id = 'audio-features-panel';
        panel.className = 'audio-features-panel';

        panel.innerHTML = `
            <div class="audio-feature-item" id="side-feat-bass" title="Bass Boost">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <rect width="16" height="20" x="4" y="2" rx="2" />
                    <circle cx="12" cy="14" r="4" />
                </svg>
            </div>
            <div class="audio-feature-item" id="side-feat-crystal" title="Crystalizer">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M6 3h12l4 9-10 10L2 12l4-9z" />
                </svg>
            </div>
            <div class="audio-feature-item" id="side-feat-reverb" title="Reverb">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                </svg>
            </div>
            <div class="audio-feature-item" id="side-feat-eq" title="Equalizer">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 20v-8"></path>
                    <path d="M9 20v-5"></path>
                    <path d="M15 20v-9"></path>
                    <path d="M21 20v-3"></path>
                </svg>
            </div>
            <div class="audio-feature-item audio-feature-item--clickable" id="side-feat-speed" title="${_tr('playbackSpeed')}">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 15a8 8 0 1 1 16 0"/>
                    <path d="M12 15l-2.5-4"/>
                    <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none"/>
                </svg>
            </div>
        `;

        const speedPanel = document.createElement('div');
        speedPanel.id = 'audio-speed-panel';
        speedPanel.className = 'audio-speed-panel';
        speedPanel.innerHTML = `
            <div class="asp-header">
                <span class="asp-title">${_tr('speedPanelLabel')}</span>
                <span class="asp-value" id="asp-value">1.0×</span>
            </div>
            <div class="asp-presets">
                <button class="asp-preset" data-rate="0.5">${_tr('speedUltraSlow')}</button>
                <button class="asp-preset" data-rate="0.75">${_tr('speedSlow')}</button>
                <button class="asp-preset active" data-rate="1">${_tr('speedNormal')}</button>
                <button class="asp-preset" data-rate="1.5">${_tr('speedFast')}</button>
                <button class="asp-preset" data-rate="2">${_tr('speedUltraFast')}</button>
            </div>
            <div class="asp-slider-row">
                <span class="asp-range-label">0.25×</span>
                <input type="range" id="asp-slider" class="asp-slider" min="0.25" max="3" step="0.05" value="1">
                <span class="asp-range-label">3.0×</span>
            </div>
        `;

        document.body.appendChild(panel);
        document.body.appendChild(speedPanel);
        this.container = panel;
        this.speedPanel = speedPanel;
    }

    setupEventListeners() {
        const speedBtn = document.getElementById('side-feat-speed');
        if (speedBtn) {
            speedBtn.addEventListener('click', () => this._toggleSpeedPanel());
        }

        this.speedPanel.querySelectorAll('.asp-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                this._applySpeed(parseFloat(btn.dataset.rate));
            });
        });

        const slider = document.getElementById('asp-slider');
        if (slider) {
            slider.addEventListener('input', () => {
                this._applySpeed(parseFloat(slider.value), false);
            });
        }
    }

    _applySpeed(rate, updateSlider = true) {
        const r = Math.min(Math.max(parseFloat(rate) || 1.0, 0.25), 3.0);

        const valueEl = document.getElementById('asp-value');
        if (valueEl) valueEl.textContent = _fmtRate(r);

        if (updateSlider) {
            const slider = document.getElementById('asp-slider');
            if (slider) slider.value = r;
        }

        this.speedPanel.querySelectorAll('.asp-preset').forEach(btn => {
            btn.classList.toggle('active', Math.abs(parseFloat(btn.dataset.rate) - r) < 0.001);
        });

        const speedIcon = document.getElementById('side-feat-speed');
        if (speedIcon) speedIcon.classList.toggle('active', Math.abs(r - 1.0) > 0.01);

        if (this.onSpeedChange) this.onSpeedChange(r);
    }

    _toggleSpeedPanel() {
        this.isSpeedPanelVisible = !this.isSpeedPanelVisible;
        this.speedPanel.classList.toggle('visible', this.isSpeedPanelVisible);
    }

    toggle() {
        this.isVisible = !this.isVisible;
        if (this.container) {
            this.container.classList.toggle('visible', this.isVisible);
            document.body.classList.toggle('audio-panel-open', this.isVisible);
        }
        if (!this.isVisible) {
            this.isSpeedPanelVisible = false;
            this.speedPanel.classList.remove('visible');
        }
    }

    updateStatus(settings) {
        const map = {
            'side-feat-bass':    settings.bassBoostEnabled,
            'side-feat-crystal': settings.trebleBoostEnabled,
            'side-feat-reverb':  settings.reverbEnabled,
            'side-feat-eq':      settings.eqEnabled,
        };
        for (const [id, active] of Object.entries(map)) {
            document.getElementById(id)?.classList.toggle('active', !!active);
        }
        const speedIcon = document.getElementById('side-feat-speed');
        if (speedIcon && settings.playbackSpeed !== undefined) {
            speedIcon.classList.toggle('active', Math.abs(settings.playbackSpeed - 1.0) > 0.01);
        }
    }

    syncSpeed(rate) {
        const r = parseFloat(rate) || 1.0;

        const slider = document.getElementById('asp-slider');
        if (slider) slider.value = r;

        const valueEl = document.getElementById('asp-value');
        if (valueEl) valueEl.textContent = _fmtRate(r);

        this.speedPanel?.querySelectorAll('.asp-preset').forEach(btn => {
            btn.classList.toggle('active', Math.abs(parseFloat(btn.dataset.rate) - r) < 0.001);
        });

        const speedIcon = document.getElementById('side-feat-speed');
        if (speedIcon) speedIcon.classList.toggle('active', Math.abs(r - 1.0) > 0.01);
    }

    refreshLabels() {
        const speedBtn = document.getElementById('side-feat-speed');
        if (speedBtn) speedBtn.title = _tr('playbackSpeed');

        if (this.speedPanel) {
            const aspTitle = this.speedPanel.querySelector('.asp-title');
            if (aspTitle) aspTitle.textContent = _tr('speedPanelLabel');

            const labelMap = { '0.5': 'speedUltraSlow', '0.75': 'speedSlow', '1': 'speedNormal', '1.5': 'speedFast', '2': 'speedUltraFast' };
            this.speedPanel.querySelectorAll('.asp-preset').forEach(btn => {
                const key = labelMap[btn.dataset.rate];
                if (key) btn.textContent = _tr(key);
            });
        }
    }
}

function _fmtRate(r) {
    const s = parseFloat(r.toFixed(2)).toString();
    return (s.includes('.') ? s : s + '.0') + '×';
}
