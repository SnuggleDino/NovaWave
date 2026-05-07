# 🎵 NovaWave `v2.9.0 PRO Evolution`

> **Your Music · Your Style · Your Rules** - No ads, no clutter. Just your music, beautifully presented.  
> Built with ❤️ in **Go (Wails)** + Web Tech · Free & Open Source

![Version](https://img.shields.io/badge/Version-2.9.0--PRO_Evolution-38bdf8?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Open--Source-4ade80?style=for-the-badge)
![Made with Love](https://img.shields.io/badge/Made_with-Love-ff69b4?style=for-the-badge)

---

## 🦖 What is NovaWave?

NovaWave is a **desktop music player** that puts personality first. It's not just about pressing play - it's about the atmosphere. Choose from handcrafted themes, kick back with animated backgrounds, dial in your sound with audio effects, and manage your entire music library your way.

Built from the ground up with **Go (Wails v2)** as the backend and a fully custom **HTML/CSS/JS** frontend - no Electron, no bloat.

---

### 🌓 Three UIs - One Player

NovaWave now ships with **three completely different interfaces**, each designed for a different kind of user:

| | 🎨 Legacy UI | 🚀 V2 PRO UI | 📱 Lite UI |
|---|---|---|---|
| **Philosophy** | Vibes & Aesthetics | Workflow & Power | Speed & Simplicity |
| **Best for** | Theme lovers, casual listening | Large libraries, power users | Minimalists, low-end PCs |
| **Highlights** | Theme Packs, animations | Grid layout, sorting, logs | Ultra-fast, resource saving |
| **Switch with** | `CTRL + U + 1` | `CTRL + U + 2` | `CTRL + U + 3` |

You can switch between all UIs **at any time** using the new **Design Switcher** in the settings.

---

### 📱 Lite UI - Minimalist Performance

A ultra-lightweight interface for those who just want to listen to music without any distractions:
- **Zero Bloat** - Only the essential controls for playback and library management
- **Resource Saving** - Perfect for older hardware or background listening
- **Fastest Startup** - Loads instantly with minimal memory footprint

---

### 🚀 V2 PRO UI - The New Standard

A ground-up redesign built for modern screens and larger libraries:

- **Sidebar Navigation** - Fluid transitions between Library, Downloader, and Settings
- **Library Sorting** - Sort tracks by A–Z, Z–A, or Recently Added/Changed
- **Multi-Folder Support** - Add and manage multiple music directories from anywhere on your drive
- **Custom Cover Engine** - Falls back to Animated Dinos 🦖, Musical Notes, or embedded MP3 metadata
- **Favorites System** - One-click ❤️ to mark your favorite tracks directly in the library table
- **PRO Console Logs** - Built-in terminal-style log panel showing backend activity in real time (`CTRL + 1`)

---

### 📥 Universal Downloader (Sampler)

Download music directly from your favorite platforms:

- **YouTube** · **YouTube Music** · **Spotify**
- Powered by `yt-dlp` + `ffmpeg` - embedded directly in the app binary
- Real-time extraction logs with clean output (developer noise suppressed)
- Configurable audio quality and download folder

---

### 🚀 Performance & Stability

- **New Design Switcher** - A modernized card-based UI for switching between interfaces with ease.
- **Playlist Refresh** - Added a dedicated refresh button in the playlist modal for instant updates.
- **Wails v2 Events** - Background workers (downloader, scanner, logger) now use direct event streams for lightning-fast UI updates.
- **Optimized Rendering** - Smoother animations and faster transitions across all UIs.

---

## 🎨 Legacy UI - Theme Packs

Handcrafted **Theme Packs** transform the entire look and feel of the Legacy UI, each with a unique startup animation:

| Theme | Vibe |
|---|---|
| 🦖 **Snuggle Time** | Cozy dino energy - the original NovaWave experience |
| 🌙 **Sleep Time** | Calm and dark, perfect for late-night listening |
| ⚡ **Cyberpunk** | Neon lights, glitch effects, electric atmosphere |
| 🏎️ **Sunset Drive** | Pure 80s Retrowave feeling |
| 🌸 **Sakura Spirit** | Relaxed Japanese-inspired aesthetics |
| 🕹️ **8-Bit** | Retro game vibes all the way |

> Want to build your own? Check out [`frontend/src/theme_packs/theme_packs.md`](frontend/src/theme_packs/theme_packs.md) for the full Theme Pack creation guide.

---

## 🎨 V2 PRO - Built-in Themes

The V2 PRO UI comes with **10 built-in color themes** - no Theme Pack needed:

**Dark:** Midnight · Cherry · Coffee · Electric Violet · Forest · Gold · Ocean · Slate  
**Light:** Glacier · Lavender

---

## 🌌 Background Animations

Set the mood with **9 animated backgrounds** available in the Legacy UI:

`Aurora` · `Fireflies` · `Flow` · `Matrix` · `Nebula` · `Plasma` · `Rain` · `Snowfall` · `Stellar`

---

## 🎧 Sound & Visuals

NovaWave gives you real control over your audio and visuals:

**Audio Effects**
- 🔊 **Bass Boost** - Configurable low-frequency gain
- ✨ **Crystalizer** - Treble enhancement for sharper highs
- 🌊 **Reverb** - Add depth and space to your music
- ⏩ **Playback Speed** - Adjustable playback rate

**Visualizer** (Legacy UI)
- Modes: **Bars** · **Orbit** · **Retro Circle**
- Adjustable sensitivity

**Dynamic Island**
- Apple-style animated notification popup on track changes

---

## 🌍 Languages

NovaWave is fully localized in **6 languages** - all UIs included:

🇩🇪 German · 🇺🇸 English · 🇹🇷 Turkish · 🇮🇹 Italian · 🇫🇷 French · 🇪🇸 Spanish

---

## 🛠️ Building from Source

### Prerequisites

- [Go](https://go.dev/) `1.23+`
- [Node.js](https://nodejs.org/) (LTS recommended)
- [Wails CLI](https://wails.io/) `v2.11.0+`

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/SnuggleDino/NovaWave-WAILS.git
cd NovaWave-WAILS

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Place required binaries into bin/
#    yt-dlp.exe · ffmpeg.exe · ffprobe.exe
#    (these are embedded into the final build via Go's embed.FS)

# 4. Start development mode
wails dev

# 5. Build a production binary
wails build
```

> The binaries (`yt-dlp`, `ffmpeg`, `ffprobe`) are embedded at compile time using Go's `//go:embed bin/*.exe` directive and extracted to a temp directory at runtime - no external dependencies for end users.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause |
| `← / →` | Previous / Next track |
| `Shift + ← / →` | Seek ±5 seconds |
| `L` | Open Lyrics |
| `CTRL + 1` | Toggle PRO Console Logs (V2) |
| `CTRL + U + 1` | Switch to Legacy UI |
| `CTRL + U + 2` | Switch to V2 PRO UI |
| `CTRL + U + 3` | Switch to Lite UI |

---

## 🤝 Contributing

Contributions are welcome! Whether it's a bug report, a new Theme Pack, a language translation, or a feature idea - feel free to open an issue or pull request.

If you'd like to create a **custom Theme Pack**, start with the guide in [`frontend/src/theme_packs/theme_packs.md`](frontend/src/theme_packs/theme_packs.md).

---

**Enjoy your music!** 🦖

*Made with ❤️ by [SnuggleDino](https://github.com/SnuggleDino)*