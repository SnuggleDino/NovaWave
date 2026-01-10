// introEngine.js
// Handles the logic and rendering of different startup intros

export class Intro {
    constructor(containerId) {
        this.containerId = containerId;
    }

    // Creates the HTML structure for the intro
    mount() {
        console.warn('Intro.mount() should be implemented by subclass');
    }

    // Cleans up the HTML
    unmount() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.remove();
        }
    }
}

export class WaterdropIntro extends Intro {
    constructor() {
        super('splash-screen');
    }

    mount() {
        // Create the Overlay Div
        const overlay = document.createElement('div');
        overlay.id = this.containerId;
        overlay.className = 'splash-overlay';

        // Inner HTML structure (from original index.html)
        overlay.innerHTML = `
            <div class="pulse-container">
                <div class="pulse-ring"></div>
                <div class="intro-content">
                    <img src="./src/assets/icon.png" alt="Logo" class="splash-logo">
                    <h1 class="splash-title">NovaWave</h1>
                    <p class="splash-slogan">Your Music &#8226; Your Style &#8226; Your Rules</p>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Auto-remove logic is handled by the IntroManager or main app logic, 
        // but typically this intro doesn't need complex JS animation logic 
        // as it relies on CSS animations (.pulse-ring).
    }
}
