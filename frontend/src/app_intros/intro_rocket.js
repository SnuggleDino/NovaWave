import { CssBasedIntro } from './intro_css_adapter.js';

export class RocketIntro extends CssBasedIntro {
    constructor() {
        super('rocket-intro');
    }

    mount() {
        super.mount(); // Show overlay
        this.createStars();
    }

    createStars() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Clear existing static background div if needed or just append to container
        // We use a dedicated container for dynamic stars to clean them up easily
        let starField = container.querySelector('.star-field');
        if (!starField) {
            starField = document.createElement('div');
            starField.className = 'star-field';
            container.insertBefore(starField, container.firstChild);
        }
        starField.innerHTML = '';

        const starCount = 100;
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'rocket-star';
            
            // Random positioning
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const size = Math.random() * 2 + 1; // 1px to 3px
            const duration = Math.random() * 1 + 0.5; // 0.5s to 1.5s (fast!)
            const delay = Math.random() * 2;

            star.style.left = `${x}%`;
            star.style.top = `${y}%`;
            star.style.width = `${size}px`;
            star.style.height = `${size * 5}px`; // Streaked stars for speed effect
            star.style.animationDuration = `${duration}s`;
            star.style.animationDelay = `-${delay}s`; // Start immediately at different offsets

            starField.appendChild(star);
        }
    }

    unmount() {
        const container = document.getElementById(this.containerId);
        if (container) {
            const starField = container.querySelector('.star-field');
            if (starField) starField.remove();
        }
        super.unmount();
    }
}
