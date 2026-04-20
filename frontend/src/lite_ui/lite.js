/**
 * LITE UI — lite.js
 * Optimized folder loader, 3-state loop, and Refresh functionality.
 */

import * as App from '../../wailsjs/go/main/App.js';
import { LangHandler } from '../app_language/lang_handler.js';

// --- State ---
let playlist = [];
let basePlaylist = [];
let currentIndex = -1;
let isPlaying = false;
let shuffleOn = false;
let loopMode = 0; // 0 = Off, 1 = Loop All, 2 = Loop One
let currentVolume = 0.2;

const audio = document.getElementById('lite-audio');

// --- DOM refs ---
const $ = id => document.getElementById(id);

const elTitle = $('lite-title');
const elArtist = $('lite-artist');
const elCover = $('lite-cover');
const elFallback = $('lite-cover-fallback');
const elFill = $('lite-progress-fill');
const elCurrent = $('lite-time-current');
const elTotal = $('lite-time-total');
const elSeek = $('lite-seek');
const elVolume = $('lite-volume');
const elTrackList = $('lite-track-list');
const elTrackCount = $('lite-track-count');
const elShuffleBtn = $('lite-btn-shuffle');
const elLoopBtn = $('lite-btn-loop');
const elShuffleLbl = $('lite-shuffle-label');
const elLoopLbl = $('lite-loop-label');
const elLoopTypeText = $('lite-loop-type-text');
const elLoopOneBadge = $('lite-loop-one-badge');
const elPlaySvg = $('lite-play-svg');
const elPauseSvg = $('lite-pause-svg');
const elLoadingOverlay = $('lite-loading-overlay');
const elSearchInput = $('lite-search-input');

// --- Helpers ---
let searchTerm = '';
const tr = (key) => LangHandler.tr(key);

function applyTranslations() {
    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        const text = tr(key);
        if (text) el.textContent = text;
    });
    document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
        const key = el.dataset.langPlaceholder;
        const text = tr(key);
        if (text) el.placeholder = text;
    });
    document.querySelectorAll('[data-lang-title]').forEach(el => {
        const key = el.dataset.langTitle;
        const text = tr(key);
        if (text) el.title = text;
    });

    // Special cases
    elTrackCount.textContent = `0 ${tr('tracks')}`;
    if (currentIndex === -1) elTitle.textContent = tr('nothingPlaying');
}

function fmt(s) {
    if (isNaN(s) || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showLoading(show) {
    if (show) elLoadingOverlay.classList.remove('hidden');
    else elLoadingOverlay.classList.add('hidden');
}

// --- Shuffle helper ---
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// --- Logic ---
function toggleShuffle() {
    shuffleOn = !shuffleOn;
    elShuffleBtn.classList.toggle('active', shuffleOn);
    elShuffleLbl.classList.toggle('hidden', !shuffleOn);

    const current = currentIndex >= 0 ? playlist[currentIndex] : null;
    if (shuffleOn) {
        playlist = shuffleArray(basePlaylist);
    } else {
        playlist = [...basePlaylist];
    }

    if (current) {
        currentIndex = playlist.findIndex(t => t.path === current.path);
    }

    renderTrackList(true);
}

function toggleLoop() {
    loopMode = (loopMode + 1) % 3; // Cycle: 0 -> 1 -> 2 -> 0

    // UI Updates
    elLoopBtn.classList.toggle('active', loopMode > 0);
    elLoopLbl.classList.toggle('hidden', loopMode === 0);

    if (loopMode === 0) {
        audio.loop = false;
        elLoopOneBadge.classList.add('hidden');
    } else if (loopMode === 1) {
        audio.loop = false;
        elLoopTypeText.textContent = tr('loopAll');
        elLoopOneBadge.classList.add('hidden');
    } else if (loopMode === 2) {
        audio.loop = true;
        elLoopTypeText.textContent = tr('loopOne');
        elLoopOneBadge.classList.remove('hidden');
    }
}

function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    const track = playlist[index];

    elTitle.textContent = track.title || track.name || 'Unknown';
    elArtist.textContent = track.artist || '—';

    const rawPath = track.path.replace(/\\/g, '/');
    const safeUrl = '/music/' + encodeURI(rawPath).replace(/#/g, '%23');
    audio.src = safeUrl;
    audio.volume = currentVolume;
    audio.loop = (loopMode === 2);

    elCover.classList.add('hidden');
    elFallback.classList.remove('hidden');

    updateTrackListHighlight();
    if (isPlaying) {
        audio.play().catch(e => console.error("[LiteUI] Play error:", e));
    }
}

function updatePlayPauseUI() {
    if (isPlaying) {
        elPlaySvg.classList.add('hidden');
        elPauseSvg.classList.remove('hidden');
    } else {
        elPlaySvg.classList.remove('hidden');
        elPauseSvg.classList.add('hidden');
    }
}

function play() {
    audio.play().then(() => {
        isPlaying = true;
        updatePlayPauseUI();
    }).catch(console.error);
}

function pause() {
    audio.pause();
    isPlaying = false;
    updatePlayPauseUI();
}

function togglePlay() {
    if (audio.paused) play();
    else pause();
}

function playNext() {
    if (playlist.length === 0) return;
    let nextIdx = currentIndex + 1;

    if (nextIdx >= playlist.length) {
        if (loopMode === 1) nextIdx = 0;
        else return;
    }

    loadTrack(nextIdx);
    if (isPlaying) audio.play().catch(() => { });
}

function playPrev() {
    if (playlist.length === 0) return;
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) prevIdx = playlist.length - 1;

    loadTrack(prevIdx);
    if (isPlaying) audio.play().catch(() => { });
}

function renderTrackList(isReshuffle = false) {
    if (!isReshuffle) showLoading(true);

    const fragment = document.createDocumentFragment();

    // Filtering logic
    const filtered = playlist.map((track, originalIndex) => ({ track, originalIndex }))
        .filter(item => {
            if (!searchTerm) return true;
            const title = (item.track.title || item.track.name || '').toLowerCase();
            const artist = (item.track.artist || '').toLowerCase();
            return title.includes(searchTerm) || artist.includes(searchTerm);
        });

    elTrackCount.textContent = `${filtered.length} Tracks`;

    filtered.forEach((item, i) => {
        const { track, originalIndex } = item;
        const div = document.createElement('div');
        div.className = 'lite-track-item' + (originalIndex === currentIndex ? ' active' : '');
        div.innerHTML = `
            <span class="lite-track-num">${originalIndex + 1}</span>
            <div class="lite-track-info">
                <div class="lite-track-name">${escHtml(track.title || track.name)}</div>
                <div class="lite-track-meta">${escHtml(track.artist || '—')}</div>
            </div>
        `;
        div.addEventListener('click', () => {
            isPlaying = true;
            loadTrack(originalIndex);
            play();
        });
        fragment.appendChild(div);
    });

    requestAnimationFrame(() => {
        elTrackList.innerHTML = '';
        elTrackList.appendChild(fragment);
        if (!isReshuffle) showLoading(false);
        updateTrackListHighlight();
    });
}

function updateTrackListHighlight() {
    const items = elTrackList.children;
    for (let i = 0; i < items.length; i++) {
    }
}

// --- Audio Events ---
audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    elFill.style.width = pct + '%';
    elSeek.value = pct;
    elCurrent.textContent = fmt(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
    elTotal.textContent = fmt(audio.duration);
});

