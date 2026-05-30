package main

import (
	"bufio"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/dhowden/tag"
	"github.com/tcolgate/mp3"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

func isAllowedPath(path string, allowedBases []string) bool {
	clean := filepath.Clean(path)
	for _, base := range allowedBases {
		cleanBase := filepath.Clean(base)
		if strings.HasPrefix(clean, cleanBase+string(filepath.Separator)) || clean == cleanBase {
			return true
		}
	}
	return false
}

type App struct {
	ctx             context.Context
	mu              sync.Mutex
	spotifyService  *SpotifyService
	trackCache      map[string]Track
	cacheMu         sync.RWMutex
	mediaKeyTID     uint32
	cacheWriteTimer *time.Timer
	cacheTimerMu    sync.Mutex
}

type Config struct {
	Theme                   string        `json:"theme"`
	Volume                  float64       `json:"volume"`
	DownloadFolder          string        `json:"downloadFolder"`
	Language                string        `json:"language"`
	CoverMode               string        `json:"coverMode"`
	CustomCoverEmoji        string        `json:"customCoverEmoji"`
	BassGain                float64       `json:"bassGain"`
	BassBoostEnabled        bool          `json:"bassBoostEnabled"`
	BassBoostValue          float64       `json:"bassBoostValue"`
	TrebleBoostEnabled      bool          `json:"trebleBoostEnabled"`
	TrebleBoostValue        float64       `json:"trebleBoostValue"`
	ReverbEnabled           bool          `json:"reverbEnabled"`
	ReverbValue             float64       `json:"reverbValue"`
	AnimationMode           string        `json:"animationMode"`
	VisualizerEnabled       bool          `json:"visualizerEnabled"`
	VisualizerStyle         string        `json:"visualizerStyle"`
	VisSensitivity          float64       `json:"visSensitivity"`
	AutoLoadLastFolder      bool          `json:"autoLoadLastFolder"`
	CurrentFolderPath       string        `json:"currentFolderPath"`
	EnableFocusMode         bool          `json:"enableFocusMode"`
	EnableDragAndDrop       bool          `json:"enableDragAndDrop"`
	UseCustomColor          bool          `json:"useCustomColor"`
	CustomAccentColor       string        `json:"customAccentColor"`
	SortMode                string        `json:"sortMode"`
	TargetFps               int           `json:"targetFps"`
	PerformanceMode         bool          `json:"performanceMode"`
	ShowStatsOverlay        bool          `json:"showStatsOverlay"`
	CinemaMode              bool          `json:"cinemaMode"`
	PlaybackSpeed           float64       `json:"playbackSpeed"`
	Favorites               []string      `json:"favorites"`
	EnableFavoritesPlaylist bool          `json:"enableFavoritesPlaylist"`
	MiniMode                bool          `json:"miniMode"`
	AudioQuality            string        `json:"audioQuality"`
	DeleteSongsEnabled      bool          `json:"deleteSongsEnabled"`
	Loop                    string        `json:"loop"`
	Shuffle                 bool          `json:"shuffle"`
	PlaylistPosition        string        `json:"playlistPosition"`
	GradientTitleEnabled    bool          `json:"gradientTitleEnabled"`
	ActiveIntro             string        `json:"activeIntro"`
	PlaylistStructure       []interface{} `json:"playlistStructure"`
	// --- Equalizer ---
	EqEnabled bool      `json:"eqEnabled"`
	EqValues  []float64 `json:"eqValues"`
	// --- Crossfade ---
	CrossfadeEnabled bool `json:"crossfadeEnabled"`
	CrossfadeSeconds int  `json:"crossfadeSeconds"`
	// --- Volume Normalization ---
	VolNormEnabled bool `json:"volNormEnabled"`
	// --- Volume Limiter ---
	VolumeLimit float64 `json:"volumeLimit"`
}

type Track struct {
	Path         string  `json:"path"`
	Title        string  `json:"title"`
	Artist       string  `json:"artist"`
	Duration     int     `json:"duration"`
	Mtime        float64 `json:"mtime"`
	PlayCount    int     `json:"playCount"`
	LastPosition float64 `json:"lastPosition"`
}

type DownloadOptions struct {
	Id         string `json:"id"`
	Url        string `json:"url"`
	CustomName string `json:"customName"`
	Quality    string `json:"quality"`
}

type SimpleResult struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
	NewPath string `json:"newPath,omitempty"`
}

