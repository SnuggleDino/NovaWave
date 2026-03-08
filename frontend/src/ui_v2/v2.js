// NovaWave Neo-Solid Engine
import * as App from '../../wailsjs/go/main/App.js';
import updateData from '../app_updates/update_news.json';
import defaultIcon from '../assets/icon.png';

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const state = {
    audio: new Audio(),
    tracks: [],
    idx: -1,
    folder: ''
};

// --- SAFE WAILS BINDING ---
async function waitForWails() {
    return new Promise(resolve => {
        const check = () => {
            if (window.go && window.go.main && window.go.main.App) {
                console.log("SolidEngine: Backend Link Established.");
                resolve();
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
}

// --- BOOT SEQUENCE ---
document.addEventListener('DOMContentLoaded', async () => {
    await waitForWails();

    initNav();
    initAudio();
    initLibrary();
    initDownloader();
    initSettings();
    
    // Load News
    if (updateData && updateData.changes) {
        $('news-container').innerHTML = updateData.changes.map(c => `
            <li class="news-item">
                <strong>${c.icon} ${c.title.en || c.title}</strong>
                <p>${c.desc.en || c.desc}</p>
            </li>
        `).join('');
    }

    // Auto-Load config
    try {
        const s = await App.GetSettings();
        if (s) {
            // Apply Theme
            if (s.v2_theme_color) applyTheme(s.v2_theme_color);
            // Apply Volume
            if (s.v2_volume !== undefined) {
                state.audio.volume = parseFloat(s.v2_volume);
                $('p-vol').value = state.audio.volume;
            }
            // Apply Folder
            const path = s.currentFolderPath || s.CurrentFolderPath;
            if (path) {
                state.folder = path;
                const res = await App.RefreshMusicFolder(path);
                if (res && res.tracks) {
                    state.tracks = res.tracks;
                    renderTracks();
                }
            }
        }
    } catch (err) {
        console.warn("SolidEngine: No previous settings found.", err);
    }
});

// --- NAVIGATION ---
function initNav() {
    $$('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.nav-btn').forEach(b => b.classList.remove('active'));
            $$('.view').forEach(v => v.classList.remove('active'));
            btn.classList.add('active');
            $(`view-${btn.dataset.target}`).classList.add('active');
        });
    });
}

// --- LIBRARY ---
function initLibrary() {
    $('btn-open-folder').addEventListener('click', async () => {
        try {
            const res = await App.SelectMusicFolder();
            if (res && res.tracks) {
                state.tracks = res.tracks;
                state.folder = res.folderPath;
                renderTracks();
            }
        } catch (e) { console.error("Folder select failed", e); }
    });

    $('btn-refresh-folder').addEventListener('click', async () => {
        if (!state.folder) return;
        try {
            const res = await App.RefreshMusicFolder(state.folder);
            if (res && res.tracks) {
                state.tracks = res.tracks;
                renderTracks();
            }
        } catch (e) { console.error("Refresh failed", e); }
    });

    $('input-search').addEventListener('input', e => renderTracks(e.target.value));
}

function renderTracks(query = '') {
    const list = $('track-container');
    const q = query.toLowerCase();
    
    if (state.tracks.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">No tracks found.</div>`;
        return;
    }

    list.innerHTML = state.tracks.filter(t => {
        const searchStr = ((t.title || '') + ' ' + (t.artist || '')).toLowerCase();
        return searchStr.includes(q);
    }).map(t => {
        const realIdx = state.tracks.indexOf(t);
        const isActive = realIdx === state.idx;
        const title = t.title || t.path.split(/[\\/]/).pop();
        const artist = t.artist || 'Unknown';
        
        return `
            <div class="track-row ${isActive ? 'active' : ''}" onclick="window.playSolid(${realIdx})">
                <div class="track-info">
                    <div class="track-name">${title}</div>
                    <div class="track-artist">${artist}</div>
                </div>
                <div class="track-dur">${formatTime(t.duration)}</div>
            </div>
        `;
    }).join('');
}

