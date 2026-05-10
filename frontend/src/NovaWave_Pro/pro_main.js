//--- Nova Wave Pro Engine ---------------
import * as App from '../../wailsjs/go/main/App.js';
import { PlaylistManager } from '../playlist/playlist_manager.js';
import { LyricsManager } from '../lyrics/lyrics_manager.js';
import { de_pro } from './language_pro/de_pro.js';
import { en_pro } from './language_pro/en_pro.js';
import { tr_pro } from './language_pro/tr_pro.js';
import { fr_pro } from './language_pro/fr_pro.js';
import { es_pro } from './language_pro/es_pro.js';
import { it_pro } from './language_pro/it_pro.js';

const $ = id => document.getElementById(id);

import playIcon from '../assets/play.svg';
import pauseIcon from '../assets/pause.svg';
import updateNews from '../app_updates/update_news.json';

const LANG_MAP = { de: de_pro, en: en_pro, tr: tr_pro, fr: fr_pro, es: es_pro, it: it_pro };
const LANG_LABELS = { de: 'Deutsch', en: 'English', tr: 'Türkçe', fr: 'Français', es: 'Español', it: 'Italiano' };

const state = {
    audio: new Audio(),
    tracks: [],
    idx: -1,
    folders: [],
    lang: 'de',
    proKeys: de_pro,
    shuffle: false,
    loop: 'none',
    coverFallback: 'dino',
    favorites: [],
    startTime: Date.now(),
    playlistStructure: null
};

let proDragId = null;

const vfState = {
    activeFolderId: null,
    contextFolderId: null,
    contextTrackPath: null,
    selectedColor: '#38bdf8',
    folderModalMode: 'create'
};

const FOLDER_COLORS = ['#38bdf8', '#ff5722', '#76ff03', '#facc15', '#d500f9', '#ff5252', '#00e5ff', '#ff9800'];

function tr(key) { return state.proKeys[key] || key; }

function logPro(msg, type = '') {
    const logBox = $('system-log-box');
    if(!logBox) return;
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
}

//--- Wails Backend Bridge ---------------
function waitForWails() {
    return new Promise(resolve => {
        const check = () => {
            if(window.go && window.go.main && window.go.main.App) {
                resolve();
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
}

//--- Boot ---------------
document.addEventListener('DOMContentLoaded', async () => {
    logPro("PRO_ENGINE: BOOT_SEQUENCE_START");
    
    initNavigation();
    initHotkeys();
    initAudio();
    initDownloaderUI();
    initSettingsUI();
    initLibraryUI();
    initVirtualFolders();
    startUptimeCounter();
    applyTheme('#ff5722');
    applyTranslations();

    window.api = { getLyrics: App.GetLyrics, hasLyrics: App.HasLyrics };
    window.tr = tr;
    LyricsManager.init(state.audio);
    $('lyrics-btn').onclick = () => {
        if(state.idx >= 0 && state.tracks[state.idx]) {
            LyricsManager.fetchAndShow(state.tracks[state.idx].path);
        }
    };
    
    logPro("UI_INIT: ✓");
    logPro("WAILS_BRIDGE: connecting...");

    await waitForWails();
    logPro("WAILS_BRIDGE: connected ✓");
    
    //--- Load Settings ---------------
    try {
        const s = await App.GetSettings();
        if(s) {
            state.lang = s.language || 'de';
            state.proKeys = LANG_MAP[state.lang] || de_pro;
            applyTranslations();
            
            const langSel = $('lang-select-pro');
            if(langSel) langSel.value = state.lang;
            
            if(s.v2_volume !== undefined) {
                state.audio.volume = parseFloat(s.v2_volume);
                $('m-vol').value = state.audio.volume;
            }
            
            if(s.coverFallback) {
                state.coverFallback = s.coverFallback;
                const fbSel = $('cover-fallback-select');
                if(fbSel) fbSel.value = state.coverFallback;
            }

            if(s.favorites) {
                try {
                    const favs = typeof s.favorites === 'string' ? JSON.parse(s.favorites) : s.favorites;
                    if(Array.isArray(favs)) state.favorites = favs;
                } catch(e) {}
            } else if(s.v2_favorites) {
                // one-time migration from old v2_favorites key
                try { state.favorites = JSON.parse(s.v2_favorites); } catch(e) {}
                App.SetSetting('favorites', state.favorites).catch(() => {});
            }

            state.shuffle = !!s.v2_shuffle;
            state.loop = s.v2_loop || 'none';
            updateModeIcons();
            
            if(s.v2_theme_color) applyTheme(s.v2_theme_color);
            

            let savedFolders = [];
            if(s.v2_folders) {
                try { savedFolders = JSON.parse(s.v2_folders); } catch(e) {}
            } else if(s.currentFolderPath || s.CurrentFolderPath) {
                savedFolders = [s.currentFolderPath || s.CurrentFolderPath];
            }

            if(s.v2_playlist_structure) {
                try { state.playlistStructure = JSON.parse(s.v2_playlist_structure); } catch(e) {}
            }

            if(savedFolders.length > 0) {
                state.folders = savedFolders;
                logPro(`AUTO_MOUNT: [${savedFolders.length}] FOLDERS`);
                PlaylistManager.init();
                let loaded = 0;
                const allTracks = [];
                for(let fp of savedFolders) {
                    try {
                        const res = await App.RefreshMusicFolder(fp);
                        if(res && res.tracks) {
                            allTracks.push(...res.tracks);
                            loaded++;
                        }
                    } catch(e) { logPro(`AUTO_MOUNT_FAILED: ${fp}`, "err"); }
                }
                if(loaded > 0) {
                    if(state.playlistStructure) {
                        PlaylistManager.importStructure(state.playlistStructure, allTracks);
                    } else {
                        PlaylistManager.appendTracks(allTracks);
                    }
                    handleTracksRefresh();
                }
            }
            renderFolderSetup();
            initOnboarding(s);
        } else {
            initOnboarding(null);
        }
    } catch(e) {
        logPro("SETTINGS_LOAD_ERROR: " + e.message, "err");
    }
    
    initDownloaderEvents();
    initMediaKeys();
    fetchGitHubCommits();
    initLanguageSwitch();
    initVersionDisplay();

    //--- External File Drop via Wails OnFileDrop ---------------
    if(window.runtime && window.runtime.OnFileDrop) {
        window.runtime.OnFileDrop(async (x, y, paths) => {
            if(!paths || paths.length === 0) return;
            const filePath = paths[0];
            const sep = filePath.includes('\\') ? '\\' : '/';
            const folderPath = filePath.substring(0, filePath.lastIndexOf(sep));
            if(!folderPath) return;
            logPro(`EXT_DROP: ${folderPath}`);
            try {
                const res = await App.RefreshMusicFolder(folderPath);
                if(res && res.tracks && res.tracks.length > 0) {
                    if(!state.folders.includes(res.folderPath)) {
                        state.folders.push(res.folderPath);
                        App.SetSetting('v2_folders', JSON.stringify(state.folders)).catch(()=>{});
                    }
                    PlaylistManager.appendTracks(res.tracks);
                    handleTracksRefresh();
                    renderFolderSetup();
                    logPro(`EXT_DROP: ${res.tracks.length} TRACKS MOUNTED ✓`);
                } else {
                    logPro('EXT_DROP: NO TRACKS FOUND', 'err');
                }
            } catch(err) {
                logPro('EXT_DROP_ERROR: ' + (err.message || err), 'err');
            }
        }, false);
    }

    logPro(tr('pro_status_ready'));

    document.addEventListener('click', () => {
        const cm = $('context-menu');
        if(cm && !cm.classList.contains('hidden')) cm.classList.add('hidden');
        const fcm = $('pro-folder-cm');
        if(fcm && !fcm.classList.contains('hidden')) fcm.classList.add('hidden');
    });
});

//--- Navigation ---------------
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => {
            const target = btn.getAttribute('data-v');
            document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b === btn));
            document.querySelectorAll('.view-section').forEach(v => v.classList.toggle('active', v.id === 'v-' + target));
            logPro(`NAV: ${target.toUpperCase()}`);
        };
    });
}

