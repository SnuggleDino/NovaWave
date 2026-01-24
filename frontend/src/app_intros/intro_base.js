/**
 * Base class for all intros.
 * Provides basic mount/unmount functionality.
 */
export class Intro {
    constructor(containerId) {
        this.containerId = containerId;
    }

    mount() {
        console.warn('Intro.mount() not implemented');
    }

    unmount() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.remove();
        }
    }
}
