import * as App from '../wailsjs/go/main/App.js';
import lovingDinosImg from './assets/Two_Loving_Cute_Dinos.png';
import lovingDinosIco from './assets/Two_Loving_Cute_Dinos.ico';
import { translations } from './translations.js';

// --- SHIM FOR COMPATIBILITY ---
const windowApi = {
    getSettings: App.GetSettings,
    setSetting: App.SetSetting,
    selectFolder: App.SelectFolder,
    selectMusicFolder: App.SelectMusicFolder,
    refreshMusicFolder: App.RefreshMusicFolder,
    downloadFromYouTube: App.DownloadFromYouTube,
    deleteTrack: App.DeleteTrack,
    updateTitle: App.UpdateTitle,
    showInFolder: App.ShowInFolder,
    moveFile: App.MoveFile,
    setWindowSize: App.SetWindowSize,
    onMediaControl: (cb) => { /* Not fully implemented in Wails yet */ },
    onDownloadProgress: (cb) => { /* Not fully implemented via Events yet */ },
    sendPlaybackState: App.SendPlaybackState
};

window.api = windowApi; 

// --- STATE & GLOBALS ---
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

// Visualizer State
let audioContext, analyser, sourceNode, bassFilter, trebleFilter, reverbNode, reverbGain, masterGain;
let visualizerDataArray;
let visualizerRunning = false;

// DOM Elements
let $, trackTitleEl, trackArtistEl, musicEmojiEl, currentTimeEl, durationEl, progressBar, progressFill, playBtn, playIcon, pauseIcon, prevBtn, nextBtn, loopBtn, shuffleBtn, volumeSlider, volumeIcon, playlistEl, playlistInfoBar, loadFolderBtn, openLibraryBtn, libraryOverlay, libraryCloseBtn, refreshFolderBtn, searchInput, sortSelect, ytUrlInput, ytNameInput, downloadBtn, downloaderOverlay, downloaderCloseBtn, downloadStatusEl, downloadProgressFill, visualizerCanvas, visualizerContainer, langButtons, settingsBtn, settingsOverlay, settingsCloseBtn, downloadFolderInput, changeFolderBtn, qualitySelect, themeSelect, visualizerToggle, visualizerStyleSelect, visualizerSensitivity, sleepTimerSelect, animationSelect, backgroundAnimationEl, emojiSelect, customEmojiContainer, customEmojiInput, toggleDeleteSongs, toggleDownloaderBtn, contextMenu, contextMenuEditTitle, contextMenuFavorite, editTitleOverlay, editTitleInput, originalTitlePreview, newTitlePreview, editTitleCancelBtn, editTitleSaveBtn, editTitleCloseBtn, confirmDeleteOverlay, confirmDeleteBtn, confirmDeleteCancelBtn, confirmDeleteCloseBtn, autoLoadLastFolderToggle, toggleMiniMode, notificationBar, notificationMessage, notificationTimeout, accentColorPicker, toggleFocusModeBtn, dropZone, toggleEnableFocus, toggleEnableDrag, toggleUseCustomColor, accentColorContainer, speedSlider, speedValue, snowInterval, toggleFavoritesBtn, toggleFavoritesOption, mainFavoriteBtn;
let favorites = [];
let favoritesSet = new Set();
let showingFavoritesOnly = false;

let trackToDeletePath = null;
let bassBoostToggle, bassBoostSlider, bassBoostValueEl, bassBoostContainer;
let trebleBoostToggle, trebleBoostSlider, trebleBoostValueEl, trebleBoostContainer;
let reverbToggle, reverbSlider, reverbValueEl, reverbContainer;
let toggleCinemaMode, btnExportPlaylist, playlistPositionSelect;
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

function saveSetting(key, value) {
    if (settings) settings[key] = value;
    windowApi.setSetting(key, value);
}

function updateCachedColor() {
    cachedAccentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#38bdf8';
}

