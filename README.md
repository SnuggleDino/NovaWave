# 🎵 NovaWave `v2.5.8 GO`
**NovaWave** is a modern, high-performance desktop music player built with **Wails (Go)** and a polished **Web-based frontend**. It combines professional audio processing with a stunning visual experience and powerful downloader capabilities.

[![Project Link](https://img.shields.io/badge/GitHub-NovaWave--WAILS-blue?style=for-the-badge&logo=github)](https://github.com/SnuggleDino/NovaWave-WAILS)

---

## ✨ Key Features

### 🎧 Professional Audio Engine
*   **Audio Extras:** Enhance your sound with built-in **Bass Boost**, **Crystalizer**, and **Reverb** effects.
*   **Playback Speed:** Adjust audio speed from 0.5x up to 2.0x without losing pitch quality.
*   **Gapless Transition:** Smooth handling of your local music library.

### 🎨 Theme Packs & Design
NovaWave is not just a player; it's a piece of art. Choose from several handcrafted Theme Packs, each with its own unique colors, icons, and **Startup Intros**:
*   🦖 **Snuggle Time:** Cozy vibes with loving dinos and warm colors.
*   🌙 **Sleep Time:** A soothing, midnight-blue atmosphere with a rising moon intro.
*   ⚡ **Cyberpunk:** A futuristic Night City aesthetic with glitch effects and CRT scanlines.
*   🏎️ **Sunset Drive:** Classic 80s Retrowave with a synth-sun and an animated grid floor.
*   🌸 **Sakura Spirit:** Peaceful Japanese garden vibes with falling cherry blossom petals.
*   💾 **NovaWave 95:** Pure nostalgia with a classic Windows 95 operating system look.

### 🏝️ Apple-Style Dynamic Island
Experience notifications like never before. NovaWave features an **Apple-style Dynamic Island** that expands to show playback status, download progress, and system hints with smooth animations and a clockwise loading indicator.

### 📱 Intelligent Mini-Player
Need more screen space? Toggle the **Landscape Mini-Player (600x200)**. 
*   Compact, non-intrusive design.
*   Integrated volume and playback controls.
*   **Dedicated Mini-Visualizer:** A specialized 5-bar visualizer to keep your desktop lively but clean.

### 📥 Universal Downloader
*   **YouTube Downloader:** Convert any YouTube link directly to high-quality MP3 (up to 320kbps).
*   **Spotify Integration:** Paste Spotify track links to automatically find and download the best matching version from YouTube, including full metadata (Title, Artist, Cover).
*   **Powered by:** Integrated support for `yt-dlp` and `ffmpeg`.

### 📊 Advanced Visualizers
Multiple visualization styles to match your mood:
*   Classic Bars, Ocean Waveform, Stellar Orbit, Cyber Pulse, Zen Harmony, Retro Pixel, and Sakura Bloom.

---

## 🚀 Getting Started

### Prerequisites
*   [Go](https://go.dev/) (1.23+ recommended)
*   [Node.js](https://nodejs.org/) & NPM
*   [Wails CLI](https://wails.io/docs/gettingstarted/installation)

### Installation & Build
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/SnuggleDino/NovaWave-WAILS.git
    cd NovaWave-WAILS
    ```
2.  **Install frontend dependencies:**
    ```bash
    cd frontend && npm install && cd ..
    ```
3.  **Setup Binaries:**
    Place `yt-dlp.exe`, `ffmpeg.exe`, and `ffprobe.exe` into the following directory to enable downloading and metadata features:
    `frontend/src/executable_bin/`
4.  **Run in development mode:**
    ```bash
    wails dev
    ```
5.  **Build the production executable:**
    ```bash
    wails build
    ```

---

## 🛠️ Tech Stack
*   **Backend:** Go (Golang)
*   **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
*   **Framework:** [Wails v2](https://wails.io/)
*   **Audio Processing:** Web Audio API
*   **Metadata:** `dhowden/tag` (Go)

---

## 📊 Project Metadata
*   **Version:** 2.5.8 GO
*   **Build Date:** 11.01.2026
*   **Author:** [SnuggleDino](https://github.com/SnuggleDino)
*   **Go Version:** v2.9.2 (Go 1.23)
*   **Repository:** [https://github.com/SnuggleDino/NovaWave-WAILS](https://github.com/SnuggleDino/NovaWave-WAILS)

---

## ⌨️ Hotkeys
*   `Space`: Play / Pause
*   `Left / Right Arrows`: Next / Previous Track
*   `Up / Down Arrows`: Volume Up / Down
*   `Shift + Left / Right`: Seek 5 seconds
*   `CTRL + 1`: Open Developer Console

---

## 👤 Author
**SnuggleDino**  
*Your Music • Your Style • Your Rules*

---
*NovaWave is an open-source project. If you like it, feel free to give it a ⭐ on GitHub!*
