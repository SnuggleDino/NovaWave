package main

import (
	"embed"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/dhowden/tag"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

type FileLoader struct {
	app *App
}

func (h *FileLoader) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	if strings.HasPrefix(path, "/music/") {
		rawPath := strings.TrimPrefix(path, "/music/")
		filePath, err := url.PathUnescape(rawPath)
		if err != nil {
			http.Error(w, "Invalid path encoding", http.StatusBadRequest)
			return
		}
		if !isAllowedPath(filePath, h.app.getAllowedDirs()) {
			http.Error(w, "Access denied", http.StatusForbidden)
			return
		}
		http.ServeFile(w, r, filePath)
		return
	}

	if strings.HasPrefix(path, "/cover/") {
		rawPath := strings.TrimPrefix(path, "/cover/")
		filePath, err := url.PathUnescape(rawPath)
		if err != nil {
			http.Error(w, "Invalid path encoding", http.StatusBadRequest)
			return
		}
		if !isAllowedPath(filePath, h.app.getAllowedDirs()) {
			http.Error(w, "Access denied", http.StatusForbidden)
			return
		}

		f, err := os.Open(filePath)
		if err != nil {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}
		defer f.Close()

		m, err := tag.ReadFrom(f)
		if err != nil || m.Picture() == nil {
			http.Error(w, "No cover found", http.StatusNotFound)
			return
		}

		pic := m.Picture()
		w.Header().Set("Content-Type", pic.MIMEType)
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Write(pic.Data)
		return
	}

	w.WriteHeader(http.StatusNotFound)
}

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:            "NovaWave",
		Width:            1300,
		Height:           900,
		MinWidth:         340,
		MinHeight:        160,
		BackgroundColour: &options.RGBA{R: 10, G: 14, B: 27, A: 255},

		AssetServer: &assetserver.Options{
			Assets:  assets,
			Handler: &FileLoader{app: app},
		},

		DragAndDrop: &options.DragAndDrop{
			EnableFileDrop:     true,
			DisableWebViewDrop: true,
		},

		OnStartup:  app.startup,
		OnShutdown: app.shutdown,
		Bind: []interface{}{
			app,
		},
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			Theme:                windows.Dark,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}