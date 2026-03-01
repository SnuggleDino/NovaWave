// --- Imports ---
import * as App from '../../wailsjs/go/main/App.js';
import '../../wailsjs/runtime/runtime.js';
import './v2.css';
import { PlaylistManager } from '../playlist/playlist_manager.js';
import { VisualizerEngine } from '../visualizerEngine.js';
import { AudioExtras } from '../audio_extras.js';
import { LangHandler } from '../app_language/lang_handler.js';
import { OnBoarding } from '../app_start/onboarding.js';
import updateData from '../app_updates/update_news.json';
import vinylImg from '../assets/Vinyl_Record.png';
import cdImg from '../assets/Compact_Disc.png';
import dinoImg from '../assets/Two_Loving_Cute_Dinos.png';
import iconImg from '../assets/icon.png';

// --- Safe API Wrapper ---
const api = {
    getSettings: () => App.GetSettings().catch(() => ({})),
    setSetting: (k,v) => App.SetSetting(k,v).catch(()=>{}),
    getLyrics: (p) => App.GetLyrics(p).catch(()=>""),
    hasLyrics: (p) => App.HasLyrics(p).catch(()=>false),
    selectMusicFolder: () => App.SelectMusicFolder().catch(()=>({tracks:[]})),
    selectFolder: () => App.SelectFolder().catch(()=>""),
    refreshMusicFolder: (p) => App.RefreshMusicFolder(p).catch(() => ({tracks:[]})),
    getAppMeta: () => App.GetAppMeta().catch(()=>({})),
    showInFolder: (p) => App.ShowInFolder(p).catch(()=>{}),
    deleteTrack: (p) => App.DeleteTrack(p).catch(()=>{}),
    restartApp: () => App.RestartApp().catch(()=>{}),
    resetConfig: () => App.ResetConfig().catch(()=>{}),
    isSpotifyUrl: (u) => App.IsSpotifyUrl(u).catch(()=>false),
    downloadFromYouTube: (o) => App.DownloadFromYouTube(o).catch(()=>{}),
    downloadFromSpotify: (id, u, q) => App.DownloadFromSpotify(id, u, q).catch(()=>{}),
    selectImage: () => App.SelectImage().catch(()=>""),
    getImageBase64: (p) => App.GetImageBase64(p).catch(()=>""),
    updateMetadata: (p, t, a) => App.UpdateMetadata(p, t, a).catch(()=>({success:false}))
};

// --- Global State ---
const state = {
    playlist: [],
    currentIndex: -1,
    isPlaying: false,
    audio: new Audio(),
    audioExtras: null,
    visualizer: null,
    volume: 0.5,
    lang: localStorage.getItem('language') || 'de',
    dlHistory: [],
    coverMode: 'auto',
    customCoverPath: null,
    downloadFolder: null,
    loop: false,
    shuffle: false,
    favs: new Set(),
    favFilterActive: false
};

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// --- 1. INITIALIZATION ---

document.addEventListener('DOMContentLoaded', async () => {
    state.lang = localStorage.getItem('language') || 'de';
    LangHandler.init(state.lang);
    applyTranslations();
    
    if ($('l-sidebar-logo')) $('l-sidebar-logo').src = iconImg;
    if ($('l-art-img')) $('l-art-img').src = iconImg;

    initNavigation();
    initAudioSystem();
    await initSettings();
    initDownloader();
    initModals();
    initLibraryButtons();
    loadChangelogInto('v2-changelog-list');
    
    setTimeout(async () => {
        $('v2-root')?.classList.add('ready');
        await autoLoad();
    }, 200);
});

function applyTranslations() {
    LangHandler.init(state.lang);
    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        const text = LangHandler.tr(key);
        if (text) {
            if (el.tagName === 'INPUT') el.placeholder = text;
            else el.textContent = text;
        }
    });
    // Refresh dynamic content
    loadChangelogInto('v2-changelog-list');
    const modalChangelog = $('modal-changelog-content');
    if (modalChangelog) loadChangelogInto('modal-changelog-content');
}

