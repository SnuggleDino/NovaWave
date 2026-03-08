// --- NOVA WAVE PRO - ADVANCED ENGINE ---
import * as App from '../../wailsjs/go/main/App.js';
import { PlaylistManager } from '../playlist/playlist_manager.js';
import { de_pro } from './language_pro/de_pro.js';
import { en_pro } from './language_pro/en_pro.js';

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const state = { 
    audio: new Audio(), 
    tracks: [], 
    idx: -1, 
    folder: '', 
    lang: 'de', 
    proKeys: de_pro,
    shuffle: false,
    loop: 'none', // none, all, one
    startTime: Date.now(),
    isReady: false
};

function tr(key) { return state.proKeys[key] || key; }

function logPro(msg, type = '') {
    const timestamp = new Date().toLocaleTimeString();
    const logBox = $('system-log-box');
    if(logBox) {
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.textContent = `[${timestamp}] ${msg}`;
        logBox.appendChild(line);
        logBox.scrollTop = logBox.scrollHeight;
    }
}

async function waitWails() {
    let retry = 0;
    while((!window.go || !window.go.main || !window.go.main.App) && retry < 100) {
        await new Promise(r => setTimeout(r, 50));
        retry++;
    }
}

// --- INITIALIZATION ---
async function boot() {
    logPro("PRO_ENGINE: BOOT_SEQUENCE_START");
    
    // Initialize UI navigation immediately so buttons work even while waiting for backend
    initNavigation();
    initHotkeys();
    
    await waitWails();
    logPro("Wails bridge established.");
    
    try {
        const settings = await App.GetSettings();
        state.lang = settings?.language || 'de';
        state.proKeys = state.lang === 'de' ? de_pro : en_pro;
        
        applyTranslations();
        initAudio();
        initLibrary();
        initDownloader();
        initSettings();
        fetchGitHubCommits();
        startUptimeCounter();
        initMediaKeyBridge();

        if(settings) {
            // Load Persistence
            state.audio.volume = settings.v2_volume ? parseFloat(settings.v2_volume) : 0.5;
            $('m-vol').value = state.audio.volume;
            
            state.shuffle = !!settings.v2_shuffle;
            state.loop = settings.v2_loop || 'none';
            updateModeIcons();

            if(settings.v2_theme_color) applyTheme(settings.v2_theme_color);
            else applyTheme('#ff5722');
            
            const path = settings.currentFolderPath || settings.CurrentFolderPath;
            if(path) {
                state.folder = path;
                logPro(`AUTO_MOUNT: ${path}`);
                App.RefreshMusicFolder(path).then(res => {
                    if(res && res.tracks) handleTracks(res.tracks, path);
                }).catch(() => logPro("AUTO_MOUNT_FAILED", "err"));
            }
        }
    } catch(err) {
        logPro("BOOT_ERROR: Backend interaction failed.", "err");
    }
    
    state.isReady = true;
    logPro("PRO_ENGINE: STATUS_READY");
}

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => {
            const target = btn.getAttribute('data-v');
            logPro(`UI_NAVIGATION: ${target.toUpperCase()}`);
            document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b === btn));
            document.querySelectorAll('.view-section').forEach(v => v.classList.toggle('active', v.id === 'v-' + target));
        };
    });
}

function initMediaKeyBridge() {
    // Media Key Events from Backend
    window.runtime?.EventsOn("media-key", (key) => {
        logPro(`MEDIA_KEY: ${key.toUpperCase()}`);
        if(key === "playpause") $('m-play').click();
        if(key === "next") $('m-next').click();
        if(key === "prev") $('m-prev').click();
    });
}