function updatePerformanceStats() {
    if (document.hidden) {
        requestAnimationFrame(updatePerformanceStats);
        return;
    }
    
    const now = performance.now();
    const interval = 1000 / targetFps;
    const statsInterval = 1000; // Recalculate stats every 1s

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
        fps = Math.round((frameCount * 1000) / timeSinceLastLog);
        
        // Rolling average for stability check
        if (isPlaying && !performanceMode && visualizerEnabled) {
            avgFps = (avgFps * 0.7) + (fps * 0.3);
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
        // If Snuggle Time was active, turn it off because they conflict
        if (settings.snuggleTimeEnabled) {
            saveSetting('snuggleTimeEnabled', false);
            const stToggle = document.getElementById('toggle-snuggle-time');
            if (stToggle) stToggle.checked = false;
            applySnuggleTime(false);
        }

        stopVisualizer();
        applyAnimationSetting('off');
        document.body.classList.add('perf-mode-active');
        if (!silent) showNotification(tr('perfModeOn'));
    } else {
        if (isPlaying) startVisualizer();
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

// --- CORE PLAYER LOGIC ---
function playTrack(index) {
    if (index < 0 || index >= playlist.length) { isPlaying = false; updatePlayPauseUI(); return; }        
    currentIndex = index;
    const track = playlist[index];
    currentTrackPath = track.path;
    let rawPath = track.path.replace(/\\/g, '/');
    let serverPath = '/music/' + rawPath;
    let safeUrl = encodeURI(serverPath).replace(/#/g, '%23');
    
    audio.src = safeUrl;

    const speed = speedSlider ? parseFloat(speedSlider.value) : 1.0;
    audio.defaultPlaybackRate = speed;
    audio.playbackRate = speed;
    
    // Ensure Context is running
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }

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
async function applyCyberpunk(enabled, showIntro = false) {
    document.body.classList.toggle('cyberpunk-active', enabled);
    const accentToggle = document.getElementById('toggle-use-custom-color');
    
    if (enabled) {
        // Exclusive with Snuggle Time
        if (settings.snuggleTimeEnabled) {
            saveSetting('snuggleTimeEnabled', false);
            const stToggle = document.getElementById('toggle-snuggle-time');
            if (stToggle) stToggle.checked = false;
            applySnuggleTime(false);
        }
        // Exclusive with Sleep Time
        if (settings.sleepTimeEnabled) {
            saveSetting('sleepTimeEnabled', false);
            const slToggle = document.getElementById('toggle-sleeptime');
            if (slToggle) slToggle.checked = false;
            applySleepTime(false);
        }
        // Exclusive with Sunset & Sakura
        if (settings.sunsetEnabled) { saveSetting('sunsetEnabled', false); document.getElementById('toggle-sunset').checked = false; applySunsetDrive(false); }
        if (settings.sakuraEnabled) { saveSetting('sakuraEnabled', false); document.getElementById('toggle-sakura').checked = false; applySakuraSpirit(false); }
        
        // Exclusive with Performance Mode
        if (performanceMode) {
            setPerformanceMode(false, true);
        }

        if (showIntro) {
            const intro = document.getElementById('cyberpunk-intro');
            if (intro) {
                intro.classList.add('visible');
                setTimeout(() => intro.classList.remove('visible'), 2500);
            }
        }

        document.documentElement.setAttribute('data-theme', 'cyberpunk');
        visualizerEnabled = true;
        if (visualizerToggle) visualizerToggle.checked = true;
        saveSetting('visualizerEnabled', true);
        if (isPlaying) startVisualizer();

        currentVisualizerStyle = 'glitch';
        if (visualizerStyleSelect) {
            visualizerStyleSelect.value = 'glitch';
            visualizerStyleSelect.disabled = true;
        }
        applyAnimationSetting('off');
        if (animationSelect) {
            animationSelect.value = 'off';
            animationSelect.disabled = true;
        }
        updateEmoji('auto'); 
        if (emojiSelect) {
            emojiSelect.value = 'auto';
            emojiSelect.disabled = true;
        }
        if (themeSelect) themeSelect.disabled = true;
        
        if (customEmojiContainer) customEmojiContainer.style.display = 'none';

        if (accentToggle) {
            accentToggle.checked = false;
            accentToggle.disabled = true;
            if (accentColorContainer) accentColorContainer.classList.add('hidden');
            document.documentElement.style.removeProperty('--accent');
        }
        updateCachedColor();
    } else {
        const th = settings.theme || 'blue';
        document.documentElement.setAttribute('data-theme', th);
        if (themeSelect) {
            themeSelect.value = th;
            themeSelect.disabled = false;
        }

        currentVisualizerStyle = settings.visualizerStyle || 'bars';
        if (visualizerStyleSelect) {
            visualizerStyleSelect.value = currentVisualizerStyle;
            visualizerStyleSelect.disabled = false;
        }
        applyAnimationSetting(settings.animationMode || 'flow');
        if (animationSelect) {
            animationSelect.value = settings.animationMode || 'flow';
            animationSelect.disabled = false;
        }
        const et = settings.coverMode || 'note';
        updateEmoji(et, settings.customCoverEmoji);
        if (emojiSelect) {
            emojiSelect.value = et;
            emojiSelect.disabled = false;
        }
        
        if (accentToggle) {
            accentToggle.disabled = false;
            accentToggle.checked = !!settings.useCustomColor;
            if (accentColorContainer) accentColorContainer.classList.toggle('hidden', !accentToggle.checked);
            if (accentToggle.checked) {
                document.documentElement.style.setProperty('--accent', settings.customAccentColor || '#38bdf8');
            }
        }
        updateCachedColor();
    }
}

async function applySunsetDrive(enabled, showIntro = false) {
    document.body.classList.toggle('sunset-active', enabled);
    const accentToggle = document.getElementById('toggle-use-custom-color');
    
    if (enabled) {
        if (settings.snuggleTimeEnabled) { saveSetting('snuggleTimeEnabled', false); document.getElementById('toggle-snuggle-time').checked = false; applySnuggleTime(false); }
        if (settings.sleepTimeEnabled) { saveSetting('sleepTimeEnabled', false); document.getElementById('toggle-sleeptime').checked = false; applySleepTime(false); }
        if (settings.cyberpunkEnabled) { saveSetting('cyberpunkEnabled', false); document.getElementById('toggle-cyberpunk').checked = false; applyCyberpunk(false); }
        if (settings.sakuraEnabled) { saveSetting('sakuraEnabled', false); document.getElementById('toggle-sakura').checked = false; applySakuraSpirit(false); }
        
        if (performanceMode) setPerformanceMode(false, true);

        if (showIntro) {
            const intro = document.getElementById('sunset-intro');
            if (intro) {
                intro.classList.add('visible');
                setTimeout(() => intro.classList.remove('visible'), 3500);
            }
        }

        document.documentElement.setAttribute('data-theme', 'sunset');
        visualizerEnabled = true;
        if (visualizerToggle) visualizerToggle.checked = true;
        saveSetting('visualizerEnabled', true);
        if (isPlaying) startVisualizer();

        currentVisualizerStyle = 'retro'; 
        if (visualizerStyleSelect) {
            visualizerStyleSelect.value = 'retro';
            visualizerStyleSelect.disabled = true;
        }
        
        applyAnimationSetting('flow'); 
        if (animationSelect) {
            animationSelect.value = 'flow';
            animationSelect.disabled = true;
        }

        updateEmoji('sunset_sun'); 
        if (emojiSelect) {
            emojiSelect.value = 'sunset_sun';
            emojiSelect.disabled = true;
        }
        if (themeSelect) themeSelect.disabled = true;
        
        if (customEmojiContainer) customEmojiContainer.style.display = 'none';

        if (accentToggle) {
            accentToggle.checked = false;
            accentToggle.disabled = true;
            if (accentColorContainer) accentColorContainer.classList.add('hidden');
            document.documentElement.style.removeProperty('--accent');
        }
        updateCachedColor();
    } else {
        const th = settings.theme || 'blue';
        document.documentElement.setAttribute('data-theme', th);
        if (themeSelect) { themeSelect.value = th; themeSelect.disabled = false; }

        currentVisualizerStyle = settings.visualizerStyle || 'bars';
        if (visualizerStyleSelect) { visualizerStyleSelect.value = currentVisualizerStyle; visualizerStyleSelect.disabled = false; }
        
        applyAnimationSetting(settings.animationMode || 'flow');
        if (animationSelect) { animationSelect.value = settings.animationMode || 'flow'; animationSelect.disabled = false; }
        
        const et = settings.coverMode || 'note';
        updateEmoji(et, settings.customCoverEmoji);
        if (emojiSelect) { emojiSelect.value = et; emojiSelect.disabled = false; }
        
        if (accentToggle) {
            accentToggle.disabled = false;
            accentToggle.checked = !!settings.useCustomColor;
            if (accentColorContainer) accentColorContainer.classList.toggle('hidden', !accentToggle.checked);
            if (accentToggle.checked) document.documentElement.style.setProperty('--accent', settings.customAccentColor || '#38bdf8');
        }
        updateCachedColor();
    }
}

async function applySakuraSpirit(enabled, showIntro = false) {
    document.body.classList.toggle('sakura-active', enabled);
    const accentToggle = document.getElementById('toggle-use-custom-color');
    
    if (enabled) {
        if (settings.snuggleTimeEnabled) { saveSetting('snuggleTimeEnabled', false); document.getElementById('toggle-snuggle-time').checked = false; applySnuggleTime(false); }
        if (settings.sleepTimeEnabled) { saveSetting('sleepTimeEnabled', false); document.getElementById('toggle-sleeptime').checked = false; applySleepTime(false); }
        if (settings.cyberpunkEnabled) { saveSetting('cyberpunkEnabled', false); document.getElementById('toggle-cyberpunk').checked = false; applyCyberpunk(false); }
        if (settings.sunsetEnabled) { saveSetting('sunsetEnabled', false); document.getElementById('toggle-sunset').checked = false; applySunsetDrive(false); }

        if (performanceMode) setPerformanceMode(false, true);

        if (showIntro) {
            const intro = document.getElementById('sakura-intro');
            if (intro) {
                intro.classList.add('visible');
                createSakuraPetals(); 
                setTimeout(() => { 
                    intro.classList.remove('visible'); 
                    stopSakuraPetals(); 
                }, 4000);
            }
        }

        document.documentElement.setAttribute('data-theme', 'sakura');
        visualizerEnabled = true;
        if (visualizerToggle) visualizerToggle.checked = true;
        saveSetting('visualizerEnabled', true);
        if (isPlaying) startVisualizer();

        currentVisualizerStyle = 'sakura_bloom'; 
        if (visualizerStyleSelect) {
            visualizerStyleSelect.value = 'sakura_bloom';
            visualizerStyleSelect.disabled = true;
        }
        
        applyAnimationSetting('off'); 
        if (animationSelect) {
            animationSelect.value = 'off';
            animationSelect.disabled = true;
        }

        updateEmoji('sakura_flower'); 
        if (emojiSelect) {
            emojiSelect.value = 'sakura_flower';
            emojiSelect.disabled = true;
        }
        if (themeSelect) themeSelect.disabled = true;
        
        if (customEmojiContainer) {
            customEmojiContainer.style.display = 'flex';
            if(customEmojiInput) customEmojiInput.value = '🌸';
        }

        if (accentToggle) {
            accentToggle.checked = false;
            accentToggle.disabled = true;
            if (accentColorContainer) accentColorContainer.classList.add('hidden');
            document.documentElement.style.removeProperty('--accent');
        }
        updateCachedColor();
    } else {
        const th = settings.theme || 'blue';
        document.documentElement.setAttribute('data-theme', th);
        if (themeSelect) { themeSelect.value = th; themeSelect.disabled = false; }

        currentVisualizerStyle = settings.visualizerStyle || 'bars';
        if (visualizerStyleSelect) { visualizerStyleSelect.value = currentVisualizerStyle; visualizerStyleSelect.disabled = false; }
        
        applyAnimationSetting(settings.animationMode || 'flow');
        if (animationSelect) { animationSelect.value = settings.animationMode || 'flow'; animationSelect.disabled = false; }
        
        const et = settings.coverMode || 'note';
        updateEmoji(et, settings.customCoverEmoji);
        if (emojiSelect) { emojiSelect.value = et; emojiSelect.disabled = false; }
        
        if (accentToggle) {
            accentToggle.disabled = false;
            accentToggle.checked = !!settings.useCustomColor;
            if (accentColorContainer) accentColorContainer.classList.toggle('hidden', !accentToggle.checked);
            if (accentToggle.checked) document.documentElement.style.setProperty('--accent', settings.customAccentColor || '#38bdf8');
        }
        updateCachedColor();
    }
}

let sakuraInterval;
function createSakuraPetals() {
    const container = document.getElementById('sakura-falling-container');
    if(!container) return;
    container.innerHTML = '';
    sakuraInterval = setInterval(() => {
        const petal = document.createElement('div');
        petal.classList.add('falling-petal');
        petal.textContent = '🌸';
        petal.style.left = Math.random() * 100 + '%';
        petal.style.animationDuration = (Math.random() * 3 + 2) + 's';
        petal.style.opacity = Math.random();
        petal.style.fontSize = (Math.random() * 10 + 15) + 'px';
        container.appendChild(petal);
        setTimeout(() => petal.remove(), 5000);
    }, 300);
}

function stopSakuraPetals() {
    if(sakuraInterval) clearInterval(sakuraInterval);
    const container = document.getElementById('sakura-falling-container');
    if(container) container.innerHTML = '';
}

function applySleepTime(enabled, showIntro = false) {

    document.body.classList.toggle('sleeptime-active', enabled);
    const accentToggle = document.getElementById('toggle-use-custom-color');
    
    if (enabled) {
        // Exclusive with Snuggle Time
        if (settings.snuggleTimeEnabled) {
            saveSetting('snuggleTimeEnabled', false);
            const stToggle = document.getElementById('toggle-snuggle-time');
            if (stToggle) stToggle.checked = false;
            applySnuggleTime(false);
        }
        // Exclusive with Cyberpunk
        if (settings.cyberpunkEnabled) {
            saveSetting('cyberpunkEnabled', false);
            const cyToggle = document.getElementById('toggle-cyberpunk');
            if (cyToggle) cyToggle.checked = false;
            applyCyberpunk(false);
        }
        // Exclusive with Sunset & Sakura
        if (settings.sunsetEnabled) { saveSetting('sunsetEnabled', false); document.getElementById('toggle-sunset').checked = false; applySunsetDrive(false); }
        if (settings.sakuraEnabled) { saveSetting('sakuraEnabled', false); document.getElementById('toggle-sakura').checked = false; applySakuraSpirit(false); }
        
        // Exclusive with Performance Mode
        if (performanceMode) {
            setPerformanceMode(false, true);
        }

        if (showIntro) {
            const intro = document.getElementById('sleep-intro');
            if (intro) {
                intro.classList.add('visible');
                setTimeout(() => intro.classList.remove('visible'), 3500);
            }
        }

        document.documentElement.setAttribute('data-theme', 'sleeptime');
        visualizerEnabled = true;
        if (visualizerToggle) visualizerToggle.checked = true;
        saveSetting('visualizerEnabled', true);
        if (isPlaying) startVisualizer();

        currentVisualizerStyle = 'moonlight';
        if (visualizerStyleSelect) {
            visualizerStyleSelect.value = 'moonlight';
            visualizerStyleSelect.disabled = true;
        }
        applyAnimationSetting('starry');
        if (animationSelect) {
            animationSelect.value = 'starry';
            animationSelect.disabled = true;
        }
        updateEmoji('moon'); 
        if (emojiSelect) {
            emojiSelect.value = 'moon';
            emojiSelect.disabled = true;
        }
        if (themeSelect) themeSelect.disabled = true;
        
        if (customEmojiContainer) customEmojiContainer.style.display = 'none';

        if (accentToggle) {
            accentToggle.checked = false;
            accentToggle.disabled = true;
            if (accentColorContainer) accentColorContainer.classList.add('hidden');
            document.documentElement.style.removeProperty('--accent');
        }
        updateCachedColor();
    } else {
        const th = settings.theme || 'blue';
        document.documentElement.setAttribute('data-theme', th);
        if (themeSelect) {
            themeSelect.value = th;
            themeSelect.disabled = false;
        }

        currentVisualizerStyle = settings.visualizerStyle || 'bars';
        if (visualizerStyleSelect) {
            visualizerStyleSelect.value = currentVisualizerStyle;
            visualizerStyleSelect.disabled = false;
        }
        applyAnimationSetting(settings.animationMode || 'flow');
        if (animationSelect) {
            animationSelect.value = settings.animationMode || 'flow';
            animationSelect.disabled = false;
        }
        const et = settings.coverMode || 'note';
        updateEmoji(et, settings.customCoverEmoji);
        if (emojiSelect) {
            emojiSelect.value = et;
            emojiSelect.disabled = false;
        }
        
        if (accentToggle) {
            accentToggle.disabled = false;
            accentToggle.checked = !!settings.useCustomColor;
            if (accentColorContainer) accentColorContainer.classList.toggle('hidden', !accentToggle.checked);
            if (accentToggle.checked) {
                document.documentElement.style.setProperty('--accent', settings.customAccentColor || '#38bdf8');
            }
        }
        updateCachedColor();
    }
}

function updateUIForCurrentTrack() {
    if (currentIndex === -1 || !playlist[currentIndex]) {
        if (trackTitleEl) trackTitleEl.textContent = tr('nothingPlaying');
        if (trackArtistEl) trackArtistEl.textContent = '...';
        if (musicEmojiEl) musicEmojiEl.textContent = '\uD83C\uDFB5'; // Note emoji
        updateActiveTrackInPlaylist();
        updateTrackTitleScroll();
        return;
    }
    const track = playlist[currentIndex];
    if (trackTitleEl) trackTitleEl.textContent = track.title;
    if (trackArtistEl) trackArtistEl.textContent = track.artist || tr('unknownArtist');

    if (mainFavoriteBtn) {
        const isFav = favoritesSet.has(track.path);
        mainFavoriteBtn.style.display = 'flex';
        mainFavoriteBtn.style.color = isFav ? '#fbbf24' : 'var(--text-muted)';
        const svg = mainFavoriteBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
    }

    const isSnuggle = settings.snuggleTimeEnabled || document.body.classList.contains('snuggle-time-active');

    if (isSnuggle) {
        updateEmoji('loving_dinos');
    } else {
        updateEmoji(settings.coverMode || 'note', settings.customCoverEmoji);
    }
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
    document.querySelectorAll('[data-lang-key]').forEach(el => { const text = tr(el.dataset.langKey); if (text) el.textContent = text; });

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

    if (isSnuggle) {
        emojiType = 'loving_dinos';
    } else if (isSleep) {
        emojiType = 'moon';
    } else if (isSunset) {
        emojiType = 'sunset_sun';
    } else if (isSakura) {
        emojiType = 'sakura_flower';
    }

    let emoji = '🎵'; 
    let isImage = false;
    let isHtml = false;

    if (emojiType === 'note') emoji = '🎵';
    else if (emojiType === 'dino') emoji = '🦖'; 
    else if (emojiType === 'moon') emoji = '🌙';
    else if (emojiType === 'sunset_sun') {
        emoji = '<div class="sun-cover"></div>';
        isHtml = true;
    }
    else if (emojiType === 'sakura_flower') {
        emoji = '<div class="sakura-cover">🌸</div>';
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
            let safeUrlPath = encodeURI(rawPath).replace(/#/g, '%23');
            const coverUrl = '/cover/' + safeUrlPath;
            isImage = true;
            emoji = coverUrl;
       }
    }

    if (isImage) {
        // Prevent flicker: if same source, do nothing
        const existingImg = musicEmojiEl.querySelector('img');
        if (existingImg) {
            // Check if src ends with the emoji url
            if(existingImg.src.endsWith(emoji.replace(/^\./, ''))) return;
        }
        
        musicEmojiEl.innerHTML = `<img src="${emoji}" alt="Cover" draggable="false" ondragstart="return false;" style="background: transparent !important; border: none !important; width: 100%; height: 100%; object-fit: contain;">`;
    } else if (isHtml) {
        musicEmojiEl.innerHTML = emoji;
    } else {
        musicEmojiEl.textContent = emoji;
    }
}

async function handleDownload() {
    const url = ytUrlInput.value.trim(); if (!url) { downloadStatusEl.textContent = tr('statusUrlMissing'); return; }

    downloadBtn.disabled = true;
    downloadBtn.style.opacity = '0.5';
    downloadStatusEl.textContent = tr('statusStarting');

    try {
        const result = await windowApi.downloadFromYouTube({ url, customName: ytNameInput.value.trim(), quality: qualitySelect.value });
        if (result.success) {
            downloadStatusEl.textContent = tr('statusSuccess');
            ytUrlInput.value = '';
            ytNameInput.value = '';
            if (currentFolderPath && settings.downloadFolder && currentFolderPath === settings.downloadFolder) {
                refreshFolderBtn.click();
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

function setupVisualizer() {
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        sourceNode = audioContext.createMediaElementSource(audio);
        analyser = audioContext.createAnalyser();

        bassFilter = audioContext.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 120;
        bassFilter.gain.value = 0;

        trebleFilter = audioContext.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = 3000;
        trebleFilter.gain.value = 0;

        reverbNode = audioContext.createConvolver();
        reverbNode.buffer = createReverbBuffer(2.0); 
        reverbGain = audioContext.createGain();
        reverbGain.gain.value = 0;

        analyser.fftSize = 512;
        updateAnalyserSettings();

        // New Graph:
        // Source -> Bass -> Treble -> Analyser -> Destination (Dry)
        // Treble -> Reverb -> ReverbGain -> Analyser (Wet)
        
        sourceNode.connect(bassFilter);
        bassFilter.connect(trebleFilter);
        
        // Dry Path
        trebleFilter.connect(analyser);
        
        // Wet Path
        trebleFilter.connect(reverbNode);
        reverbNode.connect(reverbGain);
        reverbGain.connect(analyser);

        // Final Output
        analyser.connect(audioContext.destination);

        visualizerDataArray = new Uint8Array(analyser.frequencyBinCount);
        updateAudioEffects();
    } catch (e) { console.error("Visualizer error:", e); visualizerEnabled = false; }
}

function createReverbBuffer(duration) {
    const rate = audioContext.sampleRate;
    const len = rate * duration;
    const buffer = audioContext.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
        const channel = buffer.getChannelData(c);
        for (let i = 0; i < len; i++) {
            channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
        }
    }
    return buffer;
}

function updateAudioEffects() {
    if (!audioContext) return;
    const t = audioContext.currentTime;

    const bassOn = !!settings.bassBoostEnabled;
    const crystalOn = !!settings.trebleBoostEnabled;
    const reverbOn = !!settings.reverbEnabled;

    if (bassFilter) {
        const bg = bassOn ? (parseFloat(settings.bassBoostValue) || 6) : 0;
        bassFilter.gain.cancelScheduledValues(t);
        bassFilter.gain.setTargetAtTime(bg, t, 0.1);
    }

    if (trebleFilter) {
        const tg = crystalOn ? (parseFloat(settings.trebleBoostValue) || 6) : 0;
        trebleFilter.gain.cancelScheduledValues(t);
        trebleFilter.gain.setTargetAtTime(tg, t, 0.1);
    }

    if (reverbGain) {
        const val = parseFloat(settings.reverbValue) || 30;
        const rg = reverbOn ? (val / 100) : 0;
        reverbGain.gain.cancelScheduledValues(t);
        reverbGain.gain.setTargetAtTime(rg, t, 0.1);
    }

    const mainIndicator = document.getElementById('active-features-indicator');
    if (mainIndicator) {
        mainIndicator.classList.toggle('active', bassOn || crystalOn || reverbOn);
    }

    const mb = document.getElementById('modal-feat-bass');
    const mc = document.getElementById('modal-feat-crystal');
    const mr = document.getElementById('modal-feat-reverb');
    if (mb) mb.classList.toggle('active', bassOn);
    if (mc) mc.classList.toggle('active', crystalOn);
    if (mr) mr.classList.toggle('active', reverbOn);
}

function startVisualizer() {
    if (!visualizerEnabled || !isPlaying) return;

    if (!audioContext || audioContext.state === 'closed') {
        setupVisualizer();
        if (!audioContext) return;
    }

    if (visualizerContainer && visualizerCanvas) {
        if (visualizerContainer.clientWidth > 0 && visualizerContainer.clientHeight > 0) {
            visualizerCanvas.width = visualizerContainer.clientWidth;
            visualizerCanvas.height = visualizerContainer.clientHeight;
        }
    }

    if (visualizerRunning) return;

    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(e => console.error("Resume failed", e)).finally(() => {
            if (!visualizerRunning && isPlaying) {
                visualizerRunning = true;
                drawVisualizer();
            }
        });
    } else {
        visualizerRunning = true;
        drawVisualizer();
    }
}

function stopVisualizer() {
    visualizerRunning = false;
    if (visualizerCanvas) {
        const ctx = visualizerCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    }
}

function updateAnalyserSettings() {
    if (!analyser) return;
    analyser.smoothingTimeConstant = 0.6;
    const dbValue = -15 - (visSensitivity * 15);
    analyser.maxDecibels = dbValue;
}

function drawVisualizer() {
    if (!visualizerRunning || performanceMode || !visualizerEnabled || !analyser) {
        visualizerRunning = false;
        return;
    }

    if (!isPlaying) {
        visualizerRunning = false;
        return;
    }

    if (document.hidden) {
        requestAnimationFrame(drawVisualizer);
        return;
    }

    const now = performance.now();
    const interval = 1000 / targetFps;
    const delta = now - lastRenderTime;

    if (delta < interval) {
        requestAnimationFrame(drawVisualizer);
        return;
    }

    lastRenderTime = now - (delta % interval);
    frameCount++; 
    requestAnimationFrame(drawVisualizer);

    const ctx = visualizerCanvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = visualizerCanvas;
    ctx.clearRect(0, 0, width, height);
    
    const ac = cachedAccentColor;
    analyser.getByteFrequencyData(visualizerDataArray); 
    const boost = 1 + (visSensitivity * 0.1);        

    if (currentVisualizerStyle === 'bars') {
        const bl = visualizerDataArray.length / 2;
        const bw = (width / bl) * 0.8;
        for (let i = 0; i < bl; i++) {
            const bh = (visualizerDataArray[i] / 255) * height * 0.8 * boost;
            ctx.fillStyle = ac;
            ctx.fillRect(i * (width / bl), height - bh, bw, bh);
        }
    } else if (currentVisualizerStyle === 'waveform') {
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = ac;
        const sliceWidth = width / visualizerDataArray.length;
        let x = 0;
        for (let i = 0; i < visualizerDataArray.length; i++) {
            const v = visualizerDataArray[i] / 128.0;
            const y = (v * height) / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
        }
        ctx.stroke();
    } else if (currentVisualizerStyle === 'orbit') {
        const centerX = width / 2, centerY = height / 2;
        for (let i = 0; i < 4; i++) {
            const val = visualizerDataArray[i * 8];
            const radius = (height / 6) + (val / 255) * (height / 3) * boost;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = i === 0 ? ac : `${ac}44`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            const angle = (Date.now() * 0.001 * (i + 1)) % (Math.PI * 2);
            ctx.beginPath();
            ctx.arc(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius, 4, 0, Math.PI * 2);
            ctx.fillStyle = "#fff";
            ctx.fill();
        }
    } else if (currentVisualizerStyle === 'glitch') {
        const bars = 30, bw = width / bars;
        for (let i = 0; i < bars; i++) {
            const val = visualizerDataArray[i * 3];
            const bh = (val / 255) * height * 0.9 * boost;
            ctx.fillStyle = ac;
            ctx.globalAlpha = 0.8;
            ctx.fillRect(i * bw, height - bh, bw - 4, bh);
            
            if (val > 210 && Math.random() > 0.9) {
                ctx.fillStyle = "#fff";
                ctx.globalAlpha = 1.0;
                ctx.fillRect(i * bw - 5, height - bh - 10, bw + 10, 3);
            }
        }
        ctx.globalAlpha = 1.0;
    } else if (currentVisualizerStyle === 'retro') {
        // High-Resolution & Extra-Wide Retro Mode: Filling the X-axis completely
        const targetRows = 18;
        const totalBlockHeight = height / targetRows;
        const gapY = 1.5; 
        const blockHeight = totalBlockHeight - gapY;
        
        // Much wider Rectangles to fill the X-axis effectively
        const blockWidth = blockHeight * 5.0; 
        const gapX = 3;
        const totalBlockWidth = blockWidth + gapX;
        
        const centerX = width / 2;
        // Fill entire width from center
        const maxColumns = Math.ceil(centerX / totalBlockWidth) + 1;
        // Focus on active frequency range (lower 50%) to ensure bars at edges move
        const usefulDataLimit = Math.floor(visualizerDataArray.length * 0.5);

        for (let i = 0; i < maxColumns; i++) {
            const dataIndex = Math.floor((i / maxColumns) * usefulDataLimit); 
            let val = visualizerDataArray[dataIndex] * boost;
            
            const numBlocks = Math.floor((val / 255) * targetRows);
            
            const xRight = centerX + (i * totalBlockWidth);
            const xLeft = centerX - ((i + 1) * totalBlockWidth);

            for (let j = 0; j < numBlocks; j++) {
                 if (j >= targetRows) break;
                 const y = height - ((j + 1) * totalBlockHeight);
                 
                 // Strict 12-4-2 Color Logic (6-2-1 scaled for 18 rows)
                 if (j >= 16) ctx.fillStyle = '#ff4444';      
                 else if (j >= 12) ctx.fillStyle = '#ffcc00'; 
                 else ctx.fillStyle = ac;                    

                 ctx.shadowBlur = blockHeight * 0.8; 
                 ctx.shadowColor = ctx.fillStyle;
                 
                 ctx.fillRect(xLeft, y, blockWidth, blockHeight);
                 ctx.fillRect(xRight, y, blockWidth, blockHeight);
            }
        }
        ctx.shadowBlur = 0;
    } else if (currentVisualizerStyle === 'sakura_bloom') {
        const centerX = width / 2, centerY = height / 2;
        const count = 12; // Far fewer flowers for a clearer look
        const radiusBase = Math.min(width, height) / 3;
        
        for (let i = 0; i < count; i++) {
            const dataIdx = Math.floor((i / count) * (visualizerDataArray.length * 0.5));
            const val = visualizerDataArray[dataIdx];
            // Added more complex movement to break the circle symmetry
            const angle = (i / count) * Math.PI * 2 + (Date.now() * 0.0003);
            const drift = Math.sin(Date.now() * 0.001 + i) * 20;
            
            const dist = radiusBase + (val / 255) * (radiusBase * 1.2) * boost + drift;
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;
            
            const size = 8 + (val / 255) * 15;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle + (Date.now() * 0.0008)); // Slower rotation
            ctx.fillStyle = '#fbcfe8';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#fbcfe8';
            ctx.globalAlpha = 0.6 + (val / 255) * 0.4;

            for (let p = 0; p < 5; p++) {
                ctx.rotate((Math.PI * 2) / 5);
                ctx.beginPath();
                ctx.ellipse(0, -size, size * 0.6, size, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = '#fda4af';
            ctx.fill();
            
            ctx.restore();
        }
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
    } else if (currentVisualizerStyle === 'zen') {

        const centerX = width / 2, centerY = height / 2;
        const blv = (visualizerDataArray[0] + visualizerDataArray[2]) / 2;
        const count = 16;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const dist = (blv / 255) * (height / 2.2) * boost;
            ctx.beginPath();
            ctx.arc(centerX + Math.cos(angle) * dist, centerY + Math.sin(angle) * dist, 4, 0, Math.PI * 2);
            ctx.fillStyle = ac;
            ctx.shadowBlur = 10;
            ctx.shadowColor = ac;
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    } else if (currentVisualizerStyle === 'moonlight') {
        const centerX = width / 2, centerY = height / 2, moonRadius = Math.min(width, height) / 4.5;
        const blv = (visualizerDataArray[0] + visualizerDataArray[1] + visualizerDataArray[2]) / 3;
        const pulse = (blv / 255) * 25 * boost;
        
        // Soft Glow
        ctx.beginPath();
        ctx.arc(centerX, centerY, moonRadius + pulse + 20, 0, Math.PI * 2);
        ctx.fillStyle = `${ac}11`;
        ctx.fill();

        // The Moon
        ctx.beginPath();
        ctx.arc(centerX, centerY, moonRadius + (pulse * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = ac;
        ctx.shadowBlur = 40 + pulse;
        ctx.shadowColor = ac;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Visualizer Waves (Orbiting stars)
        for (let i = 0; i < visualizerDataArray.length; i += 4) {
            const val = visualizerDataArray[i];
            if (val > 80) {
                const angle = (i / visualizerDataArray.length) * Math.PI * 2 + (Date.now() * 0.0003);
                const orbitDist = moonRadius + 30 + (val / 255) * (width / 4);
                const x = centerX + Math.cos(angle) * orbitDist;
                const y = centerY + Math.sin(angle) * orbitDist;
                
                ctx.beginPath();
                ctx.arc(x, y, (val / 255) * 4, 0, Math.PI * 2);
                ctx.fillStyle = i % 8 === 0 ? "#fff" : ac;
                ctx.globalAlpha = val / 255;
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
        }
    }
    if (musicEmojiEl && !isNaN(audio.currentTime)) {
        const blv = (visualizerDataArray[0] + visualizerDataArray[1]) / 2, fy = Math.sin(audio.currentTime * 2) * 10;
        let js = (blv > 180) ? 1 + (Math.min((blv - 180) / 50, 1) * 0.15) : 1; musicEmojiEl.style.transform = `translateY(${fy}px) scale(${js})`;
    }
}

function applySnuggleTime(enabled, showIntro = false) {
    document.body.classList.toggle('snuggle-time-active', enabled);
    const accentToggle = document.getElementById('toggle-use-custom-color');
    
    if (enabled) {
        // Exclusive with Sleep Time
        if (settings.sleepTimeEnabled) {
            saveSetting('sleepTimeEnabled', false);
            const slToggle = document.getElementById('toggle-sleeptime');
            if (slToggle) slToggle.checked = false;
            applySleepTime(false);
        }
        // Exclusive with Cyberpunk
        if (settings.cyberpunkEnabled) {
            saveSetting('cyberpunkEnabled', false);
            const cyToggle = document.getElementById('toggle-cyberpunk');
            if (cyToggle) cyToggle.checked = false;
            applyCyberpunk(false);
        }
        // Exclusive with Sunset & Sakura
        if (settings.sunsetEnabled) { saveSetting('sunsetEnabled', false); document.getElementById('toggle-sunset').checked = false; applySunsetDrive(false); }
        if (settings.sakuraEnabled) { saveSetting('sakuraEnabled', false); document.getElementById('toggle-sakura').checked = false; applySakuraSpirit(false); }

        // Automatically disable Performance Mode if Snuggle Pack is turned on
        if (performanceMode) {
            setPerformanceMode(false, true);
        }

        if (showIntro) {
            const intro = document.getElementById('snuggle-intro');
            if (intro) {
                intro.classList.add('visible');
                setTimeout(() => intro.classList.remove('visible'), 3000);
            }
        }

        document.documentElement.setAttribute('data-theme', 'dinolove');
        visualizerEnabled = true;
        if (visualizerToggle) visualizerToggle.checked = true;
        windowApi.setSetting('visualizerEnabled', true);
        if (isPlaying) startVisualizer();

        currentVisualizerStyle = 'retro';
        if (visualizerStyleSelect) {
            visualizerStyleSelect.value = 'retro';
            visualizerStyleSelect.disabled = true;
        }
        applyAnimationSetting('xmas');
        if (animationSelect) {
            animationSelect.value = 'xmas';
            animationSelect.disabled = true;
        }
        updateEmoji('loving_dinos');
        if (emojiSelect) {
            emojiSelect.value = 'loving_dinos';
            emojiSelect.disabled = true;
        }
        if (themeSelect) themeSelect.disabled = true;
        
        if (customEmojiContainer) customEmojiContainer.style.display = 'none';

        if (accentToggle) {
            accentToggle.checked = false;
            accentToggle.disabled = true;
            if (accentColorContainer) accentColorContainer.classList.add('hidden');
            document.documentElement.style.removeProperty('--accent');
        }
        updateCachedColor();
    } else {
        const th = settings.theme || 'blue';
        document.documentElement.setAttribute('data-theme', th);
        if (themeSelect) {
            themeSelect.value = th;
            themeSelect.disabled = false;
        }

        currentVisualizerStyle = settings.visualizerStyle || 'bars';
        if (visualizerStyleSelect) {
            visualizerStyleSelect.value = currentVisualizerStyle;
            visualizerStyleSelect.disabled = false;
        }
        applyAnimationSetting(settings.animationMode || 'flow');
        if (animationSelect) {
            animationSelect.value = settings.animationMode || 'flow';
            animationSelect.disabled = false;
        }
        const et = settings.coverMode || 'note';
        updateEmoji(et, settings.customCoverEmoji);
        if (emojiSelect) {
            emojiSelect.value = et;
            emojiSelect.disabled = false;
        }
        if (customEmojiContainer) customEmojiContainer.style.display = et === 'custom' ? 'flex' : 'none'; 

        if (accentToggle) {
            accentToggle.disabled = false;
            accentToggle.checked = !!settings.useCustomColor;
            if (accentColorContainer) accentColorContainer.classList.toggle('hidden', !accentToggle.checked);
            if (accentToggle.checked) {
                document.documentElement.style.setProperty('--accent', settings.customAccentColor || '#38bdf8');
            }
        }
        updateCachedColor();
    }
}

function setupAudioEvents() {
    audio.addEventListener('timeupdate', () => { if (!isNaN(audio.duration)) { const p = (audio.currentTime / audio.duration) * 100; if (progressFill) progressFill.style.width = `${p}%`; if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime); }});
    audio.addEventListener('durationchange', () => { if (durationEl) durationEl.textContent = isNaN(audio.duration) ? '0:00' : formatTime(audio.duration); });
    audio.addEventListener('play', () => {
        isPlaying = true;
        document.body.classList.add('is-playing');
        updatePlayPauseUI();
        updateUIForCurrentTrack();
        startVisualizer();
    });
    audio.addEventListener('pause', () => {
        isPlaying = false;
        document.body.classList.remove('is-playing');
        updatePlayPauseUI();
        stopVisualizer();
    });
    audio.addEventListener('ended', () => { stopVisualizer(); if (loopMode === 'one') { audio.currentTime = 0; audio.play(); } else playNext(); });
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
    
    // Apply Translations immediately
    applyTranslations();

    if (downloadFolderInput) downloadFolderInput.value = settings.downloadFolder || '';
    if (qualitySelect) qualitySelect.value = settings.audioQuality || 'best';
    
    if (animationSelect) { 
        let mode = settings.animationMode || 'flow'; 
        animationSelect.value = mode; 
        applyAnimationSetting(mode); 
    }

    if (themeSelect) themeSelect.value = settings.theme || 'blue';
    if (visualizerToggle) { visualizerToggle.checked = settings.visualizerEnabled !== false; visualizerEnabled = settings.visualizerEnabled !== false; }
    if (visualizerStyleSelect) { currentVisualizerStyle = settings.visualizerStyle || 'bars'; visualizerStyleSelect.value = currentVisualizerStyle; }
    if (visualizerSensitivity) { visSensitivity = settings.visSensitivity || 1.5; visualizerSensitivity.value = visSensitivity; }
    
    if (autoLoadLastFolderToggle) autoLoadLastFolderToggle.checked = settings.autoLoadLastFolder !== false;
    
    // Ensure mini mode is reset or handled
    if (toggleMiniMode) {
        toggleMiniMode.checked = false;
        document.body.classList.remove('is-mini');
    }

    // Auto-load last used folder
    if (settings.currentFolderPath && (settings.autoLoadLastFolder !== false)) {
        currentFolderPath = settings.currentFolderPath;
        try {
            const result = await windowApi.refreshMusicFolder(currentFolderPath);
            if (result && result.tracks) {
                basePlaylist = result.tracks;
                playlist = [...basePlaylist];
                sortPlaylist(sortMode);
                updateUIForCurrentTrack();
            }
        } catch (e) {
            console.error("Auto-load failed:", e);
        }
    }

    if (shuffleBtn) shuffleBtn.classList.toggle('mode-btn--active', shuffleOn);
    if (loopBtn) { loopBtn.classList.toggle('mode-btn--active', loopMode !== 'off'); updateLoopIcon(); }  

    if (toggleFavoritesOption) {
        toggleFavoritesOption.checked = settings.enableFavoritesPlaylist || false;
        if (toggleFavoritesBtn) toggleFavoritesBtn.style.display = settings.enableFavoritesPlaylist ? 'flex' : 'none';
    }

    if (toggleDeleteSongs) { 
        toggleDeleteSongs.checked = settings.deleteSongsEnabled || false; 
        deleteSongsEnabled = settings.deleteSongsEnabled || false; 
    }

    if (toggleEnableFocus) toggleEnableFocus.checked = settings.enableFocusMode !== false;
    if (toggleEnableDrag) toggleEnableDrag.checked = settings.enableDragAndDrop !== false;
    
    if (toggleUseCustomColor) { 
        toggleUseCustomColor.checked = settings.useCustomColor || false; 
        if (accentColorContainer) accentColorContainer.style.display = settings.useCustomColor ? 'flex' : 'none'; 
    }

    if (toggleCinemaMode) {
        toggleCinemaMode.checked = settings.cinemaMode || false;
        document.body.classList.toggle('cinema-mode', settings.cinemaMode || false);
    }

    if (playlistPositionSelect) {
        playlistPositionSelect.value = settings.playlistPosition || 'right';
        if (settings.playlistPosition === 'left') {
            document.body.classList.add('playlist-left');
        } else {
            document.body.classList.remove('playlist-left');
        }
    }

    if (settings.playlistHidden) {
        document.body.classList.add('playlist-hidden');
    } else {
        document.body.classList.remove('playlist-hidden');
    }
}

function updateLoopIcon() {
    if (!loopBtn) return;
    if (loopMode === 'one') loopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="12" y="17" font-size="10" font-weight="bold" fill="currentColor" stroke="none" text-anchor="middle">1</text></svg>`;
    else loopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
}

function applyAnimationSetting(mode) {
    if (!backgroundAnimationEl) return;
    backgroundAnimationEl.className = 'background-animation';
    backgroundAnimationEl.innerHTML = '';
    if (snowInterval) clearInterval(snowInterval);

    if (mode && mode !== 'off') {
        backgroundAnimationEl.style.display = 'block';
        backgroundAnimationEl.classList.add(`type-${mode}`);
        if (mode === 'xmas') startSnowfall();
        if (mode === 'starry') {
            // Optional: JS logic for more dynamic stars if needed
        }
    } else {
        backgroundAnimationEl.style.display = 'none';
    }
}

function startSnowfall() {
    const isMini = document.body.classList.contains('is-mini');
    const interval = isMini ? 800 : 400;

    const createSnowflake = () => {
        if (!backgroundAnimationEl) return;
        const flake = document.createElement('span');
        const duration = Math.random() * 5 + 8;

        flake.style.left = Math.random() * 100 + 'vw';
        flake.style.animationDuration = duration + 's';
        flake.style.opacity = isMini ? (Math.random() * 0.4 + 0.2) : (Math.random() * 0.7 + 0.3);
        flake.style.fontSize = isMini ? (Math.random() * 6 + 8) + 'px' : (Math.random() * 10 + 12) + 'px';
        flake.innerHTML = '\u2744';
        flake.style.position = 'absolute';
        flake.style.top = '-20px';
        flake.style.color = 'white';
        flake.style.pointerEvents = 'none';
        flake.style.animationName = 'snowfall';
        flake.style.animationTimingFunction = 'linear';
        flake.style.animationIterationCount = 'infinite';
        flake.style.filter = 'blur(1px)';
        backgroundAnimationEl.appendChild(flake);

        setTimeout(() => { flake.remove(); }, (duration * 1000) + 100);
    };
    snowInterval = setInterval(createSnowflake, interval);
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
    const settingTabs = document.querySelectorAll('.settings-nav-btn');
    const settingContents = document.querySelectorAll('.settings-tab-content');

    settingTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            settingTabs.forEach(t => t.classList.remove('active'));
            settingContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const targetId = tab.dataset.target;
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
        });
    });

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
        if (r && r.tracks) {
            basePlaylist = r.tracks;
            playlist = [...basePlaylist];
            currentIndex = currentTrackPath ? playlist.findIndex(t => t.path === currentTrackPath) : -1;  
            renderPlaylist();
            updateUIForCurrentTrack();
            currentFolderPath = r.folderPath;
            saveSetting('currentFolderPath', currentFolderPath);
            libraryOverlay.classList.remove('visible');
        }
    });
    bind(refreshFolderBtn, 'click', async () => {
        let path = currentFolderPath || settings.currentFolderPath;
        if (!path) return;
        const r = await windowApi.refreshMusicFolder(path);
        if (r && r.tracks) {
            currentFolderPath = r.folderPath;
            saveSetting('currentFolderPath', currentFolderPath);
            basePlaylist = r.tracks;
            sortPlaylist(sortMode);
            if (currentTrackPath) currentIndex = playlist.findIndex(t => t.path === currentTrackPath);    
            updateUIForCurrentTrack();
            settingsOverlay.classList.remove('visible');
        }
    });
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
        if (isMini) {
            document.body.classList.add('is-mini');
            windowApi.setWindowSize(340, 600);
        } else {
            document.body.classList.remove('is-mini');
            windowApi.setWindowSize(1300, 900);
        }
        const currentAnim = (animationSelect) ? animationSelect.value : (settings.animationMode || 'off');
        if (currentAnim === 'xmas') applyAnimationSetting('xmas');
        setTimeout(updateTrackTitleScroll, 300);
    });
    bind(downloadBtn, 'click', handleDownload);
    if (langButtons) langButtons.forEach(btn => { bind(btn, 'click', () => { currentLanguage = btn.dataset.lang; langButtons.forEach(b => b.classList.remove('active')); btn.classList.add('active'); applyTranslations(); saveSetting('language', currentLanguage); }); });
    bind(themeSelect, 'change', (e) => {
        const th = e.target.value;
        document.documentElement.setAttribute('data-theme', th);
        saveSetting('theme', th);
        setTimeout(updateCachedColor, 100);
    });
    bind(accentColorPicker, 'input', (e) => {
        const color = e.target.value;
        document.documentElement.style.setProperty('--accent', color); 
        updateCachedColor();
        // Constant saving during slide might be heavy, but required for "Custom" feel
        saveSetting('customAccentColor', color);
    });
    bind(accentColorPicker, 'change', (e) => {
        saveSetting('customAccentColor', e.target.value);
    });
    
    // Clean Wails File Drop Handler
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
    bind(settingsBtn, 'click', () => { settingsOverlay.classList.add('visible'); });
    bind(settingsCloseBtn, 'click', () => { settingsOverlay.classList.remove('visible'); });
    bind(changeFolderBtn, 'click', async () => { const nf = await windowApi.selectFolder(); if (nf) { if (downloadFolderInput) downloadFolderInput.value = nf; saveSetting('downloadFolder', nf); } });  
    bind(qualitySelect, 'change', (e) => saveSetting('audioQuality', e.target.value));
    bind(visualizerToggle, 'change', (e) => {
        visualizerEnabled = e.target.checked;
        saveSetting('visualizerEnabled', visualizerEnabled);
        if (visualizerEnabled) startVisualizer(); else stopVisualizer();
    });
    bind(visualizerStyleSelect, 'change', (e) => { currentVisualizerStyle = e.target.value; saveSetting('visualizerStyle', currentVisualizerStyle); });
    bind(visualizerSensitivity, 'input', (e) => { visSensitivity = parseFloat(e.target.value); updateAnalyserSettings(); saveSetting('visSensitivity', visSensitivity); });
    bind($('#visualizer-sensitivity-reset-btn'), 'click', () => {
        const def = 1.5;
        if (visualizerSensitivity) visualizerSensitivity.value = def;
        visSensitivity = def;
        updateAnalyserSettings();
        saveSetting('visSensitivity', def);
    });
    bind(sleepTimerSelect, 'change', (e) => { const mins = parseInt(e.target.value); if (sleepTimerId) { clearTimeout(sleepTimerId); sleepTimerId = null; } if (mins > 0) { sleepTimerId = setTimeout(() => { audio.pause(); isPlaying = false; updatePlayPauseUI(); showNotification(tr('sleepTimerStopped')); sleepTimerSelect.value = "0"; sleepTimerId = null; }, mins * 60000); showNotification(tr('sleepTimerNotify', mins)); } });
    bind(animationSelect, 'change', (e) => { const m = e.target.value; saveSetting('animationMode', m); applyAnimationSetting(m); });
    bind(autoLoadLastFolderToggle, 'change', (e) => { saveSetting('autoLoadLastFolder', e.target.checked); if (e.target.checked && currentFolderPath) saveSetting('currentFolderPath', currentFolderPath); });
    bind(toggleEnableFocus, 'change', (e) => { saveSetting('enableFocusMode', e.target.checked); if (toggleFocusModeBtn) toggleFocusModeBtn.style.display = e.target.checked ? 'flex' : 'none'; });       
    bind(toggleFocusModeBtn, 'click', () => {
        document.body.classList.toggle('focus-active');
        if (document.body.classList.contains('focus-active')) showNotification(tr('focusActiveNotify'));
    });
    bind(toggleEnableDrag, 'change', (e) => { saveSetting('enableDragAndDrop', e.target.checked); });
    bind(speedSlider, 'input', (e) => {
        const v = parseFloat(e.target.value);
        audio.defaultPlaybackRate = v;
        audio.playbackRate = v; 
        if(speedValue) speedValue.textContent = v.toFixed(1) + 'x';
        saveSetting('playbackSpeed', v);
    });
    bind($('#speed-reset-btn'), 'click', () => {
        const def = 1.0;
        if (speedSlider) speedSlider.value = def;
        audio.defaultPlaybackRate = def;
        audio.playbackRate = def;
        if (speedValue) speedValue.textContent = def.toFixed(1) + 'x';
        saveSetting('playbackSpeed', def);
    });

    bind(bassBoostToggle, 'change', (e) => {
        const enabled = e.target.checked;
        saveSetting('bassBoostEnabled', enabled);
        if (bassBoostContainer) bassBoostContainer.style.display = enabled ? 'flex' : 'none';
        updateAudioEffects();
    });
    bind(bassBoostSlider, 'input', (e) => {
        const val = parseFloat(e.target.value);
        saveSetting('bassBoostValue', val);
        if (bassBoostValueEl) bassBoostValueEl.textContent = val + 'dB';
        updateAudioEffects();
    });

    bind(trebleBoostToggle, 'change', (e) => {
        const enabled = e.target.checked;
        saveSetting('trebleBoostEnabled', enabled);
        if (trebleBoostContainer) trebleBoostContainer.style.display = enabled ? 'flex' : 'none';
        updateAudioEffects();
    });
    bind(trebleBoostSlider, 'input', (e) => {
        const val = parseFloat(e.target.value);
        saveSetting('trebleBoostValue', val);
        if (trebleBoostValueEl) trebleBoostValueEl.textContent = val + 'dB';
        updateAudioEffects();
    });

    bind(reverbToggle, 'change', (e) => {
        const enabled = e.target.checked;
        saveSetting('reverbEnabled', enabled);
        if (reverbContainer) reverbContainer.style.display = enabled ? 'flex' : 'none';
        updateAudioEffects();
    });
    bind($('#reverb-slider'), 'input', (e) => {
        const val = parseFloat(e.target.value);
        saveSetting('reverbValue', val);
        if (reverbValueEl) reverbValueEl.textContent = val + '%';
        updateAudioEffects();
    });

    bind($('#bass-boost-reset-btn'), 'click', () => {
        const def = 6;
        if (bassBoostSlider) bassBoostSlider.value = def;
        if (bassBoostValueEl) bassBoostValueEl.textContent = def + 'dB';
        saveSetting('bassBoostValue', def);
        updateAudioEffects();
    });

    bind($('#treble-boost-reset-btn'), 'click', () => {
        const def = 6;
        if (trebleBoostSlider) trebleBoostSlider.value = def;
        if (trebleBoostValueEl) trebleBoostValueEl.textContent = def + 'dB';
        saveSetting('trebleBoostValue', def);
        updateAudioEffects();
    });

    bind($('#reverb-reset-btn'), 'click', () => {
        const def = 30;
        if (reverbSlider) reverbSlider.value = def;
        if (reverbValueEl) reverbValueEl.textContent = def + '%';
        saveSetting('reverbValue', def);
        updateAudioEffects();
    });

    bind(toggleCinemaMode, 'change', (e) => {
        const enabled = e.target.checked;
        saveSetting('cinemaMode', enabled);
        document.body.classList.toggle('cinema-mode', enabled);
    });

    bind(document.getElementById('toggle-performance-mode'), 'change', (e) => {
        setPerformanceMode(e.target.checked);
    });

    bind(document.getElementById('toggle-show-stats'), 'change', (e) => {
        showStatsOverlay = e.target.checked;
        saveSetting('showStatsOverlay', showStatsOverlay);
        const overlay = document.getElementById('stats-overlay');
        if (overlay) overlay.classList.toggle('hidden', !showStatsOverlay);
    });

    const toggleSnuggleTime = document.getElementById('toggle-snuggle-time');
    bind(toggleSnuggleTime, 'change', (e) => {
        const enabled = e.target.checked;
        saveSetting('snuggleTimeEnabled', enabled);
        applySnuggleTime(enabled, true);
        // showNotification removed to suppress Island during intro
    });

    const toggleSleepTime = document.getElementById('toggle-sleeptime');
    bind(toggleSleepTime, 'change', (e) => {
        const enabled = e.target.checked;
        saveSetting('sleepTimeEnabled', enabled);
        applySleepTime(enabled, true);
    });

    const toggleCyberpunk = document.getElementById('toggle-cyberpunk');
    bind(toggleCyberpunk, 'change', (e) => {
        const enabled = e.target.checked;
        saveSetting('cyberpunkEnabled', enabled);
        applyCyberpunk(enabled, true);
    });

    const toggleSunset = document.getElementById('toggle-sunset');
    bind(toggleSunset, 'change', (e) => {
        const enabled = e.target.checked;
        saveSetting('sunsetEnabled', enabled);
        applySunsetDrive(enabled, true);
    });

    const toggleSakura = document.getElementById('toggle-sakura');
    bind(toggleSakura, 'change', (e) => {
        const enabled = e.target.checked;
        saveSetting('sakuraEnabled', enabled);
        applySakuraSpirit(enabled, true);
    });

    const fpsIn = document.getElementById('fps-input');
    const updateFps = (val) => {
        let v = parseInt(val);
        if (isNaN(v)) return;
        let clamped = Math.max(15, Math.min(120, v));
        targetFps = clamped;
        saveSetting('targetFps', clamped);
    };
    bind(fpsIn, 'input', (e) => updateFps(e.target.value));
    bind(fpsIn, 'blur', (e) => {
        updateFps(e.target.value);
        if (fpsIn) fpsIn.value = targetFps;
    });

    bind(document.getElementById('enable-perf-mode-btn'), 'click', () => {
        setPerformanceMode(true);
        document.getElementById('performance-hint').classList.remove('visible');
    });

    bind(btnExportPlaylist, 'click', () => {
        if (!playlist || playlist.length === 0) { showNotification(tr('emptyPlaylist')); return; }        
        const content = playlist.map((t, i) => `${i+1}. ${t.artist || 'Unknown'} - ${t.title}`).join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'playlist_export.txt';
        a.click();
        URL.revokeObjectURL(url);
        showNotification(tr('exportSuccess'));
    });
    bind(toggleUseCustomColor, 'change', (e) => {
        const enabled = e.target.checked;
        saveSetting('useCustomColor', enabled);
        if (accentColorContainer) accentColorContainer.style.display = enabled ? 'flex' : 'none';     
        if (enabled) {
            const color = settings.customAccentColor || '#38bdf8';
            document.documentElement.style.setProperty('--accent', color);
            if (accentColorPicker) accentColorPicker.value = color;
        } else {
            document.documentElement.style.removeProperty('--accent');
        }
        setTimeout(updateCachedColor, 50);
    });
    bind(emojiSelect, 'change', (e) => {
        const v = e.target.value;
        if (customEmojiContainer) customEmojiContainer.style.display = v === 'custom' ? 'flex' : 'none';
        saveSetting('coverMode', v);
        updateEmoji(v, customEmojiInput ? customEmojiInput.value : '');
    });
    bind(customEmojiInput, 'input', (e) => {
        const v = e.target.value;
        saveSetting('customCoverEmoji', v);
        updateEmoji('custom', v);
    });
    bind(toggleDeleteSongs, 'change', (e) => {
        deleteSongsEnabled = e.target.checked;
        saveSetting('deleteSongsEnabled', deleteSongsEnabled);
        renderPlaylist();
    });
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
    bind(infoOverlay, 'click', (e) => { if(e.target === infoOverlay) infoOverlay.classList.remove('visible'); });


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

    bind(toggleFavoritesOption, 'change', (e) => {
        const enabled = e.target.checked;
        saveSetting('enableFavoritesPlaylist', enabled);
        if (toggleFavoritesBtn) toggleFavoritesBtn.style.display = enabled ? 'flex' : 'none';
        if (!enabled && showingFavoritesOnly) {
            showingFavoritesOnly = false;
            if (toggleFavoritesBtn) toggleFavoritesBtn.classList.remove('active');
            filterPlaylist(searchInput ? searchInput.value : '');
        }
    });

    let contextMenuDelete = $('#context-menu-delete');

    bind(contextMenuDelete, 'click', () => {
        if (contextTrackIndex === null || !playlist[contextTrackIndex]) return;
        // Check if deletion is enabled
        if (!deleteSongsEnabled) {
            showNotification('Deletion is disabled in settings.');
            return;
        }
        handleDeleteTrack(playlist[contextTrackIndex].path);
    });

    bind(contextMenuFavorite, 'click', () => {
        if (contextTrackIndex === null || !playlist[contextTrackIndex]) return;
        toggleFavorite(playlist[contextTrackIndex].path);
    });

    bind(mainFavoriteBtn, 'click', () => {
        if (currentIndex === -1 || !playlist[currentIndex]) return;
        toggleFavorite(playlist[currentIndex].path);
        updateUIForCurrentTrack();
    });
    bind(downloaderCloseBtn, 'click', () => { downloaderOverlay.classList.remove('visible'); });
    bind(contextMenuEditTitle, 'click', () => { if (contextTrackIndex === null) return; const t = playlist[contextTrackIndex]; if (originalTitlePreview) originalTitlePreview.textContent = t.title; if (newTitlePreview) newTitlePreview.textContent = t.title; if (editTitleInput) editTitleInput.value = t.title; editTitleOverlay.classList.add('visible'); });
    bind(editTitleInput, 'input', () => { if (newTitlePreview) newTitlePreview.textContent = editTitleInput.value; });
    bind(editTitleCancelBtn, 'click', () => { editTitleOverlay.classList.remove('visible'); });
    bind(editTitleCloseBtn, 'click', () => { editTitleOverlay.classList.remove('visible'); });
    bind(editTitleSaveBtn, 'click', async () => { if (contextTrackIndex === null || !playlist[contextTrackIndex]) return; const t = playlist[contextTrackIndex]; const nt = editTitleInput.value.trim(); if (!nt) return; const r = await windowApi.updateTitle(t.path, nt); if (r.success) { t.title = nt; const bt = basePlaylist.find(x => x.path === t.path); if (bt) bt.title = nt; renderPlaylist(); updateUIForCurrentTrack(); editTitleOverlay.classList.remove('visible'); showNotification(tr('titleUpdated')); } });
    bind(confirmDeleteCancelBtn, 'click', () => { confirmDeleteOverlay.classList.remove('visible'); trackToDeletePath = null; });
    bind(confirmDeleteCloseBtn, 'click', () => { confirmDeleteOverlay.classList.remove('visible'); trackToDeletePath = null; });
    bind(confirmDeleteBtn, 'click', async () => { if (!trackToDeletePath) return; const ctp = (currentIndex !== -1 && playlist[currentIndex]) ? playlist[currentIndex].path : null; const r = await windowApi.deleteTrack(trackToDeletePath); if (r.success) {
        basePlaylist = basePlaylist.filter(x => x.path !== trackToDeletePath);
        playlist = playlist.filter(x => x.path !== trackToDeletePath);
        const favIdx = favorites.indexOf(trackToDeletePath);
        if (favIdx !== -1) {
            favorites.splice(favIdx, 1);
            windowApi.setSetting('favorites', favorites);
        }
        if (ctp) { if (trackToDeletePath === ctp) { audio.pause(); currentIndex = -1; audio.src = ''; updatePlayPauseUI(); } else { currentIndex = playlist.findIndex(x => x.path === ctp); } } 
        renderPlaylist(); updateUIForCurrentTrack(); confirmDeleteOverlay.classList.remove('visible'); trackToDeletePath = null; showNotification(tr('songDeleted')); } 
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

function showNotification(msg) { 
    if (!notificationBar || !notificationMessage) return; if (notificationTimeout) clearTimeout(notificationTimeout); 
    notificationMessage.textContent = msg; notificationBar.classList.remove('visible'); void notificationBar.offsetWidth; notificationBar.classList.add('visible'); 
    notificationTimeout = setTimeout(() => { notificationBar.classList.remove('visible'); }, 5000);       
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

document.addEventListener('DOMContentLoaded', () => {
    $ = (s) => document.querySelector(s);
    trackTitleEl = $('#track-title-large'); trackArtistEl = $('#track-artist-large'); musicEmojiEl = $('#music-emoji');
    currentTimeEl = $('#current-time'); durationEl = $('#duration'); progressBar = $('.progress-bar'); progressFill = $('.progress-fill');
    playBtn = $('#play-btn'); playIcon = $('#play-icon'); pauseIcon = $('#pause-icon'); prevBtn = $('#prev-btn'); nextBtn = $('#next-btn');
    loopBtn = $('#loop-btn'); shuffleBtn = $('#shuffle-btn'); volumeSlider = $('.volume-slider'); volumeIcon = $('.volume-icon');
    playlistEl = $('.playlist-scroll-area'); playlistInfoBar = $('.playlist-info-bar'); openLibraryBtn = $('#open-library-btn');
    libraryOverlay = $('#library-overlay'); libraryCloseBtn = $('#library-close-btn'); loadFolderBtn = $('#load-folder-btn');
    refreshFolderBtn = $('#refresh-folder-btn'); searchInput = $('.playlist-search-input'); sortSelect = $('#sort-select');
    ytUrlInput = $('#yt-url-input'); ytNameInput = $('#yt-name-input'); downloadBtn = $('#download-btn'); 
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
    mainFavoriteBtn = $('#main-favorite-btn');
    confirmDeleteOverlay = $('#confirm-delete-overlay'); confirmDeleteBtn = $('#confirm-delete-btn'); confirmDeleteCancelBtn = $('#confirm-delete-cancel-btn');
    confirmDeleteCloseBtn = $('#confirm-delete-close-btn');
    autoLoadLastFolderToggle = $('#toggle-auto-load-last-folder'); toggleMiniMode = $('#toggle-mini-mode');
    notificationBar = $('#notification-bar'); notificationMessage = $('#notification-message');

    const devModalOverlay = $('#dev-modal-overlay');
    const devModalCloseBtn = $('#dev-modal-close-btn');
    if (devModalCloseBtn && devModalOverlay) {
        devModalCloseBtn.addEventListener('click', () => devModalOverlay.classList.remove('visible'));    
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

    const helpToSettingsBtn = $('#help-to-settings-btn');
    if (helpToSettingsBtn) {
        helpToSettingsBtn.addEventListener('click', () => {
            if (userHelpOverlay) userHelpOverlay.classList.remove('visible');
            setTimeout(() => {
                if (settingsOverlay) settingsOverlay.classList.add('visible');
            }, 300);
        });
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
            }, 550); // Wait for transition
        });
    }

    accentColorPicker = $('#accent-color-picker');
    dropZone = $('#drop-zone'); toggleEnableDrag = $('#toggle-enable-drag'); toggleUseCustomColor = $('#toggle-use-custom-color');
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

    setupAudioEvents(); setupEventListeners();

    const hideSplash = () => {
        const splash = $('#splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                document.body.classList.add('ready');
            }, 1000);
        } else {
            document.body.classList.add('ready');
        }
    };

    async function initializeApp() {
        try {
            await loadSettings();

            // Apply Theme Packs after settings are loaded
            if (settings.snuggleTimeEnabled) {
                const stToggle = document.getElementById('toggle-snuggle-time');
                if (stToggle) stToggle.checked = true;
                applySnuggleTime(true);
            } else if (settings.sleepTimeEnabled) {
                const slToggle = document.getElementById('toggle-sleeptime');
                if (slToggle) slToggle.checked = true;
                applySleepTime(true);
            } else if (settings.cyberpunkEnabled) {
                const cyToggle = document.getElementById('toggle-cyberpunk');
                if (cyToggle) cyToggle.checked = true;
                applyCyberpunk(true);
            } else if (settings.sunsetEnabled) {
                const suToggle = document.getElementById('toggle-sunset');
                if (suToggle) suToggle.checked = true;
                applySunsetDrive(true);
            } else if (settings.sakuraEnabled) {
                const saToggle = document.getElementById('toggle-sakura');
                if (saToggle) saToggle.checked = true;
                applySakuraSpirit(true);
            } else {
                // Only apply standard theme if no pack is active
                if (settings.theme) {
                    document.documentElement.setAttribute('data-theme', settings.theme);
                }
                if (settings.useCustomColor && settings.customAccentColor) {
                    document.documentElement.style.setProperty('--accent', settings.customAccentColor);
                    if (accentColorPicker) accentColorPicker.value = settings.customAccentColor;
                }
            }

            updateCachedColor();

            audio.volume = currentVolume;
            if (volumeSlider) volumeSlider.value = currentVolume;
            if (volumeIcon) volumeIcon.innerHTML = getVolumeIcon(currentVolume);

            setTimeout(hideSplash, 2000);
        } catch (err) {
            console.error("Initialization failed:", err);
            hideSplash();
        }
    }

    initializeApp();
});