type FolderResult struct {
	Tracks     []Track `json:"tracks"`
	FolderPath string  `json:"folderPath"`
	Error      string  `json:"error,omitempty"`
}

func NewApp() *App {
	return &App{
		spotifyService: NewSpotifyService(),
		trackCache:     make(map[string]Track),
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.ensureBinaries()
	a.loadTrackCache()
	a.setupMediaKeys()
}

func (a *App) shutdown(ctx context.Context) {
	a.teardownMediaKeys()
	a.cacheTimerMu.Lock()
	if a.cacheWriteTimer != nil {
		a.cacheWriteTimer.Stop()
	}
	a.cacheTimerMu.Unlock()
	a.saveTrackCache()
}

func (a *App) SetWindowSize(width int, height int) {
	wailsRuntime.WindowSetSize(a.ctx, width, height)
}

func getConfigPath() string {
	configDir, _ := os.UserConfigDir()
	return filepath.Join(configDir, "NovaWave", "settings.json")
}

func getCachePath() string {
	configDir, _ := os.UserConfigDir()
	return filepath.Join(configDir, "NovaWave", "track_cache.json")
}

func (a *App) loadTrackCache() {
	data, err := os.ReadFile(getCachePath())
	if err != nil {
		return
	}
	var cache map[string]Track
	if json.Unmarshal(data, &cache) != nil {
		return
	}
	a.cacheMu.Lock()
	a.trackCache = cache
	a.cacheMu.Unlock()
}

func (a *App) scheduleCacheWrite() {
	a.cacheTimerMu.Lock()
	if a.cacheWriteTimer != nil {
		a.cacheWriteTimer.Stop()
	}
	a.cacheWriteTimer = time.AfterFunc(5*time.Second, func() {
		a.saveTrackCache()
	})
	a.cacheTimerMu.Unlock()
}

func (a *App) saveTrackCache() {
	a.cacheMu.RLock()
	data, err := json.Marshal(a.trackCache)
	a.cacheMu.RUnlock()
	if err != nil {
		return
	}
	path := getCachePath()
	os.MkdirAll(filepath.Dir(path), 0755)
	os.WriteFile(path, data, 0644)
}

func (a *App) SaveLastPosition(path string, position float64) {
	a.cacheMu.Lock()
	track, exists := a.trackCache[path]
	if exists {
		track.LastPosition = position
		a.trackCache[path] = track
	}
	a.cacheMu.Unlock()
	if exists {
		a.scheduleCacheWrite()
	}
}

func (a *App) IncrementPlayCount(path string) {
	a.cacheMu.Lock()
	track, exists := a.trackCache[path]
	if exists {
		track.PlayCount++
		a.trackCache[path] = track
	}
	a.cacheMu.Unlock()
	if exists {
		a.scheduleCacheWrite()
	}
}

func (a *App) ClearTrackCache() {
	a.cacheMu.Lock()
	a.trackCache = make(map[string]Track)
	a.cacheMu.Unlock()
	os.Remove(getCachePath())
}

func (a *App) getAllowedDirs() []string {
	a.mu.Lock()
	data, err := os.ReadFile(getConfigPath())
	a.mu.Unlock()

	dirs := make([]string, 0, 4)
	if err != nil {
		return dirs
	}

	var cfg Config
	if json.Unmarshal(data, &cfg) == nil {
		if cfg.DownloadFolder != "" {
			dirs = append(dirs, cfg.DownloadFolder)
		}
		if cfg.CurrentFolderPath != "" {
			dirs = append(dirs, cfg.CurrentFolderPath)
		}
	}

	// Pro UI stores multiple folders as a JSON array string in v2_folders
	var raw map[string]interface{}
	if json.Unmarshal(data, &raw) == nil {
		if v2f, ok := raw["v2_folders"].(string); ok && v2f != "" {
			var folders []string
			if json.Unmarshal([]byte(v2f), &folders) == nil {
				dirs = append(dirs, folders...)
			}
		}
	}

	return dirs
}

func (a *App) GetAppMeta() AppMeta {
	return CurrentMeta
}

func (a *App) OpenURL(url string) {
	wailsRuntime.BrowserOpenURL(a.ctx, url)
}

func defaultDownloadFolder() string {
	if home, err := os.UserHomeDir(); err == nil {
		dl := filepath.Join(home, "Downloads")
		if info, err := os.Stat(dl); err == nil && info.IsDir() {
			return dl
		}
	}
	cwd, _ := os.Getwd()
	return cwd
}

func getDefaultConfig() Config {
	return Config{
		Theme:                   "midnight",
		Volume:                  0.2,
		Language:                "de",
		CoverMode:               "note",
		CustomCoverEmoji:        "🎵",
		AnimationMode:           "flow",
		VisualizerEnabled:       true,
		VisualizerStyle:         "bars",
		VisSensitivity:          1.5,
		AutoLoadLastFolder:      true,
		EnableFocusMode:         true,
		EnableDragAndDrop:       true,
		CustomAccentColor:       "#38bdf8",
		TargetFps:               60,
		BassBoostValue:          6,
		TrebleBoostValue:        6,
		ReverbValue:             30,
		PlaybackSpeed:           1.0,
		EnableFavoritesPlaylist: true,
		AudioQuality:            "best",
		ActiveIntro:             "waterdrop",
		DownloadFolder:          defaultDownloadFolder(),
		VolumeLimit:             1.0,
	}
}

func (a *App) LoadConfig() Config {
	a.mu.Lock()
	defer a.mu.Unlock()

	path := getConfigPath()
	data, err := os.ReadFile(path)

	defaultConf := getDefaultConfig()

	if err != nil {
		return defaultConf
	}

	var loadedConf Config
	json.Unmarshal(data, &loadedConf)

	if loadedConf.Language == "" {
		loadedConf.Language = defaultConf.Language
	}
	if loadedConf.CoverMode == "" {
		loadedConf.CoverMode = defaultConf.CoverMode
	}
	if loadedConf.TargetFps == 0 {
		loadedConf.TargetFps = 60
	}
	if loadedConf.DownloadFolder == "" {
		loadedConf.DownloadFolder = defaultDownloadFolder()
	}

	return loadedConf
}

func (a *App) ResetConfig() SimpleResult {
	a.mu.Lock()
	defer a.mu.Unlock()

	defaultConf := getDefaultConfig()

	path := getConfigPath()
	os.MkdirAll(filepath.Dir(path), 0755)

	data, _ := json.MarshalIndent(defaultConf, "", "  ")
	err := os.WriteFile(path, data, 0644)
	if err != nil {
		return SimpleResult{Success: false, Error: "Reset failed: " + err.Error()}
	}
	return SimpleResult{Success: true}
}

func (a *App) SaveConfig(config Config) string {
	a.mu.Lock()
	defer a.mu.Unlock()

	path := getConfigPath()
	os.MkdirAll(filepath.Dir(path), 0755)

	data, _ := json.MarshalIndent(config, "", "  ")
	err := os.WriteFile(path, data, 0644)
	if err != nil {
		return "Save error: " + err.Error()
	}
	return "OK"
}

func (a *App) SetSetting(key string, value interface{}) {
	a.mu.Lock()
	defer a.mu.Unlock()

	path := getConfigPath()
	var configMap map[string]interface{}
	data, err := os.ReadFile(path)
	if err == nil {
		json.Unmarshal(data, &configMap)
	}

	if configMap == nil {
		configMap = make(map[string]interface{})
	}

	configMap[key] = value
	os.MkdirAll(filepath.Dir(path), 0755)
	newData, _ := json.MarshalIndent(configMap, "", "  ")
	os.WriteFile(path, newData, 0644)
}

func (a *App) GetSettings() map[string]interface{} {
	a.mu.Lock()
	defer a.mu.Unlock()

	path := getConfigPath()
	data, err := os.ReadFile(path)
	if err != nil {
		defaultConf := getDefaultConfig()
		var fallback map[string]interface{}
		if b, e := json.Marshal(defaultConf); e == nil {
			json.Unmarshal(b, &fallback)
		}
		if fallback == nil {
			fallback = make(map[string]interface{})
		}
		return fallback
	}

	var configMap map[string]interface{}
	json.Unmarshal(data, &configMap)
	return configMap
}

func (a *App) SelectFolder() string {
	selection, _ := wailsRuntime.OpenDirectoryDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Select Folder",
	})
	return selection
}