// --- AUDIO PLAYER ---
function initAudio() {
    state.audio.addEventListener('timeupdate', () => {
        if (!state.audio.duration) return;
        const pct = (state.audio.currentTime / state.audio.duration) * 100;
        $('p-fill').style.width = pct + '%';
        $('p-cur').textContent = formatTime(state.audio.currentTime);
        $('p-tot').textContent = formatTime(state.audio.duration);
    });

    state.audio.addEventListener('play', () => {
        $('p-icon-play').classList.add('hidden');
        $('p-icon-pause').classList.remove('hidden');
        renderTracks();
    });

    state.audio.addEventListener('pause', () => {
        $('p-icon-play').classList.remove('hidden');
        $('p-icon-pause').classList.add('hidden');
    });

    state.audio.addEventListener('ended', () => {
        playTrack((state.idx + 1) % state.tracks.length);
    });

    $('p-play-toggle').addEventListener('click', () => {
        if (state.idx === -1 && state.tracks.length > 0) playTrack(0);
        else if (state.audio.paused) state.audio.play();
        else state.audio.pause();
    });

    $('p-next').addEventListener('click', () => {
        if (state.tracks.length > 0) playTrack((state.idx + 1) % state.tracks.length);
    });

    $('p-prev').addEventListener('click', () => {
        if (state.tracks.length > 0) playTrack((state.idx - 1 + state.tracks.length) % state.tracks.length);
    });

    $('p-rail').addEventListener('click', e => {
        if (!state.audio.duration) return;
        const rect = $('p-rail').getBoundingClientRect();
        state.audio.currentTime = ((e.clientX - rect.left) / rect.width) * state.audio.duration;
    });

    $('p-vol').addEventListener('input', e => {
        state.audio.volume = e.target.value;
        App.SetSetting('v2_volume', e.target.value).catch(()=>{});
    });
}

window.playSolid = function(index) {
    playTrack(index);
};

function playTrack(index) {
    if (index < 0 || index >= state.tracks.length) return;
    state.idx = index;
    const t = state.tracks[index];
    
    state.audio.src = `/music/${encodeURIComponent(t.path.replace(/\\/g, '/'))}`;
    state.audio.play();

    const title = t.title || t.path.split(/[\\/]/).pop();
    $('p-title').textContent = title;
    $('p-artist').textContent = t.artist || '-';
    
    const coverPath = `/cover/${encodeURIComponent(t.path.replace(/\\/g, '/'))}`;
    $('p-art').src = coverPath;
    $('home-art').src = coverPath;
    
    $('p-art').onerror = function() { this.src = defaultIcon; };
    $('home-art').onerror = function() { this.src = defaultIcon; };
}

// --- SETTINGS ---
function initSettings() {
    $$('.color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const c = dot.dataset.color;
            applyTheme(c);
            App.SetSetting('v2_theme_color', c).catch(()=>{});
        });
    });

    $('btn-legacy').addEventListener('click', () => {
        App.SetSetting('uiVersion', 'legacy').then(() => { window.location.href = 'index.html'; }).catch(()=>{});
    });

    $('btn-restart').addEventListener('click', () => App.RestartApp().catch(()=>{}));
    $('btn-quit').addEventListener('click', () => App.ShutdownApp().catch(()=>{}));
}

function applyTheme(color) {
    document.documentElement.style.setProperty('--accent', color);
    $$('.color-dot').forEach(d => d.classList.toggle('active', d.dataset.color === color));
}

// --- DOWNLOADER ---
function initDownloader() {
    $('btn-dl-start').addEventListener('click', async () => {
        const url = $('dl-url').value.trim();
        if (!url) return;
        $('dl-url').value = '';
        
        $('dl-status').classList.remove('hidden');
        $('dl-msg').textContent = 'Starting download...';
        $('dl-pct').textContent = '0%';
        $('dl-fill').style.width = '0%';

        const id = 'dl_' + Date.now();
        try {
            const isS = await App.IsSpotifyUrl(url);
            if (isS) await App.DownloadFromSpotify(id, url, 'best');
            else await App.DownloadFromYouTube({ id, url, quality: 'best' });
        } catch (e) {
            $('dl-msg').textContent = 'Error occurred.';
            $('dl-pct').textContent = 'Failed';
            $('dl-pct').style.color = '#ef4444';
            $('dl-fill').style.backgroundColor = '#ef4444';
        }
    });

    window.addEventListener('wails:event:download-terminal-log', e => {
        const data = Array.isArray(e.detail) ? e.detail[0] : e.detail;
        if (data && data.line) {
            const m = data.line.match(/(\d{1,3}\.\d)%/);
            if (m) {
                $('dl-msg').textContent = 'Downloading...';
                $('dl-pct').textContent = m[1] + '%';
                $('dl-fill').style.width = m[1] + '%';
            }
        }
    });

    window.addEventListener('wails:event:download-success', () => {
        $('dl-msg').textContent = 'Download Complete!';
        $('dl-pct').textContent = '100%';
        $('dl-fill').style.width = '100%';
        $('dl-pct').style.color = 'var(--accent)';
        $('dl-fill').style.backgroundColor = 'var(--accent)';
    });
}

// --- UTILS ---
function formatTime(s) {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
}
