# 🎵 NovaWave `v2.9.9` 

> **Your Music · Your Style · Your Rules**
> No ads, no clutter. Just your music, beautifully presented.  
> — Built with ❤️ in **Go (Wails v2)** + Vanilla JS · Free & Open Source —

![Version](https://img.shields.io/badge/Version-2.9.9-38bdf8?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Open--Source-4ade80?style=for-the-badge)
![Made with Love](https://img.shields.io/badge/Made_with-Love-ff69b4?style=for-the-badge)

---

## 🦖 What is NovaWave?

NovaWave is a **desktop music player** that puts personality first. It's not just about pressing play - it's about the atmosphere. Choose from handcrafted themes, kick back with animated backgrounds, dial in your sound with audio effects, and manage your entire music library your way.

Built from the ground up with **Go (Wails v2)** as the backend and a fully custom **HTML/CSS/JS** frontend. No Electron, no bloat, no framework.

---

## ✨ What's New in v2.9.9

- **4 New Theme Packs** — Aqua Deep, Jazz & Bourbon, Lo-Fi Café, and Aurora Borealis. Each with a handcrafted intro animation and a persistent ambient effect.
- **Theme Pack Overhaul** — All existing packs rebuilt from the ground up with new persistent visual effects: CRT scanlines (Cyberpunk), star particles (Sleep Time), floating hearts (Snuggle Time), neon horizon line (Sunset Drive), and a persistent petal container (Sakura Spirit).
- **Stats Overlay** — Visualizer FPS now has its own dedicated row with a 3-level status indicator.
- **Bug Fixes** — Several CSS cascade and rendering issues with the new theme packs resolved.

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

Handcrafted **Theme Packs** transform the entire look and feel, each with a unique intro animation and persistent ambient effect:

| Theme | Vibe |
|---|---|
| 🦖 **Snuggle Time** | Cozy dino energy — floating hearts, the original NovaWave experience |
| 🌙 **Sleep Time** | Calm and dark — twinkling star particles, perfect for late-night listening |
| ⚡ **Cyberpunk** | Neon lights, glitch effects — persistent CRT scanline overlay |
| 🏎️ **Sunset Drive** | Pure 80s Retrowave — neon horizon line at the bottom |
| 🌸 **Sakura Spirit** | Relaxed Japanese aesthetics — persistent falling cherry blossom petals |
| 🕹️ **8-Bit** | Retro game vibes all the way |
| 🌊 **Aqua Deep** | Midnight blue deep sea — rising bubble overlay |
| 🎷 **Jazz & Bourbon** | Warm amber, smooth and soulful — drifting smoke and an art deco neon intro |
| ☕ **Lo-Fi Café** | Cozy sepia café — gentle rain overlay and a typewriter intro |
| 🌌 **Aurora Borealis** | Deep navy night sky — shimmering aurora curtains of light |

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
- 🎛️ **5-Band Equalizer** - Fine-tune 60Hz · 230Hz · 910Hz · 4kHz · 14kHz — with 6 quick presets (Flat / Pop / Rock / Classical / Jazz / Bass Boost)
- 🎚️ **Sound Profiles** - One-click audio profiles: Warm · Bright · Studio · Hall
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
