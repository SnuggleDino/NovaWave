package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"

	"github.com/dhowden/tag"
	"github.com/tcolgate/mp3"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx            context.Context
	mu             sync.Mutex // For thread-safe settings access
	spotifyService *SpotifyService
}

// Config stores all settings
type Config struct {
	Theme                   string   `json:"theme"`
	Volume                  float64  `json:"volume"`
	DownloadFolder          string   `json:"downloadFolder"`
	Language                string   `json:"language"`
	CoverMode               string   `json:"coverMode"`
	CustomCoverEmoji        string   `json:"customCoverEmoji"`
	BassGain                float64  `json:"bassGain"` // Legacy naming
	BassBoostEnabled        bool     `json:"bassBoostEnabled"`
	BassBoostValue          float64  `json:"bassBoostValue"`
	TrebleBoostEnabled      bool     `json:"trebleBoostEnabled"`
	TrebleBoostValue        float64  `json:"trebleBoostValue"`
	ReverbEnabled           bool     `json:"reverbEnabled"`
	ReverbValue             float64  `json:"reverbValue"`
	AnimationMode           string   `json:"animationMode"`
	VisualizerEnabled       bool     `json:"visualizerEnabled"`
	VisualizerStyle         string   `json:"visualizerStyle"`
	VisSensitivity          float64  `json:"visSensitivity"`
	AutoLoadLastFolder      bool     `json:"autoLoadLastFolder"`
	CurrentFolderPath       string   `json:"currentFolderPath"`
	EnableFocusMode         bool     `json:"enableFocusMode"`
	EnableDragAndDrop       bool     `json:"enableDragAndDrop"`
	UseCustomColor          bool     `json:"useCustomColor"`
	CustomAccentColor       string   `json:"customAccentColor"`
	SortMode                string   `json:"sortMode"`
	TargetFps               int      `json:"targetFps"`
	PerformanceMode         bool     `json:"performanceMode"`
	ShowStatsOverlay        bool     `json:"showStatsOverlay"`
	CinemaMode              bool     `json:"cinemaMode"`
	PlaybackSpeed           float64  `json:"playbackSpeed"`
	Favorites               []string `json:"favorites"`
	EnableFavoritesPlaylist bool     `json:"enableFavoritesPlaylist"`
	MiniMode                bool     `json:"miniMode"`
	AudioQuality            string   `json:"audioQuality"`
	DeleteSongsEnabled      bool     `json:"deleteSongsEnabled"`
	Loop                    string   `json:"loop"`
	Shuffle                 bool     `json:"shuffle"`
	SnuggleTimeEnabled      bool     `json:"snuggleTimeEnabled"`
	SleepTimeEnabled        bool     `json:"sleepTimeEnabled"`
	CyberpunkEnabled        bool     `json:"cyberpunkEnabled"`
	PlaylistPosition        string   `json:"playlistPosition"`
	PlaylistHidden          bool     `json:"playlistHidden"`
	GradientTitleEnabled    bool     `json:"gradientTitleEnabled"`
	ActiveIntro             string   `json:"activeIntro"`       // NEU
	SunsetEnabled           bool     `json:"sunsetEnabled"`     // NEU
	SakuraEnabled           bool     `json:"sakuraEnabled"`     // NEU
	NovaWave95Enabled       bool     `json:"novaWave95Enabled"` // NEU
}

// Track defines a song for the frontend
type Track struct {
	Path     string  `json:"path"`
	Title    string  `json:"title"`
	Artist   string  `json:"artist"`
	Duration int     `json:"duration"`
	Mtime    float64 `json:"mtime"` // Modification time in ms
}

type DownloadOptions struct {
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
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.setupMediaKeys()
}

