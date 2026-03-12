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
        const h = isEightBit ? 230 : 200;
        this.api.setWindowSize(w, h);

        if (this.onUpdate) this.onUpdate();

        if (this.visualizer) {
            // FIX: Save both style AND maxBars so we can fully restore them on disable()
            this.savedSettings.style = this.visualizer.style;
            this.savedSettings.maxBars = this.visualizer.maxBars;
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

        this.api.setWindowSize(1300, 900);

        if (this.visualizer) {
            // FIX: Restore the user's actual maxBars value instead of always 0.
            // 0 would silently fall back to the engine default (64), ignoring
            // any custom bar count the user had configured.
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