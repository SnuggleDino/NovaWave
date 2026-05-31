//go:build windows

package main

import (
	"embed"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"unsafe"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// On Windows the required tools are shipped inside the executable and
// extracted to the user's config directory on first launch.
//
//go:embed bin/*.exe
var embeddedBinaries embed.FS

// binaryName maps a logical tool name to its Windows executable name.
func binaryName(base string) string {
	return base + ".exe"
}

// systemBinaryDirs returns conventional install directories to probe when a
// tool is not found via PATH. On Windows the helpers are bundled, so there
// are none.
func systemBinaryDirs() []string {
	return nil
}

// configureCmd hides the console window that would otherwise flash up when a
// child process is started.
func configureCmd(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}

// ensureBinaries extracts the embedded ffmpeg/ffprobe/yt-dlp executables into
// the per-user config directory if they are not already present.
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

			dstFile, err := os.Create(destPath)
			if err != nil {
				srcFile.Close()
				continue
			}

			io.Copy(dstFile, srcFile)
			dstFile.Close()
			srcFile.Close()
			os.Chmod(destPath, 0755)
		}
	}
}

// setupMediaKeys registers global hotkeys for the multimedia keys via the
// Win32 RegisterHotKey API and forwards them to the frontend.
func (a *App) setupMediaKeys() {
	tidCh := make(chan uint32, 1)
	go func() {
		runtime.LockOSThread()
		user32 := syscall.NewLazyDLL("user32.dll")
		kernel32 := syscall.NewLazyDLL("kernel32.dll")
		procRegisterHotKey := user32.NewProc("RegisterHotKey")
		procGetMessage := user32.NewProc("GetMessageW")
		procGetCurrentThreadId := kernel32.NewProc("GetCurrentThreadId")

		tid, _, _ := procGetCurrentThreadId.Call()
		tidCh <- uint32(tid)

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

			if msg.Message == 0x0312 {
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
	a.mediaKeyTID = <-tidCh
}

// teardownMediaKeys stops the hotkey message loop started by setupMediaKeys.
func (a *App) teardownMediaKeys() {
	if a.mediaKeyTID != 0 {
		user32 := syscall.NewLazyDLL("user32.dll")
		procPostThreadMessage := user32.NewProc("PostThreadMessageW")
		procPostThreadMessage.Call(uintptr(a.mediaKeyTID), 0x0012, 0, 0) // WM_QUIT
		a.mediaKeyTID = 0
	}
}

// ShowInFolder opens the system file explorer with the given file selected.
func (a *App) ShowInFolder(path string) {
	exec.Command("explorer", "/select,", strings.ReplaceAll(path, "/", "\\")).Start()
}
