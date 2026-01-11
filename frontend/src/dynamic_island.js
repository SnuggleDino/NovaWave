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

        // Clear existing timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        // Set content
        this.messageEl.textContent = message;

        // Reset state
        if (this.spinnerEl) this.spinnerEl.style.display = 'none';
        if (this.iconEl) this.iconEl.style.display = 'none';

        // Handle types
        if (type === 'loading') {
            if (this.spinnerEl) this.spinnerEl.style.display = 'block';
            duration = 0; // Keep open until hidden manually
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
            // Info / Default
            if (this.iconEl) {
                this.iconEl.style.display = 'block';
                this.iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent);"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
            }
        }

        // Show animation
        this.element.classList.add('visible');

        // Auto hide
        if (duration > 0) {
            this.timeoutId = setTimeout(() => {
                this.hide();
            }, duration);
        }
    }

    hide() {
        if (this.element) {
            this.element.classList.remove('visible');
        }
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    showLoading(message) {
        this.show(message, 'loading', 0);
    }
}
