export class MiniPlayer {
    constructor(api, visualizerInstance, onUpdate) {
        this.api = api;
        this.visualizer = visualizerInstance;
        this.onUpdate = onUpdate;
        this.isActive = false;
        this.savedSettings = {};
    }

    enable() {
        if (this.isActive) return;
        this.isActive = true;
        document.body.classList.add('is-mini');

        const isEightBit = document.body.classList.contains('8-bit-active');
        const w = isEightBit ? 630 : 600;
        const h = isEightBit ? 225 : 200;
        this.api.setWindowSize(w, h);

        if (this.onUpdate) this.onUpdate();

        if (this.visualizer) {
            this.savedSettings.style = this.visualizer.style;
            this.savedSettings.maxBars = this.visualizer.maxBars;
            this.visualizer.updateSettings({
                style: 'bars',
                maxBars: 8
            });
        }
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        document.body.classList.remove('is-mini');

        this.api.setWindowSize(1300, 900);

        if (this.visualizer) {
            this.visualizer.updateSettings({
                style: this.savedSettings.style || 'bars',
                maxBars: this.savedSettings.maxBars !== undefined
                    ? this.savedSettings.maxBars
                    : 64
            });
        }
    }

    toggle() {
        if (this.isActive) this.disable();
        else this.enable();
        return this.isActive;
    }

    setVisualizer(vis) {
        this.visualizer = vis;
    }
}