function initNavigation() {
    $$('.l-nav-btn, .l-home-card').forEach(btn => {
        btn.onclick = () => {
            const target = btn.dataset.v || btn.dataset.target;
            if(!target) return;
            $$('.l-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.v === target));
            $$('.l-view').forEach(v => v.classList.remove('active'));
            $(`view-${target}`)?.classList.add('active');
        };
    });
}

// --- 2. AUDIO ENGINE ---

function initAudioSystem() {
    state.audio.crossOrigin = "anonymous";
    state.audio.addEventListener('timeupdate', updateProgress);
    state.audio.addEventListener('ended', () => onTrackEnd());
    
    state.audio.addEventListener('play', async () => {
        if (!state.audioExtras) await initAudioEngine();
        state.visualizer?.start();
        window.logToDev("Visualizer: Engine started.");
        updatePlayIcon(true);
        renderPlaylist();
    });
    state.audio.addEventListener('pause', () => updatePlayIcon(false));

    $('l-vol-slider').oninput = (e) => {
        state.volume = parseFloat(e.target.value);
        state.audio.volume = state.volume;
        api.setSetting('v2_volume', state.volume);
    };

    $('l-seek-rail').onclick = (e) => {
        const rect = $('l-seek-rail').getBoundingClientRect();
        if(state.audio.duration) state.audio.currentTime = ((e.clientX - rect.left) / rect.width) * state.audio.duration;
    };

    $('btn-play-main').onclick = togglePlay;
    $('btn-next').onclick = playNext;
    $('btn-prev').onclick = playPrev;
    $('btn-shuffle').onclick = () => { state.shuffle = !state.shuffle; $('btn-shuffle').classList.toggle('active', state.shuffle); };
    $('btn-loop').onclick = () => { state.loop = !state.loop; $('btn-loop').classList.toggle('active', state.loop); };

    $('l-pb-fav').onclick = () => {
        if(state.currentIndex < 0) return;
        const t = state.playlist[state.currentIndex];
        const cleanPath = t.path.replace(/\\/g, '/');
        if(state.favs.has(cleanPath)) state.favs.delete(cleanPath);
        else state.favs.add(cleanPath);
        api.setSetting('favorites', Array.from(state.favs));
        updateUI(t);
        renderPlaylist();
    };
}

async function initAudioEngine() {
    if (state.audioExtras) return;
    state.audioExtras = new AudioExtras(state.audio);
    state.audioExtras.init();
    
    const s = await api.getSettings();
    state.visualizer = new VisualizerEngine(state.audio, $('l-vis-canvas'), {
        enabled: true, 
        style: s.v2_vis_style || 'orbit', 
        accentColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    });
    
    state.visualizer.setAnalyser(state.audioExtras.getAnalyser());
    state.visualizer.resize();
    state.visualizer.start(); // Start it immediately once engine is ready
    
    window.onresize = () => state.visualizer.resize();
}

// --- 3. SETTINGS ---

async function initSettings() {
    try {
        const s = await api.getSettings();
        if(!s) return;
        
        if(s.v2_volume !== undefined) { 
            state.volume = parseFloat(s.v2_volume);
            state.audio.volume = state.volume; 
            if($('l-vol-slider')) $('l-vol-slider').value = state.volume; 
        } else {
            state.audio.volume = state.volume;
            if($('l-vol-slider')) $('l-vol-slider').value = state.volume;
        }
        
        if(s.favorites) state.favs = new Set(s.favorites.map(p => p.replace(/\\/g, '/')));
        if(s.v2_cover_mode) state.coverMode = s.v2_cover_mode;
        if(s.v2_custom_cover) state.customCoverPath = s.v2_custom_cover;
        state.downloadFolder = s.downloadFolder || s.DownloadFolder;
        
        const dlPathEl = $('v2-dl-folder-path');
        if(dlPathEl) dlPathEl.textContent = state.downloadFolder || 'Not set';

        $('btn-v2-change-dl-folder').onclick = async () => {
            const p = await api.selectFolder();
            if(p) {
                state.downloadFolder = p;
                api.setSetting('downloadFolder', p);
                if(dlPathEl) dlPathEl.textContent = p;
                window.logToDev("Updated download folder: " + p);
            }
        };
        
        applyTheme(s.v2_theme || 'midnight');
        $$('.l-swatch').forEach(sw => {
            if(sw.dataset.t === (s.v2_theme || 'midnight')) sw.classList.add('active');
            sw.onclick = () => {
                applyTheme(sw.dataset.t);
                api.setSetting('v2_theme', sw.dataset.t);
                $$('.l-swatch').forEach(x => x.classList.remove('active'));
                sw.classList.add('active');
                
                if(state.visualizer) {
                    const newAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
                    state.visualizer.updateSettings({ accentColor: newAccent });
                }
            };
        });

        $$('.l-lang-btn').forEach(btn => {
            if (btn.dataset.lang === state.lang) btn.classList.add('active');
            btn.onclick = () => {
                const newLang = btn.dataset.lang;
                LangHandler.setLanguage(newLang);
                state.lang = newLang;
                api.setSetting('language', newLang);
                $$('.l-lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === newLang));
                applyTranslations();
            };
        });

        const coverSel = $('set-cover-mode');
        if(coverSel) {
            coverSel.value = s.v2_cover_mode || 'auto';
            state.coverMode = coverSel.value;
            coverSel.onchange = () => {
                state.coverMode = coverSel.value;
                api.setSetting('v2_cover_mode', state.coverMode);
                $('btn-set-custom-image').style.display = state.coverMode === 'custom' ? 'inline-flex' : 'none';
                if(state.currentIndex >= 0) updateUI(state.playlist[state.currentIndex]);
            };
        }

        const visSel = $('set-vis-style');
        if(visSel) {
            visSel.value = s.v2_vis_style || 'orbit';
            visSel.onchange = () => {
                const style = visSel.value;
                if(state.visualizer) state.visualizer.updateSettings({ style: style });
                api.setSetting('v2_vis_style', style);
            };
        }
        $('btn-set-custom-image').onclick = async () => {
            const p = await api.selectImage();
            if(p) { 
                state.customCoverPath = p; 
                api.setSetting('v2_custom_cover', p); 
                if(state.currentIndex >= 0) updateUI(state.playlist[state.currentIndex]); 
            }
        };

        const updateFX = () => {
            if (!state.audioExtras) return;
            const eq = Array.from($$('.l-slider-v')).map(sl => parseFloat(sl.value));
            state.audioExtras.setEq(eq, true);
            state.audioExtras.setBass(parseFloat($('fx-bass-val')?.value || 6), $('fx-bass-en').checked);
            state.audioExtras.setTreble(parseFloat($('fx-treble-val')?.value || 6), $('fx-treble-en').checked);
            state.audioExtras.setReverb(parseFloat($('fx-reverb-val')?.value || 30), $('fx-reverb-en').checked);
            api.setSetting('v2_eq_values', eq);
        };
        $$('.l-slider-v, .l-switch input, .l-slider-h').forEach(i => i.oninput = updateFX);
        $('btn-eq-reset-all').onclick = () => { $$('.l-slider-v').forEach(s => s.value = 0); updateFX(); };

        $('sys-switch-legacy').onclick = () => api.setSetting('uiVersion', 'legacy').then(() => window.location.href = 'index.html');
        $('sys-clear-cache').onclick = () => { localStorage.clear(); location.reload(); };
        $('sys-restart-app').onclick = () => api.restartApp();
        $('sys-reset-all').onclick = async () => { if(confirm("Reset Settings?")) { await api.resetConfig(); location.reload(); }};
        $('sys-quit-app').onclick = () => api.restartApp();
    } catch(e) {
        window.logToDev("Settings Error: " + e.message, 'err');
    }
}

function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.className = `theme-${t}`;
}

// --- 4. PLAYLIST ---

async function autoLoad() {
    try {
        const s = await api.getSettings();
        const path = s.currentFolderPath || s.CurrentFolderPath;
        if(path) {
            const res = await api.refreshMusicFolder(path);
            handleTracks(Array.isArray(res) ? res : (res?.tracks || []));
        }
    } catch(e) {
        window.logToDev("AutoLoad Error: " + e.message, 'err');
    }
}

$('btn-load-folder').onclick = async () => {
    const res = await api.selectMusicFolder();
    handleTracks(Array.isArray(res) ? res : (res?.tracks || []));
};

$('btn-refresh-playlist').onclick = async () => {
    const s = await api.getSettings(); if(!s.currentFolderPath) return;
    const start = Date.now();
    const res = await api.refreshMusicFolder(s.currentFolderPath);
    handleTracks(Array.isArray(res) ? res : (res?.tracks || []));
};

function initLibraryButtons() {
    $('btn-load-folder').onclick = async () => {
        try {
            const res = await api.selectMusicFolder();
            handleTracks(Array.isArray(res) ? res : (res?.tracks || []));
        } catch(e) {
            window.logToDev("Load Folder Error: " + e.message, 'err');
        }
    };

    $('btn-refresh-playlist').onclick = async () => {
        try {
            const s = await api.getSettings();
            const path = s.currentFolderPath || s.CurrentFolderPath;
            if(!path) return;
            const res = await api.refreshMusicFolder(path);
            handleTracks(Array.isArray(res) ? res : (res?.tracks || []));
        } catch(e) {
            window.logToDev("Refresh Folder Error: " + e.message, 'err');
        }
    };

    $('plist-sort').onchange = () => {
        state.playlist = PlaylistManager.getRenderList($('plist-search').value, $('plist-sort').value);
        renderPlaylist();
    };

    $('btn-fav-filter').onclick = () => {
        PlaylistManager.toggleFavOnly();
        $('btn-fav-filter').classList.toggle('active', PlaylistManager.favOnly);
        state.playlist = PlaylistManager.getRenderList($('plist-search').value, $('plist-sort').value);
        renderPlaylist();
    };
}

function handleTracks(tracks) {
    if(!tracks || !Array.isArray(tracks)) return;
    PlaylistManager.loadTracks(tracks);
    state.playlist = PlaylistManager.getAllTracks();
    renderPlaylist();
    if(tracks.length > 0) {
        showNotification(LangHandler.tr('statusFinished') || "Library Loaded", `${tracks.length} tracks ready.`);
    }
}

function showNotification(title, text) {
    const container = $('l-notifications');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = 'l-toast';
    toast.innerHTML = `<strong>${title}</strong><div style="font-size:11px;opacity:0.6">${text}</div>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = '0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function renderPlaylist() {
    const list = $('l-list-content');
    if (!list) return;
    const query = $('plist-search')?.value || '';
    const items = PlaylistManager.getRenderList(query, state.favFilterActive ? state.favs : null);
    state.playlist = PlaylistManager.getAllTracks();

    // Use fast string joining for performance
    const html = items.map((item, index) => {
        if(item.type === 'folder') return `<div style="padding:15px; opacity:0.3; font-size:11px; font-weight:800; text-transform:uppercase">📂 ${item.name}</div>`;
        const t = item.data;
        const realIdx = state.playlist.findIndex(x => x.path === t.path);
        const active = realIdx === state.currentIndex;
        
        // Fix: Strip extension if it's showing the filename
        let displayTitle = t.title || t.path.split(/[\\/]/).pop();
        if (displayTitle.toLowerCase().endsWith('.mp3')) displayTitle = displayTitle.slice(0, -4);
        if (displayTitle.toLowerCase().endsWith('.wav')) displayTitle = displayTitle.slice(0, -4);
        if (displayTitle.toLowerCase().endsWith('.flac')) displayTitle = displayTitle.slice(0, -5);
        if (displayTitle.toLowerCase().endsWith('.m4a')) displayTitle = displayTitle.slice(0, -4);
        
        const isLong = displayTitle.length > 25;

        const indicator = active && !state.audio.paused ? `
            <div class="playing-bars"><span></span><span></span><span></span></div>
        ` : `<div class="t-num">${active?'▶':index+1}</div>`;

        return `
            <div class="track-row ${active?'active':''}" 
                 onclick="window.playTrack(${realIdx})"
                 oncontextmenu="window.showCM(event, ${realIdx})">
                ${indicator}
                <div class="t-info">
                    <div class="t-title-wrap">
                        <div class="t-title ${isLong?'marquee':''}">${displayTitle}</div>
                    </div>
                    <div class="t-artist">${t.artist || '—'}</div>
                </div>
                <div class="t-meta-actions">
                    <div class="t-fav-btn ${state.favs.has(t.path.replace(/\\/g, '/'))?'active':''}" 
                         onclick="event.stopPropagation(); window.toggleFavRow('${t.path.replace(/\\/g, '\\\\')}')">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="${state.favs.has(t.path.replace(/\\/g, '/'))?'currentColor':'none'}" stroke="currentColor" stroke-width="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                    </div>
                    <div class="t-dur">${formatTime(t.duration)}</div>
                </div>
            </div>`;
    }).join('');
    list.innerHTML = html;
}

window.toggleFavRow = async function(path) {
    const cleanPath = path.replace(/\\/g, '/');
    if(state.favs.has(cleanPath)) state.favs.delete(cleanPath);
    else state.favs.add(cleanPath);
    
    api.setSetting('favorites', Array.from(state.favs));
    renderPlaylist();
    // Force player bar update if it matches
    if(state.currentIndex >= 0 && state.playlist[state.currentIndex].path.replace(/\\/g, '/') === cleanPath) {
        await updateUI(state.playlist[state.currentIndex]);
    }
};

let contextTrackIdx = -1;
window.showCM = function(e, idx) {
    e.preventDefault();
    contextTrackIdx = idx;
    const menu = $('l-context-menu');
    menu.style.display = 'flex';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    
    const hide = () => menu.style.display = 'none';
    document.addEventListener('click', hide, {once:true});
};

window.playTrack = async function(idx) {
    if(idx < 0 || idx >= state.playlist.length) return;
    state.currentIndex = idx;
    const t = state.playlist[idx];
    const path = t.path.replace(/\\/g, '/');
    state.audio.src = `/music/${encodeURI(path).replace(/#/g, '%23')}`;
    state.audio.play();
    await updateUI(t);
    renderPlaylist();
};

function togglePlay() {
    if(state.playlist.length === 0) return;
    if(state.currentIndex < 0) { window.playTrack(0); return; }
    if(state.audio.paused) state.audio.play(); else state.audio.pause();
}

function updatePlayIcon(playing) {
    $('l-play-svg').style.display = playing ? 'none' : 'block';
    $('l-pause-svg').style.display = playing ? 'block' : 'none';
}

function onTrackEnd() {
    if(state.loop) { state.audio.currentTime = 0; state.audio.play(); }
    else if(state.shuffle) { window.playTrack(Math.floor(Math.random() * state.playlist.length)); }
    else { playNext(); }
}

function playNext() { window.playTrack((state.currentIndex + 1) % state.playlist.length); }
function playPrev() { window.playTrack((state.currentIndex - 1 + state.playlist.length) % state.playlist.length); }

async function updateUI(t) {
    $('l-title').textContent = $('l-pb-title').textContent = t.title || t.path.split(/[\\/]/).pop();
    $('l-artist').textContent = $('l-pb-artist').textContent = t.artist || '—';
    
    // Favorites Toggle State
    const isFav = state.favs.has(t.path.replace(/\\/g, '/'));
    const favBtn = $('l-pb-fav');
    if(favBtn) {
        favBtn.classList.toggle('active', isFav);
        const favSvg = favBtn.querySelector('svg');
        if(favSvg) favSvg.setAttribute('fill', isFav ? 'currentColor' : 'none');
    }
    
    let coverSrc = iconImg;
    let isIcon = false;
    let isSpin = false;

    if(state.coverMode === 'auto') {
        coverSrc = `/cover/${encodeURI(t.path.replace(/\\/g, '/')).replace(/#/g, '%23')}`;
    } else if(state.coverMode === 'dino') {
        coverSrc = dinoImg;
    } else if(state.coverMode === 'note') {
        coverSrc = iconImg;
        isIcon = true;
    } else if(state.coverMode === 'vinyl') {
        coverSrc = vinylImg;
        isIcon = true;
        isSpin = true;
    } else if(state.coverMode === 'compact') {
        coverSrc = cdImg;
        isIcon = true;
        isSpin = true;
    } else if(state.coverMode === 'custom' && state.customCoverPath) {
        const b64 = await api.getImageBase64(state.customCoverPath);
        if(b64) coverSrc = b64;
    }

    const spinClass = isSpin && !state.audio.paused ? 'l-spin' : '';
    const imgTag = `<img src="${coverSrc}" class="${isIcon?'l-icon-mode':''} ${spinClass}" onerror="this.src='${iconImg}'">`;
    $('l-art-main').innerHTML = imgTag;
    $('l-pb-art').innerHTML = imgTag;
}

function updateProgress() {
    if(!state.audio.duration) return;
    const pct = (state.audio.currentTime / state.audio.duration) * 100;
    $('l-seek-fill').style.width = `${pct}%`;
    $('l-cur-time').textContent = formatTime(state.audio.currentTime);
    $('l-tot-time').textContent = formatTime(state.audio.duration);
}

function formatTime(s) { if(!s || isNaN(s)) return '0:00'; return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`; }

// --- 5. DOWNLOADER & MODALS ---

function initDownloader() {
    $('btn-dl-start').onclick = async () => {
        const url = $('dl-url-input').value.trim(); if(!url) return;
        window.logToDev("Starting download: " + url);
        $('dl-progress-box').style.display = 'block';
        $('dl-msg').textContent = LangHandler.tr('statusWorking');
        $('dl-progress-fill').style.width = "0%";
        
        const id = "dl_" + Date.now();
        const item = { id, title: url, status: 'working' };
        state.dlHistory.unshift(item); renderHistory();
        
        try {
            const isS = await api.isSpotifyUrl(url);
            let res;
            if(isS) {
                window.logToDev("Spotify URL detected, resolving metadata...");
                res = await api.downloadFromSpotify(id, url, "best");
            } else {
                res = await api.downloadFromYouTube({ id, url, quality: "best" });
            }
            
            if(res && res.success !== false) {
                window.logToDev("Download finished: " + id);
                item.status = 'finished';
                $('dl-msg').textContent = LangHandler.tr('statusFinished');
                $('dl-progress-fill').style.width = "100%";
            } else {
                throw new Error(res?.error || "Download failed");
            }
        } catch(e) { 
            window.logToDev("Download Error: " + e.message, 'err');
            item.status = 'failed'; 
            $('dl-msg').textContent = LangHandler.tr('statusError') + ": " + e.message;
            $('dl-progress-fill').style.backgroundColor = "#ef4444";
        }
        renderHistory();
    };

    window.addEventListener('wails:event:download-title-update', (e) => {
        const data = (e.detail && Array.isArray(e.detail)) ? e.detail[0] : e.detail;
        if (!data || !data.id) return;
        window.logToDev("Title Update: " + data.title);
        const item = state.dlHistory.find(h => h.id === data.id);
        if(item) {
            item.title = data.title;
            renderHistory();
        }
    });

    window.addEventListener('wails:event:download-terminal-log', (e) => {
        const line = (e.detail && Array.isArray(e.detail)) ? e.detail[0] : e.detail;
        if (!line || typeof line !== 'string') return;
        
        if (line.includes('ERROR')) window.logToDev("Terminal Error: " + line, 'err');

        const match = line.match(/(\d{1,3}\.\d)%/);
        if (match && match[1]) {
            const pct = match[1];
            if ($('dl-pct')) $('dl-pct').textContent = Math.floor(parseFloat(pct)) + "%";
            if ($('dl-progress-fill')) $('dl-progress-fill').style.width = pct + "%";
        }
    });

    window.addEventListener('wails:event:download-success', (e) => {
        const data = (e.detail && Array.isArray(e.detail)) ? e.detail[0] : e.detail;
        if (!data || !data.id) return;
        window.logToDev("Download Success: Saved to " + data.path);
        const item = state.dlHistory.find(h => h.id === data.id);
        if(item) {
            item.status = 'finished';
            item.path = data.path;
            renderHistory();
        }
    });

    $('btn-open-dl-folder').onclick = async () => {
        const s = await api.getSettings();
        const path = s.downloadFolder || s.DownloadFolder;
        if(path) api.showInFolder(path);
    };
}

function renderHistory() {
    $('dl-history-list').innerHTML = state.dlHistory.map(h => {
        // Fix: Use stored path or global download folder as fallback
        const openPath = (h.path || state.downloadFolder || '').replace(/\\/g, '\\\\');
        return `
        <div class="l-card l-hist-item">
            <span class="dot ${h.status==='finished'?'green':h.status==='failed'?'red':'yellow'}"></span>
            <div class="l-hist-title">${h.title}</div>
            ${h.status==='finished' ? `<button class="l-icon-btn-tiny" onclick="api.showInFolder('${openPath}')">📂</button>` : ''}
        </div>`;
    }).join('');
}

function initModals() {
    const m = $('modal-info');
    $$('.l-ft-link').forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.modal;
            $('modal-title').textContent = type.toUpperCase();
            
            if(type === 'dev') {
                $('modal-body').innerHTML = `
                    <div class="l-modal-grid-info">
                        <div class="l-info-section">
                            <h4>System Debug</h4>
                            <p>Renderer: WebKit / WebView2</p>
                            <div class="l-kbd-wrap"><span class="l-kbd">CTRL</span>+<span class="l-kbd">1</span><span>&rarr; Console</span></div>
                            <div class="l-kbd-wrap"><span class="l-kbd">CTRL</span>+<span class="l-kbd">U</span>+<span class="l-kbd">1/2</span><span>&rarr; UI</span></div>
                        </div>
                        <div class="l-info-section">
                            <h4>App Status</h4>
                            <p>Tracks: ${state.playlist.length}</p>
                            <p>Language: ${state.lang.toUpperCase()}</p>
                            <p>Theme: ${document.documentElement.getAttribute('data-theme')}</p>
                        </div>
                    </div>
                    <div class="l-dev-console" id="v2-dev-console">
                    </div>`;
                window.logToDev("NovaWave Dev Console initialized...");
                window.logToDev("System: Ready.");
            } else if(type === 'update') {
                $('modal-body').innerHTML = `<ul id="modal-changelog-content" class="l-modal-changelog"></ul>`;
                loadChangelogInto('modal-changelog-content');
            } else {
                $('modal-body').innerHTML = `
                    <div class="l-modal-grid-info">
                        <div class="l-info-section">
                            <h4 data-key="helpPlayback">Playback</h4>
                            <p data-key="helpPlayLong">Start with Space or multimedia keys.</p>
                        </div>
                        <div class="l-info-section">
                            <h4 data-key="helpNavTitle">Navigation</h4>
                            <p data-key="helpNavLong">Switch songs using Arrow keys.</p>
                        </div>
                        <div class="l-info-section">
                            <h4 data-key="helpMiniTitle">Mini Player</h4>
                            <p data-key="helpMiniLong">Switch to compact mode for more space.</p>
                        </div>
                        <div class="l-info-section">
                            <h4 data-key="helpSeekTitle">Seeking</h4>
                            <p data-key="helpSeekLong">Hold Shift + Arrow keys to skip 5s.</p>
                        </div>
                    </div>`;
                applyTranslations();
            }
            m.classList.add('active');
        };
    });
    $('modal-close').onclick = () => m.classList.remove('active');

    // Context Menu Listeners
    $('cm-play').onclick = () => { if(contextTrackIdx>=0) window.playTrack(contextTrackIdx); };
    $('cm-folder').onclick = () => { 
        if(contextTrackIdx < 0) return;
        const track = state.playlist[contextTrackIdx];
        if (track && track.path) {
            // Fix: Pass the absolute path string directly to api.showInFolder
            api.showInFolder(track.path);
        }
    };
    $('cm-edit').onclick = () => {
        if(contextTrackIdx < 0) return;
        const track = state.playlist[contextTrackIdx];
        $('edit-tag-title').value = track.title || "";
        $('edit-tag-artist').value = track.artist || "";
        $('modal-edit-tags').classList.add('active');
    };

    $('btn-edit-tag-cancel').onclick = () => $('modal-edit-tags').classList.remove('active');

    $('btn-edit-tag-save').onclick = async () => {
        if(contextTrackIdx < 0) return;
        const track = state.playlist[contextTrackIdx];
        const newTitle = $('edit-tag-title').value.trim();
        const newArtist = $('edit-tag-artist').value.trim();
        
        if(!newTitle) return;

        const res = await api.updateMetadata(track.path, newTitle, newArtist);
        if(res && res.success !== false) {
            track.title = newTitle;
            track.artist = newArtist;
            renderPlaylist();
            if(state.currentIndex >= 0 && state.playlist[state.currentIndex].path === track.path) {
                updateUI(track);
            }
            $('modal-edit-tags').classList.remove('active');
        } else {
            alert("Update failed: " + (res?.error || "Unknown error"));
        }
    };

    $('cm-delete').onclick = () => {
        if(contextTrackIdx < 0) return;
        const t = state.playlist[contextTrackIdx];
        $('delete-confirm-text').textContent = `Are you sure you want to delete "${t.title || 'this track'}" permanently from your disk?`;
        $('modal-confirm-delete').classList.add('active');
    };

    $('btn-delete-cancel').onclick = () => $('modal-confirm-delete').classList.remove('active');
    
    $('btn-delete-confirm').onclick = async () => {
        if(contextTrackIdx < 0) return;
        const t = state.playlist[contextTrackIdx];
        const res = await api.deleteTrack(t.path);
        if(res && res.success !== false) {
            window.logToDev("Deleted track: " + t.path);
            state.playlist.splice(contextTrackIdx, 1);
            PlaylistManager.loadTracks(state.playlist);
            renderPlaylist();
            $('modal-confirm-delete').classList.remove('active');
            showNotification(LangHandler.tr('finished') || "Deleted", "Track removed from disk.");
        } else {
            const err = res?.error || "Unknown error";
            window.logToDev("Delete failed: " + err, 'err');
            alert("Delete failed: " + err);
        }
    };
}

    $('plist-search').oninput = renderPlaylist;
    $('plist-sort').onchange = (e) => { PlaylistManager.sortItems(e.target.value); renderPlaylist(); };
    $('btn-fav-filter').onclick = () => {
        state.favFilterActive = !state.favFilterActive;
        $('btn-fav-filter').classList.toggle('active', state.favFilterActive);
        renderPlaylist();
    };

async function loadChangelogInto(targetId) {
    const container = $(targetId);
    if(!container || !updateData || !updateData.changes) return;
    
    const lang = LangHandler.currentLang || 'de';
    container.innerHTML = updateData.changes.map(item => `
        <li>
            <strong>${item.icon} ${item.title[lang] || item.title['en']}</strong>
            <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.6; line-height: 1.4;">
                ${item.desc[lang] || item.desc['en']}
            </p>
        </li>
    `).join('');
}

window.logToDev = function(msg, type = '') {
    const consoleEl = $('v2-dev-console');
    if (!consoleEl) return;
    const line = document.createElement('div');
    line.className = `l-dev-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
};

// Hook global console
const _origLog = console.log;
const _origErr = console.error;
console.log = (...args) => { _origLog(...args); window.logToDev(args.join(' ')); };
console.error = (...args) => { _origErr(...args); window.logToDev(args.join(' '), 'err'); };