func (a *App) setupMediaKeys() {
	go func() {
		runtime.LockOSThread()
		user32 := syscall.NewLazyDLL("user32.dll")
		procRegisterHotKey := user32.NewProc("RegisterHotKey")
		procGetMessage := user32.NewProc("GetMessageW")

		// IDs: 1001, 1002, 1003, 1004, 1005, 1006
		// VK codes: Play/Pause (0xB3), Next (0xB0), Prev (0xB1), Stop (0xB2), Play (0xFA), Pause (0xFB)

		procRegisterHotKey.Call(0, 1001, 0, 0xB3)
		procRegisterHotKey.Call(0, 1002, 0, 0xB0)
		procRegisterHotKey.Call(0, 1003, 0, 0xB1)
		procRegisterHotKey.Call(0, 1004, 0, 0xB2)
		procRegisterHotKey.Call(0, 1005, 0, 0xFA)
		procRegisterHotKey.Call(0, 1006, 0, 0xFB)

		for {
			var msg struct {
				Hwnd    uintptr
				Message uint32
				WParam  uintptr
				LParam  uintptr
				Time    uint32
				Pt      struct{ X, Y int32 }
			}
			ret, _, _ := procGetMessage.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
			if ret == 0 {
				return
			}

			if msg.Message == 0x0312 { // WM_HOTKEY
				switch msg.WParam {
				case 1001:
					wailsRuntime.EventsEmit(a.ctx, "media-key", "playpause")
				case 1002:
					wailsRuntime.EventsEmit(a.ctx, "media-key", "next")
				case 1003:
					wailsRuntime.EventsEmit(a.ctx, "media-key", "prev")
				case 1004:
					wailsRuntime.EventsEmit(a.ctx, "media-key", "stop")
				case 1005:
					wailsRuntime.EventsEmit(a.ctx, "media-key", "play")
				case 1006:
					wailsRuntime.EventsEmit(a.ctx, "media-key", "pause")
				}
			}
		}
	}()
}

// Config speichert alle Einstellungen
func (a *App) SetWindowSize(width int, height int) {
	wailsRuntime.WindowSetSize(a.ctx, width, height)
}

// --- Config ---
func getConfigPath() string {
	configDir, _ := os.UserConfigDir()
	path := filepath.Join(configDir, "NovaWave", "settings.json")
	return path
}

func (a *App) GetAppMeta() AppMeta {
	return CurrentMeta
}

func (a *App) LoadConfig() Config {
	a.mu.Lock()
	defer a.mu.Unlock()

	path := getConfigPath()
	data, err := os.ReadFile(path)

	defaultConf := Config{
		Theme:                   "blue",
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
	}

	if err != nil {
		return defaultConf
	}

	var loadedConf Config
	err = json.Unmarshal(data, &loadedConf)
	if err != nil {
		return defaultConf
	}

	// Simple merge/fallback
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
		cwd, _ := os.Getwd()
		loadedConf.DownloadFolder = cwd
	}

	return loadedConf
}

func (a *App) SaveConfig(config Config) string {
	path := getConfigPath()
	os.MkdirAll(filepath.Dir(path), 0755)

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return "Fehler beim Erstellen der Config"
	}

	err = os.WriteFile(path, data, 0644)
	if err != nil {
		return "Fehler beim Speichern: " + err.Error()
	}
	return "Gespeichert"
}

// Helper to get current config, update one field, and save
func (a *App) SetSetting(key string, value interface{}) {
	a.mu.Lock()
	defer a.mu.Unlock()

	path := getConfigPath()

	// Read existing data as map to preserve fields not in struct (if any)
	// and to handle raw updates
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
	_ = os.WriteFile(path, newData, 0644)
}

func (a *App) GetSettings() Config {
	return a.LoadConfig()
}

// --- File System & Dialogs ---
func (a *App) SelectFolderDialog() string {
	selection, err := wailsRuntime.OpenDirectoryDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Ordner wählen",
	})
	if err != nil {
		return ""
	}
	return selection
}

func (a *App) SelectFolder() string {
	return a.SelectFolderDialog()
}

func (a *App) SelectMusicFolder() FolderResult {
	path := a.SelectFolderDialog()
	if path == "" {
		return FolderResult{Tracks: nil, FolderPath: ""}
	}
	return a.RefreshMusicFolder(path)
}

// getBinaryPath checks for a binary in several locations
func (a *App) getBinaryPath(name string) string {
	cwd, _ := os.Getwd()
	ex, _ := os.Executable()
	exDir := filepath.Dir(ex)

	paths := []string{
		filepath.Join(cwd, "executable_bin", name),
		filepath.Join(exDir, "executable_bin", name),
		filepath.Join(filepath.Dir(exDir), "executable_bin", name),
		filepath.Join(cwd, name),
	}

	for _, p := range paths {
		if info, err := os.Stat(p); err == nil && !info.IsDir() {
			abs, _ := filepath.Abs(p)
			return abs
		}
	}

	return name // Fallback to PATH
}

