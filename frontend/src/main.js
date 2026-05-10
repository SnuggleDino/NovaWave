import * as App from '../wailsjs/go/main/App.js';
import lovingDinosImg from './assets/Two_Loving_Cute_Dinos.png';
import sunsetSunImg from './assets/sunset_drive_retrowave_sun.png';
import lovingDinosIco from './assets/Two_Loving_Cute_Dinos.ico';
import { VisualizerEngine } from './visualizerEngine.js';
import { IntroManager } from './app_intros/intro_manager.js';
import { AudioExtras } from './audio_extras.js';
import { DynamicIsland } from './dynamic_island.js';
import { MiniPlayer } from './mini_player.js';
import { ThemePackListener } from './theme_packs/theme_pack_listener.js';
import { ThemeListener } from './app_themes/theme_listener.js';
import { BackgroundAnimListener } from './background_animations/background_anim_listener.js';
import { AppLoader } from './app_start/app_loader.js';
import { OnBoarding } from './app_start/onboarding.js';
import { AppShutdown } from './app_shutdown/shutdown.js';
import { AppSettings } from './app_settings/app_settings.js';
import { LangHandler } from './app_language/lang_handler.js';
import { UpdateManager } from './app_updates/update_manager.js';
import { PlaylistManager } from './playlist/playlist_manager.js';
import { DownloadManager } from './downloader/download_manager.js';
import { LyricsManager } from './lyrics/lyrics_manager.js';
import { AppPerformance } from './app_performance.js';
import { AudioFeaturesPanel } from './audio_extras/audio_features_panel.js';
import './audio_extras/audio_features_panel.css';


function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const windowApi = {
    getSettings: App.GetSettings,
    getAppMeta: App.GetAppMeta,
    setSetting: App.SetSetting,
    getLyrics: App.GetLyrics,
    hasLyrics: App.HasLyrics,
    selectFolder: App.SelectFolder,
    selectMusicFolder: App.SelectMusicFolder,
    refreshMusicFolder: App.RefreshMusicFolder,
    downloadFromYouTube: App.DownloadFromYouTube,
    downloadFromSpotify: App.DownloadFromSpotify,
    isSpotifyUrl: App.IsSpotifyUrl,
    deleteTrack: App.DeleteTrack,
    updateTitle: App.UpdateTitle,
    updateMetadata: App.UpdateMetadata,
    selectImage: App.SelectImage,
    getImageBase64: App.GetImageBase64,
    setCoverArt: App.SetCoverArt,
    showInFolder: App.ShowInFolder,
    moveFile: App.MoveFile,
    setWindowSize: App.SetWindowSize,
    resetConfig: App.ResetConfig,
    restartApp: App.RestartApp,
};

window.api = windowApi;

//--- Global UI Switcher ---------------
window.switchUI = async function (key, target) {
    console.log(`[Global] switchUI called: key=${key}, target=${target}`);
    try {
        if (window.api && window.api.setSetting) {
            await window.api.setSetting('uiVersion', key);
            console.log('[Global] UI setting saved');
        } else {
            localStorage.setItem('uiVersion', key);
        }
    } catch (e) {
        console.error('[Global] Error saving UI setting:', e);
    }

    setTimeout(() => {
        console.log(`[Global] Navigating to ${target}`);
        try {
            window.location.href = target;
        } catch (e) {
            window.location.assign(target);
        }
    }, 50);
};

//--- Global Hotkeys ---------------
document.addEventListener('keydown', (e) => {

    if (e.ctrlKey && e.key.toLowerCase() === 'u') {
        window.__uiHotkeyStage = true;
        console.log('[Hotkeys] UI Switch Stage 1 Activated (Waiting for 1 or 2)');

        if (window.__uiHotkeyTimeout) clearTimeout(window.__uiHotkeyTimeout);
        window.__uiHotkeyTimeout = setTimeout(() => {
            window.__uiHotkeyStage = false;
            console.log('[Hotkeys] UI Switch Timeout');
        }, 1000);
        return;
    }

    if (window.__uiHotkeyStage) {
        if (e.key === '1') {
            console.log('[Hotkeys] Triggering Legacy UI');
            window.switchUI('legacy', 'index.html');
            window.__uiHotkeyStage = false;
        } else if (e.key === '2') {
            console.log('[Hotkeys] Triggering V2 UI');
            window.switchUI('v2', 'v2.html');
            window.__uiHotkeyStage = false;
        } else if (e.key === '3') {
            console.log('[Hotkeys] Triggering Lite UI');
            window.switchUI('lite', 'lite.html');
            window.__uiHotkeyStage = false;
        }
    }
});

let playlist = [];
let basePlaylist = [];
let currentIndex = -1;
let currentTrackPath = null;
let isPlaying = false;
let audio = new Audio();
audio.crossOrigin = "anonymous";
document.body.appendChild(audio);

let currentVolume = 0.2;
let shuffleOn = false;
let loopMode = 'off';
let currentLanguage = 'de';
let settings = {};
let sortMode = 'name';
let visualizerEnabled = true;
let deleteSongsEnabled = false;
let currentFolderPath = null;
let contextTrackIndex = null;
let currentVisualizerStyle = 'bars';
let visSensitivity = 1.5;
let sleepTimerId = null;
let lastNotifiedPath = null;
let activeDownloaderMode = 'youtube';

let visualizer;
let audioExtras;
let audioFeaturesPanel;
let dynamicIsland;
let miniPlayer;

let $, trackTitleEl, trackArtistEl, musicEmojiEl, currentTimeEl, durationEl, progressBar, progressFill, playBtn, playIcon, pauseIcon, prevBtn, nextBtn, loopBtn, shuffleBtn, volumeSlider, volumeIcon, playlistEl, playlistInfoBar, loadFolderBtn, openLibraryBtn, libraryOverlay, libraryCloseBtn, refreshFolderBtn, playlistRefreshBtn, searchInput, sortSelect, ytUrlInput, ytNameInput, downloadBtn, downloaderOverlay, downloaderCloseBtn, downloadStatusEl, downloadProgressFill, visualizerCanvas, visualizerContainer, langButtons, settingsBtn, settingsOverlay, settingsCloseBtn, downloadFolderInput, changeFolderBtn, qualitySelect, themeSelect, visualizerToggle, visualizerStyleSelect, visualizerSensitivity, sleepTimerSelect, animationSelect, backgroundAnimationEl, emojiSelect, customEmojiContainer, customEmojiInput, toggleDeleteSongs, toggleDownloaderBtn, contextMenu, contextMenuEditTitle, contextMenuFavorite, editTitleOverlay, editTitleInput, editArtistInput, originalTitlePreview, newTitlePreview, editTitleCancelBtn, editTitleSaveBtn, editTitleCloseBtn, confirmDeleteOverlay, confirmDeleteBtn, confirmDeleteCancelBtn, confirmDeleteCloseBtn, autoLoadLastFolderToggle, toggleMiniMode, notificationBar, notificationMessage, notificationTimeout, accentColorPicker, toggleFocusModeBtn, dropZone, toggleEnableFocus, toggleEnableDrag, toggleUseCustomColor, accentColorContainer, speedSlider, speedValue, snowInterval, toggleFavoritesBtn, toggleFavoritesOption, audioExtrasToggleBtn;

let spotifyUrlInput, tabYtBtn, tabSpotifyBtn, viewYt, viewSpotify;
let musicUrlInput, musicNameInput, tabMusicBtn, viewMusic;
let favorites = [];
let favoritesSet = new Set();
let isFavoritesFilterActive = false;

let trackToDeletePath = null;
let deleteInterval = null;
let bassBoostToggle, bassBoostSlider, bassBoostValueEl, bassBoostContainer;
let trebleBoostToggle, trebleBoostSlider, trebleBoostValueEl, trebleBoostContainer;
let reverbToggle, reverbSlider, reverbValueEl, reverbContainer;
let toggleCinemaMode, btnExportPlaylist, playlistPositionSelect, toggleGradientTitle;
let renderPlaylistRequestId = null;

let lastFrameTime = performance.now();
let downloadManager;
let frameCount = 0;
let appFrameCount = 0;
let fps = 0;
let avgFps = 60;
let perfHintShown = false;
let showStatsOverlay = false;
let targetFps = 60;
let lastRenderTime = 0;
let lastStatsTime = performance.now();
let cachedAccentColor = '#38bdf8';
let isStatsLoopRunning = false;
let warmupFrames = 0;

//--- Helper Functions ---------------

let legacyDragId = null;
let legacyFolders = [];
let activeFolderId = null;
let selectedFolderColor = '#38bdf8';
let folderModal = null;
let folderInput = null;
let folderModalTitle = null;
let contextMenuFolder = null;
let contextFolderId = null;
let deleteMode = 'track';
let isQueueModalOpen = false;
let selectedCoverPath = null;

function initUIHelpers() {
    folderModal = $('#folder-modal-overlay');
    folderInput = $('#folder-input');
    folderModalTitle = $('#folder-modal-title');
    contextMenuFolder = $('#context-menu-folder');

    const palette = $('#folder-color-palette');
    if (palette) {
        palette.addEventListener('click', (e) => {
            const swatch = e.target.closest('.color-swatch');
            if (swatch) {
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                selectedFolderColor = swatch.dataset.color;
            }
        });
    }
}

function openFolderModal(mode, folderId = null) {
    activeFolderId = folderId;
    if (folderModal) folderModal.classList.add('visible');

    const folder = folderId ? PlaylistManager.items.find(i => i.id === folderId) : null;
    if (folderInput) {
        folderInput.value = mode === 'rename' ? folder?.name || '' : '';
        folderInput.placeholder = tr('folderNamePlaceholder');
        folderInput.focus();
    }

    const titleKey = mode === 'rename' ? 'folderModalTitleRename' : 'folderModalTitleCreate';
    if (folderModalTitle) folderModalTitle.textContent = tr(titleKey);

    selectedFolderColor = (mode === 'rename' && folder) ? folder.color : '#38bdf8';
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.toggle('active', swatch.dataset.color === selectedFolderColor);
    });
}

function openMoveToGroupModal(trackPath) {
    const overlay = document.getElementById('move-to-group-overlay');
    const list = document.getElementById('move-to-group-list');
    if (!overlay || !list) return;

    const folders = PlaylistManager.items.filter(i => i.type === 'folder');
    const trackItem = PlaylistManager.items.find(i => i.type === 'track' && i.id === trackPath);
    const currentGroupId = trackItem ? trackItem.groupId : null;

    list.innerHTML = '';

    if (currentGroupId) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'move-to-group-btn remove-from-group';
        removeBtn.textContent = tr('removeFromGroup');
        removeBtn.onclick = () => {
            PlaylistManager.moveItemToFolder(trackPath, null);
            savePlaylistState();
            renderPlaylist();
            overlay.classList.remove('visible');
        };
        list.appendChild(removeBtn);

        const divider = document.createElement('div');
        divider.className = 'context-divider';
        divider.style.margin = '8px 0';
        list.appendChild(divider);
    }

    folders.forEach(folder => {
        const btn = document.createElement('button');
        btn.className = 'move-to-group-btn' + (folder.id === currentGroupId ? ' active' : '');
        btn.innerHTML = `<span class="move-to-group-dot" style="background:${folder.color}"></span>${folder.name}`;
        btn.onclick = () => {
            PlaylistManager.moveItemToFolder(trackPath, folder.id);
            savePlaylistState();
            renderPlaylist();
            overlay.classList.remove('visible');
        };
        list.appendChild(btn);
    });

    overlay.classList.add('visible');
}

function showFolderContextMenu(e, folderId) {
    e.preventDefault();
    e.stopPropagation();
    contextFolderId = folderId;

    if (contextMenu) contextMenu.style.display = 'none';

    if (contextMenuFolder) {
        contextMenuFolder.style.display = 'block';
        const menuHeight = contextMenuFolder.offsetHeight;
        const windowHeight = window.innerHeight;
        let top = e.clientY;
        if (top + menuHeight > windowHeight) {
            top = Math.max(0, top - menuHeight);
        }

        contextMenuFolder.style.top = `${top}px`;
        contextMenuFolder.style.left = `${e.clientX}px`;

        const closeCm = () => {
            contextMenuFolder.style.display = 'none';
            window.removeEventListener('click', closeCm);
        };
        window.addEventListener('click', closeCm);
    }
}

