# 🎵 NovaWave `v2.7.0 GO`

Welcome to **NovaWave**! Your new, stylish desktop music player.
No clutter, no ads, just your music – wrapped in a sleek design and completely Open Source.

Built with ❤️, **Go (Wails)**, and Web Tech.

![Version](https://img.shields.io/badge/Version-2.7.0--GO-c1d37f?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Open--Source-4ade80?style=for-the-badge)
![Made with Love](https://img.shields.io/badge/Made_with-Love-ff69b4?style=for-the-badge)

---

## 🦖 What can it do?

NovaWave is more than just pressing "Play". It's about **Vibes**.

### 🎨 Style it your way! (Theme Packs)
Boring players are everywhere. NovaWave brings you handcrafted **Theme Packs** with unique startup animations:
*   🦖 **Snuggle Time:** Cozy Dino vibes.
*   🌙 **Sleep Time:** Perfect for night owls.
*   ⚡ **Cyberpunk:** Neon lights and glitch effects for Night City fans.
*   🏎️ **Sunset Drive:** Pure 80s Retrowave feeling.
*   🌸 **Sakura Spirit:** Relaxed Japanese atmosphere.
*   💾 **NovaWave 95:** Windows 95 nostalgia kick.

### 🎧 Sound & Visuals
*   **Audio Extras:** Beef up the bass or clarify the sound with built-in **Bass Boost** & **Crystalizer**.
*   **Visualizer:** Love watching your music? We've got **Bars, Waveforms, Retro Pixels**, and more dancing to the beat.
*   **Dynamic Island:** Notifications now look seriously chic – Apple-style, but for your desktop.

### 📥 Download music? Sure!
Tired of ads in the browser?
*   **YouTube:** Paste link, get MP3. Done. Now with **YouTube Music** support!
*   **Spotify:** Copy song link, NovaWave finds the track and downloads it for you.
*   **Queue Manager:** Download multiple tracks at once with the new concurrent queue.

### 📱 Smaller is better
Need space? Just switch to **Mini-Player Mode**. Small, compact, but still rocking a visualizer!

---

## 🚀 Getting Started (For Tinkers)

Want to touch the code or build it yourself? Easy.

### You need:
*   [Go](https://go.dev/) (Version 1.23+)
*   [Node.js](https://nodejs.org/) (for the frontend stuff)
*   [Wails CLI](https://wails.io/)

### Installation:
1.  **Clone Repo:**
    ```bash
    git clone https://github.com/SnuggleDino/NovaWave-WAILS.git
    cd NovaWave-WAILS
    ```
2.  **Install Frontend:**
    ```bash
    cd frontend 
    npm install 
    cd ..
    ```
3.  **Important:** For the downloader to work, you need `yt-dlp.exe`, `ffmpeg.exe`, and `ffprobe.exe` in the `bin/` folder (or in your path).
4.  **Start:**
    ```bash
    wails dev
    ```
5.  **Build:**
    ```bash
    wails build
    ```
     **For new comers:**
    > If you get an error, try to install the dependencies again.
    > But this command is not needed for the first run.
    > This command is telling the program basically to build the app.

---

## ⌨️ Shortcuts (Hotkeys)
*   `Space`: Play / Pause (The Classic)
*   `Arrows Left / Right`: Change Song
*   `Shift + Arrows`: Seek 5 seconds
*   `Arrows Up / Down`: Volume
*   `L`: Open Lyrics
*   `Q`: Toggle Queue Modal
*   `CTRL + 1`: Dev Console

---

## 🛠️ Under the Hood
*   **Go (Golang):** For the power in the background.
*   **HTML/JS/CSS:** To make it look good.
*   **Wails:** The glue that holds it all together.

---

## 🗺️ Roadmap
We're just getting started. Here is the master plan:

| Status | Feature | Mission |
| :--- | :--- | :--- |
| ✨ **Done** | **Custom Playlists** | Create, save, and export your own mixes for every mood. (Local files) |
| ✨ **Done** | **Virtual Folders** | Group tracks into collapsible "Player Folders" (pure design, no file moving). |
| ✨ **Done** | **Lyrics Support** | Sing along! Display lyrics for your local tracks. |
| ✨ **Done** | **YouTube Music** | Integrated support for music.youtube.com links. |
| ✨ **Done** | **i18n** | Full multi-language support (German/English). |
| 🔜 **Soon** | **Tag Editor** | Fix those messy tags and add cover art directly in the player. |
| 🔮 **Future** | **5-Band Equalizer** | More control than just Bass & Treble. Fine-tune your sound. |
| 🔮 **Future** | **More Themes** | You can never have enough style. More colors, more animations. |

---

**Enjoy your music!** 🦖🦕

*Made by SnuggleDino*

Your Music • Your Style • Your Rules.