//--- Media Keys ---------------
function initMediaKeys() {
    window.addEventListener('wails:event:media-key', e => {
        const key = Array.isArray(e.detail) ? e.detail[0] : e.detail;
        if(key === "playpause") $('m-play').click();
        if(key === "next") $('m-next').click();
        if(key === "prev") $('m-prev').click();
    });
}

//--- GitHub Commits ---------------
async function fetchGitHubCommits() {
    const feed = $('news-feed');
    if(!feed) return;
    feed.textContent = tr('pro_loading_commits');
    try {
        const res = await fetch('https://api.github.com/repos/SnuggleDino/NovaWave/commits?per_page=5');
        if(!res.ok) throw new Error(res.statusText);
        const commits = await res.json();
        feed.innerHTML = commits.map(c => {
            const date = new Date(c.commit.author.date).toLocaleDateString();
            const msg = c.commit.message.split('\n')[0].substring(0, 80);
            return `<div class="commit-line"><span class="commit-date">[${date}]</span> ${msg}</div>`;
        }).join('');
    } catch(e) {
        feed.textContent = tr('pro_commits_error');
    }
}

//--- Audio ---------------
function initAudio() {
    const audio = state.audio;

    audio.addEventListener('timeupdate', () => {
        if(!audio.duration) return;
        $('m-fill').style.width = ((audio.currentTime / audio.duration) * 100) + "%";
        $('m-cur').textContent = fmt(audio.currentTime);
        $('m-tot').textContent = fmt(audio.duration);
    });

    audio.addEventListener('ended', () => {
        if(state.loop === 'one') { audio.currentTime = 0; audio.play().catch(() => {}); }
        else nextTrack();
    });

    audio.addEventListener('play', () => {
        const playImg = $('m-play-img');
        if(playImg) playImg.src = pauseIcon;
        $('dash-status-label').textContent = tr('pro_status_playing');
        $('dash-status-label').style.opacity = '1';
        $('dash-status-label').style.color = 'var(--accent)';
    });

    audio.addEventListener('pause', () => {
        const playImg = $('m-play-img');
        if(playImg) playImg.src = playIcon;
        $('dash-status-label').textContent = tr('pro_status_paused');
        $('dash-status-label').style.opacity = '0.3';
        $('dash-status-label').style.color = '';
    });

    audio.addEventListener('error', () => logPro(tr('pro_audio_load_fail'), 'err'));

    $('m-play').onclick = () => {
        if(state.idx === -1 && state.tracks.length > 0) play(0);
        else if(audio.paused) audio.play().catch(err => logPro(`PLAY_ERROR: ${err.message}`, 'err'));
        else audio.pause();
    };
    
    $('m-next').onclick = () => nextTrack();
    $('m-prev').onclick = () => prevTrack();

    $('m-shuf').onclick = () => {
        state.shuffle = !state.shuffle;
        App.SetSetting('v2_shuffle', state.shuffle).catch(() => {});
        updateModeIcons();
        logPro(`PLAYER: SHUFFLE -> ${state.shuffle ? 'ON' : 'OFF'}`);
    };

    $('m-loop').onclick = () => {
        const modes = ['none', 'all', 'one'];
        state.loop = modes[(modes.indexOf(state.loop) + 1) % modes.length];
        App.SetSetting('v2_loop', state.loop).catch(() => {});
        updateModeIcons();
        logPro(`PLAYER: LOOP -> ${state.loop.toUpperCase()}`);
    };
    
    $('m-fav').onclick = () => {
        if(state.idx < 0 || state.idx >= state.tracks.length) return;
        const currentPath = state.tracks[state.idx].path;
        const favIdx = state.favorites.indexOf(currentPath);
        
        if (favIdx > -1) {
            state.favorites.splice(favIdx, 1);
            $('m-fav').classList.remove('active');
            logPro("FAV: REMOVED");
        } else {
            state.favorites.push(currentPath);
            $('m-fav').classList.add('active');
            logPro("FAV: ADDED");
        }
        
        App.SetSetting('favorites', state.favorites).catch(()=>{});
        render();
    };

    $('m-vol').oninput = e => { 
        const v = parseFloat(e.target.value);
        audio.volume = v; 
        App.SetSetting('v2_volume', v.toString()).catch(() => {});
    };

    $('m-rail').onclick = e => {
        if(!audio.duration) return;
        const rect = $('m-rail').getBoundingClientRect();
        audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    };

    //--- Cover Art Selection ---------------
    const handleChangeCover = async () => {
        if(state.idx < 0 || !state.tracks[state.idx]) return;
        const t = state.tracks[state.idx];
        const imgPath = await App.SelectImage();
        if(imgPath) {
            logPro("SYSTEM: UPDATING COVER ART...");
            const res = await App.SetCoverArt(t.path, imgPath);
            if(res && res.success) {
                logPro("SYSTEM: COVER ART UPDATED ✓");

                const rawPath = t.path.replace(/\\/g, '/');
                const safeUrlPath = encodeURI(rawPath).replace(/#/g, '%23').replace(/\?/g, '%3F');
                const cover = `/cover/${safeUrlPath}?t=${Date.now()}`;
                const mArt = $('m-art'); const dArt = $('dash-art');
                mArt.src = cover; dArt.src = cover;
                mArt.classList.remove('hidden'); dArt.classList.remove('hidden');
                $('m-dino').classList.add('hidden'); $('dash-dino').classList.add('hidden');
            } else {
                let errMsg = res ? res.error : "Unknown backend error";
                logPro(`SYSTEM_ERROR: ${errMsg}`, 'err');
            }
        }
    };
    $('m-art-box').onclick = handleChangeCover;
    $('dash-art-box').onclick = handleChangeCover;
}

function nextTrack() {
    if(state.tracks.length === 0) return;
    if(state.shuffle) play(Math.floor(Math.random() * state.tracks.length));
    else {
        const next = (state.idx + 1) % state.tracks.length;
        if(next === 0 && state.loop === 'none') return;
        play(next);
    }
}

function prevTrack() {
    if(state.tracks.length === 0) return;
    if(state.audio.currentTime > 3) { state.audio.currentTime = 0; return; }
    play(state.idx - 1 < 0 ? state.tracks.length - 1 : state.idx - 1);
}

function updateModeIcons() {
    const shufBtn = $('m-shuf');
    const loopBtn = $('m-loop');
    if(shufBtn) {
        shufBtn.classList.toggle('active', state.shuffle);
        shufBtn.title = state.shuffle ? tr('pro_shuffle_on') : tr('pro_shuffle_off');
    }
    if(loopBtn) {
        loopBtn.classList.toggle('active', state.loop !== 'none');
        const span = loopBtn.querySelector('span');
        if(span) span.textContent = state.loop === 'one' ? 'LP_1' : 'LOOP';
        loopBtn.title = tr('pro_loop_' + state.loop);
    }
}

//--- Library ---------------
function initLibraryUI() {
    $('btn-open-folder').onclick = async () => addFolder();
    
    const sortEl = $('lib-sort');
    if(sortEl) {
        sortEl.onchange = (e) => {
            const val = e.target.value;
            let mode = '';
            if(val === 'az') mode = 'name';
            else if(val === 'za') mode = 'nameDesc';
            else if(val === 'recent') mode = 'newest';
            
            PlaylistManager.currentSortMode = mode;
            logPro(tr('pro_status_ok') + ': SORT ' + val.toUpperCase());
            render();
        };
    }
    
    $('btn-refresh-lib').onclick = async () => {
        if(state.folders.length === 0) {
            logPro(tr('pro_err_no_folder'), 'err');
            return;
        }
        logPro(tr('pro_lib_refresh'));
        showRefreshAnimation();
        PlaylistManager.init();
        let loaded = 0;
        const allTracks = [];
        for(let fp of state.folders) {
            try {
                const res = await App.RefreshMusicFolder(fp);
                if(res && res.tracks) {
                    allTracks.push(...res.tracks);
                    loaded++;
                }
            } catch(e) { logPro(`REFRESH_ERROR: ${fp}`, "err"); }
        }
        if(loaded > 0) {
            if(state.playlistStructure) {
                PlaylistManager.importStructure(state.playlistStructure, allTracks);
            } else {
                PlaylistManager.appendTracks(allTracks);
            }
            handleTracksRefresh();
        }
        showRefreshComplete();
    };
    
    $('lib-search').oninput = e => render(e.target.value);

    //--- Drag & Drop Reorder ---------------
    const tbody = $('track-body');
    tbody.addEventListener('dragstart', e => {
        const row = e.target.closest('tr');
        if(!row || !row.dataset.id) return;
        proDragId = row.dataset.id;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    tbody.addEventListener('dragend', () => {
        proDragId = null;
        tbody.querySelectorAll('.drag-over, .dragging').forEach(el => el.classList.remove('drag-over', 'dragging'));
    });
    tbody.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const row = e.target.closest('tr');
        if(!row || !row.dataset.id || row.dataset.id === proDragId) return;
        tbody.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        row.classList.add('drag-over');
    });
    tbody.addEventListener('dragleave', e => {
        if(!tbody.contains(e.relatedTarget)) {
            tbody.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        }
    });
    tbody.addEventListener('drop', e => {
        e.preventDefault();
        const row = e.target.closest('tr');
        if(!row || !row.dataset.id || !proDragId || row.dataset.id === proDragId) return;
        const fromIdx = PlaylistManager.items.findIndex(i => i.id === proDragId);
        const toIdx = PlaylistManager.items.findIndex(i => i.id === row.dataset.id);
        if(fromIdx === -1 || toIdx === -1) return;
        PlaylistManager.moveItem(fromIdx, toIdx);
        savePlaylistStructure();
        state.tracks = PlaylistManager.getAllTracks();
        render();
        logPro("REORDER: DONE");
    });
}

function handleTracksRefresh() {
    state.tracks = PlaylistManager.getAllTracks();
    $('stat-tracks').textContent = state.tracks.length;
    $('stat-folders').textContent = state.folders.length;
    render();
}

function play(i) {
    if(i < 0 || i >= state.tracks.length) return;
    state.idx = i;
    const t = state.tracks[i];
    logPro("LOAD: " + (t.title || t.path.split(/[\\/]/).pop()));
    state.audio.src = "/music/" + encodeURIComponent(t.path.replace(/\\/g, '/'));
    state.audio.play().catch(err => logPro(`PLAY_ERROR: ${err.message}`, 'err'));
    
    const title = t.title || t.path.split(/[\\/]/).pop();
    const artist = t.artist || tr('pro_unknown_artist');
    $('m-title').textContent = title;
    $('dash-title').textContent = title;
    $('m-artist').textContent = artist;
    $('dash-artist').textContent = artist;
    

    requestAnimationFrame(() => {
        applyMarquee($('m-title'));
        applyMarquee($('dash-title'));
    });
    
    const rawPath = t.path.replace(/\\/g, '/');
    const safeUrlPath = encodeURI(rawPath).replace(/#/g, '%23').replace(/\?/g, '%3F');
    const cover = `/cover/${safeUrlPath}?t=${Date.now()}`;
    const mArt = $('m-art'); const dArt = $('dash-art');
    mArt.src = cover; dArt.src = cover;
    mArt.classList.remove('hidden'); dArt.classList.remove('hidden');
    $('m-dino').classList.add('hidden'); $('dash-dino').classList.add('hidden');
    
    const applyFallback = (imgEl, dinoElId) => {
        imgEl.classList.add('hidden');
        const dinoEl = $(dinoElId);
        dinoEl.classList.remove('hidden');
        if(state.coverFallback === 'emoji') {
            dinoEl.src = '';
            dinoEl.style.display = 'none';
            const parent = dinoEl.parentElement;
            let emojiSpan = parent.querySelector('.emoji-fallback');
            if(!emojiSpan) { emojiSpan = document.createElement('span'); emojiSpan.className = 'emoji-fallback'; emojiSpan.style.cssText = 'font-size:42px; display:flex; align-items:center; justify-content:center; width:100%; height:100%;'; parent.appendChild(emojiSpan); }
            emojiSpan.textContent = '🎵';
            emojiSpan.style.display = 'flex';
        } else {
            dinoEl.src = './src/assets/Two_Loving_Cute_Dinos.png';
            dinoEl.style.display = '';
            const emojiSpan = dinoEl.parentElement.querySelector('.emoji-fallback');
            if(emojiSpan) emojiSpan.style.display = 'none';
        }
    };
    
    mArt.onerror = () => applyFallback(mArt, 'm-dino');
    dArt.onerror = () => applyFallback(dArt, 'dash-dino');
    
    const isFav = state.favorites.includes(t.path);
    $('m-fav').classList.toggle('active', isFav);

    LyricsManager.checkAvailability(t.path);
    LyricsManager.hideLyrics();

    render();
}

function render(q = '') {
    const query = q.toLowerCase();
    const items = PlaylistManager.getRenderList(query);
    const tbody = $('track-body');

    if(items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${query ? tr('pro_no_results') : tr('pro_library_empty')}</td></tr>`;
        return;
    }
    
    let displayIdx = 1;
    tbody.innerHTML = items.map(item => {
        if(item.type === 'folder') {
            const arrow = item.collapsed ? '▶' : '▼';
            const col = item.color || '#38bdf8';
            return `<tr class="folder-header" draggable="true" data-id="${item.id}" onclick="window.v2ftoggle('${item.id}')" oncontextmenu="window.v2fcm(event,'${item.id}')">
                <td colspan="5" style="cursor:grab;">
                    <span style="font-size:9px; margin-right:6px; opacity:0.6;">${arrow}</span>
                    <span style="width:8px; height:8px; border-radius:50%; background:${col}; display:inline-block; margin-right:8px; vertical-align:middle;"></span>
                    <span style="color:${col};">${escHtml(item.name).toUpperCase()}</span>
                </td>
            </tr>`;
        }
        const t = item.data;
        const realIdx = state.tracks.indexOf(t);
        const active = realIdx === state.idx;
        const currentDisplayIdx = displayIdx++;
        const isFav = state.favorites.includes(t.path);
        const favCell = isFav 
            ? `<td style="text-align:center; color:var(--accent); cursor:pointer;" onclick="event.stopPropagation(); window.v2fav(${realIdx})">❤</td>`
            : `<td style="text-align:center; opacity:0.2; cursor:pointer;" onclick="event.stopPropagation(); window.v2fav(${realIdx})">♡</td>`;
        
        return `<tr class="track-row ${active?'active':''}" draggable="true" data-id="${escHtml(item.id)}" onclick="window.v2p(${realIdx})" oncontextmenu="window.v2cm(event, ${realIdx})">
            <td class="t-mono" style="cursor:grab;">${active ? '▶' : currentDisplayIdx}</td>
            ${favCell}
            <td class="t-title">${t.title || t.path.split(/[\\/]/).pop()}</td>
            <td class="t-artist">${t.artist || '-'}</td>
            <td class="t-mono">${fmt(t.duration)}</td></tr>`;
    }).join('');
}

window.v2cm = (e, idx) => {
    e.preventDefault();
    const t = state.tracks[idx];
    vfState.contextTrackPath = t ? t.path : null;

    const cm = $('context-menu');
    cm.classList.remove('hidden');

    const hasFolders = PlaylistManager.getFolderCount() > 0;
    const moveBtn = $('cm-move-to-group');
    const divider = $('cm-group-divider');
    if(moveBtn) moveBtn.style.display = hasFolders ? '' : 'none';
    if(divider) divider.style.display = hasFolders ? '' : 'none';

    let x = e.clientX;
    let y = e.clientY;
    const cw = 200;
    const ch = hasFolders ? 170 : 130;
    if(x + cw > window.innerWidth) x = window.innerWidth - cw - 10;
    if(y + ch > window.innerHeight) y = window.innerHeight - ch - 10;

    cm.style.left = x + 'px';
    cm.style.top = y + 'px';

    $('cm-play').onclick = () => play(idx);
    $('cm-fav').onclick = () => {
        if(!t) return;
        const curFav = state.favorites.indexOf(t.path);
        if(curFav > -1) {
            state.favorites.splice(curFav, 1);
            if(state.idx === idx) $('m-fav').classList.remove('active');
            logPro("FAV: REMOVED");
        } else {
            state.favorites.push(t.path);
            if(state.idx === idx) $('m-fav').classList.add('active');
            logPro("FAV: ADDED");
        }
        App.SetSetting('favorites', state.favorites).catch(()=>{});
        render();
    };
    $('cm-cover').onclick = async () => {
        if(!t) return;
        const imgPath = await App.SelectImage();
        if(imgPath) {
            logPro("SYSTEM: UPDATING COVER ART...");
            const res = await App.SetCoverArt(t.path, imgPath);
            if(res && res.success) {
                logPro("SYSTEM: COVER ART UPDATED ✓");
                if(state.idx === idx) play(idx);
            } else {
                let errMsg = res ? res.error : "Unknown backend error";
                logPro(`SYSTEM_ERROR: ${errMsg}`, 'err');
            }
        }
    };
};

function applyMarquee(el) {
    if(!el) return;
    el.classList.remove('marquee');

    void el.offsetWidth;
    const parent = el.parentElement;
    if(parent && el.scrollWidth > parent.clientWidth) {
        el.classList.add('marquee');
    }
}

//--- Sampler ---------------
function initDownloaderUI() {

    App.GetSettings().then(s => {
        if(s && s.downloadFolder) $('dl-folder').value = s.downloadFolder;
    }).catch(()=>{});

    $('btn-dl-folder').onclick = async () => {
        try {
            const res = await App.SelectFolder();
            if(res && res) {
                $('dl-folder').value = res;
                App.SetSetting('downloadFolder', res).catch(() => {});
                logPro(tr('pro_sampler_folder_set') + ': ' + res);
            }
        } catch(e) { logPro(`FOLDER_ERR: ${e}`, 'err'); }
    };

    $('btn-dl').onclick = async () => {
        const url = $('dl-url').value.trim();
        const customName = $('dl-name') ? $('dl-name').value.trim() : '';
        const format = $('dl-format').value;
        const quality = $('dl-quality').value;
        if(!url) { logPro(tr('pro_sampler_no_url'), 'err'); return; }

        $('dl-monitor').classList.remove('hidden');
        $('dl-status').textContent = tr('pro_sampling_init');
        $('dl-progress').textContent = '0%';
        $('dl-fill').style.width = '0%';
        logPro(`SAMPLER: ${url.substring(0, 60)}... [${format.toUpperCase()}/${quality.toUpperCase()}]`);

        const id = "dl_" + Date.now();
        try {
            const isS = await App.IsSpotifyUrl(url);
            if(isS) {

                await App.DownloadFromSpotify(id, url, quality);
            } else {

                await App.DownloadFromYouTube({ id, url, customName, quality });
            }
            logPro(tr('pro_sampler_signal_sent'));
        } catch(err) {
            logPro(`SAMPLER_ERROR: ${err.message || err}`, "err");
            $('dl-status').textContent = tr('pro_sampler_failed');
        }
    };
}

function initDownloaderEvents() {
    if(!window.runtime) { logPro("WARN: runtime not available for events", "err"); return; }

    window.runtime.EventsOn("download-terminal-log", data => {
        if(!data) return;
        const line = data.line || (typeof data === 'string' ? data : '');
        $('dl-status').textContent = tr('pro_sampling_active');
        const m = line.match(/(\d+\.?\d*)%/);
        if(m) {
            const pct = Math.min(parseFloat(m[1]), 100);
            $('dl-fill').style.width = pct + '%';
            $('dl-progress').textContent = Math.round(pct) + '%';
        }
        logPro(`DL: ${line.trim()}`);
    });

    window.runtime.EventsOn("download-success", data => {
        $('dl-status').textContent = tr('pro_sampling_complete');
        $('dl-fill').style.width = '100%';
        $('dl-progress').textContent = '100%';
        logPro(`SAMPLER: ${tr('pro_sampling_complete')} ✓`);
    });

    window.runtime.EventsOn("download-title-update", data => {
        if(data && data.title) logPro(`TITLE: ${data.title}`);
    });

    window.runtime.EventsOn("media-key", key => {
        if(key === 'playpause') $('m-play').click();
        else if(key === 'next') $('m-next').click();
        else if(key === 'prev') $('m-prev').click();
    });
}

async function addFolder() {
    logPro(tr('pro_request_folder'));
    try {
        const res = await App.SelectMusicFolder();
        if(res && res.tracks) {
            if(!state.folders.includes(res.folderPath)) {
                state.folders.push(res.folderPath);
                App.SetSetting('v2_folders', JSON.stringify(state.folders)).catch(()=>{});
                logPro(`MOUNT: ${res.tracks.length} ${tr('pro_tracks_loaded')} [${res.folderPath}]`);
                PlaylistManager.appendTracks(res.tracks);
                handleTracksRefresh();
                renderFolderSetup();
            } else {
                logPro(`FOLDER_ALREADY_MOUNTED: ${res.folderPath}`, 'warn');
            }
        }
    } catch(e) {
        logPro("FOLDER_ERROR: " + (e.message || e), "err");
    }
}

function removeFolder(path) {
    state.folders = state.folders.filter(f => f !== path);
    App.SetSetting('v2_folders', JSON.stringify(state.folders)).catch(()=>{});
    logPro(`UNMOUNT: ${path}`);
    

    PlaylistManager.init();
    let loaded = 0;
    const loadRemaining = async () => {
        for(let fp of state.folders) {
            try {
                const res = await App.RefreshMusicFolder(fp);
                if(res && res.tracks) { PlaylistManager.appendTracks(res.tracks); loaded++; }
            } catch(e) {}
        }
        if(loaded > 0) handleTracksRefresh();
        else {
            state.tracks = []; $('stat-tracks').textContent = '0';
            $('stat-folders').textContent = '0'; render();
        }
    };
    loadRemaining();
    renderFolderSetup();
}

function renderFolderSetup() {
    const c = $('folder-list-container');
    if(!c) return;
    if(state.folders.length === 0) {
        c.innerHTML = `<div style="color:var(--text-dim); font-size:12px; font-family:var(--font-mono); padding:10px 0;">[ NO_FOLDERS_MOUNTED ]</div>`;
        return;
    }
    c.innerHTML = state.folders.map(f => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:4px; border:1px solid rgba(255,255,255,0.05);">
            <div style="font-family:var(--font-mono); font-size:11px; color:#ccc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; padding-right:15px;" title="${f}">
                ${f}
            </div>
            <button class="btn-transport" style="color:#ff5252; width:24px; height:24px; flex-shrink:0;" onclick="window.v2rmf('${f.replace(/\\/g,'\\\\')}')" title="Remove Folder">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
        </div>
    `).join('');
}

window.v2rmf = removeFolder;

//--- Settings ---------------
function initSettingsUI() {
    document.querySelectorAll('.color-block').forEach(cb => {
        cb.onclick = () => {
            const c = cb.dataset.c;
            applyTheme(c);
            App.SetSetting('v2_theme_color', c).catch(() => {});
            logPro(`ACCENT: ${c.toUpperCase()}`);
        };
    });

    $('lang-select-pro').onchange = () => {
        state.lang = $('lang-select-pro').value;
        state.proKeys = state.lang === 'de' ? de_pro : en_pro;
        applyTranslations();
        App.SetSetting('language', state.lang).catch(() => {});
        logPro(tr('pro_language') + ': ' + state.lang.toUpperCase());
    };

    $('cover-fallback-select').onchange = () => {
        state.coverFallback = $('cover-fallback-select').value;
        App.SetSetting('coverFallback', state.coverFallback).catch(()=>{});
        const isMArtHidden = $('m-art').classList.contains('hidden');
        if (isMArtHidden) {
            $('m-dino').textContent = state.coverFallback === 'emoji' ? '🎵' : '🦖';
            $('dash-dino').textContent = state.coverFallback === 'emoji' ? '🎵' : '🦖';
        }
    };
    
    $('btn-add-folder').onclick = () => addFolder();

    $('btn-reset-fx-pro').onclick = async () => {
        if(confirm(tr('pro_confirm_reset'))) {
            logPro(tr('pro_reset_initiated'), "err");
            try { await App.ResetConfig(); } catch(e) {}
            location.reload();
        }
    };

    $('btn-restart').onclick = async () => {
        logPro(tr('pro_reboot_initiated'), "err");
        try { await App.RestartApp(); } catch(e) { location.reload(); }
    };

    $('btn-quit').onclick = () => {
        logPro(tr('pro_shutdown_initiated'), "err");
        App.ShutdownApp().catch(() => {});
    };

    $('btn-legacy').onclick = () => {
        logPro("UI_SWITCH: LEGACY");
        App.SetSetting('uiVersion', 'legacy').then(() => { location.href = 'index.html'; }).catch(() => {});
    };
}

function applyTheme(c) {
    if(!c) return;
    document.documentElement.style.setProperty('--accent', c);
    let r=0, g=0, b=0;
    if(c.length === 7) {
        r = parseInt(c.substring(1,3),16);
        g = parseInt(c.substring(3,5),16);
        b = parseInt(c.substring(5,7),16);
    }
    document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);
    document.querySelectorAll('.color-block').forEach(cb => {
        cb.classList.toggle('active', cb.dataset.c && cb.dataset.c.toLowerCase() === c.toLowerCase());
    });
}

//--- Hotkeys ---------------
function initHotkeys() {
    window.addEventListener('keydown', e => {
        if(e.ctrlKey && e.key.toLowerCase() === 'u') {
            window.addEventListener('keydown', ev => {
                if(ev.key === '1') { App.SetSetting('uiVersion', 'legacy').then(() => location.href = 'index.html').catch(() => {}); }
                else if(ev.key === '2') location.reload();
            }, { once: true });
        }
        if(e.key === ' ' && !['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) {
            e.preventDefault();
            $('m-play').click();
        }
    });
}

//--- Translations ---------------
function applyTranslations() {
    //--- Nav ---------------
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.textContent = tr('pro_nav_' + btn.getAttribute('data-v'));
    });

    //--- Dashboard ---------------
    setText('#v-home .section-header h1', tr('pro_nav_home'));
    $('dash-status-label').textContent = tr('pro_status_ok');
    $('dash-source-monitor').textContent = tr('pro_source_monitor');
    $('dash-latest-commits').textContent = tr('pro_latest_commits');
    document.querySelectorAll('.stat-name').forEach((el, i) => {
        el.textContent = tr(['pro_stat_tracks', 'pro_stat_folders', 'pro_stat_uptime'][i]);
    });

    //--- Library ---------------
    setText('#v-library .section-header h1', tr('pro_nav_library'));
    $('btn-open-folder').textContent = tr('pro_mount_path');
    $('lib-search').placeholder = tr('pro_search_db');
    document.querySelectorAll('.track-table th').forEach((el, i) => {
        el.textContent = tr(['pro_th_idx', 'pro_th_title', 'pro_th_artist', 'pro_th_length'][i]);
    });

    //--- Sampler ---------------
    setText('#v-downloader .section-header h1', tr('pro_sampler_title'));
    setText('.info-box h4', tr('pro_sampler_howto_title'));
    setText('.info-box p', tr('pro_sampler_howto_text'));
    $('dl-url').placeholder = tr('pro_sampler_url_placeholder');
    setBtnText('btn-dl', tr('pro_sampler_execute'));

    //--- Settings ---------------
    setText('#v-settings .section-header h1', tr('pro_nav_settings'));
    setBtnText('btn-reset-fx-pro', tr('pro_reset_config'));
    setBtnText('btn-legacy', tr('pro_legacy_interface'));
    setBtnText('btn-restart', tr('pro_warm_reboot'));
    setBtnText('btn-quit', tr('pro_shutdown'));

    //--- Player ---------------
    $('m-play').title = tr('pro_btn_playpause');
    $('m-next').title = tr('pro_btn_next');
    $('m-prev').title = tr('pro_btn_prev');
    $('m-vol').title = tr('pro_btn_volume');
}