func (a *App) SelectImage() string {
	selection, _ := wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Select Cover Image",
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: "Images (*.png;*.jpg;*.jpeg)", Pattern: "*.png;*.jpg;*.jpeg"},
		},
	})
	return selection
}

func (a *App) GetImageBase64(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}

	contentType := "image/jpeg"
	if strings.HasSuffix(strings.ToLower(path), ".png") {
		contentType = "image/png"
	}

	return "data:" + contentType + ";base64," + base64.StdEncoding.EncodeToString(data)
}

func (a *App) SelectMusicFolder() FolderResult {
	path := a.SelectFolder()
	if path == "" {
		return FolderResult{Tracks: nil, FolderPath: ""}
	}
	return a.RefreshMusicFolder(path)
}

func (a *App) getBinaryPath(name string) string {
	cwd, _ := os.Getwd()
	localPath := filepath.Join(cwd, "bin", name)
	if info, err := os.Stat(localPath); err == nil && !info.IsDir() {
		abs, _ := filepath.Abs(localPath)
		return abs
	}

	configDir, _ := os.UserConfigDir()
	appDataPath := filepath.Join(configDir, "NovaWave", "bin", name)
	if info, err := os.Stat(appDataPath); err == nil && !info.IsDir() {
		return appDataPath
	}

	// Fall back to a binary available on the system PATH (typical on Linux,
	// where ffmpeg/ffprobe/yt-dlp are provided by the distro's packages).
	if resolved, err := exec.LookPath(name); err == nil {
		return resolved
	}

	return name
}

