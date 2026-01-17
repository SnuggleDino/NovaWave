# 🎨 NovaWave Theme Packs Guide
> **Version:** 0.2 Beta
> **Status:** Active

Welcome to the **NovaWave Theme Pack** creation guide! Theme packs allow you to completely customize the look and feel of NovaWave. This guide serves as a template and documentation for creating your own themes.

---

## 📂 1. Directory Structure

To start, create a new folder inside `frontend/src/theme_packs/` with a unique ID for your theme.
Your folder should look like this:

```text
theme_packs/
└── YOUR_THEME_ID/           <-- Your Folder Name (must be unique)
    ├── theme.json           <-- Metadata (Required)
    ├── theme.css            <-- Styles (Required)
    ├── theme.js             <-- Logic & Interactivity (Required)
    └── assets/              <-- Images, icons, fonts (Optional but recommended)
        ├── YOUR_THEME_ID_album_cover.png
        ├── YOUR_THEME_ID_intro_icon.png
        └── YOUR_THEME_ID_themepack_icon.png
```

---

## 📝 2. Metadata (`theme.json`)

This file tells NovaWave what your theme is and how to load it.

**File:** `theme_packs/YOUR_THEME_ID/theme.json`

```json
{
  "name": "YOUR THEME NAME",        // The name displayed in the Settings menu
  "id": "YOUR_THEME_ID",            // Unique identifier (must match folder name)
  "version": "1.0.0",               // Semantic versioning
  "author": "YOUR NAME",            // Your name/handle
  "description": "A description of your theme pack.",
  "css": "theme.css",               // Path relative to this folder
  "js": "theme.js",                 // Path relative to this folder
  "preview_image": "assets/YOUR_THEME_ID_themepack_icon.png", 
  "target_version": ">=1.0.0"
}
```

---

## 🎨 3. Styling (`theme.css`)

NovaWave uses CSS Variables (Custom Properties) for theming. The Styles are scoped using the `data-theme` attribute.

**File:** `theme_packs/YOUR_THEME_ID/theme.css`

```css
/* =========================================
   1. CORE VARIABLES
   ========================================= */

:root[data-theme="YOUR_THEME_ID"] {
    --bg-main: #000000;
    --accent: #ffffff; 
    --font-main: "Courier New", Courier, monospace;
    /* ... more variables ... */
}

/* =========================================
   2. MINI PLAYER OPTIMIZATION
   ========================================= */
/* It is recommended to use specific rules for the Mini Player 
   to ensure your theme looks good in compact mode. */

html[data-theme="YOUR_THEME_ID"] body.is-mini .player-column {
    display: grid !important;
    /* Example layout for mini mode */
    grid-template-columns: 140px 1fr !important;
}
```

---

## ⚡ 4. Logic (`theme.js`)

This file handles the activation and deactivation lifecycle.

**File:** `theme_packs/YOUR_THEME_ID/theme.js`

```javascript
import './theme.css'; // Essential for Vite to bundle your styles

export default {
    /**
     * @function onEnable
     * Triggered when the theme is selected.
     */
    onEnable: (app) => {
        // 1. Set theme attributes
        document.documentElement.setAttribute('data-theme', 'YOUR_THEME_ID');
        document.body.classList.add('YOUR_THEME_ID-active');

        // 2. Lock Conflicting Settings (Optional)
        // Use a small timeout to ensure the UI has finished loading
        setTimeout(() => {
            const elementsToLock = ['theme-select', 'visualizer-style-select'];
            elementsToLock.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.disabled = true;
            });
        }, 100);

        // 3. Inject Custom Intro (Optional)
        const overlay = document.createElement('div');
        overlay.id = 'YOUR_THEME_ID-intro-overlay';
        // ... build your intro HTML ...
        document.body.appendChild(overlay);
    },

    /**
     * @function onDisable
     * Cleanup is mandatory to avoid styling leaks!
     */
    onDisable: (app) => {
        document.documentElement.removeAttribute('data-theme');
        document.body.classList.remove('YOUR_THEME_ID-active');

        // Restore settings
        const elementsToLock = ['theme-select', 'visualizer-style-select'];
        elementsToLock.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = false;
        });

        // Remove dynamic elements
        const overlay = document.getElementById('YOUR_THEME_ID-intro-overlay');
        if (overlay) overlay.remove();
    }
};
```

---

## 💡 Build-Safe Assets

When using images or icons in your theme:
1.  **CSS:** Use `background-image: url('./assets/filename.png')`. Bundlers like Vite will correctly resolve these paths during `wails build`.
2.  **HTML:** Avoid using `<img src="/src/...">` tags in dynamic HTML injection, as these paths will break in production. Use CSS classes with background images instead.

---

## 🎮 Special Features in 8-Bit Theme (Reference)

The **8-Bit** theme serves as a prime example of advanced theming:
*   **Custom Grid:** Completely restructures the Mini Player for stability.
*   **Audio Logic:** Uses Web Audio API to play retro "Coin" sounds.
*   **Locking:** Disables standard theme selection to enforce its unique identity.
*   **Marquee:** Implements a CSS-based scrolling title for long song names.