function setText(sel, text) {
    const el = document.querySelector(sel);
    if(el) el.textContent = text;
}

function setBtnText(id, text) {
    const btn = $(id);
    if(!btn) return;
    const desc = btn.querySelector('.btn-desc');
    if(desc) {
        const descClone = desc.cloneNode(true);
        btn.textContent = text;
        btn.appendChild(document.createTextNode('\n'));
        btn.appendChild(descClone);
    } else {
        btn.textContent = text;
    }
}

function startUptimeCounter() {
    setInterval(() => {
        $('stat-uptime').textContent = fmt(Math.floor((Date.now() - state.startTime) / 1000));
    }, 1000);
}

window.v2p = i => play(i);
window.v2fav = i => {
    const t = state.tracks[i];
    if(!t) return;
    const favIdx = state.favorites.indexOf(t.path);
    if(favIdx > -1) {
        state.favorites.splice(favIdx, 1);
        if(state.idx === i) $('m-fav').classList.remove('active');
        logPro("FAV: REMOVED");
    } else {
        state.favorites.push(t.path);
        if(state.idx === i) $('m-fav').classList.add('active');
        logPro("FAV: ADDED");
    }
    App.SetSetting('favorites', state.favorites).catch(()=>{});
    render();
};
window.v2rmf = p => removeFolder(p);
const fmt = s => { if(!s||isNaN(s)) return "00:00"; return `${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`; };