func getMP3Duration(path string) int {
	f, err := os.Open(path)
	if err != nil {
		return 0
	}
	defer f.Close()

	d := mp3.NewDecoder(f)
	var totalDuration time.Duration
	var frame mp3.Frame
	skipped := 0

	for {
		if err := d.Decode(&frame, &skipped); err != nil {
			break
		}
		totalDuration += frame.Duration()
	}
	return int(totalDuration.Seconds())
}

func (a *App) RefreshMusicFolder(path string) FolderResult {
	info, err := os.Stat(path)
	if err != nil {
		return FolderResult{FolderPath: path, Error: err.Error()}
	}

	if !info.IsDir() {
		name := strings.ToLower(info.Name())
		if !strings.HasSuffix(name, ".mp3") && !strings.HasSuffix(name, ".flac") && !strings.HasSuffix(name, ".wav") && !strings.HasSuffix(name, ".m4a") && !strings.HasSuffix(name, ".ogg") {
			return FolderResult{Error: "Unsupported file type"}
		}

		mtime := float64(info.ModTime().UnixMilli())
		currentTrack := Track{Path: path, Title: info.Name(), Artist: "Unknown Artist", Mtime: mtime}

		f, err := os.Open(path)
		if err == nil {
			m, err := tag.ReadFrom(f)
			if err == nil {
				if m.Title() != "" {
					currentTrack.Title = m.Title()
				}
				if m.Artist() != "" {
					currentTrack.Artist = m.Artist()
				}
			}
			f.Close()
		}

		if strings.HasSuffix(name, ".mp3") {
			currentTrack.Duration = getMP3Duration(path)
		}

		if currentTrack.Duration == 0 {
			ffprobePath := a.getBinaryPath(binaryName("ffprobe"))
			if info, err := os.Stat(ffprobePath); err == nil && !info.IsDir() {
				cmd := exec.Command(ffprobePath, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path)
				configureCmd(cmd)
				out, err := cmd.Output()
				if err == nil {
					var dur float64
					fmt.Sscanf(strings.TrimSpace(string(out)), "%f", &dur)
					currentTrack.Duration = int(dur)
				}
			}
		}

		return FolderResult{Tracks: []Track{currentTrack}, FolderPath: filepath.Dir(path)}
	}

	tracks, err := a.GetTracks(path)
	if err != nil {
		return FolderResult{Tracks: nil, FolderPath: path, Error: err.Error()}
	}
	return FolderResult{Tracks: tracks, FolderPath: path}
}

