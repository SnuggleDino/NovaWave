import { LangHandler } from '../app_language/lang_handler.js';

export const OnBoarding = {
    init: function() {
        const isComplete = localStorage.getItem('on_boarding_complete') === 'true';
        if (isComplete) return false;

        this.renderModal();
        return true;
    },

    renderModal: function() {
        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.style = `
            position: fixed; inset: 0; z-index: 999999;
            background: #050508;
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 1s ease;
            font-family: 'Inter', sans-serif;
        `;

        const container = document.createElement('div');
        container.style = `
            text-align: center; max-width: 450px; width: 90%;
            padding: 60px 40px; border-radius: 40px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(40px);
            box-shadow: 0 40px 100px rgba(0,0,0,0.8);
            position: relative; overflow: hidden;
        `;

        const textWrapper = document.createElement('div');
        textWrapper.style = `height: 120px; position: relative; margin-bottom: 20px; overflow: hidden;`;

        const helloText = document.createElement('h1');
        helloText.id = 'onboarding-hello';
        helloText.style = `
            font-size: 3.5rem; font-weight: 900; width: 100%;
            background: linear-gradient(to bottom, #fff, rgba(255,255,255,0.5));
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            margin: 0; position: absolute; left: 0; top: 0;
            transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        `;
        helloText.textContent = 'Hello';

        const subText = document.createElement('p');
        subText.style = 'color: rgba(255,255,255,0.4); margin-bottom: 50px; font-size: 1rem; font-weight: 500; letter-spacing: 0.5px;';
        subText.textContent = 'Choose your language to start';

        const langGrid = document.createElement('div');
        langGrid.style = 'display: grid; grid-template-columns: 1fr; gap: 15px;';

        const langs = LangHandler.getAvailableLanguages();
        langs.forEach(l => {
            const btn = document.createElement('button');
            btn.style = `
                all: unset; cursor: pointer; padding: 18px; border-radius: 20px;
                background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
                color: #fff; font-weight: 600; transition: 0.3s;
                font-size: 0.95rem;
            `;
            btn.textContent = l.label;
            btn.onmouseover = () => {
                btn.style.background = 'rgba(255,255,255,0.08)';
                btn.style.borderColor = 'var(--accent, #3b82f6)';
                btn.style.transform = 'translateY(-2px)';
            };
            btn.onmouseout = () => {
                btn.style.background = 'rgba(255,255,255,0.03)';
                btn.style.borderColor = 'rgba(255,255,255,0.05)';
                btn.style.transform = 'translateY(0)';
            };
            btn.onclick = () => this.complete(l.code);
            langGrid.appendChild(btn);
        });

        textWrapper.appendChild(helloText);
        container.appendChild(textWrapper);
        container.appendChild(subText);
        container.appendChild(langGrid);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // Apple-style multi-language animation
        const greetings = ['Hello', 'Hallo', 'Merhaba', 'Bonjour', 'Hola', 'Ciao'];
        let idx = 0;
        
        const animate = () => {
            helloText.style.opacity = '0';
            helloText.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                idx = (idx + 1) % greetings.length;
                helloText.textContent = greetings[idx];
                helloText.style.opacity = '1';
                helloText.style.transform = 'translateY(0)';
            }, 600);
        };

        setInterval(animate, 2500);

        setTimeout(() => overlay.style.opacity = 1, 100);
    },

    complete: function(lang) {
        LangHandler.setLanguage(lang);
        localStorage.setItem('on_boarding_complete', 'true');
        const overlay = document.getElementById('onboarding-overlay');
        if (overlay) {
            overlay.style.opacity = 0;
            setTimeout(() => {
                overlay.remove();
                location.reload();
            }, 1000);
        }
    }
};
