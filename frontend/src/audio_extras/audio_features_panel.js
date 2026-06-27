function _tr(key) {
    if (typeof window !== 'undefined' && typeof window.tr === 'function') return window.tr(key);
    return key;
}

function _fmtRate(r) {
    const s = parseFloat((parseFloat(r) || 1).toFixed(2)).toString();
    return (s.includes('.') ? s : s + '.0') + '×';
}

// ---- ICONS --------------------
const ICONS = {
    bass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="16" height="20" x="4" y="2" rx="2"/><circle cx="12" cy="14" r="4"/></svg>',
    crystal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 3h12l4 9-10 10L2 12l4-9z"/></svg>',
    reverb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    eq: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20v-8"/><path d="M9 20v-5"/><path d="M15 20v-9"/><path d="M21 20v-3"/></svg>',
    speed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15a8 8 0 1 1 16 0"/><path d="M12 15l-2.5-4"/><circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none"/></svg>',
};

const EQ_BANDS = ['60', '230', '910', '4k', '14k'];
const SPEED_PRESETS = [
    { rate: 0.5, key: 'speedUltraSlow' },
    { rate: 0.75, key: 'speedSlow' },
    { rate: 1, key: 'speedNormal' },
    { rate: 1.5, key: 'speedFast' },
    { rate: 2, key: 'speedUltraFast' },
];

export class AudioFeaturesPanel {
    constructor() {
        this.container = null;
        this.isVisible = false;
        this.onToggle = null;       // (settingKey, enabled)
        this.onParam = null;        // (settingKey, value)
        this.onSpeedChange = null;  // (rate)
        this._eqValues = [0, 0, 0, 0, 0];
        this._outsideHandler = null;
        this._keyHandler = null;
    }

    init() {
        this.createElements();
        this.setupEventListeners();
    }

    // ---- MARKUP --------------------
    createElements() {
        const panel = document.createElement('div');
        panel.id = 'audio-features-panel';
        panel.className = 'audio-features-panel';

        const featureRow = (feat, icon, labelKey) => `
            <div class="afp-group" data-feat="${feat}">
                <div class="afp-row">
                    <div class="afp-icon">${icon}</div>
                    <div class="afp-meta"><b data-label="${labelKey}">${_tr(labelKey)}</b><small data-role="val"></small></div>
                    <div class="afp-sw" data-setting="${feat}" role="switch" tabindex="0" aria-checked="false"></div>
                </div>`;

        const eqBands = EQ_BANDS.map((f, i) =>
            `<div class="afp-band" data-band="${i}"><div class="afp-track"><div class="afp-fill"></div></div><small>${f}</small></div>`
        ).join('');

        const speedChips = SPEED_PRESETS.map(p =>
            `<button class="afp-chip" data-rate="${p.rate}" data-label="${p.key}">${_tr(p.key)}</button>`
        ).join('');

        panel.innerHTML = `
            <div class="afp-head">
                <span class="afp-title" data-label="audioExtras">${_tr('audioExtras')}</span>
                <span class="afp-count" id="afp-count"></span>
            </div>

            ${featureRow('bassBoostEnabled', ICONS.bass, 'bassBoost')}</div>
            ${featureRow('trebleBoostEnabled', ICONS.crystal, 'trebleBoost')}</div>

            ${featureRow('reverbEnabled', ICONS.reverb, 'reverb')}
                <div class="afp-sub">
                    <div class="afp-slider-row">
                        <span class="lab" data-label="dry">${_tr('dry')}</span>
                        <input type="range" class="afp-range" id="afp-reverb-range" min="0" max="100" step="1" value="30">
                        <span class="lab" data-label="wet">${_tr('wet')}</span>
                    </div>
                </div>
            </div>

            ${featureRow('eqEnabled', ICONS.eq, 'equalizer')}
                <div class="afp-sub">
                    <div class="afp-eq" id="afp-eq">${eqBands}</div>
                </div>
            </div>

            <div class="afp-group expanded">
                <div class="afp-row">
                    <div class="afp-icon">${ICONS.speed}</div>
                    <div class="afp-meta"><b data-label="playbackSpeed">${_tr('playbackSpeed')}</b><small id="afp-speed-val">1.0×</small></div>
                </div>
                <div class="afp-sub"><div class="afp-speed">${speedChips}</div></div>
            </div>
        `;

        document.body.appendChild(panel);
        this.container = panel;
    }