func (a *App) GetTracks(folderPath string) ([]Track, error) {
	files, err := os.ReadDir(folderPath)
	if err != nil {
		return nil, err
	}

	ffprobePath := a.getBinaryPath(binaryName("ffprobe"))
	tracks := make([]Track, 0)
	var mutex sync.Mutex
	sem := make(chan struct{}, 10)
	var wg sync.WaitGroup

	for _, file := range files {
		if file.IsDir() {
			continue
		}
		name := strings.ToLower(file.Name())
		if !strings.HasSuffix(name, ".mp3") && !strings.HasSuffix(name, ".flac") && !strings.HasSuffix(name, ".wav") && !strings.HasSuffix(name, ".m4a") && !strings.HasSuffix(name, ".ogg") {
			continue
		}

		wg.Add(1)
		go func(f os.DirEntry) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			fullPath := filepath.Join(folderPath, f.Name())
			info, _ := f.Info()
			var mtime float64
			if info != nil {
				mtime = float64(info.ModTime().UnixMilli())
			}

			a.cacheMu.RLock()
			cached, exists := a.trackCache[fullPath]
			a.cacheMu.RUnlock()

			if exists && cached.Mtime == mtime {
				mutex.Lock()
				tracks = append(tracks, cached)
				mutex.Unlock()
				return
			}

			currentTrack := Track{Path: fullPath, Title: f.Name(), Artist: "Unknown Artist", Mtime: mtime}
			fileHandle, err := os.Open(fullPath)
			if err == nil {
				m, err := tag.ReadFrom(fileHandle)
				if err == nil {
					if m.Title() != "" {
						currentTrack.Title = m.Title()
					}
					if m.Artist() != "" {
						currentTrack.Artist = m.Artist()
					}
				}
				fileHandle.Close()
			}

			if strings.HasSuffix(strings.ToLower(f.Name()), ".mp3") {
				currentTrack.Duration = getMP3Duration(fullPath)
			}

			if currentTrack.Duration == 0 {
				cmd := exec.Command(ffprobePath, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", fullPath)
				configureCmd(cmd)
				out, _ := cmd.Output()
				var dur float64
				fmt.Sscanf(strings.TrimSpace(string(out)), "%f", &dur)
				currentTrack.Duration = int(dur)
			}

			a.cacheMu.Lock()
			a.trackCache[fullPath] = currentTrack
			a.cacheMu.Unlock()

			mutex.Lock()
			tracks = append(tracks, currentTrack)
			mutex.Unlock()
		}(file)
	}

	wg.Wait()
	go a.saveTrackCache()
	return tracks, nil
}

func (a *App) DeleteTrack(path string) SimpleResult {
	cfg := a.LoadConfig()
	allowed := []string{cfg.CurrentFolderPath, cfg.DownloadFolder}
	if !isAllowedPath(path, allowed) {
		return SimpleResult{Success: false, Error: "access denied: path outside allowed directories"}
	}

	err := os.Remove(path)
	if err != nil {
		return SimpleResult{Success: false, Error: err.Error()}
	}

	a.cacheMu.Lock()
	delete(a.trackCache, path)
	a.cacheMu.Unlock()
	go a.saveTrackCache()

	return SimpleResult{Success: true}
}

func (a *App) MoveFile(sourcePath string, destFolder string) SimpleResult {
	cfg := a.LoadConfig()
	allowed := []string{cfg.CurrentFolderPath, cfg.DownloadFolder}
	if !isAllowedPath(sourcePath, allowed) {
		return SimpleResult{Success: false, Error: "access denied: source path outside allowed directories"}
	}

	fileName := filepath.Base(sourcePath)
	destPath := filepath.Join(destFolder, fileName)
	if sourcePath == destPath {
		return SimpleResult{Success: true}
	}

	err := os.Rename(sourcePath, destPath)
	if err != nil {
		// Fallback: copy + delete (cross-device move)
		input, readErr := os.ReadFile(sourcePath)
		if readErr != nil {
			return SimpleResult{Success: false, Error: "could not read source file: " + readErr.Error()}
		}
		if writeErr := os.WriteFile(destPath, input, 0644); writeErr != nil {
			return SimpleResult{Success: false, Error: "could not write destination file: " + writeErr.Error()}
		}
		if removeErr := os.Remove(sourcePath); removeErr != nil {
			return SimpleResult{Success: false, Error: "move incomplete: could not remove source: " + removeErr.Error()}
		}
	}
	return SimpleResult{Success: true, NewPath: destPath}
}