function showDeleteConfirmation(mode, id) {
    deleteMode = mode;
    if (deleteInterval) {
        clearInterval(deleteInterval);
        deleteInterval = null;
    }

    const countdownWrapper = $('.delete-countdown-wrapper');
    const countdownBar = $('#delete-countdown-bar');

    if (countdownWrapper) countdownWrapper.classList.remove('active');
    if (countdownBar) countdownBar.classList.remove('animate');

    if (confirmDeleteOverlay) {
        const msgEl = confirmDeleteOverlay.querySelector('.confirm-message');
        const titleEl = confirmDeleteOverlay.querySelector('h3');

        if (confirmDeleteBtn) {
            confirmDeleteBtn.disabled = (mode === 'track');
            confirmDeleteBtn.textContent = tr('confirmDeleteButton');
        }

        if (mode === 'track') {
            trackToDeletePath = id;
            if (titleEl) titleEl.textContent = tr('confirmDeleteTitle');
            if (msgEl) msgEl.textContent = tr('confirmDeleteMessage');

            handleDeleteTrack(id);
        } else {
            contextFolderId = id;
            if (titleEl) titleEl.textContent = tr('cmFolderDelete');
            if (msgEl) msgEl.textContent = tr('cmFolderDeleteConfirm');
        }
        confirmDeleteOverlay.classList.add('visible');
    }
}

function handleDeleteTrack(fp) {
    let countdown = 5;
    const countdownWrapper = $('.delete-countdown-wrapper');
    const countdownBar = $('#delete-countdown-bar');

    if (countdownWrapper) countdownWrapper.classList.add('active');
    if (countdownBar) {
        countdownBar.classList.remove('animate');
        void countdownBar.offsetWidth;
        countdownBar.classList.add('animate');
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = `${tr('confirmDeleteButton')} (${countdown})`;

        deleteInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                confirmDeleteBtn.textContent = `${tr('confirmDeleteButton')} (${countdown})`;
            } else {
                clearInterval(deleteInterval);
                deleteInterval = null;
                confirmDeleteBtn.textContent = tr('confirmDeleteButton');
                confirmDeleteBtn.disabled = false;
            }
        }, 1000);
    }
}

function savePlaylistState() {
    const structure = PlaylistManager.exportStructure();
    windowApi.setSetting('playlistStructure', structure);
}

const pressedKeys = new Set();

function initVisualizerEngine() {
    if (!audioExtras && audio) {
        audioExtras = new AudioExtras(audio);
        audioExtras.init();
        updateAudioEffects();
    }

    if (visualizer) return;
    if (!audio || !visualizerCanvas) return;

    visualizer = new VisualizerEngine(audio, visualizerCanvas, {
        enabled: settings.visualizerEnabled,
        style: settings.visualizerStyle,
        sensitivity: settings.visSensitivity,
        accentColor: cachedAccentColor,
        targetFps: settings.targetFps,
        maxBars: settings.visualizerBars || 64,
        musicEmojiEl: $('.cover-art-wrapper') || musicEmojiEl
    });

    if (audioExtras) {
        visualizer.setAnalyser(audioExtras.getAnalyser());
    }

    if (miniPlayer) miniPlayer.setVisualizer(visualizer);
}

function updateAudioEffects() {
    if (audioExtras) {
        audioExtras.setBass(settings.bassBoostValue, settings.bassBoostEnabled);
        audioExtras.setTreble(settings.trebleBoostValue, settings.trebleBoostEnabled);
        audioExtras.setReverb(settings.reverbValue, settings.reverbEnabled);
        if (settings.eqValues) {
            audioExtras.setEq(settings.eqValues, settings.eqEnabled);
        }
    }
    updateActiveFeaturesIndicator();
}

function updateActiveFeaturesIndicator() {
    if (audioFeaturesPanel) {
        audioFeaturesPanel.updateStatus(settings);
    }
}

function saveSetting(key, value) {
    if (settings) settings[key] = value;
    windowApi.setSetting(key, value);
    if (key === 'activeIntro' || key === 'theme' || key === 'language') localStorage.setItem(key, value);
}

function updateCachedColor() {
    let color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dinolove') color = '#c1d37f';
    else if (currentTheme === 'cyberpunk') color = '#fcee0a';
    else if (currentTheme === 'sleeptime') color = '#7b68ee';
    else if (currentTheme === 'sakura') color = '#ffb7b2';
    else if (currentTheme === 'sunset') color = '#f97316';
    else if (currentTheme === '8_bit_theme') color = '#39ff14';

    cachedAccentColor = color || '#38bdf8';

    if (visualizer) {
        visualizer.updateSettings({ accentColor: cachedAccentColor });
    }
}

//--- App Core Functions ---------------
function tr(key, ...args) {
    return LangHandler.tr(key, ...args);
}

