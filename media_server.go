package main

import (
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"runtime"
	"strings"

	"github.com/dhowden/tag"
)

// serveMedia handles /music/ (audio) and /cover/ (embedded art) requests,
// shared by the Wails asset Handler and the loopback server. Returns true when
// the request was handled.
func serveMedia(a *App, w http.ResponseWriter, r *http.Request) bool {
	path := r.URL.Path

	// CORS: loopback origin differs from the app origin; lite.html's
	// <audio crossorigin> needs it.
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if strings.HasPrefix(path, "/music/") {
		rawPath := strings.TrimPrefix(path, "/music/")
		filePath, err := url.PathUnescape(rawPath)
		if err != nil {
			http.Error(w, "Invalid path encoding", http.StatusBadRequest)
			return true
		}
		if !isAllowedPath(filePath, a.getAllowedDirs()) {
			http.Error(w, "Access denied", http.StatusForbidden)
			return true
		}
		http.ServeFile(w, r, filePath)
		return true
	}

	if strings.HasPrefix(path, "/cover/") {
		rawPath := strings.TrimPrefix(path, "/cover/")
		filePath, err := url.PathUnescape(rawPath)
		if err != nil {
			http.Error(w, "Invalid path encoding", http.StatusBadRequest)
			return true
		}
		if !isAllowedPath(filePath, a.getAllowedDirs()) {
			http.Error(w, "Access denied", http.StatusForbidden)
			return true
		}

		f, err := os.Open(filePath)
		if err != nil {
			http.Error(w, "File not found", http.StatusNotFound)
			return true
		}
		defer f.Close()

		m, err := tag.ReadFrom(f)
		if err != nil || m.Picture() == nil {
			http.Error(w, "No cover found", http.StatusNotFound)
			return true
		}

		pic := m.Picture()
		w.Header().Set("Content-Type", pic.MIMEType)
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Write(pic.Data)
		return true
	}

	return false
}

// startMediaServer starts a loopback HTTP server for audio/cover delivery.
// Linux/WebKitGTK only: there the media player can't play from the Wails asset
// scheme, so the frontend points <audio> at http://127.0.0.1:<port>/music/...
// Windows (WebView2) uses the same-origin asset scheme (keeps Web Audio
// working), so leave mediaBaseURL empty there.
func (a *App) startMediaServer() {
	if runtime.GOOS != "linux" {
		return
	}

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return
	}

	a.mu.Lock()
	a.mediaBaseURL = fmt.Sprintf("http://%s", ln.Addr().String())
	a.mu.Unlock()

	// Bare HandlerFunc, not ServeMux: ServeMux would 301-clean the
	// "/music//home/..." double slash and drop the path's leading slash. This
	// keeps r.URL.Path verbatim.
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !serveMedia(a, w, r) {
			w.WriteHeader(http.StatusNotFound)
		}
	})
	srv := &http.Server{Handler: handler}
	go srv.Serve(ln)
}

// GetMediaBaseURL returns the loopback base URL the frontend prefixes onto
// /music/ and /cover/ paths. Empty on Windows or if the server didn't start.
func (a *App) GetMediaBaseURL() string {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.mediaBaseURL
}
