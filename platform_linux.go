//go:build linux

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/godbus/dbus/v5"
	"github.com/godbus/dbus/v5/introspect"
	"github.com/godbus/dbus/v5/prop"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// mprisConn holds the session-bus connection used for the MPRIS service so it
// can be released on shutdown.
var mprisConn *dbus.Conn

// binaryName maps a logical tool name to its executable name on Linux, where
// the tools are provided by the distribution rather than bundled.
func binaryName(base string) string {
	return base
}

// systemBinaryDirs returns the conventional locations distro packages install
// CLI tools to. These are probed when PATH is incomplete — e.g. when the app
// is started from a desktop launcher with a minimal environment.
func systemBinaryDirs() []string {
	return []string{"/usr/local/bin", "/usr/bin", "/bin"}
}

// configureCmd is a no-op on Linux; there is no console window to hide.
func configureCmd(cmd *exec.Cmd) {}

// ensureBinaries verifies that the external tools NovaWave relies on are
// reachable. On Linux these are expected to be installed system-wide
// (ffmpeg, ffprobe, yt-dlp) and resolved through getBinaryPath / PATH.
func (a *App) ensureBinaries() {
	for _, name := range []string{"ffmpeg", "ffprobe", "yt-dlp"} {
		// getBinaryPath checks PATH and the conventional install dirs; it
		// returns an absolute path when the tool is found, or the bare name
		// otherwise. Only warn in the latter case.
		if resolved := a.getBinaryPath(name); !filepath.IsAbs(resolved) {
			fmt.Fprintf(os.Stderr, "NovaWave: %q not found; install it via your package manager for full functionality\n", name)
		}
	}
}

// mprisPlayer implements the org.mpris.MediaPlayer2.Player interface. The
// methods are invoked by the desktop environment when the user presses the
// multimedia keys, and they are forwarded to the frontend as "media-key"
// events — the same events the Windows hotkey handler emits.
type mprisPlayer struct {
	app *App
}

func (p *mprisPlayer) emit(action string) *dbus.Error {
	wailsRuntime.EventsEmit(p.app.ctx, "media-key", action)
	return nil
}

func (p *mprisPlayer) PlayPause() *dbus.Error { return p.emit("playpause") }
func (p *mprisPlayer) Play() *dbus.Error      { return p.emit("play") }
func (p *mprisPlayer) Pause() *dbus.Error     { return p.emit("pause") }
func (p *mprisPlayer) Stop() *dbus.Error      { return p.emit("stop") }
func (p *mprisPlayer) Next() *dbus.Error      { return p.emit("next") }
func (p *mprisPlayer) Previous() *dbus.Error  { return p.emit("prev") }

// mprisRoot implements the org.mpris.MediaPlayer2 (root) interface.
type mprisRoot struct {
	app *App
}

func (r *mprisRoot) Raise() *dbus.Error {
	wailsRuntime.WindowShow(r.app.ctx)
	return nil
}

func (r *mprisRoot) Quit() *dbus.Error {
	wailsRuntime.Quit(r.app.ctx)
	return nil
}

// setupMediaKeys registers an MPRIS service on the D-Bus session bus so the
// desktop environment routes the multimedia keys to NovaWave. If no session
// bus is available (e.g. a headless environment) it degrades gracefully.
func (a *App) setupMediaKeys() {
	conn, err := dbus.SessionBus()
	if err != nil {
		fmt.Fprintf(os.Stderr, "NovaWave: no D-Bus session bus, media keys disabled: %v\n", err)
		return
	}

	const objPath = "/org/mpris/MediaPlayer2"
	player := &mprisPlayer{app: a}
	root := &mprisRoot{app: a}

	if err := conn.Export(player, objPath, "org.mpris.MediaPlayer2.Player"); err != nil {
		fmt.Fprintf(os.Stderr, "NovaWave: MPRIS player export failed: %v\n", err)
		return
	}
	if err := conn.Export(root, objPath, "org.mpris.MediaPlayer2"); err != nil {
		fmt.Fprintf(os.Stderr, "NovaWave: MPRIS root export failed: %v\n", err)
		return
	}

	propsSpec := map[string]map[string]*prop.Prop{
		"org.mpris.MediaPlayer2": {
			"CanQuit":             {Value: true, Writable: false, Emit: prop.EmitTrue},
			"CanRaise":            {Value: true, Writable: false, Emit: prop.EmitTrue},
			"HasTrackList":        {Value: false, Writable: false, Emit: prop.EmitTrue},
			"Identity":            {Value: "NovaWave", Writable: false, Emit: prop.EmitTrue},
			"DesktopEntry":        {Value: "novawave", Writable: false, Emit: prop.EmitTrue},
			"SupportedUriSchemes": {Value: []string{"file"}, Writable: false, Emit: prop.EmitTrue},
			"SupportedMimeTypes":  {Value: []string{"audio/mpeg", "audio/flac", "audio/x-wav", "audio/mp4", "audio/ogg"}, Writable: false, Emit: prop.EmitTrue},
		},
		"org.mpris.MediaPlayer2.Player": {
			"PlaybackStatus": {Value: "Stopped", Writable: false, Emit: prop.EmitTrue},
			"CanGoNext":      {Value: true, Writable: false, Emit: prop.EmitTrue},
			"CanGoPrevious":  {Value: true, Writable: false, Emit: prop.EmitTrue},
			"CanPlay":        {Value: true, Writable: false, Emit: prop.EmitTrue},
			"CanPause":       {Value: true, Writable: false, Emit: prop.EmitTrue},
			"CanSeek":        {Value: false, Writable: false, Emit: prop.EmitTrue},
			"CanControl":     {Value: true, Writable: false, Emit: prop.EmitTrue},
			"Metadata":       {Value: map[string]dbus.Variant{}, Writable: false, Emit: prop.EmitTrue},
		},
	}

	if _, err := prop.Export(conn, objPath, propsSpec); err != nil {
		fmt.Fprintf(os.Stderr, "NovaWave: MPRIS properties export failed: %v\n", err)
		return
	}

	node := &introspect.Node{
		Name: objPath,
		Interfaces: []introspect.Interface{
			introspect.IntrospectData,
			prop.IntrospectData,
			{
				Name: "org.mpris.MediaPlayer2",
				Methods: []introspect.Method{
					{Name: "Raise"},
					{Name: "Quit"},
				},
			},
			{
				Name: "org.mpris.MediaPlayer2.Player",
				Methods: []introspect.Method{
					{Name: "PlayPause"},
					{Name: "Play"},
					{Name: "Pause"},
					{Name: "Stop"},
					{Name: "Next"},
					{Name: "Previous"},
				},
			},
		},
	}
	conn.Export(introspect.NewIntrospectable(node), objPath, "org.freedesktop.DBus.Introspectable")

	reply, err := conn.RequestName("org.mpris.MediaPlayer2.novawave", dbus.NameFlagReplaceExisting)
	if err != nil || reply != dbus.RequestNameReplyPrimaryOwner {
		fmt.Fprintf(os.Stderr, "NovaWave: could not acquire MPRIS bus name: %v\n", err)
		return
	}

	mprisConn = conn
}

// teardownMediaKeys releases the MPRIS bus name and closes the connection.
func (a *App) teardownMediaKeys() {
	if mprisConn != nil {
		mprisConn.Close()
		mprisConn = nil
	}
}

// ShowInFolder opens the file manager at the directory containing the file.
func (a *App) ShowInFolder(path string) {
	exec.Command("xdg-open", filepath.Dir(path)).Start()
}