//--- Language Switch ---------------
function initLanguageSwitch() {
    const sel = $('lang-select-pro');
    if(!sel) return;
    sel.addEventListener('change', e => {
        const lang = e.target.value;
        state.lang = lang;
        state.proKeys = LANG_MAP[lang] || de_pro;
        App.SetSetting('language', lang).catch(()=>{});
        applyTranslations();
        logPro(`LANG: ${lang.toUpperCase()}`);
    });
}

//--- Onboarding ---------------
function initOnboarding(config) {
    if (config && (config.onboardingComplete === true || config.language)) {
        localStorage.setItem('pro_onboarding_done', '1');
        return;
    }

    const seen = localStorage.getItem('pro_onboarding_done');
    if(seen) return;
    const modal = $('onboarding-modal');
    if(!modal) return;
    modal.classList.remove('hidden');
    const container = $('onboarding-langs');
    Object.entries(LANG_LABELS).forEach(([code, label]) => {
        const btn = document.createElement('button');
        btn.className = 'onboarding-lang-btn';
        btn.textContent = label;
        btn.onclick = () => {
            state.lang = code;
            state.proKeys = LANG_MAP[code] || de_pro;
            App.SetSetting('language', code).catch(()=>{});
            const sel = $('lang-select-pro');
            if(sel) sel.value = code;
            applyTranslations();
            localStorage.setItem('pro_onboarding_done', '1');
            modal.classList.add('hidden');
            logPro(`LANG: ${code.toUpperCase()}`);
        };
        container.appendChild(btn);
    });
}