// getMP3Duration reads MP3 duration natively without external tools
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
		// Single file handling
		name := strings.ToLower(info.Name())
		if !strings.HasSuffix(name, ".mp3") && !strings.HasSuffix(name, ".flac") && !strings.HasSuffix(name, ".wav") && !strings.HasSuffix(name, ".m4a") && !strings.HasSuffix(name, ".ogg") {
			return FolderResult{Error: "Keine unterstützte Musikdatei"}
		}

		mtime := float64(info.ModTime().UnixMilli())
		currentTrack := Track{Path: path, Title: info.Name(), Artist: "Unbekannter Künstler", Mtime: mtime}

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

		// Try native MP3 duration reading first
		if strings.HasSuffix(name, ".mp3") {
			currentTrack.Duration = getMP3Duration(path)
		}

		// Fallback to ffprobe for other formats or if native failed
		if currentTrack.Duration == 0 {
			ffprobePath := a.getBinaryPath("ffprobe.exe")
			if info, err := os.Stat(ffprobePath); err == nil && !info.IsDir() {
				cmd := exec.Command(ffprobePath, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path)
				cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
				out, err := cmd.Output()
				if err == nil {
					var dur float64
					if _, err := fmt.Sscanf(strings.TrimSpace(string(out)), "%f", &dur); err == nil {
						currentTrack.Duration = int(dur)
					}
				}
			}
		}

		return FolderResult{
			Tracks:     []Track{currentTrack},
			FolderPath: filepath.Dir(path),
		}
	}

	// Directory handling
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

	ffprobePath := a.getBinaryPath("ffprobe.exe")
	hasFFprobe := false
	if info, err := os.Stat(ffprobePath); err == nil && !info.IsDir() {
		hasFFprobe = true
	}

	// Safe Slice for Concurrent Access
	var tracks []Track
	var mutex sync.Mutex

	// Worker Pool Settings
	// Limit concurrency to avoid too many open files or CPU choke
	maxConcurrency := 10
	sem := make(chan struct{}, maxConcurrency)
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

			currentTrack := Track{Path: fullPath, Title: f.Name(), Artist: "Unbekannter Künstler", Mtime: mtime}

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

			// Try native MP3 duration reading first
			if strings.HasSuffix(strings.ToLower(f.Name()), ".mp3") {
				currentTrack.Duration = getMP3Duration(fullPath)
			}

			// Fallback to ffprobe for other formats or if native failed
			if currentTrack.Duration == 0 && hasFFprobe {
				cmd := exec.Command(ffprobePath, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", fullPath)
				cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
				out, err := cmd.Output()
				if err == nil {
					var dur float64
					if _, err := fmt.Sscanf(strings.TrimSpace(string(out)), "%f", &dur); err == nil {
						currentTrack.Duration = int(dur)
					}
				}
			}

			mutex.Lock()
			tracks = append(tracks, currentTrack)
			mutex.Unlock()
		}(file)
	}

	wg.Wait()
	return tracks, nil
}

func (a *App) ShowInFolder(path string) {
	// Windows specific
	exec.Command("explorer", "/select,", strings.ReplaceAll(path, "/", "\\")).Start()
}

func (a *App) DeleteTrack(path string) SimpleResult {
	err := os.Remove(path)
	if err != nil {
		return SimpleResult{Success: false, Error: err.Error()}
	}
	return SimpleResult{Success: true}
}

func (a *App) MoveFile(sourcePath string, destFolder string) SimpleResult {
	fileName := filepath.Base(sourcePath)
	destPath := filepath.Join(destFolder, fileName)

	if sourcePath == destPath {
		return SimpleResult{Success: true}
	}

	err := os.Rename(sourcePath, destPath)
	if err != nil {
		// Try copy and delete if rename fails (diff partitions)
		input, err := os.ReadFile(sourcePath)
		if err != nil {
			return SimpleResult{Success: false, Error: err.Error()}
		}
		err = os.WriteFile(destPath, input, 0644)
		if err != nil {
			return SimpleResult{Success: false, Error: err.Error()}
		}
		os.Remove(sourcePath)
	}
	return SimpleResult{Success: true, NewPath: destPath}
}

