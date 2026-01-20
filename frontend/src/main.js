import * as App from '../wailsjs/go/main/App.js';
import lovingDinosImg from './assets/Two_Loving_Cute_Dinos.png';
import sunsetSunImg from './assets/sunset_drive_retrowave_sun.png';
import lovingDinosIco from './assets/Two_Loving_Cute_Dinos.ico';
import { translations } from './translations.js';
import { VisualizerEngine } from './visualizerEngine.js';
import { IntroManager } from './intro.js';
import { AudioExtras } from './audio_extras.js';
import { DynamicIsland } from './dynamic_island.js';
import { MiniPlayer } from './mini_player.js';
import { ThemePackListener } from './theme_packs/theme_pack_listener.js';
import { ThemeListener } from './app_themes/theme_listener.js';
import { BackgroundAnimListener } from './background_animations/background_anim_listener.js';
import { AppLoader } from './app_start/app_loader.js';
import { AppShutdown } from './app_shutdown/shutdown.js';
import { AppSettings } from './app_settings/app_settings.js';

// Wails API Mapping
const windowApi = {
    getSettings: App.GetSettings,
    getAppMeta: App.GetAppMeta,
    setSetting: App.SetSetting,
    selectFolder: App.SelectFolder,
    selectMusicFolder: App.SelectMusicFolder,
    refreshMusicFolder: App.RefreshMusicFolder,
    downloadFromYouTube: App.DownloadFromYouTube,
    downloadFromSpotify: App.DownloadFromSpotify,
    isSpotifyUrl: App.IsSpotifyUrl,
    deleteTrack: App.DeleteTrack,
    updateTitle: App.UpdateTitle,
    showInFolder: App.ShowInFolder,
    moveFile: App.MoveFile,
    setWindowSize: App.SetWindowSize,
    resetConfig: App.ResetConfig,
    onMediaControl: (cb) => { /* Not implemented */ },
    onDownloadProgress: (cb) => { /* Not implemented */ },
    sendPlaybackState: App.SendPlaybackState
};

window.api = windowApi;

// App State
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


// Visualizer State
let visualizer;
let audioExtras;
let dynamicIsland;
let miniPlayer;

// DOM Elements
let $, trackTitleEl, trackArtistEl, musicEmojiEl, currentTimeEl, durationEl, progressBar, progressFill, playBtn, playIcon, pauseIcon, prevBtn, nextBtn, loopBtn, shuffleBtn, volumeSlider, volumeIcon, playlistEl, playlistInfoBar, loadFolderBtn, openLibraryBtn, libraryOverlay, libraryCloseBtn, refreshFolderBtn, searchInput, sortSelect, ytUrlInput, ytNameInput, downloadBtn, downloaderOverlay, downloaderCloseBtn, downloadStatusEl, downloadProgressFill, visualizerCanvas, visualizerContainer, langButtons, settingsBtn, settingsOverlay, settingsCloseBtn, downloadFolderInput, changeFolderBtn, qualitySelect, themeSelect, visualizerToggle, visualizerStyleSelect, visualizerSensitivity, sleepTimerSelect, animationSelect, backgroundAnimationEl, emojiSelect, customEmojiContainer, customEmojiInput, toggleDeleteSongs, toggleDownloaderBtn, contextMenu, contextMenuEditTitle, contextMenuFavorite, editTitleOverlay, editTitleInput, originalTitlePreview, newTitlePreview, editTitleCancelBtn, editTitleSaveBtn, editTitleCloseBtn, confirmDeleteOverlay, confirmDeleteBtn, confirmDeleteCancelBtn, confirmDeleteCloseBtn, autoLoadLastFolderToggle, toggleMiniMode, notificationBar, notificationMessage, notificationTimeout, accentColorPicker, toggleFocusModeBtn, dropZone, toggleEnableFocus, toggleEnableDrag, toggleUseCustomColor, accentColorContainer, speedSlider, speedValue, snowInterval, toggleFavoritesBtn, toggleFavoritesOption;
// Spotify & Tabs
let spotifyUrlInput, tabYtBtn, tabSpotifyBtn, viewYt, viewSpotify;
let favorites = [];
let favoritesSet = new Set();
let showingFavoritesOnly = false;

let trackToDeletePath = null;
let bassBoostToggle, bassBoostSlider, bassBoostValueEl, bassBoostContainer;
let trebleBoostToggle, trebleBoostSlider, trebleBoostValueEl, trebleBoostContainer;
let reverbToggle, reverbSlider, reverbValueEl, reverbContainer;
let toggleCinemaMode, btnExportPlaylist, playlistPositionSelect, toggleGradientTitle;
let renderPlaylistRequestId = null;

// Performance
let lastFrameTime = performance.now();
let frameCount = 0;
let appFrameCount = 0;
let fps = 0;
let avgFps = 60;
let perfHintShown = false;
let performanceMode = false;
let showStatsOverlay = false;
let targetFps = 60;
let lastRenderTime = 0;
let lastStatsTime = performance.now();
let cachedAccentColor = '#38bdf8';
let isStatsLoopRunning = false;
let warmupFrames = 0;

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
        musicEmojiEl: musicEmojiEl
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
    }
    updateActiveFeaturesIndicator();
}

function updateActiveFeaturesIndicator() {
    const container = document.getElementById('active-features-indicator');
    if (!container) return;

    const bass = !!settings.bassBoostEnabled;
    const treble = !!settings.trebleBoostEnabled;
    const reverb = !!settings.reverbEnabled;
    const anyActive = bass || treble || reverb;

    container.classList.toggle('active', anyActive);

    const bassItem = document.getElementById('modal-feat-bass');
    if (bassItem) bassItem.classList.toggle('active', bass);

    const trebleItem = document.getElementById('modal-feat-crystal');
    if (trebleItem) trebleItem.classList.toggle('active', treble);

    const reverbItem = document.getElementById('modal-feat-reverb');
    if (reverbItem) reverbItem.classList.toggle('active', reverb);
}

function saveSetting(key, value) {
    if (settings) settings[key] = value;
    windowApi.setSetting(key, value);
    if (key === 'activeIntro' || key === 'theme' || key === 'language') localStorage.setItem(key, value);
}

