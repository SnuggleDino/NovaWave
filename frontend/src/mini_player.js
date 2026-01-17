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

        // Resize to Landscape Mini
        // For 8-bit theme, we need a bit more space due to thick borders and stacked layout
        const isEightBit = document.body.classList.contains('8-bit-active');
        const w = isEightBit ? 650 : 600;
        const h = isEightBit ? 300 : 200;
        this.api.setWindowSize(w, h);

        // Trigger update to refresh emoji/UI
        if (this.onUpdate) this.onUpdate();

        if (this.visualizer) {
            this.savedSettings.style = this.visualizer.style;
            this.visualizer.updateSettings({
                style: 'bars',
                maxBars: 5
            });
        }
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        document.body.classList.remove('is-mini');

        // Restore Size
        this.api.setWindowSize(1300, 900);

        if (this.visualizer) {
            this.visualizer.updateSettings({
                style: this.savedSettings.style || 'bars',
                maxBars: 0
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