// --- AUDIO LOGIC ---
function initAudio() {
    state.audio.ontimeupdate = () => {
        if(!state.audio.duration) return;
        const pct = (state.audio.currentTime / state.audio.duration) * 100;
        $('m-fill').style.width = pct + "%";
        $('m-cur').textContent = fmt(state.audio.currentTime);
        $('m-tot').textContent = fmt(state.audio.duration);
    };

    state.audio.onended = () => {
        if(state.loop === 'one') {
            state.audio.currentTime = 0;
            state.audio.play();
        } else {
            nextTrack();
        }
    };

    $('m-play').onclick = () => {
        if(state.idx === -1 && state.tracks.length > 0) play(0);
        else if(state.audio.paused) state.audio.play();
        else state.audio.pause();
    };
    
    $('m-next').onclick = () => nextTrack();
    $('m-prev').onclick = () => prevTrack();

    $('m-shuf').onclick = () => {
        state.shuffle = !state.shuffle;
        App.SetSetting('v2_shuffle', state.shuffle);
        updateModeIcons();
        logPro(`PLAYER_MODE: SHUFFLE -> ${state.shuffle ? 'ENABLED' : 'DISABLED'}`);
    };

    $('m-loop').onclick = () => {
        const modes = ['none', 'all', 'one'];
        state.loop = modes[(modes.indexOf(state.loop) + 1) % modes.length];
        App.SetSetting('v2_loop', state.loop);
        updateModeIcons();
        logPro(`PLAYER_MODE: LOOP -> ${state.loop.toUpperCase()}`);
    };
    
    state.audio.onplay = () => { 
        $('icon-play').classList.add('hidden'); 
        $('icon-pause').classList.remove('hidden'); 
        render(); 
    };
    state.audio.onpause = () => { 
        $('icon-play').classList.remove('hidden'); 
        $('icon-pause').classList.add('hidden'); 
    };
    
    $('m-vol').oninput = async e => { 
        const v = parseFloat(e.target.value);
        state.audio.volume = v; 
        await App.SetSetting('v2_volume', v.toString()); 
    };

    $('m-rail').onclick = e => {
        if(!state.audio.duration) return;
        const rect = $('m-rail').getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        state.audio.currentTime = pos * state.audio.duration;
    };
}

function nextTrack() {
    if(state.tracks.length === 0) return;
    if(state.shuffle) {
        play(Math.floor(Math.random() * state.tracks.length));
    } else {
        const next = (state.idx + 1) % state.tracks.length;
        if(next === 0 && state.loop === 'none') return;
        play(next);
    }
}

function prevTrack() {
    if(state.tracks.length === 0) return;
    let prev = state.idx - 1;
    if(prev < 0) prev = state.tracks.length - 1;
    play(prev);
}

function updateModeIcons() {
    $('m-shuf').classList.toggle('active', state.shuffle);
    $('m-loop').classList.toggle('active', state.loop !== 'none');
    $('m-loop').querySelector('span').textContent = state.loop === 'one' ? 'LP_1' : 'LOOP';
}

// --- LIBRARY & PLAYLIST ---
function initLibrary() {
    $('btn-open-folder').onclick = async () => {
        logPro("SYSTEM: REQUEST_FOLDER_PICKER");
        const res = await App.SelectMusicFolder();
        if(res && res.tracks) {
            logPro(`MOUNT_SUCCESS: ${res.tracks.length} tracks.`);
            handleTracks(res.tracks, res.folderPath);
            App.SetSetting('currentFolderPath', res.folderPath);
        }
    };
    $('lib-search').oninput = e => render(e.target.value);
}

function handleTracks(tracks, path) {
    state.folder = path;
    PlaylistManager.loadTracks(tracks);
    state.tracks = PlaylistManager.getAllTracks();
    $('stat-tracks').textContent = state.tracks.length;
    $('stat-folders').textContent = PlaylistManager.getFolderCount() || 1;
    render();
}

function play(i) {
    if(i < 0 || i >= state.tracks.length) return;
    state.idx = i;
    const t = state.tracks[i];
    logPro("LOAD_STREAM: " + t.path);
    state.audio.src = "/music/" + encodeURIComponent(t.path.replace(/\\/g, '/'));
    state.audio.play();
    
    $('m-title').textContent = $('dash-title').textContent = t.title || t.path.split(/[\\/]/).pop();
    $('m-artist').textContent = $('dash-artist').textContent = t.artist || "Unknown Artist";
    
    const cover = "/cover/" + encodeURIComponent(t.path.replace(/\\/g, '/'));
    $('m-art').src = $('dash-art').src = cover;
    
    $('m-art').classList.remove('hidden');
    $('dash-art').classList.remove('hidden');
    $('m-dino').classList.add('hidden');
    $('dash-dino').classList.add('hidden');

    $('m-art').onerror = $('dash-art').onerror = function() { 
        this.classList.add('hidden'); 
        $('m-dino').classList.remove('hidden'); 
        $('dash-dino').classList.remove('hidden'); 
    };
    render();
}

function render(q = '') {
    const query = q.toLowerCase();
    const items = PlaylistManager.getRenderList(query);
    
    $('track-body').innerHTML = items.map((item) => {
        if(item.type === 'folder') return `<tr class="folder-header"><td colspan="4">📂 ${item.name.toUpperCase()}</td></tr>`;
        
        const t = item.data;
        const realIdx = state.tracks.indexOf(t);
        const active = realIdx === state.idx;
        return `
        <tr class="track-row ${active?'active':''}" onclick="window.v2p(${realIdx})">
            <td class="t-mono">${active?'>>':realIdx+1}</td>
            <td class="t-title">${t.title || t.path.split(/[\\/]/).pop()}</td>
            <td class="t-artist">${t.artist || '-'}</td>
            <td class="t-mono">${fmt(t.duration)}</td>
        </tr>`;
    }).join('');
}

