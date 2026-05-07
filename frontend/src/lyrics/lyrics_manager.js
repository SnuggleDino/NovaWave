function tr(key) {
    if (typeof window !== 'undefined' && window.tr) return window.tr(key);
    return key;
}

function parseLrc(text) {
    const lines = [];
    const regex = /\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/;
    for (const raw of text.split('\n')) {
        const m = raw.match(regex);
        if (m) {
            const time = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
            lines.push({ time, text: m[3].trim() });
        }
    }
    return lines.sort((a, b) => a.time - b.time);
}

export const LyricsManager = {
    overlay: null,
    content: null,
    closeBtn: null,
    btn: null,
    audio: null,
    lrcLines: null,
    activeIdx: -1,
    _timeupdateHandler: null,

    init(audioEl) {
        this.overlay = document.getElementById('lyrics-overlay');
        this.content = document.getElementById('lyrics-content');
        this.closeBtn = document.getElementById('lyrics-close-btn');
        this.btn = document.getElementById('lyrics-btn');

        if (this.btn) this.btn.style.display = 'none';

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hideLyrics());
        }

        if (audioEl) {
            this.audio = audioEl;
            this._timeupdateHandler = () => {
                if (this.lrcLines) this._syncLrc(this.audio.currentTime);
            };
            this.audio.addEventListener('timeupdate', this._timeupdateHandler);
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

    async fetchAndShow(trackPath) {
        if (!trackPath) {
            this._showPlain(tr('noTrackSelected'));
            this.showLyrics();
            return;
        }

        this.showLoading();
        try {
            const text = await window.api.getLyrics(trackPath);
            if (text && text.trim().length > 0) {
                const parsed = parseLrc(text);
                if (parsed.length > 0) {
                    this.lrcLines = parsed;
                    this.activeIdx = -1;
                    this._renderLrc();
                    if (this.audio) this._syncLrc(this.audio.currentTime);
                } else {
                    this.lrcLines = null;
                    this._showPlain(text);
                }
            } else {
                this.lrcLines = null;
                this._showPlain(tr('lyricsNotFound'));
            }
        } catch (e) {
            this.lrcLines = null;
            this._showPlain(tr('lyricsError'));
            console.error(e);
        }
        this.showLyrics();
    },

    _renderLrc() {
        if (!this.content || !this.lrcLines) return;
        this.content.innerHTML = this.lrcLines
            .map((line, i) => `<div class="lrc-line" data-idx="${i}">${line.text || '&#9834;'}</div>`)
            .join('');
    },

    _syncLrc(currentTime) {
        if (!this.lrcLines || !this.content) return;
        let idx = -1;
        for (let i = 0; i < this.lrcLines.length; i++) {
            if (this.lrcLines[i].time <= currentTime) idx = i;
            else break;
        }
        if (idx === this.activeIdx) return;
        this.activeIdx = idx;

        const els = this.content.querySelectorAll('.lrc-line');
        els.forEach((el, i) => el.classList.toggle('lrc-active', i === idx));

        if (idx >= 0 && els[idx]) {
            els[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    _showPlain(text) {
        if (this.content) this.content.textContent = text;
    },

    updateUI(text) {
        this._showPlain(text);
    },

    showLyrics() {
        if (this.overlay) this.overlay.classList.add('visible');
    },

    hideLyrics() {
        if (this.overlay) this.overlay.classList.remove('visible');
        this.lrcLines = null;
        this.activeIdx = -1;
    },

    showLoading() {
        this.lrcLines = null;
        this.activeIdx = -1;
        if (this.content) this.content.textContent = tr('lyricsLoading');
    }
};
