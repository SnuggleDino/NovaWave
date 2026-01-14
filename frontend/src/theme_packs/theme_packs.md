# 🎨 NovaWave Theme Packs Guide
> **Version:** 0.1 Alpha
> **Status:** Experimental

Welcome to the **NovaWave Theme Pack** creation guide! Theme packs allow you to completely customize the look and feel of NovaWave. This guide serves as a template and documentation for creating your own themes.

---

## 📂 1. Directory Structure

To start, create a new folder inside `frontend/src/theme_packs/` with a unique ID for your theme (e.g., `my_awesome_theme`).
Your folder should look like this:

```text
theme_packs/
└── YOUR_THEME_ID/           <-- Your Folder Name (must be unique)
    ├── theme.json           <-- Metadata (Required)
    ├── theme.css            <-- Styles (Required)
    ├── theme.js             <-- Logic & Interactivity (Required)
    └── assets/              <-- Images, icons, fonts (Optional but recommended)
        ├── preview.png
        └── intro_icon.png
```

---

## 📝 2. Metadata (`theme.json`)

This file tells NovaWave what your theme is and how to load it.

**File:** `theme_packs/YOUR_THEME_ID/theme.json`

```json
{
  "name": "Neon Nights",            // The name displayed in the Settings menu
  "id": "neon_nights_theme",        // Unique identifier (must match folder name ideally)
  "version": "1.0.0",               // Semantic versioning
  "author": "CyberArtist",          // Your name/handle
  "description": "A dark, neon-infused theme for night coding.",
  "css": "theme.css",               // Path relative to this folder
  "js": "theme.js",                 // Path relative to this folder
  "preview_image": "assets/preview.png", // Image shown in the theme selector (500x300px recommended)
  "target_version": ">=1.5.0"       // Min. supported NovaWave version
}
```

---

## 🎨 3. Styling (`theme.css`)

NovaWave uses CSS Variables (Custom Properties) for theming. This allows for instant theme switching without reloading.
The Styles are scoped using the `data-theme` attribute on the `root` or `html` element.

**File:** `theme_packs/YOUR_THEME_ID/theme.css`

```css
/* =========================================
   1. CORE VARIABLES
   These control the main colors of the app.
   ========================================= */

:root[data-theme="YOUR_THEME_ID"] {
    /* Backgrounds */
    --bg-main: #0d1a0f;                       /* Main app background */
    --bg-card: rgba(30, 46, 34, 0.8);         /* Card/Panel background */
    --bg-card-light: rgba(50, 75, 55, 0.5);   /* Lighter card elements (hover states) */
    
    /* Accents (The "Identity" color) */
    --accent: #c1d37f;                        /* Main accent color (Buttons, highlights) */
    --accent-soft: rgba(193, 211, 127, 0.2);  /* Subtle glow, backgrounds for active items */
    
    /* Text */
    --text-main: #fffcf2;                     /* Primary text color */
    --text-muted: #d4e09b;                    /* Secondary/Subtext color */
    
    /* Borders & Shadows */
    --border-soft: rgba(193, 211, 127, 0.3);  /* Thin borders around panels */
    --shadow-soft: 0 20px 50px rgba(10, 30, 15, 0.5); /* Deep shadows for depth */
    
    /* Radius (Optional override) */
    --radius-lg: 18px;                        /* Roundness of cards */
}

/* =========================================
   2. GLOBAL OVERRIDES
   Target specific elements for deeper customization.
   ========================================= */

/* Main Body Background (Gradients, Images) */
:root[data-theme="YOUR_THEME_ID"] body {
    background: radial-gradient(circle at top right, #1e3322 0%, #0d1a0f 100%);
    background-attachment: fixed; /* Keeps background static while scrolling */
}

/* Player Controls (Play/Pause/Skip) */
:root[data-theme="YOUR_THEME_ID"] .control-main {
    background: var(--accent);
    color: #1a2e1d; /* Icon color inside the main button */
    box-shadow: 0 8px 25px var(--accent-soft);
}

/* Progress Bar Gradient */
:root[data-theme="YOUR_THEME_ID"] .progress-fill {
    background: linear-gradient(to right, var(--accent), #f2cc8f);
}

/* Active Badge Icons */
:root[data-theme="YOUR_THEME_ID"] .active-features-container .features-badge-icon {
    border-color: #f2cc8f;
    color: #f2cc8f;
}

/* Language Buttons */
:root[data-theme="YOUR_THEME_ID"] .lang-btn.active {
    color: #ffffff !important;
    text-shadow: 0 0 10px var(--accent);
}

/* =========================================
   3. INTRO ANIMATION (Optional)
   Styles for the full-screen overlay when theme loads.
   ========================================= */

.YOUR_THEME_ID-intro-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 200000; /* Must be very high to cover everything */
    display: none;   /* Hidden by default */
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.5s ease;
    
    /* Custom Gradient for Intro */
    background: linear-gradient(180deg, #2a1b22 0%, #4a2c36 100%);
}

/* This class is added via JS to show the intro */
.YOUR_THEME_ID-intro-overlay.visible {
    display: flex;
    opacity: 1;
    pointer-events: auto;
}

/* Floating Animation Example */
.YOUR_THEME_ID-intro-img {
    width: 250px;
    height: auto;
    margin-bottom: 30px;
    filter: drop-shadow(0 0 30px var(--accent-soft));
    animation: YOUR_THEME_ID-float 3s ease-in-out infinite alternate;
}

@keyframes YOUR_THEME_ID-float {
    from { transform: translateY(0) scale(1); }
    to { transform: translateY(-15px) scale(1.05); }
}
```