func (a *App) UpdateMetadata(pathStr string, newTitle string, newArtist string) SimpleResult {
	sanitizeTag := func(s string) string {
		s = strings.Map(func(r rune) rune {
			if r < 0x20 || r == 0x7F {
				return -1
			}
			return r
		}, s)
		if len([]rune(s)) > 200 {
			runes := []rune(s)
			s = string(runes[:200])
		}
		return strings.TrimSpace(s)
	}
	newTitle = sanitizeTag(newTitle)
	newArtist = sanitizeTag(newArtist)

	ffmpegPath := a.getBinaryPath(binaryName("ffmpeg"))
	ext := filepath.Ext(pathStr)
	tempPath := strings.TrimSuffix(pathStr, ext) + "_temp" + ext

	args := []string{"-i", pathStr, "-metadata", "title=" + newTitle, "-metadata", "artist=" + newArtist, "-c", "copy", "-y", tempPath}
	cmd := exec.Command(ffmpegPath, args...)
	configureCmd(cmd)
	err := cmd.Run()
	if err != nil {
		return SimpleResult{Success: false, Error: err.Error()}
	}

	err = os.Remove(pathStr)
	if err != nil {
		os.Remove(tempPath)
		return SimpleResult{Success: false, Error: "File locked or read-only: " + err.Error()}
	}

	err = os.Rename(tempPath, pathStr)
	if err != nil {
		return SimpleResult{Success: false, Error: "Rename failed: " + err.Error()}
	}
	return SimpleResult{Success: true}
}

func (a *App) UpdateTitle(pathStr string, newTitle string) SimpleResult {
	currentArtist := ""
	if f, err := os.Open(pathStr); err == nil {
		if m, err := tag.ReadFrom(f); err == nil {
			currentArtist = m.Artist()
		}
		f.Close()
	}
	return a.UpdateMetadata(pathStr, newTitle, currentArtist)
}

func (a *App) SetCoverArt(audioPath string, imagePath string) SimpleResult {
	ffmpegPath := a.getBinaryPath(binaryName("ffmpeg"))
	ext := filepath.Ext(audioPath)
	tempPath := strings.TrimSuffix(audioPath, ext) + "_cover_temp" + ext

	args := []string{
		"-i", audioPath,
		"-i", imagePath,
		"-map", "0:a",
		"-map", "1:v",
		"-c", "copy",
		"-id3v2_version", "3",
		"-metadata:s:v", "title=Album cover",
		"-metadata:s:v", "comment=Cover (front)",
		"-y",
		tempPath,
	}

	cmd := exec.Command(ffmpegPath, args...)
	configureCmd(cmd)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return SimpleResult{Success: false, Error: "FFmpeg Error: " + err.Error() + " | Log: " + string(output)}
	}

	err = os.Remove(audioPath)
	if err != nil {
		os.Remove(tempPath)
		return SimpleResult{Success: false, Error: "Could not remove original file (locked?): " + err.Error()}
	}

	err = os.Rename(tempPath, audioPath)
	if err != nil {
		return SimpleResult{Success: false, Error: "Rename failed: " + err.Error()}
	}

	return SimpleResult{Success: true}
}

// --- Lyrics ---
func (a *App) GetLyrics(pathStr string) string {
	ext := filepath.Ext(pathStr)
	lrcPath := strings.TrimSuffix(pathStr, ext) + ".lrc"
	if _, err := os.Stat(lrcPath); err == nil {
		content, err := os.ReadFile(lrcPath)
		if err == nil {
			return string(content)
		}
	}
	return ""
}

func (a *App) HasLyrics(pathStr string) bool {
	ext := filepath.Ext(pathStr)
	lrcPath := strings.TrimSuffix(pathStr, ext) + ".lrc"
	if _, err := os.Stat(lrcPath); err == nil {
		return true
	}
	return false
}