function updateCachedColor() {
    let color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

    // Hardcoded overrides for known theme packs to be 100% sure they don't use fallbacks
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

function updatePerformanceStats() {
    if (document.hidden) {
        requestAnimationFrame(updatePerformanceStats);
        return;
    }

    const now = performance.now();
    const interval = 1000 / targetFps;
    const statsInterval = 1000;

    // Throttle App Update Loop to targetFps
    const delta = now - lastStatsTime;
    if (delta < interval) {
        requestAnimationFrame(updatePerformanceStats);
        return;
    }
    lastStatsTime = now - (delta % interval);
    appFrameCount++;

    const timeSinceLastLog = now - lastFrameTime;
    if (timeSinceLastLog >= statsInterval) {
        const appFps = Math.round((appFrameCount * 1000) / timeSinceLastLog);

        let visFps = 0;
        if (visualizer) {
            visFps = Math.round((visualizer.getAndResetFrameCount() * 1000) / timeSinceLastLog);
        }
        fps = visFps;

        if (isPlaying && !performanceMode && visualizerEnabled) {
            avgFps = (avgFps * 0.7) + (visFps * 0.3);
        } else {
            avgFps = appFps;
        }

        const currentFrameTime = appFps > 0 ? Math.round(1000 / appFps) : 0;

        appFrameCount = 0;
        frameCount = 0;
        lastFrameTime = now;

        if (showStatsOverlay || (avgFps < targetFps * 0.8)) {
            const fpsEl = document.getElementById('stat-fps');
            const timeEl = document.getElementById('stat-time');
            const lagEl = document.getElementById('stat-lag');
            const perfInfoEl = document.getElementById('stat-perf-info');

            if (fpsEl) {
                const visStatus = (isPlaying && !performanceMode) ? fps : '-';
                fpsEl.textContent = `${appFps} (${visStatus})`;

                if (appFps >= targetFps * 0.9) fpsEl.style.color = '#4ade80';
                else if (appFps >= targetFps * 0.6) fpsEl.style.color = '#fbbf24';
                else fpsEl.style.color = '#ef4444';
            }

            if (timeEl) timeEl.textContent = currentFrameTime + 'ms';

            if (lagEl) {
                if (performanceMode) {
                    lagEl.textContent = tr('statPowerSave');
                    lagEl.style.color = '#38bdf8';
                } else if (avgFps < targetFps * 0.5) {
                    lagEl.textContent = 'LAG';
                    lagEl.style.color = '#ef4444';
                    if (warmupFrames > 5) triggerPerformanceHint();
                } else if (avgFps < targetFps * 0.8) {
                    lagEl.textContent = tr('statUnstable');
                    lagEl.style.color = '#fbbf24';
                } else {
                    lagEl.textContent = isPlaying ? tr('statStable') : 'Standby';
                    lagEl.style.color = isPlaying ? '#4ade80' : '#8a93a2';
                }
            }

            if (perfInfoEl) {
                if (performanceMode) {
                    perfInfoEl.textContent = 'Active';
                } else {
                    const stability = targetFps > 0 ? Math.min(100, Math.round((avgFps / targetFps) * 100)) : 0;
                    perfInfoEl.textContent = `${stability}%`;
                }
            }
        }
    }

    if (isPlaying && !performanceMode && visualizerEnabled) {
        warmupFrames++;
    } else {
        warmupFrames = 0;
    }

    requestAnimationFrame(updatePerformanceStats);
}

const pressedKeys = new Set();

function triggerPerformanceHint(force = false) {
    if (!force && (perfHintShown || performanceMode)) return;
    const hint = document.getElementById('performance-hint');
    const hintText = document.getElementById('hint-text');
    if (hint) {
        if (hintText) hintText.textContent = tr('perfLagMsg');
        if (!force && warmupFrames < 600) return;
        hint.classList.add('visible');
        if (!force) perfHintShown = true;
        setTimeout(() => { if (hint) hint.classList.remove('visible'); }, 10000);
    }
}

function setPerformanceMode(enabled, silent = false) {
    performanceMode = enabled;
    saveSetting('performanceMode', enabled);

    const toggle = document.getElementById('toggle-performance-mode');
    if (toggle) toggle.checked = enabled;

    if (enabled) {
        // Deactivate any active theme pack for performance
        ThemePackListener.deactivateActivePack();

        if (visualizer) visualizer.stop();
        applyAnimationSetting('off');
        document.body.classList.add('perf-mode-active');
        if (!silent) showNotification(tr('perfModeOn'));
    } else {
        if (isPlaying && visualizer) visualizer.start();
        applyAnimationSetting(settings.animationMode || 'flow');
        document.body.classList.remove('perf-mode-active');
    }
}

function tr(key, ...args) {
    const langCode = currentLanguage || (settings && settings.language) || 'de';
    const lang = translations[langCode] || translations.de;
    const text = (lang && lang[key]) || (translations.de[key]) || key;
    return typeof text === 'function' ? text(...args) : text;
}

// Player Logic
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
    let nextIndex = shuffleOn ? Math.floor(Math.random() * playlist.length) : currentIndex + 1;
    if (nextIndex >= playlist.length) { if (loopMode === 'all') nextIndex = 0; else { isPlaying = false; updatePlayPauseUI(); return; } }
    playTrack(nextIndex);
}

function playPrev() { if (audio.currentTime > 3) audio.currentTime = 0; else playTrack(currentIndex - 1 < 0 ? playlist.length - 1 : currentIndex - 1); }