---

## ⚡ 4. Logic (`theme.js`)

This file handles the activation and deactivation lifecycle.

**File:** `theme_packs/YOUR_THEME_ID/theme.js`

```javascript
export default {
    /**
     * @function onEnable
     * Called when the user selects your theme.
     * @param {Object} app - The NovaWave application instance.
     */
    onEnable: (app) => {
        console.log('Applying theme: YOUR_THEME_ID');

        // 1. Activate CSS Variables
        // This switches the :root selector to match your CSS
        document.documentElement.setAttribute('data-theme', 'YOUR_THEME_ID');

        // 2. Play Intro Animation (Optional)
        // Ensure you have added the HTML for this ID (see Section 5)
        const introElement = document.getElementById('YOUR_THEME_ID-intro');
        if (introElement) {
            introElement.classList.add('visible');
            
            // Remove the overlay after 3 seconds
            setTimeout(() => {
                introElement.classList.remove('visible');
            }, 3000);
        }

        // 3. Optional: Configure App Settings
        // You can force specific modes if your theme requires them.
        
        // Example: Force Retro Visualizer
        // if (app.visualizer) app.visualizer.setStyle('retro');
        
        // Example: Set specific emoji pack
        // app.ui.updateEmoji('loving_dinos');
    },

    /**
     * @function onDisable
     * Called when the user switches to another theme.
     * Clean up your changes here.
     */
    onDisable: (app) => {
        // 1. Remove the theme attribute
        document.documentElement.removeAttribute('data-theme');
        
        // 2. Reset any forced settings (Optional)
        // app.visualizer.resetStyle();
    }
};
```

---

## 🏗️ 5. HTML Injection

Currently, custom HTML for intros (like the overlay) needs to be added to the main `index.html`.

*Future versions of NovaWave will support dynamic HTML injection from `theme.json`.*

**For now, add this to `frontend/index.html` inside the `<body>`:**

```html
<!-- YOUR THEME ID INTRO -->
<div id="YOUR_THEME_ID-intro" class="YOUR_THEME_ID-intro-overlay">
    <!-- Replace with your local asset path -->
    <img src="themes/YOUR_THEME_ID/assets/intro_icon.png" class="YOUR_THEME_ID-intro-img" alt="Theme Logo">
    <div class="YOUR_THEME_ID-intro-text">THEME NAME</div>
</div>
```

---

## 💡 Additional Tips

-   **Color Contrast:** Ensure `text-main` is readable against `bg-main` and `bg-card`.
-   **Transparencies:** Using `rgba()` for backgrounds (like `bg-card`) creates a nice glassmorphism effect.
-   **Animations:** Keep intro animations short (under 3-4 seconds) so users don't get annoyed.
-   **Assets:** Keep image sizes optimized (under 500KB) to keep the app fast.

