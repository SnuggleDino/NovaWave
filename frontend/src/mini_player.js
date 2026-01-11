export class MiniPlayer {
    constructor(api, visualizerInstance) {
        this.api = api;
        this.visualizer = visualizerInstance;
        this.isActive = false;
        this.savedSettings = {};
    }

    enable() {
        if (this.isActive) return;
        this.isActive = true;
        document.body.classList.add('is-mini');
        
        // Resize to Landscape Mini (e.g. 590x180)
        this.api.setWindowSize(590, 180);
        
        // Adjust Visualizer for Mini Mode
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
        
        // Restore Visualizer
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