// --- UI & DOM MANIPULATION ---
function deactivateAllThemePacks(excludeKey) {
    const packs = [
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
        'sunset-active', 'sakura-active'
    );

    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--bg-main');

    const th = settings.theme || 'midnight';
    document.documentElement.setAttribute('data-theme', th);
    localStorage.setItem('theme', th);
    if (themeSelect) { themeSelect.disabled = false; themeSelect.value = th; }

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
        visualizer.updateSettings({ style: style, maxBars: 0 });
        if (visualizerStyleSelect) { visualizerStyleSelect.disabled = false; visualizerStyleSelect.value = style; }
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
        return;
    }
    const track = playlist[currentIndex];
    if (trackTitleEl) trackTitleEl.textContent = track.title;
    if (trackArtistEl) trackArtistEl.textContent = track.artist || tr('unknownArtist');

    updateEmoji(emojiMode, customEmoji);
    updateActiveTrackInPlaylist();
    updateTrackTitleScroll();
    if (isPlaying && lastNotifiedPath !== track.path) { showNotification(`${tr('nowPlaying')}: ${track.title}`); lastNotifiedPath = track.path; }
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
    if (playlist.length === 0) {
        const msg = showingFavoritesOnly ? tr('noFavoritesFound') : tr('emptyPlaylist');
        playlistEl.innerHTML = `<div class="empty-state">${msg}</div>`;
        if (playlistInfoBar) playlistInfoBar.textContent = `0 ${tr('tracks')}`;
        return;
    }
    if (playlistInfoBar) playlistInfoBar.textContent = `${playlist.length} ${playlist.length === 1 ? tr('track') : tr('tracks')}`;
    let renderIndex = 0; const CHUNK_SIZE = 50;
    function renderChunk() {
        const fragment = document.createDocumentFragment(); const limit = Math.min(renderIndex + CHUNK_SIZE, playlist.length);
        for (let i = renderIndex; i < limit; i++) {
            const track = playlist[i], row = document.createElement('div');
            row.className = 'track-row'; row.dataset.index = i; if (i === currentIndex) row.classList.add('active');
            const pi = `<div class="playing-bars"><span></span><span></span><span></span></div>`;
            const isFav = favoritesSet.has(track.path);
            const favFill = isFav ? 'currentColor' : 'none';
            const favColor = isFav ? '#fbbf24' : 'var(--text-muted)';
            const favBtn = `<button class="fav-track-btn" data-path="${track.path}" title="${tr('toggleFavorite')}" style="color: ${favColor};"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${favFill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></button>`;
            row.innerHTML = `<div class="track-index">${(isPlaying && i === currentIndex) ? pi : (i + 1)}</div><div class="track-info-block"><div class="track-title-small">${track.title}</div><div class="track-artist-small">${track.artist || tr('unknownArtist')}</div></div>${favBtn}<div class="track-duration">${formatTime(track.duration)}</div>`;
            fragment.appendChild(row);
        }
        playlistEl.appendChild(fragment); renderIndex = limit;
        if (renderIndex < playlist.length) renderPlaylistRequestId = requestAnimationFrame(renderChunk);
    }
    renderChunk();
}

