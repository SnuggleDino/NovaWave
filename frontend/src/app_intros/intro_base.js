/**
 * Base class for all intros.
 * Provides basic mount/unmount functionality.
 */
export class Intro {
    constructor(containerId) {
        this.containerId = containerId;
    }

    /**
     * Called when the intro should be displayed.
     * Override this to create elements or show overlays.
     */
    mount() {
        console.warn('Intro.mount() not implemented');
    }

    /**
     * Called when the intro should be removed/hidden.
     */
    unmount() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.remove();
        }
    }
}
