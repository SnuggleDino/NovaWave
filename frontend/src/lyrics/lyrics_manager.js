// FIX: Replaced all hardcoded German strings with translation keys via window.tr().
// Affected: showLoading(), fetchAndShow() error/empty states.
// New translation keys needed in all language files:
//   'lyricsLoading'   -> "Lade..." / "Loading..." / etc.
//   'lyricsNotFound'  -> "Keine Songtexte gefunden..."
//   'lyricsError'     -> "Fehler beim Laden der Songtexte."
//   'noTrackSelected' -> "Kein Song ausgewählt." (also used in main.js)

function tr(key) {
    if (typeof window !== 'undefined' && window.tr) return window.tr(key);
    return key;
}

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
            console.error('Lyrics check failed', e);
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
                // FIX: was hardcoded German — now uses translation key
                this.updateUI(tr('lyricsNotFound'));
            }
        } catch (e) {
            // FIX: was hardcoded German — now uses translation key
            this.updateUI(tr('lyricsError'));
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
        // FIX: was hardcoded German "Lade..." — now uses translation key
        if (this.content) this.content.textContent = tr('lyricsLoading');
    }
};