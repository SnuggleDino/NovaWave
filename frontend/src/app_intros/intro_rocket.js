import { CssBasedIntro } from './intro_css_adapter.js';

export class RocketIntro extends CssBasedIntro {
    constructor() {
        super('rocket-intro');
    }

    mount() {
        super.mount();
        this.createStars();
    }

    createStars() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
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

            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const size = Math.random() * 2 + 1;
            const duration = Math.random() * 1 + 0.5;
            const delay = Math.random() * 2;

            star.style.left = `${x}%`;
            star.style.top = `${y}%`;
            star.style.width = `${size}px`;
            star.style.height = `${size * 5}px`;
            star.style.animationDuration = `${duration}s`;
            star.style.animationDelay = `-${delay}s`;

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
