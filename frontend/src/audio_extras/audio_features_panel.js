export class AudioFeaturesPanel {
    constructor() {
        this.container = null;
        this.isVisible = false;
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
        `;

        document.body.appendChild(panel);
        this.container = panel;
    }

    setupEventListeners() {
    }

    toggle() {
        this.isVisible = !this.isVisible;
        if (this.container) {
            this.container.classList.toggle('visible', this.isVisible);
            document.body.classList.toggle('audio-panel-open', this.isVisible);
        }
    }

    updateStatus(settings) {
        const features = {
            'side-feat-bass': settings.bassBoostEnabled,
            'side-feat-crystal': settings.trebleBoostEnabled,
            'side-feat-reverb': settings.reverbEnabled,
            'side-feat-eq': settings.eqEnabled
        };

        for (const [id, active] of Object.entries(features)) {
            const el = document.getElementById(id);
            if (el) {
                el.classList.toggle('active', !!active);
            }
        }
    }
}