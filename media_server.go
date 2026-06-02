package main

import (
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/dhowden/tag"
)

// serveMedia handles /music/ (audio files) and /cover/ (embedded cover art)
// requests. It is shared by the Wails asset Handler (FileLoader) and the
// loopback media server below, so both expose identical, access-checked
// endpoints. Returns true when the request was a media request (handled).
func serveMedia(a *App, w http.ResponseWriter, r *http.Request) bool {
	path := r.URL.Path

	// Allow the WebKit media player / fetch to read these cross-origin
	// (the loopback server's origin differs from the app's asset origin,
	// and lite.html's <audio crossorigin="anonymous"> requires CORS).
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
// WebKitGTK refuses to play media from the Wails custom asset scheme
// (FormatError at prepareToPlay) and mis-seeks blob: URLs (audio jumps around),
// so the frontend instead points <audio> at real http://127.0.0.1:<port>/music/
// URLs, which the GStreamer media player streams correctly with proper
// byte-range / seek support.
func (a *App) startMediaServer() {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return
	}

	a.mu.Lock()
	a.mediaBaseURL = fmt.Sprintf("http://%s", ln.Addr().String())
	a.mu.Unlock()

	// Use a bare HandlerFunc, NOT http.ServeMux: the frontend builds URLs as
	// "/music/" + an absolute file path, producing a double slash
	// ("/music//home/..."). ServeMux would 301-redirect that to the cleaned
	// "/music/home/..." and the leading slash of the file path would be lost,
	// breaking the access check. A bare handler preserves r.URL.Path verbatim.
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !serveMedia(a, w, r) {
			w.WriteHeader(http.StatusNotFound)
		}
	})
	srv := &http.Server{Handler: handler}
	go srv.Serve(ln)
}

// GetMediaBaseURL returns the loopback base URL (e.g. http://127.0.0.1:45678)
// the frontend prefixes onto /music/ and /cover/ paths. Empty if the server
// failed to start (frontend then falls back to relative asset-scheme URLs).
func (a *App) GetMediaBaseURL() string {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.mediaBaseURL
}
