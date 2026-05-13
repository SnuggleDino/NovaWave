# 🎵 NovaWave `v2.9.5` 

> **Your Music · Your Style · Your Rules**
> No ads, no clutter. Just your music, beautifully presented.  
> — Built with ❤️ in **Go (Wails v2)** + Vanilla JS · Free & Open Source —

![Version](https://img.shields.io/badge/Version-2.9.5-38bdf8?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Open--Source-4ade80?style=for-the-badge)
![Made with Love](https://img.shields.io/badge/Made_with-Love-ff69b4?style=for-the-badge)

---

## 🦖 What is NovaWave?

NovaWave is a **desktop music player** that puts personality first. It's not just about pressing play - it's about the atmosphere. Choose from handcrafted themes, kick back with animated backgrounds, dial in your sound with audio effects, and manage your entire music library your way.

Built from the ground up with **Go (Wails v2)** as the backend and a fully custom **HTML/CSS/JS** frontend. No Electron, no bloat, no framework.

---

## ✨ What's New in v2.9.5

- **Settings Side Drawer** - Settings now open as a sleek slide-in panel from the right, with icon tabs, integrated search, and smooth animation. Sub-navigation replaced with clean section dividers.
- **NovaWave 95 Intro** - Fully implemented Windows 95-style startup animation with app icon, blue block progress bar, and CRT scanline overlay.
- **Danger Zone Redesign** - Each destructive action (Restart, Reset, Quit) now has its own row with an icon, description, and a ghost button - blue for Restart, red for Reset/Quit.
- **Design & UI Tab** - Redesigned as single-column horizontal cards for a cleaner, more spacious layout.

---

## 🖥️ Three UIs - One Player

NovaWave ships with **three completely different interfaces**, each designed for a different kind of user:

| | 🎨 Legacy UI | 🚀 V2 PRO UI | 📱 Lite UI |
|---|---|---|---|
| **Philosophy** | Vibes & Aesthetics | Workflow & Power | Speed & Simplicity |
| **Best for** | Theme lovers, casual listening | Large libraries, power users | Minimalists, low-end PCs |
| **Highlights** | Theme Packs, animations, visualizer | Grid layout, sorting, logs | Ultra-fast, minimal footprint |
| **Switch with** | `CTRL + U + 1` | `CTRL + U + 2` | `CTRL + U + 3` |

Switch between all UIs at any time using the **Design Switcher** in Settings → UI.

---

## 🚀 V2 PRO UI

A ground-up redesign built for modern screens and larger libraries:

- **Sidebar Navigation** - Fluid transitions between Library, Downloader, and Settings
- **Library Sorting** - Sort tracks by A–Z, Z–A, or Recently Added
- **Multi-Folder Support** - Manage multiple music directories
- **Virtual Folders** - Organize tracks into custom groups with color labels
- **Favorites System** - One-click ❤️ to mark favorite tracks
- **LRC Lyrics** - Synchronized lyrics overlay with `.lrc` file support
- **PRO Console** - Built-in terminal-style log panel (`CTRL + 1`)

---

## 📱 Lite UI

Ultra-lightweight for those who just want to listen:

- **Zero Bloat** - Only essential playback and library controls
- **Resource Saving** - Perfect for older hardware or background listening
- **Instant Start** - Minimal memory footprint, loads immediately

---

## 🎬 Startup Intros

Every launch can feel different. Choose a startup animation in **Settings → Intros**:

| Intro | Vibe |
|---|---|
| 💧 **Waterdrop** | The classic NovaWave splash screen |
| 🪟 **NovaWave 95** | Windows 95-style boot with progress bar & CRT scanlines |
| 🦖 **Dino Love** | Heartwarming dino animation with floating hearts |
| 🚀 **Rocket** | Blast-off into space |
| 🕹️ **8-Bit** | Interactive retro game screen - press start to continue |
| 🌙 **Sleep Time** · ⭐ **Snuggle** · ⚡ **Cyberpunk** · 🏎️ **Sunset** · 🌸 **Sakura** | Theme Pack intros |

---

## 🎨 Theme Packs (Legacy UI)

Handcrafted **Theme Packs** transform the entire look and feel, each with a unique startup animation:

| Theme | Vibe |
|---|---|
| 🦖 **Snuggle Time** | Cozy dino energy - the original NovaWave experience |
| 🌙 **Sleep Time** | Calm and dark, perfect for late-night listening |
| ⚡ **Cyberpunk** | Neon lights, glitch effects, electric atmosphere |
| 🏎️ **Sunset Drive** | Pure 80s Retrowave feeling |
| 🌸 **Sakura Spirit** | Relaxed Japanese-inspired aesthetics |
| 🕹️ **8-Bit** | Retro game vibes all the way |

> Want to build your own? See [`frontend/src/theme_packs/theme_packs.md`](frontend/src/theme_packs/theme_packs.md) for the full creation guide.

---

## 🎨 V2 PRO - Built-in Themes

The V2 PRO UI ships with **10 built-in color themes**:

**Dark:** Midnight · Cherry · Coffee · Electric Violet · Forest · Gold · Ocean · Slate  
**Light:** Glacier · Lavender

---

## 🌌 Background Animations

Set the mood with **9 animated backgrounds** (Legacy UI):

`Aurora` · `Fireflies` · `Flow` · `Matrix` · `Nebula` · `Plasma` · `Rain` · `Snowfall` · `Stellar`

---

## 🎧 Sound & Visuals

**Audio Effects**
- 🔊 **Bass Boost** - Configurable low-frequency gain
- ✨ **Crystalizer** - Treble enhancement for sharper highs
- 🌊 **Reverb** - Add depth and space to your music
- 🎛️ **5-Band Equalizer** - Fine-tune 60Hz · 230Hz · 910Hz · 4kHz · 14kHz
- ⏩ **Playback Speed** - 0.25× to 3.0× with pitch preservation

**Visualizer** (Legacy UI)
- Modes: **Bars** · **Waveform** · **Orbit** · **Glitch** · **Zen** · **Retro** · **Sakura Bloom**
- Adjustable bar count and sensitivity

**Dynamic Island**
- Apple-style animated notification popup on track change

---

## 📥 Universal Downloader

Download music directly from your favorite platforms:

- **YouTube** · **YouTube Music** · **Spotify**
- Powered by `yt-dlp` + `ffmpeg` - embedded directly in the app binary
- Real-time extraction logs, configurable quality and download folder

---

## 🌍 Languages

Fully localized in **6 languages** across all UIs:

🇩🇪 German · 🇺🇸 English · 🇹🇷 Turkish · 🇮🇹 Italian · 🇫🇷 French · 🇪🇸 Spanish

---

## 🛠️ Building from Source

### Prerequisites

- [Go](https://go.dev/) `1.23+`
- [Node.js](https://nodejs.org/) (LTS)
- [Wails CLI](https://wails.io/) `v2.11.0+`

### Setup

```bash
# Clone the repository
git clone https://github.com/SnuggleDino/NovaWave-WAILS.git
cd NovaWave-WAILS

# Install frontend dependencies
1. cd frontend 
2. npm install 
3. cd ..

# Place required binaries into bin/
# yt-dlp.exe · ffmpeg.exe · ffprobe.exe
# (embedded into the final build via Go's embed.FS)

# Start development mode
wails dev

# Build a production binary
wails build
```

> The binaries (`yt-dlp`, `ffmpeg`, `ffprobe`) are embedded at compile time via `//go:embed bin/*.exe` and extracted to a temp directory at runtime - no external dependencies for end users.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause |
| `← / →` | Previous / Next track |
| `Shift + ← / →` | Seek ±5 seconds |
| `L` | Open Lyrics |
| `CTRL + 1` | Toggle PRO Console (V2 UI) |
| `CTRL + U + 1` | Switch to Legacy UI |
| `CTRL + U + 2` | Switch to V2 PRO UI |
| `CTRL + U + 3` | Switch to Lite UI |

---

## 🤝 Contributing

Contributions are welcome - bug reports, Theme Packs, translations, or feature ideas. Open an issue or pull request anytime.

For custom **Theme Packs**, start with [`frontend/src/theme_packs/theme_packs.md`](frontend/src/theme_packs/theme_packs.md).

---

**Enjoy your music!** 🦖

*Made with ❤️ by [SnuggleDino](https://github.com/SnuggleDino)*