//--- Version Display ---------------
async function initVersionDisplay() {
    try {
        const meta = await App.GetAppMeta();
        if(!meta) return;
        const versionEl = $('sidebar-version');
        if(versionEl) {
            versionEl.textContent = `v${meta.version}`;
            versionEl.onclick = () => showVersionModal(meta);
        }
    } catch(e) {}
}

async function showVersionModal(meta) {
    const modal = $('version-modal');
    const body = $('version-modal-body');
    if(!modal || !body) return;

    let html = `
        <div class="version-info-row"><span class="label">Version</span><span class="value">v${meta.version}</span></div>
        <div class="version-info-row"><span class="label">Build Date</span><span class="value">${meta.buildDate}</span></div>
        <div class="version-info-row"><span class="label">Author</span><span class="value">${meta.author}</span></div>
        <div class="version-info-row" style="border-bottom:none;">
            <span class="label">Repository</span>
            <a href="#" class="version-link" id="version-repo-link" style="display:flex; align-items:center; gap:6px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub
            </a>
        </div>
    `;

    try {
        const news = updateNews;
        const lang = state.lang;
        if(news.changes) {
            html += '<div style="margin-top:15px; font-size:11px; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Changelog</div>';
            news.changes.forEach(c => {
                const title = c.title[lang] || c.title['en'] || '';
                const desc = c.desc[lang] || c.desc['en'] || '';
                html += `<div class="version-changelog-item"><span class="icon">${c.icon}</span><div><strong>${title}</strong><div class="desc">${desc}</div></div></div>`;
            });
        }
    } catch(e) {}

    body.innerHTML = html;
    modal.classList.remove('hidden');

    $('version-modal-close').onclick = () => modal.classList.add('hidden');
    modal.onclick = e => { if(e.target === modal) modal.classList.add('hidden'); };
    const repoLink = $('version-repo-link');
    if(repoLink && meta.repoLink) { repoLink.onclick = (e) => { e.preventDefault(); window.open(meta.repoLink, '_blank'); }; }
}

