# 🎨 NovaWave Theme Pack Creation Guide

> **Version:** 1.0  
> **Status:** Active  
> **Applies to:** NovaWave v2.8.5+

Welcome to the **official NovaWave Theme Pack guide**! This document walks you through everything you need to know to build your very own Theme Pack - from a simple color swap all the way to a fully immersive experience with custom sounds, intro animations, and hand-drawn pixel art.

Theme Packs run inside the **Legacy UI** and are loaded automatically by NovaWave at startup using Vite's glob import system. There's no plugin registry, no manual registration - just drop your folder in the right place and NovaWave picks it up.

---

## 📖 Table of Contents

1. [How Theme Packs Work](#how-theme-packs-work)
2. [Directory Structure](#directory-structure)
3. [⭐ Beginner Themes - Colors & Identity](#-beginner-themes--colors--identity)
4. [🔥 Advanced Themes - Animations & Intros](#-advanced-themes--animations--intros)
5. [💀 Advanced Themes ++ - Full Immersion](#-advanced-themes----full-immersion)
6. [Adding Custom Images](#adding-custom-images)
7. [CSS Variable Reference](#css-variable-reference)
8. [The `app` Object Reference](#the-app-object-reference)
9. [Troubleshooting](#troubleshooting)

---

## How Theme Packs Work

When NovaWave starts, `theme_pack_listener.js` uses Vite's `import.meta.glob()` to scan every folder inside `frontend/src/theme_packs/` for a `theme.json` and a `theme.js`. It then:

1. Reads the metadata from `theme.json` to build the Theme Pack card in the Settings UI
2. Loads the JavaScript module from `theme.js` which exports an `onEnable` / `onDisable` lifecycle
3. Resolves any asset paths (images, icons) relative to the theme folder

When a user selects your theme in the settings, `onEnable(app)` is called. When they switch away, `onDisable(app)` is called. **Cleanup in `onDisable` is mandatory** - failing to clean up will cause visual glitches and broken state when switching to another theme.

---

## Directory Structure

Every Theme Pack lives in its own folder inside `frontend/src/theme_packs/`. The folder name becomes the Theme ID and **must be unique**.

```
frontend/src/theme_packs/
└── your_theme_id/              ← Your folder (must match your theme "id" in theme.json)
    ├── theme.json              ← Metadata & Settings (Required)
    ├── theme.css               ← All visual styling (Required)
    ├── theme.js                ← Activation logic (Required)
    └── assets/                 ← Images, audio, icons (Optional)
        ├── your_theme_id_album_cover.png     ← Shown as album art
        ├── your_theme_id_intro_icon.png      ← Used in the startup intro
        └── your_theme_id_themepack_icon.png  ← Preview card in Settings
```

> **Naming convention:** Use `snake_case` for both your folder name and your `id` field. Spaces and hyphens in folder names can cause issues with the glob importer.

---

## ⭐ Beginner Themes - Colors & Identity

**Goal:** Create a theme that changes the color palette and personality of NovaWave without any animations or JavaScript logic.

**What you'll learn:**
- Setting up the three required files
- Using CSS variables to restyle the entire UI
- Adding a preview card for the Settings screen

**Difficulty:** Low - only CSS and JSON needed. JavaScript is minimal.

---

### Step 1 - Create Your Folder

Create a new folder inside `frontend/src/theme_packs/`:

```
frontend/src/theme_packs/my_theme/
```

> Choose an ID you like - you'll use it consistently in all three files. Once NovaWave is running, changing the ID requires updating all three files.

---

### Step 2 - Write `theme.json`

This file provides the metadata that powers your Theme Pack card in the Settings UI.

```json
{
  "name": "My Theme",
  "id": "my_theme",
  "version": "1.0.0",
  "author": "YourName",
  "description": "A short description shown in the Settings panel.",
  "css": "theme.css",
  "js": "theme.js",
  "preview_emoji": "🌿",
  "preview_bg": "#1a2e1a"
}
```

**Field reference:**

| Field | Required | Description |
|---|---|---|
| `name` | ✅ | Display name shown in the Settings UI |
| `id` | ✅ | Must exactly match your folder name |
| `version` | ✅ | Semantic version string (e.g. `"1.0.0"`) |
| `author` | ✅ | Your name or handle |
| `description` | ✅ | Short description (1–2 sentences) |
| `css` | ✅ | Always `"theme.css"` |
| `js` | ✅ | Always `"theme.js"` |
| `preview_emoji` | Optional | Emoji shown on the card if no image is set |
| `preview_bg` | Optional | Background color for the emoji card (hex) |
| `preview_image` | Optional | Path to a PNG preview image (see [Adding Custom Images](#adding-custom-images)) |
| `target_version` | Optional | Minimum NovaWave version (e.g. `">=1.0.0"`) |

> **Tip:** Use either `preview_emoji` + `preview_bg` (easy, no image needed) or `preview_image` (more polished). If both are set, `preview_image` takes priority.

---

### Step 3 - Write `theme.css`

All your visual styling goes here. NovaWave uses **CSS Custom Properties (variables)** scoped to a `data-theme` attribute on the `<html>` element. This means your styles only apply when your theme is active - no interference with other themes.

```css
/* ============================================================
   CORE VARIABLES
   All colors, fonts, and borders for your theme.
   ============================================================ */

:root[data-theme="my_theme"] {
    /* Backgrounds */
    --bg-main: #0d1a0d;           /* Main app background */
    --bg-card: #1a2e1a;           /* Card / panel background */
    --bg-card-light: #243824;     /* Slightly lighter card variant */
    --bg-card-hover: #2e4a2e;     /* Hover state for cards */

    /* Accent & Text */
    --accent: #4ade80;            /* Main highlight color (buttons, active states) */
    --accent-soft: rgba(74, 222, 128, 0.15); /* Subtle accent tint for backgrounds */
    --text-main: #f0fdf4;         /* Primary text color */
    --text-muted: #86efac;        /* Secondary / muted text */

    /* Borders */
    --border-soft: #166534;       /* Subtle border color */
    --border-main: 1px solid #166534;
    --border-thin: 1px solid rgba(74, 222, 128, 0.3);

    /* Typography (optional) */
    --font-stack: 'Inter', 'Segoe UI', sans-serif;
}

/* ============================================================
   OPTIONAL: Fine-tune specific components
   ============================================================ */

/* Active track highlight in the library */
:root[data-theme="my_theme"] .track-row.active {
    background: linear-gradient(90deg, rgba(74, 222, 128, 0.2), transparent) !important;
    border-left: 4px solid var(--accent) !important;
}

:root[data-theme="my_theme"] .track-row:hover {
    background: rgba(74, 222, 128, 0.05);
}
```

> **Important:** Always scope your rules to `:root[data-theme="my_theme"]`. Never write bare selectors like `.track-row` without the scope - they will bleed into other themes and the default UI.

---

### Step 4 - Write `theme.js`

For a Beginner Theme, the JavaScript is minimal. You just need to set the `data-theme` attribute on enable and remove it on disable.

```javascript
// The CSS import is REQUIRED - Vite needs this to bundle your stylesheet.
import './theme.css';

export default {

    onEnable: (app) => {
        // 1. Apply your theme to the HTML element
        document.documentElement.setAttribute('data-theme', 'my_theme');

        // 2. Set the accent color for the visualizer and dynamic island
        document.documentElement.style.setProperty('--accent', '#4ade80');

        // 3. Notify the UI that the cached accent color has changed
        if (app.ui && app.ui.updateCachedColor) {
            app.ui.updateCachedColor();
        }
    },

    onDisable: (app) => {
        // Always clean up - remove the data-theme attribute
        document.documentElement.removeAttribute('data-theme');

        // Reset the visualizer accent back to the NovaWave default
        if (app.visualizer) {
            app.visualizer.updateSettings({ accentColor: '#38bdf8' });
        }
    }
};
```

---

### Step 5 - Test It

1. Make sure the dev server is running: `wails dev`
2. Open NovaWave → Settings → Theme Packs
3. Your new theme card should appear automatically
4. Click it to activate - the UI should immediately reflect your colors
5. Switch to another theme and back to verify `onDisable` cleans up correctly

**Nothing appearing?**
- Double-check that your folder name and the `id` field in `theme.json` are identical
- Make sure `theme.js` has `import './theme.css';` at the top
- Check the browser DevTools console (`F12`) for import errors

---

## 🔥 Advanced Themes - Animations & Intros

**Goal:** Create a theme with a custom startup intro animation, a locked background animation, and visualizer integration.

**What you'll learn:**
- Triggering and hiding intro overlays from the HTML
- Programmatically setting background animations
- Locking UI controls to enforce your theme's identity
- Applying custom emoji for the album cover fallback

**Difficulty:** Medium - requires understanding of JavaScript DOM manipulation and CSS animations.

---

### How Intros Work

The Legacy UI's `index.html` contains pre-built intro overlay elements for the built-in themes (e.g. `id="cyberpunk-intro"`, `id="sakura-intro"`). Your theme can either use a **pre-existing HTML intro** (if you add one to the HTML) or **inject an overlay dynamically via JavaScript**.

**Option A - Static HTML Intro (cleaner, recommended for simple intros):**

Add an overlay to `frontend/index.html` (inside `<body>`):

```html
<div id="my_theme-intro" class="theme-intro-overlay">
    <div class="my_theme-intro-content">
        <span class="my_theme-icon">🌿</span>
        <p>Welcome to My Theme</p>
    </div>
</div>
```

Then in `theme.js`, show and hide it:

```javascript
const intro = document.getElementById('my_theme-intro');
if (intro) {
    intro.classList.add('visible');
    setTimeout(() => intro.classList.remove('visible'), 3000); // Hide after 3 seconds
}
```

And in `theme.css`, define the animation:

```css
#my_theme-intro {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: #0d1a0d;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.5s ease;
}

#my_theme-intro.visible {
    opacity: 1;
    pointer-events: all;
}

#my_theme-intro .my_theme-icon {
    font-size: 5rem;
    animation: bounceIn 0.8s ease;
}

@keyframes bounceIn {
    0%   { transform: scale(0.5); opacity: 0; }
    70%  { transform: scale(1.1); }
    100% { transform: scale(1);   opacity: 1; }
}
```

---

**Option B - Dynamic Intro (more flexible, no HTML edits needed):**

Inject the overlay entirely from JavaScript. This is the approach used by the **8-Bit theme**:

```javascript
onEnable: (app) => {
    document.documentElement.setAttribute('data-theme', 'my_theme');

    // Build the overlay in JS
    const overlay = document.createElement('div');
    overlay.id = 'my_theme-intro-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0;
        background: #0d1a0d;
        z-index: 2147483647;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        color: #4ade80;
    `;
    overlay.innerHTML = `
        <div style="font-size: 5rem; margin-bottom: 2rem;">🌿</div>
        <h1 style="font-size: 2rem; font-family: sans-serif;">My Theme</h1>
    `;

    document.body.appendChild(overlay);

    // Auto-remove after 3 seconds with a fade-out
    setTimeout(() => {
        overlay.style.transition = 'opacity 0.6s';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 600);
    }, 2400);
},

onDisable: (app) => {
    document.documentElement.removeAttribute('data-theme');
    // Always clean up any injected elements!
    const overlay = document.getElementById('my_theme-intro-overlay');
    if (overlay) overlay.remove();
}
```

> **Note on `z-index`:** Use `2147483647` (the maximum 32-bit integer) for intro overlays. This guarantees they render on top of everything including the settings modal and Dynamic Island.

---

### Setting a Background Animation

You can lock a specific background animation when your theme activates:

```javascript
// Available IDs: 'aurora', 'fireflies', 'flow', 'matrix',
//                'nebula', 'plasma', 'rain', 'snowfall', 'stellar', 'off'
if (app.ui && app.ui.applyAnimationSetting) {
    app.ui.applyAnimationSetting('fireflies');
}
```

If your theme has a strong visual identity, you should also **lock the animation selector** so users can't accidentally change it:

```javascript
setTimeout(() => {
    const animSelect = document.getElementById('animation-select');
    if (animSelect) {
        animSelect.value = 'fireflies'; // Sync the dropdown visually
        animSelect.disabled = true;     // Lock it
    }
}, 100);
```

> **Why the `setTimeout`?** The settings UI takes a few milliseconds to initialize. A 50–100ms delay ensures the elements exist in the DOM before you try to modify them.

Always restore in `onDisable`:

```javascript
onDisable: (app) => {
    document.documentElement.removeAttribute('data-theme');
    const animSelect = document.getElementById('animation-select');
    if (animSelect) animSelect.disabled = false;
}
```

---

### Locking UI Controls

Theme Packs can disable specific settings controls to prevent users from breaking your theme's visual consistency. Use the following element IDs:

| Element ID | What It Controls |
|---|---|
| `theme-select` | The base color theme dropdown |
| `animation-select` | The background animation dropdown |
| `visualizer-style-select` | The visualizer mode selector |
| `toggle-use-custom-color` | The custom accent color toggle |
| `accent-color-picker` | The accent color picker input |
| `emoji-select` | The album cover fallback emoji |
| `visualizer-bars-input` | The visualizer bar count slider |
| `toggle-gradient-title` | The gradient title toggle |

```javascript
// Locking example
const toDisable = ['theme-select', 'animation-select', 'visualizer-style-select'];

setTimeout(() => {
    toDisable.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = true;
    });
}, 100);
```

```javascript
// Always re-enable in onDisable
onDisable: (app) => {
    const toEnable = ['theme-select', 'animation-select', 'visualizer-style-select'];
    toEnable.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = false;
    });
}
```

---

### Visualizer Integration

Tell NovaWave's visualizer to match your theme's colors and style:

```javascript
if (app.visualizer) {
    app.visualizer.updateSettings({
        enabled: true,
        style: 'retro',       // 'bars', 'orbit', 'retro'
        accentColor: '#4ade80'
    });
}
```

Reset it on disable:

```javascript
if (app.visualizer) {
    app.visualizer.updateSettings({ accentColor: '#38bdf8' }); // NovaWave default
}
```

---

### Setting the Album Cover Emoji

When no embedded artwork is found in an MP3, NovaWave falls back to an emoji. Your theme can set a custom one:

```javascript
if (app.ui && app.ui.updateEmoji) {
    app.ui.updateEmoji('loving_dinos'); // Use any valid emoji key
}
```

Available built-in emoji keys (from `app_settings.js`): `loving_dinos`, `moon`, `sakura_flower`, `sunset_sun`, `cyber` - or use any raw emoji character if the key isn't recognized.

---

## 💀 Advanced Themes ++ - Full Immersion

**Goal:** Build a Theme Pack that completely transforms the NovaWave experience - custom sounds, restructured layouts, interactive intros, and original particle effects.

**What you'll learn:**
- Playing audio using the Web Audio API
- Restructuring the Mini Player layout with CSS Grid
- Building interactive intro screens ("Press Start")
- Creating custom particle or canvas effects
- Safe cleanup of audio contexts and intervals

**Difficulty:** High - requires solid JavaScript and CSS knowledge.

---

### Playing Sounds with the Web Audio API

The **8-Bit theme** uses a synthesized "coin sound" on startup. Here's the full pattern for safely creating and destroying an audio context:

```javascript
// Declare outside the export so it persists while the theme is active
let audioCtx = null;

function getAudioCtx() {
    // Reuse existing context, or create a new one if closed
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playCoinSound() {
    try {
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);       // Low note
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // High note

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
        console.error('[MyTheme] Audio error:', e);
    }
}

export default {
    onEnable: (app) => {
        document.documentElement.setAttribute('data-theme', 'my_theme');
        playCoinSound();
        // ... rest of setup
    },

    onDisable: (app) => {
        document.documentElement.removeAttribute('data-theme');

        // IMPORTANT: Always close and null the audio context on disable
        if (audioCtx) {
            audioCtx.close();
            audioCtx = null;
        }
    }
};
```

> **Browser policy:** Browsers block audio until the user has interacted with the page. The 8-Bit theme works around this by placing the sound inside a "Press Start" button click handler - the user interaction unlocks audio automatically. For auto-playing sounds on enable, the audio may be silently blocked on the very first load.

---

### Building an Interactive Intro ("Press Start")

The 8-Bit theme's full intro pattern - a fullscreen overlay with a button that the user must click to dismiss:

```javascript
function createInteractiveIntro(onDismiss) {
    const overlay = document.createElement('div');
    overlay.id = 'my_theme-intro-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0;
        background: #000;
        z-index: 2147483647;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        font-family: 'Courier New', monospace;
        color: #4ade80;
    `;

    overlay.innerHTML = `
        <div id="my_theme-logo" style="font-size: 5rem; margin-bottom: 1rem; animation: float 2s ease-in-out infinite;">🌿</div>
        <h1 style="font-size: 2.5rem; letter-spacing: 4px; margin-bottom: 3rem;">MY THEME</h1>
        <button id="my_theme-start-btn" style="
            background: transparent;
            border: 3px solid #4ade80;
            color: #4ade80;
            padding: 1rem 3rem;
            font-size: 1.5rem;
            font-family: 'Courier New', monospace;
            cursor: pointer;
            animation: blink 1s steps(2) infinite;
        ">PRESS START</button>
    `;

    document.body.appendChild(overlay);

    const btn = overlay.querySelector('#my_theme-start-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            if (onDismiss) onDismiss(); // e.g. play a sound
            overlay.style.transition = 'opacity 0.5s';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 500);
        });
    }
}
```

Add the CSS animations to `theme.css`:

```css
@keyframes float {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-15px); }
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
}
```

---

### Creating a Particle Effect

The **Sakura Spirit** theme creates falling petals by spawning DOM elements on a timer. Here is the full, clean pattern:

```javascript
let particleInterval = null;

function startParticles() {
    const container = document.createElement('div');
    container.id = 'my_theme-particles';
    container.style.cssText = `
        position: fixed; inset: 0;
        pointer-events: none;
        z-index: 1;
        overflow: hidden;
    `;
    document.body.appendChild(container);

    particleInterval = setInterval(() => {
        const particle = document.createElement('div');
        particle.className = 'my-theme-particle';
        particle.textContent = '🌿';
        particle.style.cssText = `
            position: absolute;
            top: -30px;
            left: ${Math.random() * 100}%;
            font-size: ${Math.random() * 10 + 14}px;
            opacity: ${Math.random() * 0.7 + 0.3};
            animation: fallDown ${Math.random() * 3 + 3}s linear forwards;
            pointer-events: none;
        `;
        container.appendChild(particle);

        // Self-clean after animation ends
        setTimeout(() => particle.remove(), 6000);
    }, 400);
}

function stopParticles() {
    if (particleInterval) {
        clearInterval(particleInterval);
        particleInterval = null;
    }
    const container = document.getElementById('my_theme-particles');
    if (container) container.remove();
}
```

In `theme.css`:

```css
@keyframes fallDown {
    0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
    100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
}
```

In `theme.js` - start and stop with the theme:

```javascript
onEnable: (app) => {
    document.documentElement.setAttribute('data-theme', 'my_theme');
    startParticles();
},

onDisable: (app) => {
    document.documentElement.removeAttribute('data-theme');
    stopParticles(); // Critical - clear interval and remove container
}
```

> **Performance tip:** Limit the spawn rate to one particle every 300–500ms. Spawning too fast creates hundreds of DOM elements and causes noticeable frame drops, especially on lower-end hardware.

---

### Restructuring the Mini Player Layout

The Mini Player is a compact mode where space is tight. The **8-Bit theme** completely restructures it using a CSS Grid with named areas to prevent elements from overlapping.

Here is the full template for a clean 2-column mini player layout:

```css
/* 2-column grid: cover on the left, everything else on the right */
html[data-theme="my_theme"] body.is-mini .player-column {
    display: grid !important;
    width: 100% !important;
    height: 100% !important;
    grid-template-columns: 130px 1fr !important;
    grid-template-rows: auto 36px auto auto auto !important;
    grid-template-areas:
        "cover info"
        "cover vis"
        "cover buttons"
        "cover volume"
        "cover progress" !important;
    gap: 5px 12px !important;
    align-items: center !important;
    padding: 10px !important;
}

/* Lock the cover into its grid area */
html[data-theme="my_theme"] body.is-mini .cover-art-container {
    grid-area: cover !important;
    width: 130px !important;
    height: 130px !important;
    min-width: 130px !important;
    align-self: center !important;
}

/* Track info area */
html[data-theme="my_theme"] body.is-mini .track-info-area {
    grid-area: info !important;
    overflow: hidden !important;
}

/* Visualizer */
html[data-theme="my_theme"] body.is-mini .visualizer-container {
    grid-area: vis !important;
    display: block !important;
    height: 100% !important;
    width: 100% !important;
}

/* Playback controls */
html[data-theme="my_theme"] body.is-mini .controls-area {
    grid-area: buttons !important;
}

/* Volume slider */
html[data-theme="my_theme"] body.is-mini .volume-control-area {
    grid-area: volume !important;
}

/* Progress bar */
html[data-theme="my_theme"] body.is-mini .progress-area {
    grid-area: progress !important;
    align-self: end !important;
}
```

> **Always use `!important`** in mini player overrides. NovaWave's default styles are often quite specific and will override your rules without it.

---

### Long Title Marquee Scrolling

For the mini player, long track titles can overflow. The 8-Bit theme uses a CSS marquee animation:

```css
/* Default - no animation */
html[data-theme="my_theme"] body.is-mini .track-title-large {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: clip !important;
    display: inline-block !important;
    padding-right: 50px !important;
    animation: none;
}

/* Active - scroll when title is long */
html[data-theme="my_theme"] body.is-mini .title-scroll-wrapper.scroll-active .track-title-large {
    animation: marqueeScroll 10s linear infinite !important;
}

@keyframes marqueeScroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
}
```

---

## Adding Custom Images

Images give your Theme Pack a professional, polished identity. NovaWave supports three image slots:

| Slot | File name convention | Where it appears |
|---|---|---|
| **Theme Pack Card** | `your_theme_id_themepack_icon.png` | The preview card in Settings → Theme Packs |
| **Intro Screen** | `your_theme_id_intro_icon.png` | Used inside your startup intro animation |
| **Album Cover** | `your_theme_id_album_cover.png` | Shown as the default cover art for all tracks |

Place all images inside `assets/` within your theme folder:

```
my_theme/
└── assets/
    ├── my_theme_themepack_icon.png
    ├── my_theme_intro_icon.png
    └── my_theme_album_cover.png
```

---

### Referencing Images in CSS

Use relative paths from `theme.css`. Vite resolves these automatically during `wails build`:

```css
/* Album cover in the player */
.my-theme-album-cover {
    background-image: url('./assets/my_theme_album_cover.png');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    width: 100%;
    height: 100%;
    display: block;
}

/* Intro icon */
.my-theme-intro-logo {
    width: 300px;
    height: 300px;
    background-image: url('./assets/my_theme_intro_icon.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
}

/* Pixel art - disable anti-aliasing for crisp edges */
.my-theme-pixel-art {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
}
```

---

### Referencing Images in JavaScript (Dynamic HTML)

**This is a common mistake.** If you inject HTML strings in `theme.js` using a hardcoded path like `/src/assets/...`, the path **will break in the production build** because Vite hashes asset filenames.

**❌ Wrong - breaks in production:**
```javascript
overlay.innerHTML = `<img src="/src/theme_packs/my_theme/assets/my_theme_intro_icon.png">`;
```

**✅ Correct - use CSS classes with background images:**
```javascript
// In theme.js - use a CSS class, not a src attribute
overlay.innerHTML = `<div class="my-theme-intro-logo"></div>`;
```

```css
/* In theme.css - Vite handles the URL correctly */
.my-theme-intro-logo {
    background-image: url('./assets/my_theme_intro_icon.png');
    width: 300px;
    height: 300px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
}
```

---

### Preview Card Image (theme.json)

To use a PNG instead of an emoji for the preview card, reference it in `theme.json`:

```json
{
  "preview_image": "assets/my_theme_themepack_icon.png"
}
```

The `theme_pack_listener.js` resolves this path relative to your theme folder automatically. **Recommended size:** 200×200px or larger (it's displayed at ~100×100px in the UI).

---

### Recommended Image Specs

| Slot | Recommended Size | Format | Notes |
|---|---|---|---|
| Theme Pack Card | 200×200px | PNG | Transparent background works great |
| Intro Icon | 300×300px or larger | PNG | Square aspect ratio recommended |
| Album Cover | 400×400px | PNG | Square, displays in player art container |
| Pixel Art | Any | PNG | Add `image-rendering: pixelated` in CSS |

---

## CSS Variable Reference

These are all CSS variables used by NovaWave's core UI. Override these in your `:root[data-theme="your_id"]` block to style the entire app:

```css
:root[data-theme="your_id"] {

    /* ── Backgrounds ─────────────────────────────── */
    --bg-main: #000000;           /* Root background of the app window */
    --bg-card: #121212;           /* Card, panel, and modal backgrounds */
    --bg-card-light: #1e1e1e;     /* Slightly lighter card variant */
    --bg-card-hover: #2a2a2a;     /* Card hover state */

    /* ── Accent & Highlights ─────────────────────── */
    --accent: #38bdf8;            /* Primary action color (buttons, active states, links) */
    --accent-soft: rgba(56, 189, 248, 0.15); /* Transparent accent for backgrounds */

    /* ── Text ────────────────────────────────────── */
    --text-main: #ffffff;         /* Primary text */
    --text-muted: #a1a1aa;        /* Secondary / dimmed text */

    /* ── Borders ─────────────────────────────────── */
    --border-soft: #27272a;       /* Subtle UI borders */
    --border-main: 1px solid #27272a;
    --border-thin: 1px solid rgba(255,255,255,0.1);

    /* ── Typography ──────────────────────────────── */
    --font-stack: 'Inter', 'Segoe UI', sans-serif;
    --font-main: var(--font-stack);
}
```

> **Real-world examples** from the built-in themes:
>
> | Theme | `--bg-main` | `--accent` | `--text-main` |
> |---|---|---|---|
> | Midnight | `#000000` | `#8b5cf6` | `#ffffff` |
> | Cherry | `#2a0a12` | `#fb7185` | `#fff1f2` |
> | Ocean | `#021019` | `#06b6d4` | `#ecfeff` |
> | Glacier (Light) | `#f8fafc` | `#0ea5e9` | `#0f172a` |
> | Forest | dark green | `#4ade80` | `#f0fdf4` |

---

## The `app` Object Reference

The `onEnable(app)` and `onDisable(app)` functions receive a single `app` object. Always guard with `if (app.X && ...)` before calling - not all versions expose every property.

| Property / Method | What it does |
|---|---|
| `app.visualizer.updateSettings({ style, accentColor, enabled })` | Updates the visualizer mode and color |
| `app.ui.updateCachedColor()` | Refreshes NovaWave's internal accent color cache after you change `--accent` |
| `app.ui.updateEmoji(key)` | Sets the album cover fallback emoji |
| `app.ui.applyAnimationSetting(id)` | Switches the background animation (e.g. `'matrix'`, `'nebula'`, `'off'`) |

---

## Troubleshooting

### My theme card doesn't show up in Settings

- Confirm the folder name and the `id` in `theme.json` are identical (case-sensitive, `snake_case`)
- Make sure all three files exist: `theme.json`, `theme.css`, `theme.js`
- Check the DevTools console (`F12`) for Vite import errors
- Restart the dev server (`wails dev`) after creating new files - hot reload sometimes misses new folders

### My CSS changes don't apply

- Verify you are scoping every rule to `:root[data-theme="your_id"]`
- Check that `import './theme.css'` is the first line in `theme.js`
- Use DevTools to inspect the HTML element and confirm `data-theme` is set correctly when the theme is active
- Some default styles are highly specific - add `!important` if needed, especially for mini player rules

### The theme looks broken after switching away

- You have a cleanup issue in `onDisable`. Walk through every DOM change made in `onEnable` and make sure `onDisable` reverses it
- Check for lingering `data-theme` attributes: open DevTools → Elements → check if `data-theme` is still on `<html>` after switching
- Check for orphaned injected elements: search for your overlay IDs in the DOM after switching away

### My image shows a broken icon in the build

- You are likely using a hardcoded path in a JavaScript `innerHTML` string - Vite can't trace these
- Move the image reference to a CSS class with `background-image: url('./assets/...')` - Vite processes CSS imports correctly
- Never use `<img src="/src/...">` in dynamically injected HTML

### Audio doesn't play on first activation

- This is expected browser behavior. Browsers require a user gesture before playing audio
- Wrap your sound call inside a button click handler (like the 8-Bit "Press Start" pattern) to guarantee audio is unlocked
- If you need ambient audio on activate, display a UI prompt asking the user to click before playing

### The Mini Player is broken / elements overlap

- The Mini Player has a different layout than the full player - you need dedicated CSS rules under `body.is-mini`
- Use the CSS Grid template from the [Restructuring the Mini Player Layout](#restructuring-the-mini-player-layout) section
- Add `!important` to all mini player overrides - the default rules are very specific
- Test by pressing the Mini Player button in the app while your theme is active

### The particle effect is causing lag

- Reduce the spawn rate (increase the `setInterval` delay to 400–600ms)
- Reduce the number of simultaneous particles by shortening the auto-remove timeout
- Add `will-change: transform` to particle elements to hint to the browser to use GPU compositing
- As a fallback, use a CSS-only animation instead of spawning DOM elements

---

*Happy theming!* 🦖  
*~ Made with ❤️ for everyone*