func (a *App) DownloadFromYouTube(opts DownloadOptions) (SimpleResult, error) {
	cfg := a.LoadConfig()
	folderPath := cfg.DownloadFolder
	ytPath := a.getBinaryPath(binaryName("yt-dlp"))
	ffmpegPath := a.getBinaryPath(binaryName("ffmpeg"))

	if _, err := exec.LookPath(ytPath); err != nil {
		if _, statErr := os.Stat(ytPath); statErr != nil {
			return SimpleResult{Success: false, Error: "yt-dlp not found. Install it via your package manager (e.g. 'pacman -S yt-dlp', 'apt install yt-dlp') or place the binary in NovaWave's bin folder."}, nil
		}
	}

	qualityMap := map[string]string{"best": "0", "high": "5", "standard": "9"}
	qVal := qualityMap[opts.Quality]

	outputTemplate := "%(title)s.%(ext)s"
	if opts.CustomName != "" {
		safeName := strings.Map(func(r rune) rune {
			if strings.ContainsRune("< > : \" / \\ | ? *", r) {
				return '_'
			}
			return r
		}, opts.CustomName)
		outputTemplate = safeName + ".%(ext)s"
	}

	args := []string{
		opts.Url, "-x", "--audio-format", "mp3", "--audio-quality", qVal,
		"--newline", "--progress", "--no-warnings",
		"--embed-thumbnail", "--add-metadata",
		"--ffmpeg-location", filepath.Dir(ffmpegPath),
		"-P", folderPath, "-o", outputTemplate,
	}

	cmd := exec.Command(ytPath, args...)
	configureCmd(cmd)

	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()

	if err := cmd.Start(); err != nil {
		return SimpleResult{Success: false, Error: err.Error()}, nil
	}

	go func() {
		ctx, cancel := context.WithTimeout(a.ctx, 15*time.Second)
		defer cancel()
		tCmd := exec.CommandContext(ctx, ytPath, "--get-title", "--no-warnings", opts.Url)
		configureCmd(tCmd)
		if out, err := tCmd.Output(); err == nil {
			title := strings.TrimSpace(string(out))
			if title != "" {
				wailsRuntime.EventsEmit(a.ctx, "download-title-update", map[string]string{
					"id":    opts.Id,
					"title": title,
				})
			}
		}
	}()

	processPipe := func(r io.Reader) {
		scanner := bufio.NewScanner(r)
		for scanner.Scan() {
			line := scanner.Text()
			wailsRuntime.EventsEmit(a.ctx, "download-terminal-log", map[string]string{
				"id":   opts.Id,
				"line": line + "\n",
			})

			lowerLine := strings.ToLower(line)
			var titleCandidate string

			if strings.Contains(line, "Destination: ") {
				parts := strings.Split(line, "Destination: ")
				titleCandidate = parts[len(parts)-1]
			} else if strings.Contains(lowerLine, "has already been downloaded") {
				titleCandidate = strings.TrimPrefix(line, "[download] ")
				titleCandidate = strings.Split(titleCandidate, " has already")[0]
			}

			if titleCandidate != "" {
				filename := filepath.Base(strings.TrimSpace(titleCandidate))
				title := strings.TrimSuffix(filename, filepath.Ext(filename))
				if idx := strings.LastIndex(title, " ["); idx != -1 {
					title = strings.TrimSpace(title[:idx])
				}
				wailsRuntime.EventsEmit(a.ctx, "download-title-update", map[string]string{
					"id":    opts.Id,
					"title": title,
				})
			}
		}
	}

	go processPipe(stdout)
	go processPipe(stderr)

	err := cmd.Wait()
	if err != nil {
		wailsRuntime.EventsEmit(a.ctx, "download-terminal-log", map[string]string{
			"id":   opts.Id,
			"line": fmt.Sprintf("ERROR: %v\n", err),
		})
		return SimpleResult{Success: false, Error: fmt.Sprintf("Download failed: %v", err)}, nil
	}

	wailsRuntime.EventsEmit(a.ctx, "download-success", map[string]string{
		"id":   opts.Id,
		"path": folderPath,
	})

	return SimpleResult{Success: true}, nil
}

func (a *App) IsSpotifyUrl(url string) bool {
	return a.spotifyService.IsSpotifyUrl(url)
}

func (a *App) GetSpotifyPlaylistTracks(url string) ([]string, error) {
	return a.spotifyService.GetPlaylistTracks(url)
}

func (a *App) DownloadFromSpotify(id string, url string, quality string) (SimpleResult, error) {
	track, err := a.spotifyService.GetTrackMetadata(url)
	if err != nil {
		return SimpleResult{Success: false, Error: err.Error()}, nil
	}

	return a.DownloadFromYouTube(DownloadOptions{
		Id:         id,
		Url:        fmt.Sprintf("ytsearch1:%s - %s lyrics", track.Artist, track.Title),
		CustomName: fmt.Sprintf("%s - %s", track.Artist, track.Title),
		Quality:    quality,
	})
}

func (a *App) ShutdownApp() {
	wailsRuntime.Quit(a.ctx)
}

func (a *App) RestartApp() {
	self, err := os.Executable()
	if err != nil {
		return
	}
	cmd := exec.Command(self)
	cmd.Start()
	wailsRuntime.Quit(a.ctx)
}
