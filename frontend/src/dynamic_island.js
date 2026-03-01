export class DynamicIsland {
    constructor() {
        this.element = document.getElementById('dynamic-island');
        this.messageEl = document.getElementById('island-message');
        this.spinnerEl = document.getElementById('island-spinner');
        this.iconEl = document.getElementById('island-icon');
        this.timeoutId = null;
    }

    show(message, type = 'info', duration = 3000) {
        if (!this.element || !this.messageEl) return;

        // Skip if in mini player mode
        if (document.body.classList.contains('is-mini')) {
            return;
        }

        if (this.timeoutId) clearTimeout(this.timeoutId);

        this.messageEl.textContent = message;

        if (this.spinnerEl) this.spinnerEl.style.display = 'none';
        if (this.iconEl) this.iconEl.style.display = 'none';

        if (type === 'loading') {
            if (this.spinnerEl) this.spinnerEl.style.display = 'block';
            duration = 0;
        } else if (type === 'success') {
            if (this.iconEl) {
                this.iconEl.style.display = 'block';
                this.iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #4ade80;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            }
        } else if (type === 'error') {
            if (this.iconEl) {
                this.iconEl.style.display = 'block';
                this.iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #ef4444;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
            }
        } else {
            if (this.iconEl) {
                this.iconEl.style.display = 'block';
                this.iconEl.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" class="timer-svg" style="transform: rotate(-90deg);">
                    <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.2)" stroke-width="2.5" fill="none"></circle>
                    <circle cx="12" cy="12" r="9" stroke="var(--accent)" stroke-width="2.5" fill="none" 
                            stroke-dasharray="56.5" stroke-dashoffset="0"
                            style="animation: timer-anim var(--timer-duration, 3s) linear forwards;"></circle>
                </svg>`;
                this.iconEl.style.setProperty('--timer-duration', `${duration > 0 ? duration : 3000}ms`);
            }
        }

        this.element.classList.add('visible');

        if (duration > 0) {
            this.timeoutId = setTimeout(() => this.hide(), duration);
        }
    }

    hide() {
        if (this.element) this.element.classList.remove('visible');
        if (this.timeoutId) clearTimeout(this.timeoutId);
    }

    showLoading(message) {
        this.show(message, 'loading', 0);
    }
}