function playTrack(index) {
    if (index < 0 || index >= playlist.length) { isPlaying = false; updatePlayPauseUI(); return; }
    currentIndex = index;
    const track = playlist[index];
    currentTrackPath = track.path;
    let rawPath = track.path.replace(/\\/g, '/');
    let serverPath = '/music/' + rawPath;
    let safeUrl = encodeURI(serverPath).replace(/#/g, '%23');

    audio.src = safeUrl;

    const speed = settings.playbackSpeed || 1.0;
    audio.defaultPlaybackRate = speed;
    audio.playbackRate = speed;

    if (audioExtras) audioExtras.resume();

    audio.play().catch(e => console.error("Error playing audio:", e));
    isPlaying = true;
    updateUIForCurrentTrack();
}

function playNext() {
    if (shuffleOn) {
        if (playlist.length <= 1) { playTrack(0); return; }
        let nextIndex;
        do {
            nextIndex = Math.floor(Math.random() * playlist.length);
        } while (nextIndex === currentIndex);
        playTrack(nextIndex);
        return;
    }
    let nextIndex = currentIndex + 1;
    if (nextIndex >= playlist.length) {
        if (loopMode === 'all') nextIndex = 0;
        else { isPlaying = false; updatePlayPauseUI(); return; }
    }
    playTrack(nextIndex);
}

function playPrev() { if (audio.currentTime > 3) audio.currentTime = 0; else playTrack(currentIndex - 1 < 0 ? playlist.length - 1 : currentIndex - 1); }

//--- UI & DOM Manipulation ---------------
function deactivateAllThemePacks(excludeKey) {
    const packs = [
        { key: 'snuggleTimeEnabled', toggleId: 'toggle-snuggle-time' },
        { key: 'sleepTimeEnabled', toggleId: 'toggle-sleep-time' },
        { key: 'cyberpunkEnabled', toggleId: 'toggle-cyberpunk' },
        { key: 'sunsetEnabled', toggleId: 'toggle-sunset' },
        { key: 'sakuraEnabled', toggleId: 'toggle-sakura' },
        { key: 'eightBitEnabled', toggleId: 'toggle-8-bit' },
        { key: 'fridayNightFunkinEnabled', toggleId: 'toggle-friday-night-funkin' }
    ];

    packs.forEach(pack => {
        if (pack.key !== excludeKey && settings[pack.key]) {
            saveSetting(pack.key, false);
            const toggle = document.getElementById(pack.toggleId);
            if (toggle) toggle.checked = false;
        }
    });
}

function resetToDefaultTheme() {
    document.body.classList.remove(
        'snuggle-time-active', 'sleeptime-active', 'cyberpunk-active',
        'sunset-active', 'sakura-active', 'friday-night-funkin-active'
    );

    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--bg-main');

    if (!settings.activeThemePack) {
        const th = settings.theme || 'midnight';
        document.documentElement.setAttribute('data-theme', th);
        localStorage.setItem('theme', th);
        if (themeSelect) { themeSelect.disabled = false; themeSelect.value = th; }
    } else {
        document.documentElement.setAttribute('data-theme', settings.activeThemePack);
    }

    if (settings.useCustomColor && settings.customAccentColor) {
        document.documentElement.style.setProperty('--accent', settings.customAccentColor);
    }

    const accentToggle = document.getElementById('toggle-use-custom-color');
    if (accentToggle) {
        accentToggle.disabled = false;
        accentToggle.checked = !!settings.useCustomColor;
        if (accentColorContainer) accentColorContainer.classList.toggle('hidden', !accentToggle.checked);
    }

    if (visualizer) {
        const style = settings.visualizerStyle || 'bars';
        const bars = settings.visualizerBars || 64;
        visualizer.updateSettings({ style: style, maxBars: bars });
        if (visualizerStyleSelect) { visualizerStyleSelect.disabled = false; visualizerStyleSelect.value = style; }

        const barsInput = document.getElementById('visualizer-bars-input');
        const barsValue = document.getElementById('visualizer-bars-value');
        if (barsInput) {
            barsInput.disabled = false;
            barsInput.value = bars;
            if (barsValue) barsValue.value = bars;
        }
    }

    const anim = settings.animationMode || 'flow';
    applyAnimationSetting(anim);
    if (animationSelect) { animationSelect.disabled = false; animationSelect.value = anim; }

    const et = settings.coverMode || 'note';
    updateEmoji(et, settings.customCoverEmoji);
    if (emojiSelect) { emojiSelect.disabled = false; emojiSelect.value = et; }
    if (customEmojiContainer) customEmojiContainer.style.display = et === 'custom' ? 'flex' : 'none';

    setTimeout(() => {
        updateCachedColor();
        renderPlaylist();
    }, 100);
}

function updateUIForCurrentTrack() {
    let emojiMode = settings.coverMode || 'note';
    let customEmoji = settings.customCoverEmoji;
    const isSnuggle = settings.snuggleTimeEnabled || document.body.classList.contains('snuggle-time-active');
    if (isSnuggle) emojiMode = 'loving_dinos';

    if (currentIndex === -1 || !playlist[currentIndex]) {
        if (trackTitleEl) trackTitleEl.textContent = tr('nothingPlaying');
        if (trackArtistEl) trackArtistEl.textContent = '...';
        updateEmoji(emojiMode, customEmoji);
        updateActiveTrackInPlaylist();
        updateTrackTitleScroll();
        LyricsManager.checkAvailability(null);
        return;
    }
    const track = playlist[currentIndex];

    let cleanTitle = cleanTitleDisplay(track.title || "");

    if (trackTitleEl) trackTitleEl.textContent = cleanTitle;
    if (trackArtistEl) trackArtistEl.textContent = track.artist || tr('unknownArtist');

    LyricsManager.checkAvailability(track.path);

    updateEmoji(emojiMode, customEmoji);
    updateActiveTrackInPlaylist();
    updateTrackTitleScroll();
    if (isPlaying && lastNotifiedPath !== track.path) {
        showNotification(`${tr('nowPlaying')}: ${cleanTitle}`);
        lastNotifiedPath = track.path;
    }
}

function updatePlayPauseUI() { if (playIcon && pauseIcon) { playIcon.style.display = isPlaying ? 'none' : 'block'; pauseIcon.style.display = isPlaying ? 'block' : 'none'; } updateActiveTrackInPlaylist(); }

function updateActiveTrackInPlaylist() {
    if (!playlistEl) return;
    const previousActive = playlistEl.querySelector('.track-row.active');
    if (previousActive) { previousActive.classList.remove('active'); const indexEl = previousActive.querySelector('.track-index'); if (indexEl) indexEl.textContent = parseInt(previousActive.dataset.index, 10) + 1; }
    if (currentIndex !== -1) {
        const newActive = playlistEl.querySelector(`.track-row[data-index="${currentIndex}"]`);
        if (newActive) {
            newActive.classList.add('active');
            const indexEl = newActive.querySelector('.track-index');
            if (indexEl) { if (isPlaying) { indexEl.innerHTML = `<div class="playing-bars"><span></span><span></span><span></span></div>`; } else { indexEl.textContent = currentIndex + 1; } }

            requestAnimationFrame(() => {
                newActive.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
    }
}

function renderPlaylist() {
    if (!playlistEl) return;
    if (renderPlaylistRequestId) cancelAnimationFrame(renderPlaylistRequestId);
    playlistEl.innerHTML = '';

    const renderItems = PlaylistManager.getRenderList(
        searchInput ? searchInput.value : '',
        isFavoritesFilterActive ? favoritesSet : null
    );

    if (renderItems.length === 0) {
        const msg = isLibraryLoading ? tr('loaderLoadingLibrary') : (isFavoritesFilterActive ? tr('noFavoritesFound') : tr('emptyPlaylist'));
        playlistEl.innerHTML = `<div class="empty-state">${msg}</div>`;
        if (playlistInfoBar) playlistInfoBar.textContent = `0 ${tr('playlistTitle')}`;
        return;
    }

    if (isFavoritesFilterActive || (searchInput && searchInput.value)) {
        playlist = renderItems.filter(i => i.type === 'track').map(i => i.data);
    } else {
        playlist = PlaylistManager.getAllTracks();
    }

    if (currentTrackPath) {
        currentIndex = playlist.findIndex(t => t.path === currentTrackPath);
    }

    if (playlistInfoBar) playlistInfoBar.textContent = `${playlist.length} ${playlist.length === 1 ? tr('track') : tr('tracks')}`;

    let renderIndex = 0; const CHUNK_SIZE = 50;

    function renderChunk() {
        const fragment = document.createDocumentFragment();
        const limit = Math.min(renderIndex + CHUNK_SIZE, renderItems.length);

        for (let i = renderIndex; i < limit; i++) {
            const item = renderItems[i];

            if (item.type === 'folder') {
                const row = document.createElement('div');
                row.className = 'track-row is-folder';
                row.dataset.id = item.id;
                row.dataset.itemId = item.id;
                row.draggable = true;

                const color = item.color || '#38bdf8';
                row.style.setProperty('--folder-color', color);
                row.style.setProperty('--folder-color-soft', color + '26');
                row.style.borderLeftColor = color;
                row.style.color = color;
                row.style.background = `linear-gradient(90deg, ${color}26, transparent)`;

                const arrow = item.collapsed ? '▶' : '▼';
                row.innerHTML = `<div class="track-index" style="width:30px;">${arrow}</div><div class="track-info-block" style="font-size:0.9rem;">${escapeHtml(item.name)}</div>`;

                row.onclick = () => {
                    PlaylistManager.toggleFolder(item.id);
                    savePlaylistState();
                    renderPlaylist();
                };

                row.oncontextmenu = (e) => showFolderContextMenu(e, item.id);
                fragment.appendChild(row);

            } else {
                const track = item.data;
                const globalIndex = playlist.findIndex(t => t.path === track.path);

                const row = document.createElement('div');
                row.className = 'track-row';
                row.dataset.index = globalIndex;
                row.dataset.itemId = track.path;
                row.draggable = true;
                if (globalIndex === currentIndex) row.classList.add('active');

                let displayTitle = cleanTitleDisplay(track.title || "");

                const isFav = favoritesSet.has(track.path.replace(/\\/g, '/'));
                const favFill = isFav ? 'currentColor' : 'none';
                const favColor = isFav ? '#fbbf24' : 'var(--text-muted)';
                const favBtn = `<button class="fav-track-btn" data-path="${track.path}" title="${tr('toggleFavorite')}" style="color: ${favColor};"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${favFill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></button>`;

                const displayIdx = (isPlaying && globalIndex === currentIndex) ? `<div class="playing-bars"><span></span><span></span><span></span></div>` : (globalIndex + 1);
                const titlePrefix = (!searchInput.value && item.groupId) ? '<span style="opacity:0.6; margin-right:5px;">↳</span> ' : '';

                row.innerHTML = `<div class="track-index">${displayIdx}</div><div class="track-info-block"><div class="track-title-small">${titlePrefix}${escapeHtml(displayTitle)}</div><div class="track-artist-small">${escapeHtml(track.artist || tr('unknownArtist'))}</div></div>${favBtn}<div class="track-duration">${formatTime(track.duration)}</div>`;
                fragment.appendChild(row);
            }
        }
        playlistEl.appendChild(fragment); renderIndex = limit;
        if (renderIndex < renderItems.length) {
            renderPlaylistRequestId = requestAnimationFrame(renderChunk);
        } else {

            renderPlaylistRequestId = null;
            updateActiveTrackInPlaylist();
        }
    }
    renderChunk();
}

function applyTranslations() {
    document.querySelectorAll('[data-lang-key], [data-key]').forEach(el => {
        const key = el.dataset.langKey || el.dataset.key;
        if (el.classList.contains('apply-intro-btn')) {
            const card = el.closest('.intro-card');
            if (card) {
                const isActive = card.classList.contains('active');
                const introKey = isActive ? 'introActiveBtn' : 'introApplyBtn';
                const text = tr(introKey);
                if (text) el.textContent = text;
                return;
            }
        }

        const text = tr(key);
        if (text) {
            el.textContent = text;
            if (el.classList.contains('glitch-text')) el.setAttribute('data-text', text);
        }
    });

    const newBadgeEl = document.getElementById('snuggle-new-badge');
    if (newBadgeEl) {
        const text = tr('newBadge');
        newBadgeEl.innerHTML = text.split('').map(char => `<span>${char}</span>`).join('');
    }

    document.querySelectorAll('[data-lang-placeholder]').forEach(el => { el.placeholder = tr(el.dataset.langPlaceholder); });
    document.querySelectorAll('[data-lang-title]').forEach(el => { el.title = tr(el.dataset.langTitle); });

    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.value = currentLanguage;
    }

    const dropZoneTextEl = $('#drop-zone p'); if (dropZoneTextEl) dropZoneTextEl.textContent = tr('dropFiles');
    document.title = tr('appTitle');
    updateUIForCurrentTrack();
    renderPlaylist();
    if (UpdateManager && typeof UpdateManager.renderChangelog === 'function') {
        UpdateManager.renderChangelog();
    }

    if (settings.snuggleTimeEnabled || document.body.classList.contains('snuggle-time-active')) {
        updateEmoji('loving_dinos');
    }
}

function updateTrackTitleScroll() {
    if (!trackTitleEl) return;
    trackTitleEl.classList.remove('animating');
    trackTitleEl.style.transform = 'translateX(0)';

    const wrapper = trackTitleEl.parentElement;
    if (wrapper) wrapper.classList.remove('scroll-active');

    setTimeout(() => {
        if (!wrapper) return;

        const containerWidth = wrapper.offsetWidth;
        const textWidth = trackTitleEl.scrollWidth;

        if (textWidth > containerWidth) {
            const scrollDist = (textWidth - containerWidth + 40) * -1;
            trackTitleEl.style.setProperty('--scroll-dist', `${scrollDist}px`);
            trackTitleEl.classList.add('animating');
            wrapper.classList.add('scroll-active');
        }
    }, 400);
}

function updateEmoji(emojiType, customEmoji) {
    if (!musicEmojiEl) return;

    const isSnuggle = settings.snuggleTimeEnabled || document.body.classList.contains('snuggle-time-active');
    const isSleep = settings.sleepTimeEnabled || document.body.classList.contains('sleeptime-active');
    const isSunset = settings.sunsetEnabled || document.body.classList.contains('sunset-active');
    const isSakura = settings.sakuraEnabled || document.body.classList.contains('sakura-active');
    const isEightBit = settings.eightBitEnabled || document.body.classList.contains('8-bit-active');

    if (isSnuggle) {
        emojiType = 'loving_dinos';
    } else if (isSleep) {
        emojiType = 'moon';
    } else if (isSunset) {
        emojiType = 'sunset_sun';
    } else if (isSakura) {
        emojiType = 'sakura_flower';
    } else if (isEightBit) {
        emojiType = 'eight_bit';
    }

    if (emojiType === 'auto' || emojiType === undefined) {
        if (currentTrackPath) {
            let rawPath = currentTrackPath.replace(/\\/g, '/');
            let safeUrlPath = encodeURI(rawPath).replace(/#/g, '%23').replace(/\?/g, '%3F');
            const coverUrl = '/cover/' + safeUrlPath + '?t=' + Date.now();

            const img = new Image();
            img.onload = () => {
                musicEmojiEl.innerHTML = `<img src="${coverUrl}" alt="Cover" draggable="false" ondragstart="return false;" style="background: transparent !important; border: none !important; width: 100%; height: 100%; object-fit: contain;">`;
            };
            img.onerror = () => {
                const fallbackType = settings.lastCoverEmoji || 'note';

                const finalFallback = (fallbackType === 'auto') ? 'note' : fallbackType;
                renderEmoji(finalFallback, settings.customCoverEmoji);
            };
            img.src = coverUrl;
            return;
        } else {
            emojiType = settings.lastCoverEmoji || 'note';
        }
    }

    renderEmoji(emojiType, customEmoji);
}

function renderEmoji(emojiType, customEmoji) {
    let emoji = '🎵';
    let isImage = false;
    let isHtml = false;

    if (emojiType === 'note') emoji = '🎵';
    else if (emojiType === 'dino') emoji = '🦖';
    else if (emojiType === 'cyber') emoji = '🤖';
    else if (emojiType === 'moon') emoji = '🌙';
    else if (emojiType === 'sunset_sun') {
        emoji = sunsetSunImg;
        isImage = true;
    }
    else if (emojiType === 'sakura_flower') {
        emoji = '<div class="sakura-cover">🌸</div>';
        isHtml = true;
    }
    else if (emojiType === 'eight_bit') {
        emoji = '<div class="eight-bit-cover"></div>';
        isHtml = true;
    }
    else if (emojiType === 'loving_dinos') {
        emoji = lovingDinosImg;
        isImage = true;
    }
    else if (emojiType === 'gift') emoji = '\uD83C\uDF81';
    else if (emojiType === 'vinyl') {
        emoji = './assets/Vinyl_Record.png';
        isImage = true;
    }
    else if (emojiType === 'compact') {
        emoji = './assets/Compact_Disc.png';
        isImage = true;
    }
    else if (emojiType === 'custom' && customEmoji) emoji = customEmoji.trim();

    if (isImage) {
        musicEmojiEl.innerHTML = `<img src="${emoji}" alt="Cover" draggable="false" ondragstart="return false;" style="background: transparent !important; border: none !important; width: 100%; height: 100%; object-fit: contain;">`;
    } else if (isHtml) {
        musicEmojiEl.innerHTML = emoji;
    } else {
        musicEmojiEl.textContent = emoji;
    }
}

//--- Downloader UI Utilities ---------------
function updateQueueStatsUI(stats) {
    const pEl = document.getElementById('qs-pending');
    const rEl = document.getElementById('qs-processing');
    const sEl = document.getElementById('qs-success');

    if (pEl) pEl.textContent = stats.pending;
    if (rEl) rEl.textContent = stats.processing;
    if (sEl) sEl.textContent = stats.success;

    if (stats.processing > 0) {
        setDownloaderState('processing', `${tr('statusProgress')}: ${stats.processing}`);
    } else if (stats.pending > 0) {
        setDownloaderState('info', `${tr('queueTitle')}: ${stats.pending}`);
    } else if (stats.success > 0 || stats.failed > 0) {
        setDownloaderState('success', tr('legendFinished'));
    } else {
        setDownloaderState('idle');
    }
}

function setDownloaderState(state, message) {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('info-status-text');
    const terminal = document.getElementById('terminal-view');
    const btn = document.getElementById('download-btn');
    const toggleTerminal = document.getElementById('toggle-terminal-btn');

    if (!statusDot || !statusText || !terminal || !btn) return;

    statusDot.className = 'status-dot';
    btn.classList.remove('loading');

    if (toggleTerminal) toggleTerminal.style.display = 'flex';

    if (state === 'idle') {
        statusDot.classList.add('idle');
        statusText.textContent = message || tr('statusReady');
        btn.disabled = false;
    } else if (state === 'processing') {
        statusDot.classList.add('processing');
        statusText.textContent = message || tr('statusStarting');
        btn.classList.add('loading');
        btn.disabled = false;
    } else if (state === 'success') {
        statusDot.classList.add('success');
        statusText.textContent = message || tr('statusSuccess');
        btn.disabled = false;
    } else if (state === 'error') {
        statusDot.classList.add('error');
        statusText.textContent = message || tr('statusError');
        btn.disabled = false;
        const terminalPanel = document.getElementById('terminal-panel');
        if (terminalPanel && terminalPanel.style.display === 'none') {
            toggleTerminalPanel();
        }
    } else if (state === 'info') {
        statusDot.classList.add('info');
        statusText.textContent = message;
        btn.disabled = false;
    }
}

//--- Queue Modal ---------------
function setupQueueUI() {
    const queueOverlay = document.getElementById('queue-overlay');
    const openBtn = document.getElementById('open-queue-btn');
    const clearBtn = document.getElementById('clear-history-btn');

    const terminalBtn = document.getElementById('toggle-terminal-btn');
    const clearTerminalBtn = document.getElementById('clear-terminal-btn');

    if (openBtn) openBtn.onclick = toggleQueuePanel;

    if (terminalBtn) terminalBtn.onclick = toggleTerminalPanel;
    if (clearTerminalBtn) {
        clearTerminalBtn.onclick = () => {
            const term = document.getElementById('terminal-view');
            if (term) term.innerHTML = '';
        };
    }

    if (clearBtn) {
        clearBtn.onclick = () => {
            if (downloadManager) {
                downloadManager.history = [];
                downloadManager._notifyStats();
                renderQueueModal();
            }
        };
    }
}

function toggleQueuePanel() {
    const queuePanel = document.getElementById('queue-panel');
    const downOverlay = document.getElementById('downloader-overlay');

    if (queuePanel) {
        if (queuePanel.style.display === 'none') {
            queuePanel.style.display = 'flex';
            isQueueModalOpen = true;
            renderQueueModal();
            if (downOverlay) downOverlay.classList.add('with-queue');
        } else {
            closeQueuePanel();
        }
    }
}

function closeQueuePanel() {
    const queuePanel = document.getElementById('queue-panel');
    const downOverlay = document.getElementById('downloader-overlay');

    if (queuePanel) {
        queuePanel.style.display = 'none';
        isQueueModalOpen = false;
        if (downOverlay && document.getElementById('terminal-panel')?.style.display !== 'flex') {
            downOverlay.classList.remove('with-queue');
        }
    }
}

function toggleTerminalPanel() {
    const terminalPanel = document.getElementById('terminal-panel');
    const downOverlay = document.getElementById('downloader-overlay');

    if (terminalPanel) {
        if (terminalPanel.style.display === 'none') {
            terminalPanel.style.display = 'flex';
            if (downOverlay) downOverlay.classList.add('with-queue');
        } else {
            closeTerminalPanel();
        }
    }
}

function closeTerminalPanel() {
    const terminalPanel = document.getElementById('terminal-panel');
    const downOverlay = document.getElementById('downloader-overlay');
    if (terminalPanel) {
        terminalPanel.style.display = 'none';
        if (downOverlay && (!document.getElementById('queue-panel') || document.getElementById('queue-panel').style.display === 'none')) {
            downOverlay.classList.remove('with-queue');
        }
    }
}

function showErrorModal(errorText) {
    const overlay = document.getElementById('error-modal-overlay');
    const content = document.getElementById('error-modal-content');
    if (overlay && content) {
        content.textContent = errorText || 'Unknown error occurred.';
        overlay.classList.add('visible');
    }
}

function renderQueueModal() {
    const container = document.getElementById('queue-list-container');
    if (!container || !downloadManager) return;

    const { queue, history } = downloadManager.getAllItems();
    const allItems = [...queue, ...history].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

    if (allItems.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:20px; text-align:center; color:var(--text-muted);">No downloads in current session.</div>';
        return;
    }

    container.innerHTML = '';

    allItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'q-item';
        if (item.status === 'error') {
            div.classList.add('has-error');
            div.style.cursor = 'pointer';
            div.title = 'Click for details';
            div.onclick = () => showErrorModal(item.error);
        }

        let icon = '🎵';
        if (item.type === 'youtube') icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>`;
        else if (item.type === 'spotify') icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>`;

        let statusClass = item.status;
        let pText = tr('statusReady');
        if (item.status === 'processing') pText = tr('statusStarting');
        else if (item.status === 'success') pText = tr('statusSuccess');
        else if (item.status === 'error') pText = tr('statusError');

        const timeStr = item.finishedAt
            ? tr('finishedAt', new Date(item.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
            : new Date(item.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const displayName = item.customName || (item.url.length > 40 ? item.url.substring(0, 37) + '...' : item.url);

        div.innerHTML = `
            <div class="q-item-icon">${icon}</div>
            <div class="q-item-info">
                <div class="q-item-title" title="${item.url}">${displayName}</div>
                <div class="q-item-meta">
                    <span class="q-status ${statusClass}">${pText}</span>
                    <span class="q-time">${timeStr}</span>
                </div>
            </div>
            ${item.status === 'error' ? `<div style="color:var(--clean-danger); font-size:11px; font-weight: bold; margin-left: 10px;">VIEW ERROR</div>` : ''}
        `;
        container.appendChild(div);
    });

    const summary = document.querySelector('.queue-summary');
    if (summary) summary.textContent = `${tr('queueTotal')} ${allItems.length}`;
}

function logToTerminal(msg, type = 'info') {
    const terminal = document.getElementById('terminal-view');
    if (!terminal) return;

    const lines = msg.split(/\r?\n/);

    lines.forEach((line, idx) => {
        if (line.trim() === '' && idx > 0) return;

        const div = document.createElement('div');
        div.className = 'terminal-line';
        if (type === 'error') div.classList.add('log-error');
        else if (type === 'success') div.classList.add('log-success');

        div.textContent = '> ' + line;
        terminal.appendChild(div);
    });

    terminal.scrollTop = terminal.scrollHeight;
}

async function handleDownload() {
    let url = '';
    let name = '';

    if (activeDownloaderMode === 'spotify') {
        url = spotifyUrlInput.value.trim();
    } else if (activeDownloaderMode === 'music') {
        url = musicUrlInput.value.trim();
        name = musicNameInput.value.trim();
    } else {
        url = ytUrlInput.value.trim();
        name = ytNameInput.value.trim();
    }

    if (!url) {
        setDownloaderState('idle', tr('statusUrlMissing'));
        return;
    }

    let parsedUrl;
    try { parsedUrl = new URL(url); } catch (_) { parsedUrl = null; }
    const hostname = parsedUrl ? parsedUrl.hostname.toLowerCase() : '';
    const isYtMusic = hostname === 'music.youtube.com';
    const isYtStandard = (hostname === 'www.youtube.com' || hostname === 'youtube.com' || hostname === 'youtu.be') && !isYtMusic;
    const isSpotify = hostname === 'open.spotify.com' || hostname === 'spotify.com';

    if (!parsedUrl || !['https:', 'http:'].includes(parsedUrl.protocol)) {
        setDownloaderState('error', tr('statusUrlInvalid'));
        return;
    }

    if (activeDownloaderMode === 'youtube' && !isYtStandard) {
        const msg = tr('errorOnlyYtLinks');
        setDownloaderState('error', msg);
        showErrorModal(msg);
        return;
    }
    if (activeDownloaderMode === 'music' && !isYtMusic) {
        const msg = tr('errorOnlyMusicLinks');
        setDownloaderState('error', msg);
        showErrorModal(msg);
        return;
    }
    if (activeDownloaderMode === 'spotify' && !isSpotify) {
        setDownloaderState('error', tr('statusUrlInvalid'));
        return;
    }

    const type = (activeDownloaderMode === 'music') ? 'youtube' : activeDownloaderMode;

    if (type === 'spotify' && url.includes('/playlist/')) {
        setDownloaderState('pending', tr('statusFetchingPlaylist'));
        try {
            const trackUrls = await window.go.main.App.GetSpotifyPlaylistTracks(url);
            const quality = settings.audioQuality || 'best';
            for (const trackUrl of trackUrls) {
                downloadManager.add(trackUrl, 'spotify', '', quality);
            }
            showNotification(`${trackUrls.length} ${tr('playlistTracksQueued')}`, 'success', 2500);
        } catch (e) {
            setDownloaderState('error', e.message || tr('statusUrlInvalid'));
            return;
        }
    } else {
        downloadManager.add(url, type, name, settings.audioQuality || 'best');
    }

    if (activeDownloaderMode === 'youtube') {
        ytUrlInput.value = '';
        ytNameInput.value = '';
    } else if (activeDownloaderMode === 'music') {
        musicUrlInput.value = '';
        musicNameInput.value = '';
    } else {
        spotifyUrlInput.value = '';
    }
}

function setupAudioEvents() {
    audio.addEventListener('timeupdate', () => { if (!isNaN(audio.duration)) { const p = (audio.currentTime / audio.duration) * 100; if (progressFill) progressFill.style.width = `${p}%`; if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime); } });
    audio.addEventListener('durationchange', () => { if (durationEl) durationEl.textContent = isNaN(audio.duration) ? '0:00' : formatTime(audio.duration); });
    audio.addEventListener('play', () => {
        isPlaying = true;
        document.body.classList.add('is-playing');
        updatePlayPauseUI();
        updateUIForCurrentTrack();
        if (visualizer) visualizer.start();
    });
    audio.addEventListener('pause', () => {
        isPlaying = false;
        document.body.classList.remove('is-playing');
        updatePlayPauseUI();
        if (visualizer) visualizer.stop();
    });
    audio.addEventListener('ended', () => {
        if (visualizer) visualizer.stop();
        if (loopMode === 'one') { audio.currentTime = 0; audio.play(); } else playNext();
    });
    audio.addEventListener('error', (e) => { console.error("Audio playback error:", e); showNotification(tr('statusPlaybackError')); isPlaying = false; updatePlayPauseUI(); });
    audio.addEventListener('volumechange', () => { currentVolume = audio.volume; if (volumeSlider) volumeSlider.value = currentVolume; if (volumeIcon) volumeIcon.innerHTML = getVolumeIcon(currentVolume); clearTimeout(window.volumeSaveTimeout); window.volumeSaveTimeout = setTimeout(() => { saveSetting('volume', currentVolume); }, 500); });
}

async function performFolderRefresh() {
    const path = currentFolderPath || settings.currentFolderPath;
    if (!path) return;

    showNotification(tr('refreshFolder'), 'loading', 0);
    const startTime = performance.now();

    const r = await windowApi.refreshMusicFolder(path);
    if (r && r.tracks) {
        const duration = Math.round(performance.now() - startTime);

        currentFolderPath = r.folderPath;
        saveSetting('currentFolderPath', currentFolderPath);
        let allTracks = r.tracks;

        for (const fp of legacyFolders) {
            if (fp === currentFolderPath) continue;
            try {
                const r2 = await windowApi.refreshMusicFolder(fp);
                if (r2 && r2.tracks) allTracks = allTracks.concat(r2.tracks);
            } catch (e2) { console.warn('[Legacy] Refresh failed for:', fp, e2); }
        }

        basePlaylist = allTracks;
        PlaylistManager.importStructure(settings.playlistStructure, basePlaylist);
        playlist = PlaylistManager.getAllTracks();

        sortPlaylist(sortMode);

        if (currentTrackPath) {
            currentIndex = playlist.findIndex(t => t.path === currentTrackPath);
        }

        updateUIForCurrentTrack();
        renderPlaylist();

        showNotification(`${tr('folderRefreshed')} (${duration}ms)`, 'success', 3000);
    }
}

async function loadSettings() {
    const s = await windowApi.getSettings();
    if (s) settings = s;

    if (settings.language) {
        currentLanguage = settings.language;
    } else {
        currentLanguage = 'de';
    }
    document.documentElement.lang = currentLanguage;
    localStorage.setItem('language', currentLanguage);

    if (settings.favorites) {
        favorites = settings.favorites;
        favoritesSet = new Set(favorites.map(p => p.replace(/\\/g, '/')));
    } else {
        favorites = [];
        favoritesSet = new Set();
    }

    currentVolume = settings.volume !== undefined ? settings.volume : 0.2;
    audio.volume = currentVolume;
    if (volumeSlider) volumeSlider.value = currentVolume;
    if (volumeIcon) volumeIcon.innerHTML = getVolumeIcon(currentVolume);

    shuffleOn = settings.shuffle || false;
    loopMode = settings.loop || 'off';
    sortMode = settings.sortMode || 'name';

    if (langButtons) langButtons.forEach(b => b.classList.toggle('active', b.dataset.lang === currentLanguage));

    applyTranslations();

    AppSettings.restoreUIState();

    if (shuffleBtn) shuffleBtn.classList.toggle('mode-btn--active', shuffleOn);
    if (loopBtn) { loopBtn.classList.toggle('mode-btn--active', loopMode !== 'off'); updateLoopIcon(); }

    if (settings.deleteSongsEnabled) deleteSongsEnabled = settings.deleteSongsEnabled;

    if (toggleEnableFocus) toggleEnableFocus.checked = settings.enableFocusMode !== false;
    if (toggleEnableDrag) toggleEnableDrag.checked = settings.enableDragAndDrop !== false;

    const toggleRememberTP = $('#toggle-remember-themepack');
    if (toggleRememberTP) toggleRememberTP.checked = settings.rememberThemePack !== false;

    if (settings.useCustomColor) {
        document.documentElement.style.setProperty('--accent', settings.customAccentColor || '#38bdf8');
    }

    if (settings.gradientTitleEnabled) {
        document.body.classList.add('gradient-title-active');
    }

    if (settings.cinemaMode) {
        document.body.classList.add('cinema-mode');
    }

    if (settings.playlistPosition === 'left') {
        document.body.classList.add('playlist-left');
    }

    if (settings.playlistHidden) {
        document.body.classList.add('playlist-hidden');
    }



    showStatsOverlay = !!settings.showStatsOverlay;
    const statsOverlay = document.getElementById('stats-overlay');
    if (statsOverlay) statsOverlay.classList.toggle('hidden', !showStatsOverlay);

    if (settings.targetFps) targetFps = settings.targetFps;

    if (settings.legacyFolders) {
        try {
            legacyFolders = Array.isArray(settings.legacyFolders)
                ? settings.legacyFolders
                : JSON.parse(settings.legacyFolders);
        } catch (e) { legacyFolders = []; }
    }

    updateAudioEffects();
    updateActiveFeaturesIndicator();

}

let isLibraryLoading = false;

async function loadLibrary() {
    if (!settings.currentFolderPath || settings.autoLoadLastFolder === false) return;
    isLibraryLoading = true;
    currentFolderPath = settings.currentFolderPath;
    try {
        const result = await windowApi.refreshMusicFolder(currentFolderPath);
        if (result && result.folderPath) {
            let allTracks = result.tracks || [];

            // Load additional legacyFolders
            for (const fp of legacyFolders) {
                if (fp === currentFolderPath) continue;
                try {
                    const r2 = await windowApi.refreshMusicFolder(fp);
                    if (r2 && r2.tracks) allTracks = allTracks.concat(r2.tracks);
                } catch (e2) { console.warn('[Legacy] Failed to load folder:', fp, e2); }
            }

            basePlaylist = allTracks;
            PlaylistManager.importStructure(settings.playlistStructure, basePlaylist);
            playlist = PlaylistManager.getAllTracks();
            sortPlaylist(sortMode);
            updateUIForCurrentTrack();
        }
    } catch (e) {
        console.error("Auto-load failed:", e);
    } finally {
        isLibraryLoading = false;
        renderPlaylist();
    }
}

function renderLegacyFolderList() {
    const container = document.getElementById('legacy-folder-list');
    if (!container) return;
    container.innerHTML = '';
    if (legacyFolders.length === 0) return;
    legacyFolders.forEach(fp => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;background:rgba(255,255,255,0.05);border-radius:8px;font-size:13px;';
        const label = document.createElement('span');
        label.textContent = fp;
        label.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-secondary,#aaa);';
        label.title = fp;
        const btn = document.createElement('button');
        btn.textContent = '✕';
        btn.style.cssText = 'background:none;border:none;color:#f87171;cursor:pointer;font-size:14px;flex-shrink:0;';
        btn.addEventListener('click', () => removeLegacyFolder(fp));
        row.appendChild(label);
        row.appendChild(btn);
        container.appendChild(row);
    });
}

async function removeLegacyFolder(fp) {
    legacyFolders = legacyFolders.filter(f => f !== fp);
    saveSetting('legacyFolders', legacyFolders);
    renderLegacyFolderList();
    // Reload library without this folder
    const allTracks = [];
    try {
        if (currentFolderPath) {
            const r = await windowApi.refreshMusicFolder(currentFolderPath);
            if (r && r.tracks) allTracks.push(...r.tracks);
        }
    } catch (e) { /* ignore */ }
    for (const f of legacyFolders) {
        try {
            const r2 = await windowApi.refreshMusicFolder(f);
            if (r2 && r2.tracks) allTracks.push(...r2.tracks);
        } catch (e2) { /* ignore */ }
    }
    basePlaylist = allTracks;
    PlaylistManager.importStructure(settings.playlistStructure, basePlaylist);
    playlist = PlaylistManager.getAllTracks();
    sortPlaylist(sortMode);
    currentIndex = currentTrackPath ? playlist.findIndex(t => t.path === currentTrackPath) : -1;
    updateUIForCurrentTrack();
    renderPlaylist();
    savePlaylistState();
}

function updateLoopIcon() {
    if (!loopBtn) return;
    if (loopMode === 'one') loopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="12" y="17" font-size="10" font-weight="bold" fill="currentColor" stroke="none" text-anchor="middle">1</text></svg>`;
    else loopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
}

function applyAnimationSetting(mode) {
    BackgroundAnimListener.setAnimation(mode);
}

function formatTime(s) { if (isNaN(s)) return '0:00'; const m = Math.floor(s / 60), sc = Math.floor(s % 60).toString().padStart(2, '0'); return `${m}:${sc}`; }

function updateDebugSize() {
    const sizeEl = document.getElementById('stat-size');
    const debugItem = document.getElementById('debug-size-item');
    if (sizeEl && debugItem && !debugItem.classList.contains('hidden')) {
        sizeEl.textContent = `${window.innerWidth} x ${window.innerHeight}`;
    }
}

function getVolumeIcon(v) {
    if (v === 0) return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
    if (v < 0.5) return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
}

function cleanTitleDisplay(title) {
    if (!title) return "";

    return title.replace(/\.(mp3|wav|flac|ogg|m4a|aac|wma|alac|dsd|pcm)(\s*\(\d+\))?$/gi, '').trim();
}

async function toggleFavorite(path) {
    const index = favorites.indexOf(path);
    const normalizedPath = path.replace(/\\/g, '/');

    if (index === -1) {
        favorites.push(path);
        favoritesSet.add(normalizedPath);
    } else {
        favorites.splice(index, 1);
        favoritesSet.delete(normalizedPath);
    }

    await windowApi.setSetting('favorites', favorites);


    basePlaylist.forEach(track => {
        if (track.path === path) {
            track.isFavorite = (index === -1);
        }
    });

    const currentScroll = playlistEl ? playlistEl.scrollTop : 0;

    renderPlaylist();
    updateUIForCurrentTrack();

    if (playlistEl) {
        requestAnimationFrame(() => {
            playlistEl.scrollTop = currentScroll;
        });
    }
}

function sortPlaylist(m) {
    PlaylistManager.sortItems(m);
    renderPlaylist();
}

function showContextMenu(e, idx) {
    contextTrackIndex = idx;
    if (!contextMenu) return;
    if (contextMenuFavorite && playlist[idx]) {
        const isFav = favorites.includes(playlist[idx].path);
        contextMenuFavorite.textContent = isFav ? tr('removeFromFavorites') : tr('addToFavorites');
    }

    const deleteBtn = document.getElementById('cm-delete');
    if (deleteBtn) deleteBtn.style.display = deleteSongsEnabled ? 'flex' : 'none';

    const moveToGroupBtn = document.getElementById('cm-move-to-group');
    if (moveToGroupBtn) moveToGroupBtn.style.display = PlaylistManager.getFolderCount() > 0 ? 'flex' : 'none';

    contextMenu.style.display = 'block';
    const menuHeight = contextMenu.offsetHeight;
    const windowHeight = window.innerHeight;
    let top = e.clientY;
    if (top + menuHeight > windowHeight) {
        top = Math.max(0, top - menuHeight);
    }

    contextMenu.style.top = `${top}px`;
    contextMenu.style.left = `${e.clientX}px`;

    const hcm = () => { contextMenu.style.display = 'none'; window.removeEventListener('click', hcm); };
    window.addEventListener('click', hcm);
}

function setupEventListeners() {

    initUIHelpers();

    const bind = (el, ev, h) => { if (el && typeof el.addEventListener === 'function') el.addEventListener(ev, h); };
    bind(playBtn, 'click', () => { if (playlist.length === 0) return; if (isPlaying) audio.pause(); else (currentIndex === -1) ? playTrack(0) : audio.play(); });
    bind(nextBtn, 'click', playNext); bind(prevBtn, 'click', playPrev);
    bind(shuffleBtn, 'click', () => {
        shuffleOn = !shuffleOn;
        shuffleBtn.classList.toggle('mode-btn--active', shuffleOn);
        saveSetting('shuffle', shuffleOn);
        showNotification(tr('shuffle') + ': ' + (shuffleOn ? 'ON' : 'OFF'), 'info', 1500);
    });
    bind(loopBtn, 'click', () => {
        loopMode = (loopMode === 'off' ? 'all' : (loopMode === 'all' ? 'one' : 'off'));
        loopBtn.classList.toggle('mode-btn--active', loopMode !== 'off');
        updateLoopIcon();
        saveSetting('loop', loopMode);
        showNotification(tr('loop') + ': ' + loopMode.toUpperCase(), 'info', 1500);
    });
    bind($('#lyrics-btn'), 'click', () => {
        if (currentTrackPath) {
            LyricsManager.fetchAndShow(currentTrackPath);
        } else {
            showNotification(tr('noTrackSelected'));
        }
    });
    bind(progressBar, 'click', (e) => { if (!isNaN(audio.duration)) { const r = progressBar.getBoundingClientRect(); audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration; } });
    bind(volumeSlider, 'input', (e) => { audio.volume = parseFloat(e.target.value); });
    bind(openLibraryBtn, 'click', () => { libraryOverlay.classList.add('visible'); });
    bind(libraryCloseBtn, 'click', () => { libraryOverlay.classList.remove('visible'); });
    bind(loadFolderBtn, 'click', async () => {
        const r = await windowApi.selectMusicFolder();
        if (r && r.folderPath) {
            currentFolderPath = r.folderPath;
            saveSetting('currentFolderPath', currentFolderPath);
            // Reset legacyFolders when selecting a brand new primary folder
            legacyFolders = [];
            saveSetting('legacyFolders', legacyFolders);
            renderLegacyFolderList();

            basePlaylist = r.tracks || [];
            PlaylistManager.importStructure(settings.playlistStructure, basePlaylist);
            playlist = PlaylistManager.getAllTracks();

            currentIndex = currentTrackPath ? playlist.findIndex(t => t.path === currentTrackPath) : -1;
            renderPlaylist();
            updateUIForCurrentTrack();
            savePlaylistState();

            libraryOverlay.classList.remove('visible');
        }
    });

    bind($('#add-folder-lib-btn'), 'click', async () => {
        const r = await windowApi.selectMusicFolder();
        if (!r || !r.folderPath) return;
        if (r.folderPath === currentFolderPath || legacyFolders.includes(r.folderPath)) return;
        legacyFolders.push(r.folderPath);
        saveSetting('legacyFolders', legacyFolders);
        renderLegacyFolderList();
        PlaylistManager.appendTracks(r.tracks || []);
        basePlaylist = PlaylistManager.getAllTracks();
        playlist = [...basePlaylist];
        sortPlaylist(sortMode);
        currentIndex = currentTrackPath ? playlist.findIndex(t => t.path === currentTrackPath) : -1;
        renderPlaylist();
        updateUIForCurrentTrack();
        savePlaylistState();
    });

    let st; bind(searchInput, 'input', (e) => { clearTimeout(st); st = setTimeout(() => { renderPlaylist(); }, 250); });

    window.addEventListener('keydown', (e) => {
        if (!e.key) return;
        const key = e.key.toLowerCase();
        pressedKeys.add(key);
        const isCtrl = pressedKeys.has('control');
        const isOne = pressedKeys.has('1');

        if (isCtrl && key === 'f') {
            e.preventDefault();
            const search = document.querySelector('.playlist-search-input');
            if (search) {
                search.focus();
                search.select();
            }
            return;
        }

        if (isCtrl && isOne && pressedKeys.has('x')) { triggerPerformanceHint(true); return; }
        if (isCtrl && isOne && pressedKeys.has('h')) {
            const debugEl = document.getElementById('debug-size-item');
            const statsOverlay = document.getElementById('stats-overlay');
            if (debugEl && statsOverlay) {
                const isHidden = debugEl.classList.contains('hidden');
                debugEl.classList.toggle('hidden', !isHidden);
                if (isHidden) { statsOverlay.classList.remove('hidden'); updateDebugSize(); }
                else { if (!showStatsOverlay) statsOverlay.classList.add('hidden'); }
            }
            return;
        }
        if (isCtrl && isOne && pressedKeys.size === 2) {
            const devModal = document.getElementById('dev-modal-overlay');
            if (devModal && !devModal.classList.contains('visible')) devModal.classList.add('visible');
            return;
        }

        if (e.target.closest('input, textarea')) return;
        switch (e.code) {
            case 'Space': e.preventDefault(); if (isPlaying) audio.pause(); else audio.play(); break;
            case 'ArrowRight': if (e.shiftKey) audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); else playNext(); break;
            case 'ArrowLeft': if (e.shiftKey) audio.currentTime = Math.max(0, audio.currentTime - 5); else playPrev(); break;
            case 'ArrowUp': e.preventDefault(); audio.volume = Math.min(1, audio.volume + 0.05); break;
            case 'ArrowDown': e.preventDefault(); audio.volume = Math.max(0, audio.volume - 0.05); break;
            case 'MediaPlayPause':
            case 'MediaPlay':
            case 'MediaPause':
                e.preventDefault(); if (isPlaying) audio.pause(); else audio.play(); break;
            case 'MediaTrackNext': e.preventDefault(); playNext(); break;
            case 'MediaTrackPrevious': e.preventDefault(); playPrev(); break;
            case 'MediaStop': e.preventDefault(); audio.pause(); audio.currentTime = 0; break;
        }
    });

    window.addEventListener('keyup', (e) => { if (e.key) pressedKeys.delete(e.key.toLowerCase()); });
    window.addEventListener('blur', () => { pressedKeys.clear(); });

    bind(toggleMiniMode, 'change', (e) => {
        const isMini = e.target.checked;
        saveSetting('miniMode', isMini);
        if (miniPlayer) {
            if (isMini) miniPlayer.enable();
            else miniPlayer.disable();
        }
        const currentAnim = (animationSelect) ? animationSelect.value : (settings.animationMode || 'off');
        if (currentAnim === 'xmas') applyAnimationSetting('xmas');
        setTimeout(updateTrackTitleScroll, 300);
    });
    bind(downloadBtn, 'click', handleDownload);
    if (langButtons) langButtons.forEach(btn => {
        bind(btn, 'click', () => {
            currentLanguage = btn.dataset.lang;
            document.documentElement.lang = currentLanguage;
            langButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyTranslations();
            saveSetting('language', currentLanguage);
        });
    });

    if (window.runtime) {
        window.runtime.EventsOn("media-key", (key) => {
            if (key === 'playpause') {
                if (isPlaying) audio.pause(); else audio.play();
            } else if (key === 'next') {
                playNext();
            } else if (key === 'prev') {
                playPrev();
            } else if (key === 'stop') {
                audio.pause();
                audio.currentTime = 0;
            } else if (key === 'play') {
                audio.play();
            } else if (key === 'pause') {
                audio.pause();
            }
        });

        window.runtime.EventsOn("download-terminal-log", (data) => {
            logToTerminal(data, 'info');
        });

        window.runtime.EventsOn("download-title-update", (data) => {
            if (downloadManager && data.title && data.id) {
                const items = downloadManager.getAllItems();
                const task = [...items.queue, ...items.history].find(t => t.id === data.id);
                if (task && !task.customName) {
                    task.customName = data.title;
                    if (isQueueModalOpen) renderQueueModal();
                }
            }
        });
    }

    bind(sortSelect, 'change', (e) => { sortMode = e.target.value; saveSetting('sortMode', sortMode); sortPlaylist(sortMode); });

    bind(toggleFocusModeBtn, 'click', () => {
        document.body.classList.toggle('focus-active');
        if (document.body.classList.contains('focus-active')) showNotification(tr('focusActiveNotify'));
    });

    bind(toggleEnableFocus, 'change', (e) => { saveSetting('enableFocusMode', e.target.checked); if (toggleFocusModeBtn) toggleFocusModeBtn.style.display = e.target.checked ? 'flex' : 'none'; });
    bind(toggleEnableDrag, 'change', (e) => { saveSetting('enableDragAndDrop', e.target.checked); });

    bind(playlistEl, 'click', (e) => {
        const fb = e.target.closest('.fav-track-btn');
        if (fb) { e.stopPropagation(); toggleFavorite(fb.dataset.path); return; }
        const row = e.target.closest('.track-row');
        if (row && !row.classList.contains('is-folder')) playTrack(parseInt(row.dataset.index, 10));
    });
    bind(playlistEl, 'contextmenu', (e) => {
        const r = e.target.closest('.track-row');
        if (r) {
            e.preventDefault();
            if (r.classList.contains('is-folder')) {
                showFolderContextMenu(e, r.dataset.id);
            } else {
                showContextMenu(e, parseInt(r.dataset.index, 10));
            }
        }
    });

    //--- Drag & Drop Reorder ---------------
    playlistEl.addEventListener('dragstart', e => {
        const row = e.target.closest('.track-row');
        if(!row || !row.dataset.itemId) return;
        legacyDragId = row.dataset.itemId;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    playlistEl.addEventListener('dragend', () => {
        legacyDragId = null;
        playlistEl.querySelectorAll('.drag-over, .dragging').forEach(el => el.classList.remove('drag-over', 'dragging'));
    });
    playlistEl.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const row = e.target.closest('.track-row');
        if(!row || !row.dataset.itemId || row.dataset.itemId === legacyDragId) return;
        playlistEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        row.classList.add('drag-over');
    });
    playlistEl.addEventListener('dragleave', e => {
        if(!playlistEl.contains(e.relatedTarget)) {
            playlistEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        }
    });
    playlistEl.addEventListener('drop', e => {
        e.preventDefault();
        const row = e.target.closest('.track-row');
        if(!row || !row.dataset.itemId || !legacyDragId || row.dataset.itemId === legacyDragId) return;
        const fromIdx = PlaylistManager.items.findIndex(i => i.id === legacyDragId);
        const toIdx = PlaylistManager.items.findIndex(i => i.id === row.dataset.itemId);
        if(fromIdx === -1 || toIdx === -1) return;
        PlaylistManager.moveItem(fromIdx, toIdx);
        savePlaylistState();
        renderPlaylist();
    });

    //--- External File Drop via Wails OnFileDrop ---------------
    if(window.runtime && window.runtime.OnFileDrop) {
        window.runtime.OnFileDrop(async (x, y, paths) => {
            if(!paths || paths.length === 0) return;
            const filePath = paths[0];
            const sep = filePath.includes('\\') ? '\\' : '/';
            const folderPath = filePath.substring(0, filePath.lastIndexOf(sep));
            if(!folderPath) return;
            const r = await windowApi.refreshMusicFolder(folderPath);
            if(r && r.folderPath) {
                if(!legacyFolders.includes(r.folderPath)) {
                    legacyFolders.push(r.folderPath);
                    saveSetting('legacyFolders', legacyFolders);
                    renderLegacyFolderList();
                }
                PlaylistManager.appendTracks(r.tracks || []);
                basePlaylist = PlaylistManager.getAllTracks();
                playlist = [...basePlaylist];
                currentIndex = currentTrackPath ? playlist.findIndex(t => t.path === currentTrackPath) : -1;
                renderPlaylist();
                savePlaylistState();
            }
        }, false);
    }

    //--- Context Menu Bindings ---------------
    bind($('#cm-play'), 'click', () => {
        if (contextTrackIndex !== null && playlist[contextTrackIndex]) playTrack(contextTrackIndex);
    });

    bind($('#cm-edit'), 'click', () => {
        if (contextTrackIndex === null || !playlist[contextTrackIndex]) return;
        const t = playlist[contextTrackIndex];
        if (editTitleInput) editTitleInput.value = t.title;
        if (editArtistInput) editArtistInput.value = t.artist || '';

        const img = document.getElementById('edit-cover-img');
        if (img) {
            let rawPath = t.path.replace(/\\/g, '/');
            let safeUrlPath = encodeURI(rawPath).replace(/#/g, '%23').replace(/\?/g, '%3F');
            img.src = '/cover/' + safeUrlPath + '?t=' + Date.now();
        }
        selectedCoverPath = null;

        if (editTitleOverlay) editTitleOverlay.classList.add('visible');
    });

    bind($('#cm-fav'), 'click', () => {
        if (contextTrackIndex !== null && playlist[contextTrackIndex]) toggleFavorite(playlist[contextTrackIndex].path);
    });

    bind($('#cm-folder'), 'click', () => {
        if (contextTrackIndex !== null && playlist[contextTrackIndex]) windowApi.showInFolder(playlist[contextTrackIndex].path);
    });

    bind($('#cm-move-to-group'), 'click', () => {
        if (contextTrackIndex !== null && playlist[contextTrackIndex]) {
            contextMenu.style.display = 'none';
            openMoveToGroupModal(playlist[contextTrackIndex].path);
        }
    });

    bind($('#move-to-group-close-btn'), 'click', () => {
        const overlay = document.getElementById('move-to-group-overlay');
        if (overlay) overlay.classList.remove('visible');
    });

    bind($('#cm-delete'), 'click', () => {
        if (contextTrackIndex !== null && playlist[contextTrackIndex]) {
            showDeleteConfirmation('track', playlist[contextTrackIndex].path);
        }
    });

    bind(toggleDownloaderBtn, 'click', () => {
        downloaderOverlay.classList.add('visible');
    });

    const toggleLegendBtn = document.getElementById('toggle-legend-btn');
    bind(toggleLegendBtn, 'click', () => {
        const legend = document.getElementById('clean-legend');
        if (legend) legend.classList.toggle('collapsed');
    });

    const toggleTerminalBtn = document.getElementById('toggle-terminal-btn');
    bind(toggleTerminalBtn, 'click', () => {
        const term = document.getElementById('terminal-view');
        if (term) term.classList.toggle('visible');
    });

    const infoBtn = document.getElementById('project-info-btn');
    const infoOverlay = document.getElementById('project-info-overlay');
    const infoCloseBtn = document.getElementById('project-info-close-btn');

    bind(infoBtn, 'click', () => infoOverlay.classList.add('visible'));
    bind(infoCloseBtn, 'click', () => infoOverlay.classList.remove('visible'));
    bind(infoOverlay, 'click', (e) => { if (e.target === infoOverlay) infoOverlay.classList.remove('visible'); });

    function resetDownloaderUI() {
        if (ytUrlInput) ytUrlInput.value = '';
        if (ytNameInput) ytNameInput.value = '';
        if (downloadStatusEl) downloadStatusEl.textContent = tr('statusReady');
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.style.opacity = '1';
        }
    }


    bind(toggleFavoritesBtn, 'click', () => {
        isFavoritesFilterActive = !isFavoritesFilterActive;
        toggleFavoritesBtn.classList.toggle('active', isFavoritesFilterActive);
        toggleFavoritesBtn.style.color = isFavoritesFilterActive ? 'var(--accent)' : 'var(--text-main)';
        renderPlaylist();
    });

    bind($('#toggle-remember-themepack'), 'change', (e) => {
        saveSetting('rememberThemePack', e.target.checked);
    });

    bind($('#add-folder-btn'), 'click', () => openFolderModal('create'));
    bind($('#folder-cancel-btn'), 'click', () => folderModal.classList.remove('visible'));
    bind($('#folder-modal-close-btn'), 'click', () => folderModal.classList.remove('visible'));

    bind($('#folder-save-btn'), 'click', () => {
        const name = folderInput.value.trim();
        if (!name) return;

        if (activeFolderId) {
            PlaylistManager.renameFolder(activeFolderId, name, selectedFolderColor);
        } else {
            PlaylistManager.addFolder(name, selectedFolderColor);
        }
        savePlaylistState();
        renderPlaylist();
        folderModal.classList.remove('visible');
    });

    bind($('#cm-folder-rename'), 'click', () => openFolderModal('rename', contextFolderId));
    bind($('#cm-folder-delete'), 'click', () => showDeleteConfirmation('folder', contextFolderId));

    bind(confirmDeleteCancelBtn, 'click', () => {
        if (deleteInterval) { clearInterval(deleteInterval); deleteInterval = null; }
        confirmDeleteOverlay.classList.remove('visible');
        trackToDeletePath = null;
    });
    bind(confirmDeleteCloseBtn, 'click', () => {
        if (deleteInterval) { clearInterval(deleteInterval); deleteInterval = null; }
        confirmDeleteOverlay.classList.remove('visible');
        trackToDeletePath = null;
    });

    bind(confirmDeleteBtn, 'click', async () => {
        if (deleteMode === 'folder') {
            if (contextFolderId) {
                PlaylistManager.deleteFolder(contextFolderId);
                savePlaylistState();
                renderPlaylist();
                showNotification(tr('folderDeleted'));
            }
            confirmDeleteOverlay.classList.remove('visible');
            return;
        }

        if (!trackToDeletePath) return;

        confirmDeleteBtn.disabled = true;

        const ctp = (currentIndex !== -1 && playlist[currentIndex]) ? playlist[currentIndex].path : null;

        if (trackToDeletePath === ctp) {
            audio.pause();
            audio.src = '';
            audio.load();
            currentIndex = -1;
            updatePlayPauseUI();
        }

        const r = await windowApi.deleteTrack(trackToDeletePath);

        confirmDeleteBtn.disabled = false;

        if (r.success) {
            basePlaylist = basePlaylist.filter(x => x.path !== trackToDeletePath);
            PlaylistManager.items = PlaylistManager.items.filter(i => !(i.type === 'track' && i.id === trackToDeletePath));
            playlist = PlaylistManager.getAllTracks();

            const favIdx = favorites.indexOf(trackToDeletePath);
            if (favIdx !== -1) {
                favorites.splice(favIdx, 1);
                windowApi.setSetting('favorites', favorites);
            }

            if (ctp && trackToDeletePath !== ctp) {
                currentIndex = playlist.findIndex(x => x.path === ctp);
            }

            renderPlaylist();
            updateUIForCurrentTrack();
            confirmDeleteOverlay.classList.remove('visible');
            trackToDeletePath = null;
            showNotification(tr('songDeleted'), 'success');
        } else {
            showNotification(tr('statusError') + ': ' + (r.error || 'Unknown error'), 'error');
        }
    });

    bind(downloaderCloseBtn, 'click', () => {
        downloaderOverlay.classList.remove('visible');
        const errorOverlay = document.getElementById('error-modal-overlay');
        if (errorOverlay) errorOverlay.classList.remove('visible');
    });
    bind(editTitleCancelBtn, 'click', () => { editTitleOverlay.classList.remove('visible'); });
    bind(editTitleCloseBtn, 'click', () => { editTitleOverlay.classList.remove('visible'); });
    bind($('#change-cover-btn'), 'click', async () => {
        const path = await windowApi.selectImage();
        if (path) {
            selectedCoverPath = path;
            const base64Data = await windowApi.getImageBase64(path);
            const img = document.getElementById('edit-cover-img');
            if (img && base64Data) img.src = base64Data;
        }
    });

    bind(editTitleSaveBtn, 'click', async () => {
        if (contextTrackIndex === null || !playlist[contextTrackIndex]) return;
        const t = playlist[contextTrackIndex];
        const nt = editTitleInput.value.trim();
        const na = editArtistInput.value.trim();
        if (!nt) return;

        const isCurrent = (currentTrackPath === t.path);
        const wasPlaying = isPlaying;

        if (isCurrent) {
            audio.pause();
            audio.src = '';
            audio.load();
        }

        if (selectedCoverPath) {
            const res = await windowApi.setCoverArt(t.path, selectedCoverPath);
            if (!res.success) {
                if (isCurrent && wasPlaying) playTrack(currentIndex);
                showNotification('Cover Error: ' + res.error, 'error');
                return;
            }
        }

        const r = await windowApi.updateMetadata(t.path, nt, na);
        if (r.success) {
            t.title = nt;
            t.artist = na;

            const mgrItem = PlaylistManager.items.find(i => i.type === 'track' && i.id === t.path);
            if (mgrItem) {
                mgrItem.data.title = nt;
                mgrItem.data.artist = na;
                mgrItem.searchString = (nt + ' ' + na).toLowerCase();
            }

            renderPlaylist();

            if (isCurrent) {
                setTimeout(() => {
                    playTrack(currentIndex);
                    if (!wasPlaying) audio.pause();
                }, 200);
            } else {
                updateUIForCurrentTrack();
            }

            editTitleOverlay.classList.remove('visible');
            showNotification(selectedCoverPath ? tr('coverUpdated') : tr('titleUpdated'));
        }
    });
    let resTimeout; new ResizeObserver(() => { if (visualizerCanvas && visualizerContainer) { visualizerCanvas.width = visualizerContainer.clientWidth; visualizerCanvas.height = visualizerContainer.clientHeight; } }).observe(visualizerContainer);
    window.addEventListener('resize', () => {
        clearTimeout(resTimeout);
        resTimeout = setTimeout(() => {
            updateTrackTitleScroll();
            updateDebugSize();
        }, 100);
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            if (audioExtras) audioExtras.resume();
            if (isPlaying && visualizer) visualizer.start();
        }
    });
}

function initSettingsLogic() {
    const callbacks = {
        onThemeChange: (val) => {
            saveSetting('theme', val);
            showNotification(tr('theme') + ': ' + val.toUpperCase(), 'info', 2000);
            setTimeout(updateCachedColor, 100);
        },
        onAccentColorChange: (val) => {
            updateCachedColor();
            showNotification(tr('customColor') + ': ' + val, 'info', 1500);
        },
        onVisualizerToggle: (enabled) => {
            visualizerEnabled = enabled;
            if (visualizer) {
                visualizer.updateSettings({ enabled: enabled });
                if (enabled) visualizer.start(); else visualizer.stop();
            }
            showNotification(tr('visualizer') + ': ' + (enabled ? 'ON' : 'OFF'), 'info', 1500);
        },
        onVisualizerStyleChange: (val) => {
            if (visualizer) visualizer.updateSettings({ style: val });
            showNotification(tr('visualizerStyle') + ': ' + val.toUpperCase(), 'info', 1500);
        },
        onVisualizerSensitivityChange: (val) => {
            if (visualizer) visualizer.updateSettings({ sensitivity: val });
        },
        onVisualizerBarsChange: (val) => {
            if (visualizer) visualizer.updateSettings({ maxBars: val });
        },
        onEmojiChange: (mode, customVal) => {
            updateEmoji(mode, customVal);
            if (!window._isRestoring) showNotification(tr('coverEmoji') + ': ' + mode.toUpperCase(), 'info', 1500);
        },
        onSleepTimerChange: (mins) => {
            if (sleepTimerId) { clearTimeout(sleepTimerId); sleepTimerId = null; }
            if (mins > 0) {
                sleepTimerId = setTimeout(() => {
                    audio.pause(); isPlaying = false; updatePlayPauseUI();
                    showNotification(tr('sleepTimerStopped'));
                    sleepTimerId = null;
                }, mins * 60000);
                showNotification(tr('sleepTimerNotify', mins), 'info', 4000);
            } else {
                showNotification(tr('sleepTimer') + ': OFF', 'info', 1500);
            }
        },
        onSpeedChange: (val) => {
            audio.defaultPlaybackRate = val;
            audio.playbackRate = val;
            showNotification(tr('playbackSpeed') + ': ' + val + 'x', 'info', 1500);
        },
        onDeleteSongsToggle: (enabled) => {
            deleteSongsEnabled = enabled;
            renderPlaylist();
            showNotification(tr('enableDeleteSongs') + ': ' + (enabled ? 'ON' : 'OFF'), enabled ? 'success' : 'info', 2000);
        },
        onRefreshFolder: () => performFolderRefresh(),
        onAudioEffectChange: (type, enabled, val) => {
            updateAudioEffects();
            if (type) {
                const label = tr(type) || type;
                const status = enabled ? 'ON' : 'OFF';
                const valStr = val !== undefined ? ` (${val})` : '';
                showNotification(`${label}: ${status}${valStr}`, 'info', 1500);
            }
        },
        onPerformanceModeChange: (enabled) => {
            AppPerformance.setPerformanceMode(enabled);
            showNotification(tr('perfModeLabel') + ': ' + (enabled ? 'ON' : 'OFF'), enabled ? 'success' : 'info', 2500);
        },
        onStatsToggle: (enabled) => {
            AppPerformance.setShowStats(enabled);
            showNotification(tr('showStatsLabel') + ': ' + (enabled ? 'ON' : 'OFF'), 'info', 1500);
        },
        onFavoritesOptionToggle: (enabled) => {
            if (toggleFavoritesBtn) toggleFavoritesBtn.style.display = enabled ? 'flex' : 'none';
            if (!enabled && isFavoritesFilterActive) {
                isFavoritesFilterActive = false;
                if (toggleFavoritesBtn) toggleFavoritesBtn.classList.remove('active');
                renderPlaylist();
            }
            showNotification(tr('enableFavoritesOption') + ': ' + (enabled ? 'ON' : 'OFF'), 'info', 1500);
        },
        onFpsChange: (val) => {
            AppPerformance.setTargetFps(val);
            saveSetting('targetFps', val);
            showNotification(tr('fpsLimitLabel') + ': ' + val, 'info', 1500);
        },
        onExportPlaylist: () => {
            if (!playlist || playlist.length === 0) { showNotification(tr('emptyPlaylist')); return; }
            const content = playlist.map((t, i) => `${i + 1}. ${t.artist || 'Unknown'} - ${t.title}`).join('\n');
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'playlist_export.txt';
            a.click();
            URL.revokeObjectURL(url);
            showNotification(tr('exportSuccess'), 'success', 2000);
        },
        onResetApp: async () => {
            if (confirm(tr('resetWarning'))) {
                try {
                    const res = await windowApi.resetConfig();
                    if (res.success) {
                        localStorage.clear();
                        showNotification("Reset complete. Restarting...", "success");
                        setTimeout(() => windowApi.restartApp(), 1500);
                    } else {
                        showNotification("Reset failed: " + res.error, "error");
                    }
                } catch (e) {
                    console.error("Reset error:", e);
                }
            }
        },
        onRestartApp: () => {
            windowApi.restartApp();
        },
        onShutdownApp: () => {
            AppShutdown.shutdown();
        },
        onAnimationChange: (val) => {
            applyAnimationSetting(val);
            if (!window._isRestoring) showNotification(tr('backgroundAnimation') + ': ' + val.toUpperCase(), 'info', 2000);
        }
    };

    AppSettings.init(windowApi, settings, callbacks);
}

function makeDraggable(modal, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if (e.button !== 0) return;
        if (e.target.closest('input, button, select')) return;

        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        if (modal.style.position !== 'absolute') {
            const rect = modal.getBoundingClientRect();
            modal.style.position = 'absolute';
            modal.style.top = rect.top + "px";
            modal.style.left = rect.left + "px";
            modal.style.transform = 'none';
            modal.style.margin = '0';
        }
        modal.classList.add('is-dragging');
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        modal.style.top = (modal.offsetTop - pos2) + "px";
        modal.style.left = (modal.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        modal.classList.remove('is-dragging');
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

async function loadAppMeta() {
    try {
        const meta = await windowApi.getAppMeta();
        if (meta) {
            const mAuth = document.getElementById('meta-author');
            const mVer = document.getElementById('meta-version');
            const mGo = document.getElementById('meta-go-version');
            const mDate = document.getElementById('meta-date');
            const mGit = document.getElementById('meta-github');
            const mRepo = document.getElementById('meta-repo');

            if (mAuth) mAuth.textContent = meta.author;
            if (mVer) mVer.textContent = meta.version;
            if (mGo) mGo.textContent = meta.goVersion;
            if (mDate) mDate.textContent = meta.buildDate;
            if (mGit) {
                mGit.textContent = meta.githubUser;
                mGit.href = `https://github.com/${meta.githubUser}`;
            }
            if (mRepo) mRepo.href = meta.repoLink;
        }
    } catch (e) {
        console.error("Meta load failed", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    miniPlayer = new MiniPlayer(windowApi, null, updateUIForCurrentTrack);

    $ = (s) => document.querySelector(s);
    trackTitleEl = $('#track-title-large'); trackArtistEl = $('#track-artist-large'); musicEmojiEl = $('#music-emoji');
    currentTimeEl = $('#current-time'); durationEl = $('#duration'); progressBar = $('.progress-bar'); progressFill = $('.progress-fill');
    playBtn = $('#play-btn'); playIcon = $('#play-icon'); pauseIcon = $('#pause-icon'); prevBtn = $('#prev-btn'); nextBtn = $('#next-btn');
    loopBtn = $('#loop-btn'); shuffleBtn = $('#shuffle-btn'); volumeSlider = $('.volume-slider'); volumeIcon = $('.volume-icon');
    playlistEl = $('.playlist-scroll-area'); playlistInfoBar = $('.playlist-info-bar'); openLibraryBtn = $('#open-library-btn');
    libraryOverlay = $('#library-overlay'); libraryCloseBtn = $('#library-close-btn'); loadFolderBtn = $('#load-folder-btn');
    refreshFolderBtn = $('#refresh-folder-btn');
    playlistRefreshBtn = $('#playlist-refresh-btn');
    searchInput = $('.playlist-search-input');
    sortSelect = $('#sort-select');
    ytUrlInput = $('#yt-url-input'); ytNameInput = $('#yt-name-input'); downloadBtn = $('#download-btn');
    musicUrlInput = $('#music-url-input'); musicNameInput = $('#music-name-input');
    spotifyUrlInput = $('#spotify-url-input');
    tabYtBtn = $('#tab-yt-btn'); tabMusicBtn = $('#tab-music-btn'); tabSpotifyBtn = $('#tab-spotify-btn');
    viewYt = $('#view-youtube'); viewMusic = $('#view-music'); viewSpotify = $('#view-spotify');

    downloaderOverlay = $('#downloader-overlay'); downloaderCloseBtn = $('#downloader-close-btn'); downloadStatusEl = $('#info-status-text');
    downloadProgressFill = $('.yt-progress-fill'); visualizerCanvas = $('#visualizer-canvas'); visualizerContainer = $('.visualizer-container');
    const langSelect = $('#lang-select');
    if (langSelect) {
        langSelect.value = currentLanguage;
        langSelect.addEventListener('change', (e) => {
            const newLang = e.target.value;
            LangHandler.setLanguage(newLang);
            currentLanguage = newLang;
            windowApi.setSetting('language', newLang);
            applyTranslations();
        });
    }
    settingsBtn = $('#settings-btn'); settingsOverlay = $('#settings-overlay');
    settingsCloseBtn = $('#settings-close-btn'); downloadFolderInput = $('#default-download-folder'); changeFolderBtn = $('#change-download-folder-btn');
    qualitySelect = $('#audio-quality-select'); themeSelect = $('#theme-select'); visualizerToggle = $('#toggle-visualizer');
    visualizerStyleSelect = $('#visualizer-style-select'); visualizerSensitivity = $('#visualizer-sensitivity');
    sleepTimerSelect = $('#sleep-timer-select'); animationSelect = $('#animation-select'); backgroundAnimationEl = $('.background-animation'); emojiSelect = $('#emoji-select');
    customEmojiContainer = $('#custom-emoji-container'); customEmojiInput = $('#custom-emoji-input'); toggleDeleteSongs = $('#toggle-delete-songs');
    toggleDownloaderBtn = $('#toggle-downloader-btn'); contextMenu = $('#context-menu'); contextMenuEditTitle = $('#context-menu-edit-title'); contextMenuFavorite = $('#context-menu-favorite');
    editTitleOverlay = $('#edit-title-overlay'); editTitleInput = $('#edit-title-input'); editArtistInput = $('#edit-artist-input'); originalTitlePreview = $('#original-title-preview');
    newTitlePreview = $('#new-title-preview'); editTitleCancelBtn = $('#edit-title-cancel-btn'); editTitleSaveBtn = $('#edit-title-save-btn');
    editTitleCloseBtn = $('#edit-title-close-btn');
    confirmDeleteOverlay = $('#confirm-delete-overlay');
    toggleFavoritesBtn = $('#toggle-favorites-btn'); toggleFavoritesOption = $('#toggle-favorites-option');
    confirmDeleteBtn = $('#confirm-delete-btn');
    confirmDeleteCancelBtn = $('#confirm-delete-cancel-btn');
    confirmDeleteCloseBtn = $('#confirm-delete-close-btn');
    autoLoadLastFolderToggle = $('#toggle-auto-load-last-folder'); toggleMiniMode = $('#toggle-mini-mode');
    audioExtrasToggleBtn = $('#audio-extras-toggle-btn');
    notificationBar = $('#notification-bar'); notificationMessage = $('#notification-message');

    loadAppMeta();
    LyricsManager.init(audio);

    audioFeaturesPanel = new AudioFeaturesPanel();
    audioFeaturesPanel.init();

    if (audioExtrasToggleBtn) {
        audioExtrasToggleBtn.addEventListener('click', () => {
            audioFeaturesPanel.toggle();
        });
    }

    const userHelpOverlay = document.getElementById('user-help-overlay');
    const userHelpBtn = document.getElementById('user-help-btn');
    const userHelpCloseBtn = document.getElementById('user-help-close-btn');

    if (userHelpBtn && userHelpOverlay) {
        userHelpBtn.onclick = (e) => {
            e.preventDefault();
            userHelpOverlay.classList.add('visible');
        };
    }
    if (userHelpCloseBtn && userHelpOverlay) {
        userHelpCloseBtn.onclick = (e) => {
            e.preventDefault();
            userHelpOverlay.classList.remove('visible');
        };
    }

    if (settingsBtn && settingsOverlay) {
        settingsBtn.addEventListener('click', () => {
            settingsOverlay.classList.add('visible');
        });
    }

    const helpToSettingsBtn = $('#help-to-settings-btn');
    if (helpToSettingsBtn) {
        helpToSettingsBtn.addEventListener('click', () => {
            if (userHelpOverlay) userHelpOverlay.classList.remove('visible');
            setTimeout(() => {
                if (settingsOverlay) settingsOverlay.classList.add('visible');
            }, 300);
        });
    }

    /* --- Dev Modal Logic --- */
    const devModalOverlay = document.getElementById('dev-modal-overlay');
    const openDevBtn = document.getElementById('open-dev-btn');
    const devModalCloseBtn = document.getElementById('dev-modal-close-btn');

    if (openDevBtn && devModalOverlay) {
        openDevBtn.onclick = (e) => {
            e.preventDefault();
            devModalOverlay.classList.add('visible');
        };
    }
    if (devModalCloseBtn && devModalOverlay) {
        devModalCloseBtn.onclick = (e) => {
            e.preventDefault();
            devModalOverlay.classList.remove('visible');
        };
    }

    /* --- Playlist Toggle Logic --- */
    const togglePlaylistBtn = $('#toggle-playlist-btn');
    if (togglePlaylistBtn) {
        togglePlaylistBtn.addEventListener('click', () => {
            const isHidden = document.body.classList.toggle('playlist-hidden');
            saveSetting('playlistHidden', isHidden);

            togglePlaylistBtn.style.color = isHidden ? 'var(--text-muted)' : 'var(--accent)';
            togglePlaylistBtn.style.borderColor = isHidden ? 'var(--border-soft)' : 'var(--accent)';

            setTimeout(() => {
                if (visualizerCanvas && visualizerContainer) {
                    visualizerCanvas.width = visualizerContainer.clientWidth;
                    visualizerCanvas.height = visualizerContainer.clientHeight;
                }
                if (typeof updateTrackTitleScroll === 'function') updateTrackTitleScroll();
            }, 550);
        });
    }

    accentColorPicker = $('#accent-color-picker');
    dropZone = $('#drop-zone'); toggleEnableDrag = $('#toggle-enable-drag'); toggleUseCustomColor = $('#toggle-use-custom-color');
    toggleGradientTitle = $('#toggle-gradient-title');
    accentColorContainer = $('#accent-color-container');
    toggleEnableFocus = $('#toggle-enable-focus'); toggleFocusModeBtn = $('#toggle-focus-mode-btn');
    speedSlider = $('#speed-slider'); speedValue = $('#speed-value');

    bassBoostToggle = $('#toggle-bass-boost');
    bassBoostSlider = $('#bass-boost-slider');
    bassBoostValueEl = $('#bass-boost-value');
    bassBoostContainer = $('#bass-boost-slider-container');

    trebleBoostToggle = $('#toggle-treble-boost');
    trebleBoostSlider = $('#treble-boost-slider');
    trebleBoostValueEl = $('#treble-boost-value');
    trebleBoostContainer = $('#treble-boost-slider-container');

    reverbToggle = $('#toggle-reverb');
    reverbSlider = $('#reverb-slider');
    reverbValueEl = $('#reverb-value');
    reverbContainer = $('#reverb-slider-container');

    toggleCinemaMode = $('#toggle-cinema-mode');
    btnExportPlaylist = $('#btn-export-playlist');
    playlistPositionSelect = $('#playlist-position-select');

    if (playlistPositionSelect) {
        playlistPositionSelect.addEventListener('change', (e) => {
            const pos = e.target.value;
            saveSetting('playlistPosition', pos);
            if (pos === 'left') {
                document.body.classList.add('playlist-left');
            } else {
                document.body.classList.remove('playlist-left');
            }
        });
    }

    if (tabYtBtn && tabSpotifyBtn && tabMusicBtn) {
        const setTab = (mode) => {
            activeDownloaderMode = mode;
            tabYtBtn.classList.toggle('active', mode === 'youtube');
            tabMusicBtn.classList.toggle('active', mode === 'music');
            tabSpotifyBtn.classList.toggle('active', mode === 'spotify');

            viewYt.style.display = mode === 'youtube' ? 'block' : 'none';
            viewMusic.style.display = mode === 'music' ? 'block' : 'none';
            viewSpotify.style.display = mode === 'spotify' ? 'block' : 'none';
        };

        if (activeDownloaderMode) setTab(activeDownloaderMode);

        tabYtBtn.addEventListener('click', () => setTab('youtube'));
        tabMusicBtn.addEventListener('click', () => setTab('music'));
        tabSpotifyBtn.addEventListener('click', () => setTab('spotify'));
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownload);
    }

    const inputs = [ytUrlInput, ytNameInput, spotifyUrlInput];
    inputs.forEach(input => {
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleDownload();
            });
        }
    });

    const overlays = [settingsOverlay, libraryOverlay, downloaderOverlay, editTitleOverlay, confirmDeleteOverlay, document.getElementById('dev-modal-overlay'), document.getElementById('user-help-overlay'), document.getElementById('error-modal-overlay')];
    overlays.forEach(ov => {
        if (ov) {
            let modal = ov.querySelector('.settings-modal');
            let header = ov.querySelector('.settings-header');

            if (!modal) modal = ov.querySelector('.modern-downloader-panel');
            if (!modal) modal = ov.querySelector('.discord-settings-layout');
            if (!modal) modal = ov.querySelector('.modern-clean-panel');

            if (!header) header = ov.querySelector('.modern-header');
            if (!header) header = ov.querySelector('.settings-sidebar');
            if (!header) header = ov.querySelector('.clean-header');

            const isDownloader = ov.id === 'downloader-overlay';
            if (modal && header && !isDownloader) makeDraggable(modal, header);

            ov.addEventListener('click', (e) => {
                if (e.target === ov) {
                    if (ov.id === 'confirm-delete-overlay' && deleteInterval) {
                        clearInterval(deleteInterval);
                        deleteInterval = null;
                    }
                    ov.classList.remove('visible');
                }
            });
        }
    });

    document.querySelectorAll('.close-modal-btn, #settings-close-btn, #edit-title-cancel-btn, #confirm-delete-cancel-btn, #error-modal-close-btn, #error-modal-ok-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const ov = btn.closest('.overlay-container');
            if (ov) {
                ov.classList.remove('visible');
            }
        });
    });

    const introCards = document.querySelectorAll('.intro-card');
    introCards.forEach(card => {
        const btn = card.querySelector('.apply-intro-btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                introCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                applyTranslations();
                const introKey = card.dataset.intro;
                saveSetting('activeIntro', introKey);
            });
        }
    });

    setupAudioEvents(); setupEventListeners();

    async function initializeApp() {
        const config = await windowApi.getSettings();
        const onboardingDone = config && config.onboardingComplete === true;

        if (!onboardingDone) {
            if (OnBoarding.init((lang, theme) => {
                saveSetting('onboardingComplete', true);
                saveSetting('language', lang);
                if (theme) saveSetting('theme', theme);
                localStorage.setItem('on_boarding_complete', 'true');
                localStorage.setItem('language', lang);
                if (theme) localStorage.setItem('theme', theme);
                setTimeout(() => location.reload(), 1000);
            })) return;
        }

        try {
            const savedLang = (config && config.language) || localStorage.getItem('language') || 'de';
            LangHandler.init(savedLang);
            currentLanguage = savedLang;
            document.documentElement.lang = currentLanguage;

            AppLoader.init();
            AppLoader.update(5, tr('loaderBooting'));

            const cachedTheme = localStorage.getItem('theme') || 'midnight';
            document.documentElement.setAttribute('data-theme', cachedTheme);

            AppLoader.update(20, tr('loaderModules'));
            ThemeListener.init();
            BackgroundAnimListener.init();

            AppLoader.update(30, tr('loaderLoadingSettings'));
            downloadManager = new DownloadManager({
                onStatsUpdate: (stats) => {
                    updateQueueStatsUI(stats);
                    if (isQueueModalOpen) renderQueueModal();
                },
                onLog: (key, type, args) => {
                    let msg = key;
                    if (typeof key === 'string' && (key.startsWith('log') || key.startsWith('status'))) {
                        msg = tr(key, args);
                    }
                    logToTerminal(msg, type);

                    if (type === 'error') {
                        setDownloaderState('error', msg);
                    }
                }
            });

            setupQueueUI();

            await loadSettings();

            initSettingsLogic();

            if (toggleFavoritesBtn) {
                toggleFavoritesBtn.style.display = settings.enableFavoritesPlaylist ? 'flex' : 'none';
            }

            AppPerformance.init({
                visualizer,
                settings,
                tr,
                saveSetting,
                applyAnimation: applyAnimationSetting,
                showNotification: window.showNotification
            });

            AppLoader.update(70, tr('loaderApplying'));
            if (settings.activeIntro) localStorage.setItem('activeIntro', settings.activeIntro);
            if (settings.theme) localStorage.setItem('theme', settings.theme);

            if (animationSelect) animationSelect.value = settings.animationMode || 'flow';

            ThemePackListener.init({
                visualizer,
                ui: {
                    updateEmoji,
                    updateCachedColor,
                    resetToDefaultTheme,
                    applyAnimationSetting
                },
                settings
            });

            UpdateManager.init(windowApi);

            if (settings.theme) {
                document.documentElement.setAttribute('data-theme', settings.theme);
            }
            if (settings.useCustomColor && settings.customAccentColor) {
                document.documentElement.style.setProperty('--accent', settings.customAccentColor);
                if (accentColorPicker) accentColorPicker.value = settings.customAccentColor;
            }

            updateCachedColor();

            audio.volume = currentVolume;
            if (volumeSlider) volumeSlider.value = currentVolume;
            if (volumeIcon) volumeIcon.innerHTML = getVolumeIcon(currentVolume);

            AppLoader.update(90, tr('loaderAudio'));
            initVisualizerEngine();

            AppLoader.update(100, tr('loaderReady'));
            AppLoader.finish();

            const activeIntro = settings.activeIntro || 'waterdrop';
            const introPromise = activeIntro !== 'none'
                ? new IntroManager({ activeIntro }).play()
                : new Promise(r => setTimeout(r, 500));

            renderLegacyFolderList();
            loadLibrary();

            await introPromise;
            document.body.classList.add('ready');

        } catch (err) {
            console.error("Initialization failed:", err);
            const loader = document.getElementById('app-loader');
            if (loader) loader.remove();
            const cover = document.getElementById('startup-cover');
            if (cover) cover.remove();
            document.body.classList.add('ready');
            alert("Init Error: " + err.message);
        }
    }

    initializeApp();

    if (refreshFolderBtn) refreshFolderBtn.addEventListener('click', () => performFolderRefresh());
    if (playlistRefreshBtn) playlistRefreshBtn.addEventListener('click', () => performFolderRefresh());

    dynamicIsland = new DynamicIsland();

    window.showNotification = function (message, type = 'info', duration = 3000) {
        if (dynamicIsland) dynamicIsland.show(message, type, duration);
    };

    window.hideNotification = function () {
        if (dynamicIsland) dynamicIsland.hide();
    };

});