//--- Virtual Folders ---------------
function savePlaylistStructure() {
    const s = PlaylistManager.exportStructure();
    state.playlistStructure = s;
    App.SetSetting('v2_playlist_structure', JSON.stringify(s)).catch(() => {});
}

function initVirtualFolders() {
    const createBtn = $('btn-create-group');
    if(createBtn) createBtn.onclick = () => openFolderModal('create');

    $('pfm-close').onclick = () => $('pro-folder-modal').classList.add('hidden');
    $('pfm-cancel').onclick = () => $('pro-folder-modal').classList.add('hidden');
    $('pfm-save').onclick = () => {
        const name = $('pfm-input').value.trim();
        if(!name) return;
        if(vfState.folderModalMode === 'rename' && vfState.activeFolderId) {
            PlaylistManager.renameFolder(vfState.activeFolderId, name, vfState.selectedColor);
            logPro(`GROUP: RENAMED -> ${name.toUpperCase()}`);
        } else {
            PlaylistManager.addFolder(name, vfState.selectedColor);
            logPro(`GROUP: CREATED -> ${name.toUpperCase()}`);
        }
        savePlaylistStructure();
        render();
        $('pro-folder-modal').classList.add('hidden');
    };
    $('pfm-input').addEventListener('keydown', e => { if(e.key === 'Enter') $('pfm-save').click(); });

    const palette = $('pfm-colors');
    FOLDER_COLORS.forEach(c => {
        const dot = document.createElement('div');
        dot.className = 'pfm-color-dot';
        dot.style.background = c;
        dot.dataset.c = c;
        dot.onclick = () => {
            vfState.selectedColor = c;
            palette.querySelectorAll('.pfm-color-dot').forEach(d => d.classList.toggle('active', d.dataset.c === c));
        };
        palette.appendChild(dot);
    });

    $('pmm-close').onclick = () => $('pro-move-modal').classList.add('hidden');

    $('cm-move-to-group').onclick = () => {
        $('context-menu').classList.add('hidden');
        if(vfState.contextTrackPath) openMoveToGroupModal(vfState.contextTrackPath);
    };

    $('pfcm-rename').onclick = () => {
        $('pro-folder-cm').classList.add('hidden');
        openFolderModal('rename', vfState.contextFolderId);
    };

    $('pfcm-delete').onclick = () => {
        $('pro-folder-cm').classList.add('hidden');
        if(vfState.contextFolderId) {
            PlaylistManager.deleteFolder(vfState.contextFolderId);
            savePlaylistStructure();
            render();
            logPro("GROUP: DELETED");
        }
    };
}

