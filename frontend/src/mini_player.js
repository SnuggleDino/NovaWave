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
        
        // Resize to Landscape Mini (e.g. 600x200)
        this.api.setWindowSize(600, 200);
        
        // Trigger update to refresh emoji/UI
        if (this.onUpdate) this.onUpdate();
        
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