// --- DOWNLOADER ---
function initDownloader() {
    $('btn-dl').onclick = async () => {
        const url = $('dl-url').value.trim();
        const quality = $('dl-quality').value;
        if(!url) return;

        $('dl-monitor').classList.remove('hidden');
        $('dl-status').textContent = "SAMPLING_INIT...";
        logPro(`SAMPLER: STARTING -> ${url} [${quality.toUpperCase()}]`);

        const id = "dl_" + Date.now();
        const isS = await App.IsSpotifyUrl(url);
        
        try {
            if(isS) await App.DownloadFromSpotify(id, url, quality);
            else await App.DownloadFromYouTube({id, url, quality});
            logPro("SAMPLER: SIGNAL_SENT");
        } catch(err) {
            logPro("SAMPLER_ERROR: EXECUTION_FAILED", "err");
        }
    };

    // Listen for progress events (if supported by backend)
    window.runtime?.EventsOn("download-terminal-log", (data) => {
        if($('v-downloader').classList.contains('active')) {
             $('dl-status').textContent = "SAMPLING_ACTIVE";
             logPro(`DL_CORE: ${data.line.trim()}`);
        }
    });
}

// --- SYSTEM & SETTINGS ---
function initSettings() {
    document.querySelectorAll('.color-block').forEach(cb => {
        cb.onclick = async () => {
            const c = cb.dataset.c;
            applyTheme(c);
            await App.SetSetting('v2_theme_color', c);
            logPro(`CONFIG: ACCENT_COLOR -> ${c.toUpperCase()}`);
        };
    });
    
    $('btn-reset-fx-pro').onclick = async () => {
        if(confirm("DANGER: WIPE_ALL_CONFIG?")) {
            logPro("SYSTEM: REQUEST_RESET", "err");
            await App.ResetConfig();
            location.reload();
        }
    };
    
    $('btn-restart').onclick = async () => {
        logPro("SYSTEM: SENDING_WARM_REBOOT", "err");
        await App.RestartApp();
    };
    
    $('btn-quit').onclick = async () => {
        logPro("SYSTEM: SENDING_SHUTDOWN", "err");
        await App.ShutdownApp();
    };
    
    $('btn-legacy').onclick = () => {
        App.SetSetting('uiVersion', 'legacy').then(() => location.href = 'index.html');
    };
}

function applyTheme(c) {
    document.documentElement.style.setProperty('--accent', c);
    let r=0,g=0,b=0;
    if(c.length===7){r=parseInt(c.substring(1,3),16);g=parseInt(c.substring(3,5),16);b=parseInt(c.substring(5,7),16);}
    document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);
    document.querySelectorAll('.color-block').forEach(cb => cb.classList.toggle('active', cb.dataset.c.toLowerCase() === c.toLowerCase()));
}

// --- HELPERS ---
function initHotkeys() {
    window.addEventListener('keydown', e => {
        if(e.ctrlKey && e.key.toLowerCase() === 'u') {
            const handleNext = (ev) => {
                if(ev.key === '1') App.SetSetting('uiVersion', 'legacy').then(() => location.href = 'index.html');
                else if(ev.key === '2') location.reload();
                window.removeEventListener('keydown', handleNext);
            };
            window.addEventListener('keydown', handleNext, { once: true });
        }
    });
}

function applyTranslations() {
    $('dash-status-label').textContent = tr('pro_status_ok');
    $('dash-source-monitor').textContent = tr('pro_source_monitor');
    $('dash-latest-commits').textContent = tr('pro_latest_commits');
    $('btn-open-folder').textContent = tr('pro_mount_path');
    $('lib-search').placeholder = tr('pro_search_db');
    $('btn-restart').textContent = tr('pro_warm_reboot');
    $('btn-quit').textContent = tr('pro_shutdown');
}

function startUptimeCounter() {
    setInterval(() => {
        const diff = Math.floor((Date.now() - state.startTime) / 1000);
        $('stat-uptime').textContent = fmt(diff);
    }, 1000);
}

window.v2p = i => play(i);
const fmt = s => { if(!s||isNaN(s)) return "00:00"; return `${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`; };

boot();
