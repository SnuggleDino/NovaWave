package main

import (
	"embed"
	"net/http"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var appIcon []byte

type FileLoader struct {
	app *App
}

func (h *FileLoader) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// /music/ and /cover/ are handled by the shared media handler (also used by
	// the loopback media server in media_server.go). Anything else is 404.
	if serveMedia(h.app, w, r) {
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
		Linux: &linux.Options{
			Icon:                appIcon,
			ProgramName:         "NovaWave",
			WindowIsTranslucent: false,
			WebviewGpuPolicy:    linux.WebviewGpuPolicyOnDemand,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
