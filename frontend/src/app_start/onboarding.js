import iconPng from '../assets/icon.png';
import { LangHandler } from '../app_language/lang_handler.js';

const ONBOARDING_THEMES = [
    { id: 'midnight', name: 'Midnight', bg: '#000000', accent: '#8b5cf6' },
    { id: 'ocean',    name: 'Ocean',    bg: '#021019', accent: '#06b6d4' },
    { id: 'cherry',   name: 'Cherry',   bg: '#2a0a12', accent: '#fb7185' },
    { id: 'glacier',  name: 'Glacier',  bg: '#f8fafc', accent: '#0ea5e9' },
];

export const OnBoarding = {
    onComplete: null,
    _state: { step: 1, lang: null, theme: 'midnight' },
    _greetingInterval: null,
    _overlay: null,
    _contentEl: null,
    _logoEl: null,
    _logoWrapEl: null,
    _blobEl: null,

    init(callback) {
        this.onComplete = callback;
        this._state = { step: 1, lang: null, theme: 'midnight' };
        this._injectStyles();
        this._buildOverlay();
        this._renderStep1();
        return true;
    },

    _injectStyles() {
        if (document.getElementById('ob-styles')) return;
        const style = document.createElement('style');
        style.id = 'ob-styles';
        style.textContent = `
            @keyframes obMorphBlob {
                0%,100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: translate(-50%,-50%) rotate(0deg)   scale(1);    }
                25%     { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; transform: translate(-50%,-50%) rotate(55deg)  scale(1.07); }
                50%     { border-radius: 50% 60% 30% 70% / 30% 60% 70% 50%; transform: translate(-50%,-50%) rotate(135deg) scale(0.93); }
                75%     { border-radius: 70% 40% 60% 30% / 60% 30% 50% 60%; transform: translate(-50%,-50%) rotate(215deg) scale(1.09); }
            }

            @keyframes obBlobBtn {
                0%,100% { border-radius: 58px 46px 52px 48px / 48px 54px 46px 58px; transform: scale(1); }
                33%     { border-radius: 46px 58px 48px 54px / 54px 46px 58px 48px; transform: scale(1.013); }
                66%     { border-radius: 52px 44px 56px 50px / 50px 56px 44px 52px; transform: scale(0.992); }
            }

            @keyframes obFadeUp {
                from { opacity: 0; transform: translateY(16px); }
                to   { opacity: 1; transform: translateY(0); }
            }

            #onboarding-overlay * { box-sizing: border-box; }

            .ob-lang-btn {
                all: unset; cursor: pointer; padding: 16px 10px; border-radius: 16px;
                background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
                color: #fff; font-weight: 600; font-family: inherit;
                font-size: 0.92rem; text-align: center;
                transition: background 0.22s, border-color 0.22s, transform 0.22s, box-shadow 0.22s;
            }
            .ob-lang-btn:hover  { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.22); transform: translateY(-2px); }
            .ob-lang-btn.ob-selected {
                background: rgba(255,255,255,0.13); border-color: rgba(255,255,255,0.45);
                box-shadow: 0 0 14px rgba(255,255,255,0.1);
            }

            .ob-theme-card {
                all: unset; cursor: pointer; border-radius: 18px; padding: 14px 16px;
                display: flex; align-items: center; gap: 13px;
                border: 2px solid rgba(255,255,255,0.08);
                transition: transform 0.22s, border-color 0.22s, box-shadow 0.22s;
                font-family: inherit;
            }
            .ob-theme-card:hover      { transform: translateY(-3px); }
            .ob-theme-card.ob-selected { border-color: rgba(255,255,255,0.55) !important; box-shadow: 0 0 22px rgba(255,255,255,0.11); }

            .ob-continue-btn {
                all: unset; cursor: pointer; padding: 13px 38px; border-radius: 50px;
                background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18);
                color: #fff; font-weight: 700; font-family: inherit; font-size: 0.98rem;
                margin-top: 26px; display: inline-block;
                transition: background 0.22s, transform 0.2s, box-shadow 0.22s;
            }
            .ob-continue-btn:hover { background: rgba(255,255,255,0.18); transform: translateY(-2px); }

            .ob-cta-btn {
                all: unset; cursor: pointer; padding: 18px 52px;
                font-weight: 800; font-family: inherit; font-size: 1.1rem;
                letter-spacing: 0.3px; display: inline-block;
                animation: obBlobBtn 2.8s ease-in-out infinite;
                transition: box-shadow 0.3s;
                box-shadow: 0 4px 28px rgba(var(--ob-rgb), 0.3);
            }
            .ob-cta-btn:hover {
                box-shadow: 0 6px 40px rgba(var(--ob-rgb), 0.5);
                transform: scale(1.02);
            }
        `;
        document.head.appendChild(style);
    },

    _buildOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 999999;
            background: #070710;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            font-family: 'Inter', sans-serif;
            opacity: 0; transition: opacity 0.9s ease;
        `;

        const logoWrap = document.createElement('div');
        logoWrap.style.cssText = `
            position: relative; display: flex; align-items: center; justify-content: center;
            width: 82px; height: 82px; z-index: 1;
            margin-bottom: 34px;
            transition: width 0.5s cubic-bezier(0.22,1,0.36,1),
                        height 0.5s cubic-bezier(0.22,1,0.36,1),
                        margin-bottom 0.5s cubic-bezier(0.22,1,0.36,1);
        `;

        const blob = document.createElement('div');
        blob.style.cssText = `
            position: absolute; top: 50%; left: 50%;
            width: 320px; height: 320px;
            background: radial-gradient(ellipse at center, rgba(139,92,246,0.5) 0%, rgba(6,182,212,0.25) 45%, transparent 68%);
            pointer-events: none; z-index: 0;
            animation: obMorphBlob 9s ease-in-out infinite;
        `;
        logoWrap.appendChild(blob);
        this._blobEl = blob;

        const logo = document.createElement('img');
        logo.src = iconPng;
        logo.alt = 'NovaWave';
        logo.style.cssText = `
            width: 82px; height: 82px; border-radius: 22px;
            position: relative; z-index: 1;
            filter: drop-shadow(0 8px 28px rgba(139,92,246,0.45));
            transition: width 0.5s cubic-bezier(0.22,1,0.36,1),
                        height 0.5s cubic-bezier(0.22,1,0.36,1),
                        filter 0.5s ease;
        `;
        logoWrap.appendChild(logo);
        this._logoEl  = logo;
        this._logoWrapEl = logoWrap;

        const content = document.createElement('div');
        content.style.cssText = `
            position: relative; z-index: 1; text-align: center;
            width: 100%; max-width: 430px; padding: 0 24px;
            transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1);
        `;

        overlay.appendChild(logoWrap);
        overlay.appendChild(content);
        this._contentEl = content;
        this._overlay   = overlay;

        document.body.appendChild(overlay);
        setTimeout(() => { overlay.style.opacity = '1'; }, 80);
    },

    _swapContent(renderFn) {
        const el = this._contentEl;
        el.style.opacity   = '0';
        el.style.transform = 'translateY(-12px)';
        setTimeout(() => {
            el.innerHTML = '';
            renderFn();
            el.style.transform = 'translateY(12px)';
            requestAnimationFrame(() => requestAnimationFrame(() => {
                el.style.opacity   = '1';
                el.style.transform = 'translateY(0)';
            }));
        }, 310);
    },

    _setLogoSize(px, marginBottom) {
        this._logoWrapEl.style.width  = `${px}px`;
        this._logoWrapEl.style.height = `${px}px`;
        this._logoWrapEl.style.marginBottom = `${marginBottom}px`;
        this._logoEl.style.width  = `${px}px`;
        this._logoEl.style.height = `${px}px`;
    },

    // --- Step 1: Language ---

    _renderStep1() {
        this._state.step = 1;
        this._setLogoSize(82, 34);
        this._logoEl.style.filter = 'drop-shadow(0 8px 28px rgba(139,92,246,0.45))';
        this._blobEl.style.background =
            'radial-gradient(ellipse at center, rgba(139,92,246,0.5) 0%, rgba(6,182,212,0.25) 45%, transparent 68%)';

        const greetings = ['Hello', 'Hallo', 'Merhaba', 'Bonjour', 'Hola', 'Ciao'];
        let gIdx = 0;

        const greetEl = document.createElement('h1');
        greetEl.id = 'ob-greeting';
        greetEl.style.cssText = `
            font-size: 3rem; font-weight: 900; margin: 0 0 10px;
            background: linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.45));
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            transition: opacity 0.45s ease, transform 0.45s ease;
        `;
        greetEl.textContent = greetings[0];

        const subEl = document.createElement('p');
        subEl.style.cssText = `
            color: rgba(255,255,255,0.5); font-size: 0.93rem; margin: 0 0 32px;
            font-weight: 500; letter-spacing: 0.3px;
        `;
        subEl.textContent = 'Choose your language to start';

        const langGrid = document.createElement('div');
        langGrid.style.cssText = `display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 11px;`;

        LangHandler.getAvailableLanguages().forEach(l => {
            const btn = document.createElement('button');
            btn.className = 'ob-lang-btn';
            btn.textContent = l.label;
            btn.onclick = () => {
                langGrid.querySelectorAll('.ob-lang-btn').forEach(b => b.classList.remove('ob-selected'));
                btn.classList.add('ob-selected');
                this._state.lang = l.code;
                setTimeout(() => this._goToStep2(), 380);
            };
            langGrid.appendChild(btn);
        });

        this._contentEl.appendChild(greetEl);
        this._contentEl.appendChild(subEl);
        this._contentEl.appendChild(langGrid);

        if (this._greetingInterval) clearInterval(this._greetingInterval);
        this._greetingInterval = setInterval(() => {
            const el = document.getElementById('ob-greeting');
            if (!el) return;
            el.style.opacity   = '0';
            el.style.transform = 'translateY(18px)';
            setTimeout(() => {
                gIdx = (gIdx + 1) % greetings.length;
                el.textContent     = greetings[gIdx];
                el.style.opacity   = '1';
                el.style.transform = 'translateY(0)';
            }, 460);
        }, 2500);
    },

    // --- Step 2: Theme ---

    _goToStep2() {
        if (this._greetingInterval) { clearInterval(this._greetingInterval); this._greetingInterval = null; }
        this._setLogoSize(50, 18);
        this._swapContent(() => this._renderStep2Content());
    },

    _renderStep2Content() {
        const titleEl = document.createElement('h2');
        titleEl.style.cssText = `font-size: 1.75rem; font-weight: 800; color: #fff; margin: 0 0 6px;`;
        titleEl.textContent = 'Choose your style';

        const subEl = document.createElement('p');
        subEl.style.cssText = `color: rgba(255,255,255,0.4); font-size: 0.88rem; margin: 0 0 22px; line-height: 1.5;`;
        subEl.innerHTML = `Pick a look that feels right &nbsp;<span style="color:rgba(255,255,255,0.22);font-size:0.78rem;">— more themes &amp; options in Settings anytime</span>`;

        const grid = document.createElement('div');
        grid.style.cssText = `display: grid; grid-template-columns: 1fr 1fr; gap: 11px;`;

        ONBOARDING_THEMES.forEach(theme => {
            const isLight = theme.bg === '#f8fafc' || theme.bg === '#faf5ff';
            const card = document.createElement('button');
            card.className = 'ob-theme-card' + (this._state.theme === theme.id ? ' ob-selected' : '');
            card.style.cssText = `background: ${theme.bg}; border-color: rgba(255,255,255,${isLight ? '0.22' : '0.08'});`;

            const swatch = document.createElement('div');
            swatch.style.cssText = `
                width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
                background: ${theme.accent};
                box-shadow: 0 0 12px ${theme.accent}88;
            `;

            const rightCol = document.createElement('div');
            rightCol.style.cssText = `display: flex; flex-direction: column; gap: 5px; align-items: flex-start;`;

            for (let i = 0; i < 2; i++) {
                const line = document.createElement('div');
                line.style.cssText = `
                    height: 5px; border-radius: 3px;
                    background: ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'};
                    width: ${i === 0 ? '70%' : '45%'};
                `;
                rightCol.appendChild(line);
            }

            const nameEl = document.createElement('span');
            nameEl.style.cssText = `
                font-size: 0.82rem; font-weight: 700; letter-spacing: 0.2px;
                color: ${isLight ? '#111' : '#fff'}; margin-top: 2px;
            `;
            nameEl.textContent = theme.name;
            rightCol.appendChild(nameEl);

            card.appendChild(swatch);
            card.appendChild(rightCol);

            card.onclick = () => {
                grid.querySelectorAll('.ob-theme-card').forEach(c => c.classList.remove('ob-selected'));
                card.classList.add('ob-selected');
                this._state.theme = theme.id;
                document.documentElement.setAttribute('data-theme', theme.id);
                this._blobEl.style.background =
                    `radial-gradient(ellipse at center, ${theme.accent}88 0%, ${theme.accent}33 40%, transparent 68%)`;
                this._logoEl.style.filter = `drop-shadow(0 6px 20px ${theme.accent}88)`;
            };

            grid.appendChild(card);
        });

        const continueBtn = document.createElement('button');
        continueBtn.className = 'ob-continue-btn';
        continueBtn.textContent = 'Continue →';
        continueBtn.onclick = () => this._goToStep3();

        this._contentEl.appendChild(titleEl);
        this._contentEl.appendChild(subEl);
        this._contentEl.appendChild(grid);
        this._contentEl.appendChild(continueBtn);
    },

    // --- Step 3: Finish ---

    _goToStep3() {
        this._setLogoSize(82, 34);
        this._swapContent(() => this._renderStep3Content());
    },

    _renderStep3Content() {
        const theme = ONBOARDING_THEMES.find(t => t.id === this._state.theme) || ONBOARDING_THEMES[0];
        const isLight = theme.bg === '#f8fafc' || theme.bg === '#faf5ff';

        const r = parseInt(theme.accent.slice(1,3), 16);
        const g = parseInt(theme.accent.slice(3,5), 16);
        const b = parseInt(theme.accent.slice(5,7), 16);

        const titleEl = document.createElement('h1');
        titleEl.style.cssText = `
            font-size: 2.4rem; font-weight: 900; margin: 0 0 10px;
            background: linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.45));
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        `;
        titleEl.textContent = "You're all set!";

        const subEl = document.createElement('p');
        subEl.style.cssText = `color: rgba(255,255,255,0.4); font-size: 0.93rem; margin: 0 0 42px; font-weight: 500;`;
        subEl.textContent = 'Your music. Your style. Your rules.';

        const ctaBtn = document.createElement('button');
        ctaBtn.className = 'ob-cta-btn';
        ctaBtn.style.cssText = `
            background: ${theme.accent};
            color: ${isLight ? '#000' : '#fff'};
            --ob-rgb: ${r}, ${g}, ${b};
        `;
        ctaBtn.textContent = "Let's Listen Up! 🎵";
        ctaBtn.onclick = () => this.complete(this._state.lang, this._state.theme);

        this._contentEl.appendChild(titleEl);
        this._contentEl.appendChild(subEl);
        this._contentEl.appendChild(ctaBtn);
    },

    // --- Complete ---

    complete(lang, theme) {
        if (this._greetingInterval) { clearInterval(this._greetingInterval); this._greetingInterval = null; }

        const useLang  = lang  || 'de';
        const useTheme = theme || 'midnight';

        LangHandler.setLanguage(useLang);
        document.documentElement.setAttribute('data-theme', useTheme);
        localStorage.setItem('on_boarding_complete', 'true');
        localStorage.setItem('theme', useTheme);

        if (typeof this.onComplete === 'function') {
            this.onComplete(useLang, useTheme);
            return;
        }

        const overlay = document.getElementById('onboarding-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.remove(); location.reload(); }, 900);
        }
    }
};