    // ---- WIRING --------------------
    setupEventListeners() {
        // feature toggles
        this.container.querySelectorAll('.afp-sw').forEach(sw => {
            const fire = () => this._flipToggle(sw);
            sw.addEventListener('click', fire);
            sw.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); }
            });
        });

        // reverb wet/dry
        const reverb = this.container.querySelector('#afp-reverb-range');
        if (reverb) {
            reverb.addEventListener('input', () => {
                if (this.onParam) this.onParam('reverbValue', parseInt(reverb.value, 10));
            });
        }

        // equalizer strip (pointer drag)
        this._setupEqDrag();

        // speed presets
        this.container.querySelectorAll('.afp-chip').forEach(chip => {
            chip.addEventListener('click', () => this._applySpeed(parseFloat(chip.dataset.rate)));
        });
    }

    _flipToggle(sw) {
        const key = sw.dataset.setting;
        const enabled = !sw.classList.contains('on');
        sw.classList.toggle('on', enabled);
        sw.setAttribute('aria-checked', enabled ? 'true' : 'false');
        const row = sw.closest('.afp-row');
        const group = sw.closest('.afp-group');
        if (row) row.classList.toggle('on', enabled);
        if (group && group.querySelector('.afp-sub')) group.classList.toggle('expanded', enabled);
        if (this.onToggle) this.onToggle(key, enabled);
    }

    _setupEqDrag() {
        const eq = this.container.querySelector('#afp-eq');
        if (!eq) return;
        const apply = (band, clientY) => {
            const track = band.querySelector('.afp-track');
            const rect = track.getBoundingClientRect();
            let ratio = 1 - (clientY - rect.top) / rect.height;
            ratio = Math.max(0, Math.min(1, ratio));
            const v = Math.round(ratio * 24 - 12);
            const i = parseInt(band.dataset.band, 10);
            this._eqValues[i] = v;
            const fill = band.querySelector('.afp-fill');
            if (fill) fill.style.height = ((v + 12) / 24 * 100) + '%';
            if (this.onParam) this.onParam('eqValues', this._eqValues.slice());
        };
        eq.querySelectorAll('.afp-band').forEach(band => {
            let dragging = false;
            band.addEventListener('pointerdown', (e) => {
                dragging = true;
                band.setPointerCapture && band.setPointerCapture(e.pointerId);
                apply(band, e.clientY);
                e.preventDefault();
            });
            band.addEventListener('pointermove', (e) => { if (dragging) apply(band, e.clientY); });
            band.addEventListener('pointerup', () => { dragging = false; });
            band.addEventListener('pointercancel', () => { dragging = false; });
        });
    }

    _applySpeed(rate) {
        const r = Math.min(Math.max(parseFloat(rate) || 1.0, 0.25), 3.0);
        this._renderSpeed(r);
        if (this.onSpeedChange) this.onSpeedChange(r);
    }

    _renderSpeed(r) {
        const valueEl = this.container.querySelector('#afp-speed-val');
        if (valueEl) valueEl.textContent = _fmtRate(r);
        this.container.querySelectorAll('.afp-chip').forEach(chip => {
            chip.classList.toggle('active', Math.abs(parseFloat(chip.dataset.rate) - r) < 0.001);
        });
    }

    // ---- OPEN / CLOSE --------------------
    toggle() { this.isVisible ? this.close() : this.open(); }

    open() {
        if (!this.container) return;
        this.isVisible = true;
        this.container.classList.add('visible');
        document.body.classList.add('audio-panel-open');
        const fab = document.getElementById('audio-extras-toggle-btn');
        if (fab) fab.setAttribute('aria-expanded', 'true');
        setTimeout(() => {
            this._outsideHandler = (e) => {
                if (!this.container.contains(e.target) && !e.target.closest('#audio-extras-toggle-btn')) this.close();
            };
            document.addEventListener('click', this._outsideHandler);
        }, 0);
        this._keyHandler = (e) => { if (e.key === 'Escape') this.close(); };
        document.addEventListener('keydown', this._keyHandler);
    }

    close() {
        if (!this.container) return;
        this.isVisible = false;
        this.container.classList.remove('visible');
        document.body.classList.remove('audio-panel-open');
        const fab = document.getElementById('audio-extras-toggle-btn');
        if (fab) fab.setAttribute('aria-expanded', 'false');
        if (this._outsideHandler) { document.removeEventListener('click', this._outsideHandler); this._outsideHandler = null; }
        if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
    }

    // ---- STATE SYNC (settings -> panel) --------------------
    updateStatus(settings) {
        if (!this.container || !settings) return;
        const setRow = (key, active, valText) => {
            const group = this.container.querySelector(`.afp-group[data-feat="${key}"]`);
            if (!group) return;
            const row = group.querySelector('.afp-row');
            const sw = group.querySelector('.afp-sw');
            const val = group.querySelector('[data-role="val"]');
            if (row) row.classList.toggle('on', !!active);
            if (sw) { sw.classList.toggle('on', !!active); sw.setAttribute('aria-checked', active ? 'true' : 'false'); }
            if (val && valText !== undefined) val.textContent = valText;
            if (group.querySelector('.afp-sub')) group.classList.toggle('expanded', !!active);
        };

        setRow('bassBoostEnabled', settings.bassBoostEnabled, `${settings.bassBoostValue ?? 6} dB`);
        setRow('trebleBoostEnabled', settings.trebleBoostEnabled, `${settings.trebleBoostValue ?? 6} dB`);
        setRow('reverbEnabled', settings.reverbEnabled, `${_tr('wet')} ${settings.reverbValue ?? 30}%`);
        setRow('eqEnabled', settings.eqEnabled, '5-Band');

        const reverb = this.container.querySelector('#afp-reverb-range');
        if (reverb && settings.reverbValue !== undefined) reverb.value = settings.reverbValue;

        if (Array.isArray(settings.eqValues)) {
            this._eqValues = settings.eqValues.slice(0, 5);
            while (this._eqValues.length < 5) this._eqValues.push(0);
            this.container.querySelectorAll('#afp-eq .afp-band').forEach((band, i) => {
                const v = this._eqValues[i] || 0;
                const fill = band.querySelector('.afp-fill');
                if (fill) fill.style.height = ((v + 12) / 24 * 100) + '%';
            });
        }

        if (settings.playbackSpeed !== undefined) this._renderSpeed(settings.playbackSpeed);

        const count = ['bassBoostEnabled', 'trebleBoostEnabled', 'reverbEnabled', 'eqEnabled']
            .filter(k => !!settings[k]).length;
        const countEl = this.container.querySelector('#afp-count');
        if (countEl) countEl.textContent = count ? `● ${count}` : '';
    }

    syncSpeed(rate) { this._renderSpeed(parseFloat(rate) || 1.0); }

    // ---- i18n --------------------
    refreshLabels() {
        if (!this.container) return;
        this.container.querySelectorAll('[data-label]').forEach(el => {
            el.textContent = _tr(el.dataset.label);
        });
    }
}