audio.addEventListener('ended', () => {
    if (loopMode === 1) {
        playNext();
    } else if (loopMode === 0) {
        if (currentIndex < playlist.length - 1) playNext();
        else pause();
    }
});

elSeek.addEventListener('input', () => {
    if (!audio.duration) return;
    audio.currentTime = (elSeek.value / 100) * audio.duration;
});

// --- Volume ---
audio.volume = currentVolume;
elVolume.value = currentVolume * 100;
elVolume.addEventListener('input', () => {
    currentVolume = elVolume.value / 100;
    audio.volume = currentVolume;
});

// --- Events ---
$('lite-btn-play').addEventListener('click', togglePlay);
$('lite-btn-next').addEventListener('click', () => { isPlaying = true; playNext(); });
$('lite-btn-prev').addEventListener('click', () => { isPlaying = true; playPrev(); });
elShuffleBtn.addEventListener('click', toggleShuffle);
elLoopBtn.addEventListener('click', toggleLoop);

elSearchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    renderTrackList(true);
});

$('lite-open-folder-btn').addEventListener('click', async () => {
    try {
        const result = await App.SelectMusicFolder();
        if (!result || !result.tracks || result.tracks.length === 0) return;

        processNewTracks(result.tracks);
    } catch (e) {
        console.error('[LiteUI] SelectMusicFolder error:', e);
        showLoading(false);
    }
});

$('lite-refresh-folder-btn').addEventListener('click', async () => {
    try {
        showLoading(true);
        const result = await App.RefreshMusicFolder();
        if (!result || !result.tracks) {
            showLoading(false);
            return;
        }
        processNewTracks(result.tracks);
    } catch (e) {
        console.error('[LiteUI] RefreshMusicFolder error:', e);
        showLoading(false);
    }
});

function processNewTracks(tracks) {
    showLoading(true);

    // --- Load Stop ---
    audio.pause();
    isPlaying = false;

    setTimeout(() => {
        basePlaylist = tracks;
        playlist = shuffleOn ? shuffleArray(basePlaylist) : [...basePlaylist];
        currentIndex = -1;
        renderTrackList();
        loadTrack(0);
        updatePlayPauseUI();
    }, 50);
}

$('lite-switch-full-btn').addEventListener('click', async () => {
    try { await App.SetSetting('uiVersion', 'legacy'); }
    catch (e) { localStorage.setItem('uiVersion', 'legacy'); }
    window.location.href = 'index.html';
});

// --- Initialization ---
applyTranslations();