function applyTranslations() {
    document.querySelectorAll('[data-lang-key]').forEach(el => {
        if (el.classList.contains('apply-intro-btn')) {
            const card = el.closest('.intro-card');
            if (card) {
                const isActive = card.classList.contains('active');
                el.dataset.langKey = isActive ? 'introActiveBtn' : 'introApplyBtn';
            }
        }

        const text = tr(el.dataset.langKey);
        if (text) {
            // Special case for buttons to avoid appending if multiple calls happen
            if (el.tagName === 'BUTTON') {
                el.textContent = text;
            } else {
                el.textContent = text;
            }
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
    const dropZoneTextEl = $('#drop-zone p'); if (dropZoneTextEl) dropZoneTextEl.textContent = tr('dropZoneText');
    document.title = tr('appTitle');
    updateUIForCurrentTrack();
    renderPlaylist();

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
    else if (emojiType === 'custom' && customEmoji) emoji = customEmoji.trim();

    if (emojiType === 'auto' || emojiType === undefined) {
        if (currentTrackPath) {
            let rawPath = currentTrackPath.replace(/\\/g, '/');
            // encodeURI preserves colons (C:) and slashes, but we must manually escape # and ? 
            // because they have special meaning in URLs and would truncate the path.
            let safeUrlPath = encodeURI(rawPath).replace(/#/g, '%23').replace(/\?/g, '%3F');
            const coverUrl = '/cover/' + safeUrlPath;
            isImage = true;
            emoji = coverUrl;
        }
    }

    if (isImage) {
        const existingImg = musicEmojiEl.querySelector('img');
        if (existingImg) {
            if (existingImg.src.endsWith(emoji.replace(/^\./, ''))) return;
        }

        musicEmojiEl.innerHTML = `<img src="${emoji}" alt="Cover" draggable="false" ondragstart="return false;" style="background: transparent !important; border: none !important; width: 100%; height: 100%; object-fit: contain;">`;
    } else if (isHtml) {
        musicEmojiEl.innerHTML = emoji;
    } else {
        musicEmojiEl.textContent = emoji;
    }
}

async function handleDownload() {
    let url = '';

    if (activeDownloaderMode === 'spotify') {
        url = spotifyUrlInput.value.trim();
    } else {
        url = ytUrlInput.value.trim();
    }

    if (!url) { downloadStatusEl.textContent = tr('statusUrlMissing'); return; }

    downloadBtn.disabled = true;
    downloadBtn.style.opacity = '0.5';
    downloadStatusEl.textContent = tr('statusStarting');

    try {
        let result;
        if (activeDownloaderMode === 'spotify') {
            downloadStatusEl.textContent = tr('statusLoadingMetadata');
            result = await windowApi.downloadFromSpotify(url, qualitySelect.value);
        } else {
            result = await windowApi.downloadFromYouTube({ url, customName: ytNameInput.value.trim(), quality: qualitySelect.value });
        }

        if (result.success) {
            downloadStatusEl.textContent = tr('statusSuccess');
            ytUrlInput.value = '';
            ytNameInput.value = '';
            if (spotifyUrlInput) spotifyUrlInput.value = '';

            if (currentFolderPath && settings.downloadFolder && currentFolderPath === settings.downloadFolder) {
                // Refresh folder triggered via event listener on refresh btn, but here we can't trigger click easily if we decoupled.
                // But wait, refresh logic is available via windowApi.refreshMusicFolder
                // For simplicity, we just trigger the button click if it exists, or call the logic.
                const btn = document.getElementById('refresh-folder-btn');
                if (btn) btn.click();
            }
        } else {
            downloadStatusEl.textContent = `${tr('statusError')}: ${result.error}`;
            if (downloadProgressFill) downloadProgressFill.style.width = '0%';
        }
    } catch (err) {
        downloadStatusEl.textContent = `${tr('statusError')}: ${err.message}`;
        if (downloadProgressFill) downloadProgressFill.style.width = '0%';
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.style.opacity = '1';
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

async function loadSettings() {
    const s = await windowApi.getSettings();
    if (s) settings = s;

    // Restore Language
    if (settings.language) {
        currentLanguage = settings.language;
    } else {
        currentLanguage = 'de';
    }
    document.documentElement.lang = currentLanguage;
    localStorage.setItem('language', currentLanguage);

    // Restore Favorites
    if (settings.favorites) {
        favorites = settings.favorites;
        favoritesSet = new Set(favorites);
    } else {
        favorites = [];
        favoritesSet = new Set();
    }

    // Restore Volume
    currentVolume = settings.volume !== undefined ? settings.volume : 0.2;
    audio.volume = currentVolume;
    if (volumeSlider) volumeSlider.value = currentVolume;
    if (volumeIcon) volumeIcon.innerHTML = getVolumeIcon(currentVolume);

    shuffleOn = settings.shuffle || false;
    loopMode = settings.loop || 'off';
    sortMode = settings.sortMode || 'name';

    if (langButtons) langButtons.forEach(b => b.classList.toggle('active', b.dataset.lang === currentLanguage));

    applyTranslations();

    // AppSettings will handle UI restoration for settings modal!
    AppSettings.restoreUIState();

    if (shuffleBtn) shuffleBtn.classList.toggle('mode-btn--active', shuffleOn);
    if (loopBtn) { loopBtn.classList.toggle('mode-btn--active', loopMode !== 'off'); updateLoopIcon(); }

    if (settings.deleteSongsEnabled) deleteSongsEnabled = settings.deleteSongsEnabled;

    if (toggleEnableFocus) toggleEnableFocus.checked = settings.enableFocusMode !== false;
    if (toggleEnableDrag) toggleEnableDrag.checked = settings.enableDragAndDrop !== false;

    // We still need to apply some things that affect global state immediately
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

    // Performance Mode
    if (settings.performanceMode) {
        setPerformanceMode(true, true);
    }

    // Stats Overlay
    showStatsOverlay = !!settings.showStatsOverlay;
    const statsOverlay = document.getElementById('stats-overlay');
    if (statsOverlay) statsOverlay.classList.toggle('hidden', !showStatsOverlay);

    if (settings.targetFps) targetFps = settings.targetFps;


    // Restore Audio Extras Logic (AudioNodes)
    updateAudioEffects();

    // Auto Load Folder
    if (settings.currentFolderPath && (settings.autoLoadLastFolder !== false)) {
        AppLoader.update(50, tr('loaderLoadingLibrary'));
        currentFolderPath = settings.currentFolderPath;
        try {
            const result = await windowApi.refreshMusicFolder(currentFolderPath);
            if (result && result.folderPath) {
                basePlaylist = result.tracks || [];
                playlist = [...basePlaylist];
                sortPlaylist(sortMode);
                updateUIForCurrentTrack();
            }
        } catch (e) {
            console.error("Auto-load failed:", e);
        }
    }
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

function toggleFavorite(path) {
    const index = favorites.indexOf(path);
    if (index === -1) {
        favorites.push(path);
        favoritesSet.add(path);
    } else {
        favorites.splice(index, 1);
        favoritesSet.delete(path);
    }
    saveSetting('favorites', favorites);
    renderPlaylist();
    updateUIForCurrentTrack();
    if (showingFavoritesOnly) filterPlaylist(searchInput ? searchInput.value : '');
}

function filterPlaylist(q) {
    let filtered = [...basePlaylist];
    if (showingFavoritesOnly) {
        filtered = filtered.filter(t => favoritesSet.has(t.path));
    }
    if (q) {
        const lowerQ = q.toLowerCase();
        filtered = filtered.filter(t => t.title.toLowerCase().includes(lowerQ) || (t.artist && t.artist.toLowerCase().includes(lowerQ)));
    }
    playlist = filtered;
    if (currentTrackPath) {
        currentIndex = playlist.findIndex(t => t.path === currentTrackPath);
    }
    renderPlaylist();
}

function sortPlaylist(m) {
    const srt = [...basePlaylist];
    if (m === 'name') srt.sort((a, b) => a.title.localeCompare(b.title, 'de', { numeric: true }));
    else if (m === 'nameDesc') srt.sort((a, b) => b.title.localeCompare(a.title, 'de', { numeric: true }));
    else if (m === 'newest') srt.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
    basePlaylist = srt;
    filterPlaylist(searchInput ? searchInput.value : '');
}

function showContextMenu(e, idx) {
    contextTrackIndex = idx;
    if (!contextMenu) return;
    if (contextMenuFavorite && playlist[idx]) {
        const isFav = favorites.includes(playlist[idx].path);
        contextMenuFavorite.textContent = isFav ? tr('removeFromFavorites') : tr('addToFavorites');
    }
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.display = 'block';
    const hcm = () => { contextMenu.style.display = 'none'; window.removeEventListener('click', hcm); };
    window.addEventListener('click', hcm);
}

function handleDeleteTrack(fp) { trackToDeletePath = fp; confirmDeleteOverlay.classList.add('visible'); let c = 5; confirmDeleteBtn.disabled = true; confirmDeleteBtn.textContent = `${tr('confirmDeleteButton')} (${c})`; const ci = setInterval(() => { c--; if (c > 0) confirmDeleteBtn.textContent = `${tr('confirmDeleteButton')} (${c})`; else { clearInterval(ci); confirmDeleteBtn.textContent = tr('confirmDeleteButton'); confirmDeleteBtn.disabled = false; } }, 1000); }

function setupEventListeners() {
    // Only Main App Listeners here. Settings logic moved to AppSettings via initSettingsLogic().

    const bind = (el, ev, h) => { if (el && typeof el.addEventListener === 'function') el.addEventListener(ev, h); };
    bind(playBtn, 'click', () => { if (playlist.length === 0) return; if (isPlaying) audio.pause(); else (currentIndex === -1) ? playTrack(0) : audio.play(); });
    bind(nextBtn, 'click', playNext); bind(prevBtn, 'click', playPrev);
    bind(shuffleBtn, 'click', () => { shuffleOn = !shuffleOn; shuffleBtn.classList.toggle('mode-btn--active', shuffleOn); saveSetting('shuffle', shuffleOn); });
    bind(loopBtn, 'click', () => { loopMode = (loopMode === 'off' ? 'all' : (loopMode === 'all' ? 'one' : 'off')); loopBtn.classList.toggle('mode-btn--active', loopMode !== 'off'); updateLoopIcon(); saveSetting('loop', loopMode); });
    bind(progressBar, 'click', (e) => { if (!isNaN(audio.duration)) { const r = progressBar.getBoundingClientRect(); audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration; } });
    bind(volumeSlider, 'input', (e) => { audio.volume = parseFloat(e.target.value); });
    bind(openLibraryBtn, 'click', () => { libraryOverlay.classList.add('visible'); });
    bind(libraryCloseBtn, 'click', () => { libraryOverlay.classList.remove('visible'); });
    bind(loadFolderBtn, 'click', async () => {
        const r = await windowApi.selectMusicFolder();
        if (r && r.folderPath) {
            basePlaylist = r.tracks || [];
            playlist = [...basePlaylist];
            currentIndex = currentTrackPath ? playlist.findIndex(t => t.path === currentTrackPath) : -1;
            renderPlaylist();
            updateUIForCurrentTrack();
            currentFolderPath = r.folderPath;
            saveSetting('currentFolderPath', currentFolderPath);
            libraryOverlay.classList.remove('visible');
        }
    });
    // refreshFolderBtn logic is also handled in AppSettings callback for standard refresh, 
    // but the button might exist in multiple places (header/modal). 
    // Actually, AppSettings handles the modal one. The header one is not existent in current HTML.

    let st; bind(searchInput, 'input', (e) => { clearTimeout(st); st = setTimeout(() => { filterPlaylist(e.target.value); }, 250); });

    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        pressedKeys.add(key);
        const isCtrl = pressedKeys.has('control');
        const isOne = pressedKeys.has('1');

        if (isCtrl && isOne && pressedKeys.has('x')) { e.preventDefault(); triggerPerformanceHint(true); return; }
        if (isCtrl && isOne && pressedKeys.has('h')) {
            e.preventDefault();
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
            e.preventDefault();
            const devModal = document.getElementById('dev-modal-overlay');
            if (devModal && !devModal.classList.contains('visible')) devModal.classList.add('visible');
            return;
        }

        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
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

    window.addEventListener('keyup', (e) => { pressedKeys.delete(e.key.toLowerCase()); });
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
    }

    bind(sortSelect, 'change', (e) => { sortMode = e.target.value; saveSetting('sortMode', sortMode); sortPlaylist(sortMode); });

    // Bind "Focus Mode" Button (Player UI)
    bind(toggleFocusModeBtn, 'click', () => {
        document.body.classList.toggle('focus-active');
        if (document.body.classList.contains('focus-active')) showNotification(tr('focusActiveNotify'));
    });

    // Legacy / Orphaned Binds Check
    bind(toggleEnableFocus, 'change', (e) => { saveSetting('enableFocusMode', e.target.checked); if (toggleFocusModeBtn) toggleFocusModeBtn.style.display = e.target.checked ? 'flex' : 'none'; });
    bind(toggleEnableDrag, 'change', (e) => { saveSetting('enableDragAndDrop', e.target.checked); });


    bind(playlistEl, 'click', (e) => {
        const db = e.target.closest('.delete-track-btn');
        if (db) { e.stopPropagation(); handleDeleteTrack(db.dataset.path); return; }
        const fb = e.target.closest('.fav-track-btn');
        if (fb) { e.stopPropagation(); toggleFavorite(fb.dataset.path); return; }
        const row = e.target.closest('.track-row');
        if (row) playTrack(parseInt(row.dataset.index, 10));
    });
    bind(playlistEl, 'contextmenu', (e) => { const r = e.target.closest('.track-row'); if (r) { e.preventDefault(); showContextMenu(e, parseInt(r.dataset.index, 10)); } });
    bind($('#context-menu-show-folder'), 'click', () => { if (contextTrackIndex === null || !playlist[contextTrackIndex]) return; windowApi.showInFolder(playlist[contextTrackIndex].path); });
    const toggleDownloaderBtn = document.getElementById('toggle-downloader-btn');
    bind(toggleDownloaderBtn, 'click', () => {
        downloaderOverlay.classList.add('visible');
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
        showingFavoritesOnly = !showingFavoritesOnly;
        toggleFavoritesBtn.classList.toggle('active', showingFavoritesOnly);
        toggleFavoritesBtn.style.color = showingFavoritesOnly ? 'var(--accent)' : 'var(--text-main)';
        filterPlaylist(searchInput ? searchInput.value : '');
    });
    // toggleFavoritesOption is in AppSettings, handled there.

    bind(downloaderCloseBtn, 'click', () => { downloaderOverlay.classList.remove('visible'); });
    bind(editTitleInput, 'input', () => { if (newTitlePreview) newTitlePreview.textContent = editTitleInput.value; });
    bind(editTitleCancelBtn, 'click', () => { editTitleOverlay.classList.remove('visible'); });
    bind(editTitleCloseBtn, 'click', () => { editTitleOverlay.classList.remove('visible'); });
    bind(editTitleSaveBtn, 'click', async () => { if (contextTrackIndex === null || !playlist[contextTrackIndex]) return; const t = playlist[contextTrackIndex]; const nt = editTitleInput.value.trim(); if (!nt) return; const r = await windowApi.updateTitle(t.path, nt); if (r.success) { t.title = nt; const bt = basePlaylist.find(x => x.path === t.path); if (bt) bt.title = nt; renderPlaylist(); updateUIForCurrentTrack(); editTitleOverlay.classList.remove('visible'); showNotification(tr('titleUpdated')); } });
    bind(confirmDeleteCancelBtn, 'click', () => { confirmDeleteOverlay.classList.remove('visible'); trackToDeletePath = null; });
    bind(confirmDeleteCloseBtn, 'click', () => { confirmDeleteOverlay.classList.remove('visible'); trackToDeletePath = null; });
    bind(confirmDeleteBtn, 'click', async () => {
        if (!trackToDeletePath) return; const ctp = (currentIndex !== -1 && playlist[currentIndex]) ? playlist[currentIndex].path : null; const r = await windowApi.deleteTrack(trackToDeletePath); if (r.success) {
            basePlaylist = basePlaylist.filter(x => x.path !== trackToDeletePath);
            playlist = playlist.filter(x => x.path !== trackToDeletePath);
            const favIdx = favorites.indexOf(trackToDeletePath);
            if (favIdx !== -1) {
                favorites.splice(favIdx, 1);
                windowApi.setSetting('favorites', favorites);
            }
            if (ctp) { if (trackToDeletePath === ctp) { audio.pause(); currentIndex = -1; audio.src = ''; updatePlayPauseUI(); } else { currentIndex = playlist.findIndex(x => x.path === ctp); } }
            renderPlaylist(); updateUIForCurrentTrack(); confirmDeleteOverlay.classList.remove('visible'); trackToDeletePath = null; showNotification(tr('songDeleted'));
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
        if (!document.hidden && isPlaying && visualizerEnabled && !visualizerRunning) {
            startVisualizer();
        }
    });
}

function initSettingsLogic() {
    const callbacks = {
        onThemeChange: (val) => {
            saveSetting('theme', val);
            setTimeout(updateCachedColor, 100);
        },
        onAccentColorChange: () => {
            updateCachedColor();
        },
        onVisualizerToggle: (enabled) => {
            visualizerEnabled = enabled;
            if (visualizer) {
                visualizer.updateSettings({ enabled: enabled });
                if (enabled) visualizer.start(); else visualizer.stop();
            }
        },
        onVisualizerStyleChange: (val) => {
            if (visualizer) visualizer.updateSettings({ style: val });
        },
        onVisualizerSensitivityChange: (val) => {
            if (visualizer) visualizer.updateSettings({ sensitivity: val });
        },
        onEmojiChange: (mode, customVal) => {
            updateEmoji(mode, customVal);
        },
        onSleepTimerChange: (mins) => {
            if (sleepTimerId) { clearTimeout(sleepTimerId); sleepTimerId = null; }
            if (mins > 0) {
                sleepTimerId = setTimeout(() => {
                    audio.pause(); isPlaying = false; updatePlayPauseUI();
                    showNotification(tr('sleepTimerStopped'));
                    sleepTimerId = null;
                }, mins * 60000);
                showNotification(tr('sleepTimerNotify', mins));
            }
        },
        onSpeedChange: (val) => {
            audio.defaultPlaybackRate = val;
            audio.playbackRate = val;
        },
        onDeleteSongsToggle: (enabled) => {
            deleteSongsEnabled = enabled;
            renderPlaylist(); // Update playlist to show/hide delete buttons
        },
        onRefreshFolder: async () => {
            let path = currentFolderPath || settings.currentFolderPath;
            if (!path) return;
            const r = await windowApi.refreshMusicFolder(path);
            if (r && r.tracks) {
                currentFolderPath = r.folderPath;
                saveSetting('currentFolderPath', currentFolderPath);
                basePlaylist = r.tracks;
                playlist = [...basePlaylist];
                sortPlaylist(sortMode);
                if (currentTrackPath) currentIndex = playlist.findIndex(t => t.path === currentTrackPath);
                updateUIForCurrentTrack();
                showNotification(tr('folderRefreshed'));
            }
        },
        onAudioEffectChange: () => {
            updateAudioEffects();
        },
        onLangUpdate: () => {
            applyTranslations();
        },
        onPerformanceModeChange: (enabled) => {
            setPerformanceMode(enabled);
        },
        onStatsToggle: (enabled) => {
            showStatsOverlay = enabled;
        },
        onFavoritesOptionToggle: (enabled) => {
            if (toggleFavoritesBtn) toggleFavoritesBtn.style.display = enabled ? 'flex' : 'none';
            if (!enabled && showingFavoritesOnly) {
                showingFavoritesOnly = false;
                if (toggleFavoritesBtn) toggleFavoritesBtn.classList.remove('active');
                filterPlaylist(searchInput ? searchInput.value : '');
            }
        },
        onFpsChange: (val) => {
            targetFps = val;
            saveSetting('targetFps', val);
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
            showNotification(tr('exportSuccess'));
        },
        onResetApp: async () => {
            if (confirm(tr('resetWarning'))) {
                try {
                    const res = await windowApi.resetConfig();
                    if (res.success) {
                        localStorage.clear();
                        showNotification("Reset complete. Restarting...", "success");
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        showNotification("Reset failed: " + res.error, "error");
                    }
                } catch (e) {
                    console.error("Reset error:", e);
                }
            }
        },
        onShutdownApp: () => {
            AppShutdown.shutdown();
        },
        onAnimationChange: (val) => {
            applyAnimationSetting(val);
        }
    };

    AppSettings.init(windowApi, settings, callbacks);
}

function makeDraggable(modal, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if (e.button !== 0) return;
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
    refreshFolderBtn = $('#refresh-folder-btn'); searchInput = $('.playlist-search-input'); sortSelect = $('#sort-select');
    ytUrlInput = $('#yt-url-input'); ytNameInput = $('#yt-name-input'); downloadBtn = $('#download-btn');
    spotifyUrlInput = $('#spotify-url-input');
    tabYtBtn = $('#tab-yt-btn'); tabSpotifyBtn = $('#tab-spotify-btn');
    viewYt = $('#view-youtube'); viewSpotify = $('#view-spotify');

    downloaderOverlay = $('#downloader-overlay'); downloaderCloseBtn = $('#downloader-close-btn'); downloadStatusEl = $('.status-text');
    downloadProgressFill = $('.yt-progress-fill'); visualizerCanvas = $('#visualizer-canvas'); visualizerContainer = $('.visualizer-container');
    langButtons = document.querySelectorAll('.lang-btn'); settingsBtn = $('#settings-btn'); settingsOverlay = $('#settings-overlay');
    settingsCloseBtn = $('#settings-close-btn'); downloadFolderInput = $('#default-download-folder'); changeFolderBtn = $('#change-download-folder-btn');
    qualitySelect = $('#audio-quality-select'); themeSelect = $('#theme-select'); visualizerToggle = $('#toggle-visualizer');
    visualizerStyleSelect = $('#visualizer-style-select'); visualizerSensitivity = $('#visualizer-sensitivity');
    sleepTimerSelect = $('#sleep-timer-select'); animationSelect = $('#animation-select'); backgroundAnimationEl = $('.background-animation'); emojiSelect = $('#emoji-select');
    customEmojiContainer = $('#custom-emoji-container'); customEmojiInput = $('#custom-emoji-input'); toggleDeleteSongs = $('#toggle-delete-songs');
    toggleDownloaderBtn = $('#toggle-downloader-btn'); contextMenu = $('#context-menu'); contextMenuEditTitle = $('#context-menu-edit-title'); contextMenuFavorite = $('#context-menu-favorite');
    editTitleOverlay = $('#edit-title-overlay'); editTitleInput = $('#edit-title-input'); originalTitlePreview = $('#original-title-preview');
    newTitlePreview = $('#new-title-preview'); editTitleCancelBtn = $('#edit-title-cancel-btn'); editTitleSaveBtn = $('#edit-title-save-btn');
    editTitleCloseBtn = $('#edit-title-close-btn');
    toggleFavoritesBtn = $('#toggle-favorites-btn'); toggleFavoritesOption = $('#toggle-favorites-option');
    confirmDeleteCloseBtn = $('#confirm-delete-close-btn');
    autoLoadLastFolderToggle = $('#toggle-auto-load-last-folder'); toggleMiniMode = $('#toggle-mini-mode');
    notificationBar = $('#notification-bar'); notificationMessage = $('#notification-message');

    loadAppMeta();

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

            // Update icon state (optional visual feedback)
            togglePlaylistBtn.style.color = isHidden ? 'var(--text-muted)' : 'var(--accent)';
            togglePlaylistBtn.style.borderColor = isHidden ? 'var(--border-soft)' : 'var(--accent)';

            // Adjust resizing
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

    // Downloader Tabs
    if (tabYtBtn && tabSpotifyBtn) {
        // Init default state
        if (activeDownloaderMode === 'youtube') {
            tabYtBtn.classList.add('active');
            viewYt.style.display = 'block';
            viewSpotify.style.display = 'none';
        }

        tabYtBtn.addEventListener('click', () => {
            activeDownloaderMode = 'youtube';
            tabYtBtn.classList.add('active');
            tabSpotifyBtn.classList.remove('active');
            viewYt.style.display = 'block';
            viewSpotify.style.display = 'none';
        });

        tabSpotifyBtn.addEventListener('click', () => {
            activeDownloaderMode = 'spotify';
            tabSpotifyBtn.classList.add('active');
            tabYtBtn.classList.remove('active');
            viewSpotify.style.display = 'block';
            viewYt.style.display = 'none';
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownload);
    }

    const overlays = [settingsOverlay, libraryOverlay, downloaderOverlay, editTitleOverlay, confirmDeleteOverlay, document.getElementById('dev-modal-overlay'), document.getElementById('user-help-overlay')];
    overlays.forEach(ov => {
        if (ov) {
            const modal = ov.querySelector('.settings-modal');
            const header = ov.querySelector('.settings-header');
            if (modal && header) makeDraggable(modal, header);

            ov.addEventListener('click', (e) => {
                if (e.target === ov) {
                    ov.classList.remove('visible');
                    setTimeout(() => {
                        if (modal) {
                            modal.style.position = '';
                            modal.style.top = '';
                            modal.style.left = '';
                            modal.style.transform = '';
                            modal.style.margin = '';
                        }
                    }, 300);
                }
            });
        }
    });

    document.querySelectorAll('.close-modal-btn, #settings-close-btn, #edit-title-cancel-btn, #confirm-delete-cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const ov = btn.closest('.overlay-container');
            if (ov) {
                const modal = ov.querySelector('.settings-modal');
                setTimeout(() => {
                    if (modal) {
                        modal.style.position = '';
                        modal.style.top = '';
                        modal.style.left = '';
                        modal.style.transform = '';
                        modal.style.margin = '';
                    }
                }, 300);
            }
        });
    });

    // Intro Settings
    const introCards = document.querySelectorAll('.intro-card');
    introCards.forEach(card => {
        const btn = card.querySelector('.apply-intro-btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent card click issues if any
                // 1. Remove active from all
                introCards.forEach(c => c.classList.remove('active'));
                // 2. Add active to current
                card.classList.add('active');
                // 3. Update button texts
                applyTranslations();
                // 4. Save setting
                const introKey = card.dataset.intro;
                saveSetting('activeIntro', introKey);
            });
        }
    });

    setupAudioEvents(); setupEventListeners();

    async function initializeApp() {
        try {
            // Pre-detect language for loader
            const savedLang = localStorage.getItem('language');
            if (savedLang) {
                currentLanguage = savedLang;
                document.documentElement.lang = currentLanguage;
            }

            AppLoader.init();
            AppLoader.update(5, tr('loaderBooting'));

            // Fast Path: Apply cached theme
            const cachedTheme = localStorage.getItem('theme') || 'midnight';
            document.documentElement.setAttribute('data-theme', cachedTheme);

            AppLoader.update(20, tr('loaderModules'));
            // Initialize Dynamic Themes & Animations
            ThemeListener.init();
            BackgroundAnimListener.init();

            AppLoader.update(30, tr('loaderLoadingSettings'));
            // Load Settings (includes folder scan)
            await loadSettings();

            // INIT APP SETTINGS LOGIC
            initSettingsLogic();

            AppLoader.update(70, tr('loaderApplying'));
            if (settings.activeIntro) localStorage.setItem('activeIntro', settings.activeIntro);
            if (settings.theme) localStorage.setItem('theme', settings.theme);

            // Initialize Theme Packs
            ThemePackListener.init({ visualizer, ui: { updateEmoji, updateCachedColor, resetToDefaultTheme }, settings });

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

            if (settings.activeThemePack) {
                setTimeout(() => {
                    ThemePackListener.restoreState(settings.activeThemePack, { visualizer, ui: { updateEmoji }, settings });
                }, 500);
            }

            AppLoader.update(100, tr('loaderReady'));
            AppLoader.finish();

            // Start Intro or Show App
            const activeIntro = settings.activeIntro || 'waterdrop';
            if (activeIntro !== 'none') {
                setTimeout(() => {
                    const introMgr = new IntroManager({ activeIntro: activeIntro });
                    introMgr.play().then(() => {
                        document.body.classList.add('ready');
                    });
                }, 600);
            } else {
                setTimeout(() => document.body.classList.add('ready'), 500);
            }

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

    // Load Folder and Refresh
    setTimeout(() => {
        const btn = document.getElementById('open-library-btn');
        if (btn) {
            // Remove old listeners by cloning
            const newBtn = btn.cloneNode(true);
            if (btn.parentNode) btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', async () => {
                try {
                    // Direct call to system dialog
                    const res = await windowApi.selectMusicFolder();
                    if (res && res.folderPath) {
                        saveSetting('currentFolderPath', res.folderPath);
                        currentFolderPath = res.folderPath;

                        // Refresh the folder
                        basePlaylist = res.tracks || [];
                        playlist = [...basePlaylist];
                        sortPlaylist(sortMode);
                        renderPlaylist();
                        updateUIForCurrentTrack();
                        showNotification(tr('folderLoaded', res.folderPath));

                        const libOverlay = document.getElementById('library-overlay');
                        if (libOverlay) libOverlay.classList.remove('visible');
                    }
                } catch (e) {
                    console.error("Load folder failed:", e);
                }
            });
        }

        // 2. Ensure Refresh Button Works
        const refBtn = document.getElementById('refresh-folder-btn');
        if (refBtn) {
            const newRefBtn = refBtn.cloneNode(true);
            if (refBtn.parentNode) refBtn.parentNode.replaceChild(newRefBtn, refBtn);

            newRefBtn.addEventListener('click', async () => {
                let path = currentFolderPath || settings.currentFolderPath;
                if (!path) {
                    const btn = document.getElementById('open-library-btn');
                    if (btn) btn.click();
                    return;
                }

                const res = await windowApi.refreshMusicFolder(path);
                if (res && res.tracks) {
                    currentFolderPath = res.folderPath;
                    saveSetting('currentFolderPath', currentFolderPath);
                    basePlaylist = res.tracks;
                    playlist = [...basePlaylist];
                    sortPlaylist(sortMode);
                    renderPlaylist();
                    showNotification(tr('folderRefreshed'));
                }
            });
        }
    }, 500);


    // Context Menu
    let cmTimeout;
    function showContextMenu(e, index) {
        e.preventDefault();
        const cm = document.getElementById('context-menu');
        if (!cm) return;

        // Store index globally
        contextTrackIndex = index;

        // Calculate position (keep in bounds)
        let x = e.clientX;
        let y = e.clientY;

        const w = cm.offsetWidth || 200;
        const h = cm.offsetHeight || 250;

        if (x + w > window.innerWidth) x = window.innerWidth - w - 10;
        if (y + h > window.innerHeight) y = window.innerHeight - h - 10;

        cm.style.left = x + 'px';
        cm.style.top = y + 'px';
        cm.classList.add('visible');

        // Setup dismiss
        const dismiss = () => {
            cm.classList.remove('visible');
            document.removeEventListener('click', dismiss);
        };
        setTimeout(() => document.addEventListener('click', dismiss), 50);
    }

    // Bind Context Menu Actions (Running once at end of file)
    setTimeout(() => {
        // Play
        const cmPlay = document.getElementById('cm-play');
        if (cmPlay) cmPlay.onclick = () => {
            if (contextTrackIndex !== null) playTrack(contextTrackIndex);
        };

        // Edit Title
        const cmEdit = document.getElementById('cm-edit');
        if (cmEdit) cmEdit.onclick = () => {
            if (contextTrackIndex === null) return;
            const t = playlist[contextTrackIndex];

            // Ensure elements exist before accessing
            if (originalTitlePreview) originalTitlePreview.textContent = t.title;
            if (newTitlePreview) newTitlePreview.textContent = t.title;
            if (editTitleInput) editTitleInput.value = t.title;

            if (editTitleOverlay) editTitleOverlay.classList.add('visible');
        };

        // Favorite
        const cmFav = document.getElementById('cm-fav');
        if (cmFav) cmFav.onclick = () => {
            if (contextTrackIndex !== null && playlist[contextTrackIndex]) toggleFavorite(playlist[contextTrackIndex].path);
        };

        // Folder
        const cmFolder = document.getElementById('cm-folder');
        if (cmFolder) cmFolder.onclick = () => {
            if (contextTrackIndex !== null && playlist[contextTrackIndex]) windowApi.showInFolder(playlist[contextTrackIndex].path);
        };

        // Delete
        const cmDelete = document.getElementById('cm-delete');
        if (cmDelete) cmDelete.onclick = () => {
            if (contextTrackIndex !== null && playlist[contextTrackIndex]) {
                trackToDeletePath = playlist[contextTrackIndex].path;
                if (confirmDeleteOverlay) confirmDeleteOverlay.classList.add('visible');
            }
        };
    }, 1000);


    // Dynamic Island
    dynamicIsland = new DynamicIsland();

    // Global showNotification wrapper
    window.showNotification = function (message, type = 'info', duration = 3000) {
        if (dynamicIsland) dynamicIsland.show(message, type, duration);
    };

    window.hideNotification = function () {
        if (dynamicIsland) dynamicIsland.hide();
    };

});