func (a *App) UpdateTitle(pathStr string, newTitle string) SimpleResult {
	ffmpegPath := a.getBinaryPath("ffmpeg.exe")
	if info, err := os.Stat(ffmpegPath); err != nil || info.IsDir() {
		return SimpleResult{Success: false, Error: "ffmpeg.exe not found"}
	}

	ext := filepath.Ext(pathStr)
	tempPath := strings.TrimSuffix(pathStr, ext) + "_temp" + ext

	cmd := exec.Command(ffmpegPath, "-i", pathStr, "-metadata", "title="+newTitle, "-c", "copy", "-y", tempPath)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	err := cmd.Run()
	if err != nil {
		return SimpleResult{Success: false, Error: "FFmpeg error: " + err.Error()}
	}

	// Swap files
	err = os.Remove(pathStr)
	if err != nil {
		os.Remove(tempPath) // Clean up
		return SimpleResult{Success: false, Error: "Could not remove original file"}
	}
	err = os.Rename(tempPath, pathStr)
	if err != nil {
		return SimpleResult{Success: false, Error: "Could not rename temp file"}
	}

	return SimpleResult{Success: true}
}

// --- Downloader ---
func (a *App) DownloadFromYouTube(opts DownloadOptions) (SimpleResult, error) {
	cfg := a.LoadConfig()
	folderPath := cfg.DownloadFolder
	if folderPath == "" {
		cwd, _ := os.Getwd()
		folderPath = cwd
	}

	ytPath := a.getBinaryPath("yt-dlp.exe")
	ffmpegPath := a.getBinaryPath("ffmpeg.exe")

	if _, err := os.Stat(ytPath); err != nil {
		return SimpleResult{Success: false, Error: "yt-dlp.exe nicht gefunden! Bitte in 'executable_bin' legen."}, nil
	}
	if _, err := os.Stat(ffmpegPath); err != nil {
		return SimpleResult{Success: false, Error: "ffmpeg.exe nicht gefunden!"}, nil
	}

	qualityMap := map[string]string{"best": "0", "high": "5", "standard": "9"}
	qVal := "0"
	if v, ok := qualityMap[opts.Quality]; ok {
		qVal = v
	}

	outputTemplate := "%(title)s.%(ext)s"
	if opts.CustomName != "" {
		// Simple sanitize
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
		"--embed-thumbnail", "--add-metadata",
		"--ffmpeg-location", filepath.Dir(ffmpegPath),
		"-P", folderPath, "-o", outputTemplate,
	}

	cmd := exec.Command(ytPath, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	// We could parse stdout for progress here if we wanted to be fancy,
	// but for now we just wait.
	// To send progress we'd need to read stdout pipe and emit Wails events.

	output, err := cmd.CombinedOutput()
	if err != nil {
		outStr := string(output)
		if len(outStr) > 200 {
			outStr = outStr[len(outStr)-200:]
		}
		return SimpleResult{Success: false, Error: outStr}, nil
	}

	// If custom name was provided, we might want to ensure ID3 title matches using ffmpeg or NodeID3 equivalent?
	// yt-dlp --add-metadata sets title to video title usually.
	// If the user provided a custom name, they might expect the metadata Title to match.
	// We can optionally fix it here if needed, similar to the legacy app.

	return SimpleResult{Success: true}, nil
}

func (a *App) SendPlaybackState(isPlaying bool) {
	// Placeholder: In Wails, we might emit an event if backend needs to know,
	// or we just use this to trigger system media controls if implemented.
}

// --- Spotify Downloader ---

func (a *App) IsSpotifyUrl(url string) bool {
	return a.spotifyService.IsSpotifyUrl(url)
}

func (a *App) GetSpotifyMetadata(url string) (*SpotifyTrack, error) {
	return a.spotifyService.GetTrackMetadata(url)
}

func (a *App) DownloadFromSpotify(url string, quality string) (SimpleResult, error) {
	track, err := a.spotifyService.GetTrackMetadata(url)
	if err != nil {
		return SimpleResult{Success: false, Error: "Spotify Metadata Error: " + err.Error()}, nil
	}

	// Search on YouTube for "Artist - Title lyrics" for best results
	searchQuery := fmt.Sprintf("ytsearch1:%s - %s lyrics", track.Artist, track.Title)

	opts := DownloadOptions{
		Url:        searchQuery,
		CustomName: fmt.Sprintf("%s - %s", track.Artist, track.Title),
		Quality:    quality,
	}

	// We use the existing download logic
	return a.DownloadFromYouTube(opts)
}