function openFolderModal(mode, folderId = null) {
    vfState.folderModalMode = mode;
    vfState.activeFolderId = folderId;

    const input = $('pfm-input');
    const title = $('pfm-title');

    if(mode === 'rename' && folderId) {
        const folder = PlaylistManager.items.find(i => i.id === folderId);
        input.value = folder ? folder.name : '';
        vfState.selectedColor = folder ? folder.color : '#38bdf8';
        title.textContent = 'RENAME_GROUP';
    } else {
        input.value = '';
        vfState.selectedColor = '#38bdf8';
        title.textContent = 'CREATE_GROUP';
    }

    $('pfm-colors').querySelectorAll('.pfm-color-dot').forEach(d => {
        d.classList.toggle('active', d.dataset.c === vfState.selectedColor);
    });

    $('pro-folder-modal').classList.remove('hidden');
    input.focus();
}

function openMoveToGroupModal(trackPath) {
    const modal = $('pro-move-modal');
    const list = $('pmm-list');
    if(!modal || !list) return;

    const folders = PlaylistManager.items.filter(i => i.type === 'folder');
    const trackItem = PlaylistManager.items.find(i => i.type === 'track' && i.id === trackPath);
    const currentGroupId = trackItem ? trackItem.groupId : null;

    list.innerHTML = '';

    if(currentGroupId) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-pro';
        removeBtn.style.cssText = 'width:100%; margin-bottom:4px;';
        removeBtn.textContent = '✕ Remove from Group';
        removeBtn.onclick = () => {
            PlaylistManager.moveItemToFolder(trackPath, null);
            savePlaylistStructure();
            render();
            modal.classList.add('hidden');
            logPro("GROUP: TRACK REMOVED");
        };
        list.appendChild(removeBtn);
    }

    if(folders.length === 0) {
        const msg = document.createElement('div');
        msg.style.cssText = 'font-family:var(--font-mono); font-size:11px; color:var(--text-dim); text-align:center; padding:16px;';
        msg.textContent = '[ NO_GROUPS_CREATED ]';
        list.appendChild(msg);
    } else {
        folders.forEach(folder => {
            const btn = document.createElement('button');
            const isActive = folder.id === currentGroupId;
            btn.className = 'btn-pro' + (isActive ? ' primary' : '');
            btn.style.cssText = 'width:100%; display:flex; align-items:center; gap:10px;';
            btn.innerHTML = `<span style="width:10px; height:10px; border-radius:50%; background:${folder.color}; flex-shrink:0;"></span>${escHtml(folder.name)}`;
            btn.onclick = () => {
                PlaylistManager.moveItemToFolder(trackPath, folder.id);
                savePlaylistStructure();
                render();
                modal.classList.add('hidden');
                logPro(`GROUP: TRACK -> ${folder.name.toUpperCase()}`);
            };
            list.appendChild(btn);
        });
    }

    modal.classList.remove('hidden');
}

window.v2ftoggle = (folderId) => {
    PlaylistManager.toggleFolder(folderId);
    render();
};

window.v2fcm = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    vfState.contextFolderId = folderId;
    const fcm = $('pro-folder-cm');
    fcm.classList.remove('hidden');

    let x = e.clientX;
    let y = e.clientY;
    if(x + 180 > window.innerWidth) x = window.innerWidth - 190;
    if(y + 90 > window.innerHeight) y = window.innerHeight - 100;
    fcm.style.left = x + 'px';
    fcm.style.top = y + 'px';
};

function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

//--- Refresh Animation ---------------
function showRefreshAnimation() {
    const el = $('refresh-status');
    if(!el) return;
    el.classList.remove('hidden');
    el.innerHTML = '<span class="refresh-spinner"></span> Refreshing...';
}
function showRefreshComplete() {
    const el = $('refresh-status');
    if(!el) return;
    el.innerHTML = '<span class="refresh-check">✓</span> Complete';
    setTimeout(() => el.classList.add('hidden'), 2500);
}
