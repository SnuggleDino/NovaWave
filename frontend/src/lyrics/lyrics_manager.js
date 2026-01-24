/**
 * Lyrics Manager
 * Handles loading and displaying lyrics.
 * Currently supports:
 * - Local .lrc files (via Backend)
 */

export const LyricsManager = {
    overlay: null,
    content: null,
    closeBtn: null,
    btn: null,

    init() {
        this.overlay = document.getElementById('lyrics-overlay');
        this.content = document.getElementById('lyrics-content');
        this.closeBtn = document.getElementById('lyrics-close-btn');
        this.btn = document.getElementById('lyrics-btn');

        if (this.btn) this.btn.style.display = 'none';

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hideLyrics());
        }
    },

    async checkAvailability(trackPath) {
        if (!this.btn || !trackPath) {
            if (this.btn) this.btn.style.display = 'none';
            return;
        }

        try {
            const has = await window.api.hasLyrics(trackPath);
            this.btn.style.display = has ? 'flex' : 'none';
        } catch (e) {
            console.error("Lyrics check failed", e);
            this.btn.style.display = 'none';
        }
    },

    async loadLyrics(trackPath) {
        if (!trackPath) return;
    },

    async fetchAndShow(trackPath) {
        if (!trackPath) return;

        this.showLoading();
        try {
            const lyrics = await window.api.getLyrics(trackPath);
            if (lyrics && lyrics.trim().length > 0) {
                this.updateUI(lyrics);
            } else {
                this.updateUI('Keine Songtexte gefunden. (Erstelle eine .lrc Datei im Ordner)');
            }
        } catch (e) {
            this.updateUI('Fehler beim Laden der Songtexte.');
            console.error(e);
        }
        this.showLyrics();
    },

    updateUI(text) {
        if (this.content) {
            this.content.textContent = text;
        }
    },

    showLyrics() {
        if (this.overlay) this.overlay.classList.add('visible');
    },

    hideLyrics() {
        if (this.overlay) this.overlay.classList.remove('visible');
    },

    showLoading() {
        if (this.content) this.content.textContent = 'Lade...';
    }
};
