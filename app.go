package main

import (
	"bufio"
	"context"
	"embed"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
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

//go:embed bin/*.exe
var embeddedBinaries embed.FS

type App struct {
	ctx            context.Context
	mu             sync.Mutex
	spotifyService *SpotifyService
	trackCache     map[string]Track
	cacheMu        sync.RWMutex
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
	SnuggleTimeEnabled      bool          `json:"snuggleTimeEnabled"`
	SleepTimeEnabled        bool          `json:"sleepTimeEnabled"`
	CyberpunkEnabled        bool          `json:"cyberpunkEnabled"`
	PlaylistPosition        string        `json:"playlistPosition"`
	PlaylistHidden          bool          `json:"playlistHidden"`
	GradientTitleEnabled    bool          `json:"gradientTitleEnabled"`
	ActiveIntro             string        `json:"activeIntro"`
	SunsetEnabled           bool          `json:"sunsetEnabled"`
	SakuraEnabled           bool          `json:"sakuraEnabled"`
	NovaWave95Enabled       bool          `json:"novaWave95Enabled"`
	PlaylistStructure       []interface{} `json:"playlistStructure"`
	// --- 5 BiquadFilterNode ---
	EqEnabled bool      `json:"eqEnabled"`
	EqValues  []float64 `json:"eqValues"`
}

type Track struct {
	Path     string  `json:"path"`
	Title    string  `json:"title"`
	Artist   string  `json:"artist"`
	Duration int     `json:"duration"`
	Mtime    float64 `json:"mtime"`
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
	a.setupMediaKeys()
}

func (a *App) ensureBinaries() {
	configDir, _ := os.UserConfigDir()
	destDir := filepath.Join(configDir, "NovaWave", "bin")
	os.MkdirAll(destDir, 0755)

	files := []string{"ffmpeg.exe", "ffprobe.exe", "yt-dlp.exe"}

	for _, name := range files {
		destPath := filepath.Join(destDir, name)

		if _, err := os.Stat(destPath); err != nil {
			srcFile, err := embeddedBinaries.Open("bin/" + name)
			if err != nil {
				continue
			}
			defer srcFile.Close()

			dstFile, err := os.Create(destPath)
			if err != nil {
				continue
			}
			defer dstFile.Close()

			io.Copy(dstFile, srcFile)
			os.Chmod(destPath, 0755)
		}
	}
}

func (a *App) setupMediaKeys() {
	go func() {
		runtime.LockOSThread()
		user32 := syscall.NewLazyDLL("user32.dll")
		procRegisterHotKey := user32.NewProc("RegisterHotKey")
		procGetMessage := user32.NewProc("GetMessageW")

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

func (a *App) SetWindowSize(width int, height int) {
	wailsRuntime.WindowSetSize(a.ctx, width, height)
}

func getConfigPath() string {
	configDir, _ := os.UserConfigDir()
	return filepath.Join(configDir, "NovaWave", "settings.json")
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
	}

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

		cwd, _ := os.Getwd()
		loadedConf.DownloadFolder = cwd
	}

	return loadedConf
}

func (a *App) ResetConfig() SimpleResult {
	a.mu.Lock()
	defer a.mu.Unlock()

	defaultConf := Config{
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
	}

	cwd, _ := os.Getwd()
	defaultConf.DownloadFolder = cwd

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
		// Return default config as map
		return map[string]interface{}{
			"theme":                   "midnight",
			"volume":                  0.2,
			"language":                "de",
			"coverMode":               "note",
			"animationMode":           "flow",
			"visualizerEnabled":       true,
			"activeIntro":             "waterdrop",
			"enableFavoritesPlaylist": true,
		}
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
	// 1. Check local bin folder first (Development)
	cwd, _ := os.Getwd()
	localPath := filepath.Join(cwd, "bin", name)
	if info, err := os.Stat(localPath); err == nil && !info.IsDir() {
		abs, _ := filepath.Abs(localPath)
		return abs
	}

	// 2. Check AppData (Production)
	configDir, _ := os.UserConfigDir()
	appDataPath := filepath.Join(configDir, "NovaWave", "bin", name)
	if info, err := os.Stat(appDataPath); err == nil && !info.IsDir() {
		return appDataPath
	}

	// 3. Fallback to PATH
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
			ffprobePath := a.getBinaryPath("ffprobe.exe")
			if info, err := os.Stat(ffprobePath); err == nil && !info.IsDir() {
				cmd := exec.Command(ffprobePath, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path)
				cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
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

	ffprobePath := a.getBinaryPath("ffprobe.exe")
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

			// 1. Check Cache first
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
				cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
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
	return tracks, nil
}

func (a *App) ShowInFolder(path string) {
	exec.Command("explorer", "/select,", strings.ReplaceAll(path, "/", "\\")).Start()
}

func (a *App) DeleteTrack(path string) SimpleResult {
	err := os.Remove(path)
	if err != nil {
		return SimpleResult{Success: false, Error: err.Error()}
	}

	// Remove from cache
	a.cacheMu.Lock()
	delete(a.trackCache, path)
	a.cacheMu.Unlock()

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
		input, _ := os.ReadFile(sourcePath)
		os.WriteFile(destPath, input, 0644)
		os.Remove(sourcePath)
	}
	return SimpleResult{Success: true, NewPath: destPath}
}

func (a *App) UpdateMetadata(pathStr string, newTitle string, newArtist string) SimpleResult {
	ffmpegPath := a.getBinaryPath("ffmpeg.exe")
	ext := filepath.Ext(pathStr)
	tempPath := strings.TrimSuffix(pathStr, ext) + "_temp" + ext

	args := []string{"-i", pathStr, "-metadata", "title=" + newTitle, "-metadata", "artist=" + newArtist, "-c", "copy", "-y", tempPath}
	cmd := exec.Command(ffmpegPath, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
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
	return a.UpdateMetadata(pathStr, newTitle, "")
}

func (a *App) SetCoverArt(audioPath string, imagePath string) SimpleResult {
	ffmpegPath := a.getBinaryPath("ffmpeg.exe")
	ext := filepath.Ext(audioPath)
	tempPath := strings.TrimSuffix(audioPath, ext) + "_cover_temp" + ext

	// ffmpeg command to attach picture (ID3v2 for MP3)
	// -map 0:a -map 1:v -> Take audio from file 0, video (image) from file 1
	// -c copy -> Copy streams without re-encoding (fast)
	// -id3v2_version 3 -> Maximum compatibility
	// -metadata:s:v title="Album cover" -metadata:s:v comment="Cover (front)" -> Tags
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
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	
	output, err := cmd.CombinedOutput()
	if err != nil {
		return SimpleResult{Success: false, Error: "FFmpeg Error: " + err.Error() + " | Log: " + string(output)}
	}

	// Replace original file
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

// --- Lyrics Function ---
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
	ytPath := a.getBinaryPath("yt-dlp.exe")
	ffmpegPath := a.getBinaryPath("ffmpeg.exe")

	if _, err := os.Stat(ytPath); err != nil {
		return SimpleResult{Success: false, Error: "yt-dlp.exe not found in bin folder"}, nil
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
		"--newline", "--progress",
		"--embed-thumbnail", "--add-metadata",
		"--ffmpeg-location", filepath.Dir(ffmpegPath),
		"-P", folderPath, "-o", outputTemplate,
	}

	cmd := exec.Command(ytPath, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()

	if err := cmd.Start(); err != nil {
		return SimpleResult{Success: false, Error: err.Error()}, nil
	}

	go func() {
		tCmd := exec.Command(ytPath, "--get-title", "--no-warnings", opts.Url)
		tCmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
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

	// Try to find the downloaded file to send path to frontend
	wailsRuntime.EventsEmit(a.ctx, "download-success", map[string]string{
		"id":   opts.Id,
		"path": folderPath,
	})

	return SimpleResult{Success: true}, nil
}

func (a *App) SendPlaybackState(isPlaying bool) {}

func (a *App) IsSpotifyUrl(url string) bool {
	return a.spotifyService.IsSpotifyUrl(url)
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
