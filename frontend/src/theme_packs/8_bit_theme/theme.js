
import './theme.css';

let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playStartSound() {
    try {
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
        console.error("Audio Error:", e);
    }
}

export default {
    onEnable: (app) => {
        console.log("8-BIT THEME ACTIVATED");

        document.documentElement.setAttribute('data-theme', '8_bit_theme');
        document.body.classList.add('8-bit-active');
        document.documentElement.style.setProperty('--accent', '#39ff14');

        // 2. Visualizer Style & Color
        if (app.visualizer) {
            app.visualizer.updateSettings({
                style: 'retro',
                accentColor: '#39ff14' // Neon Green
            });
        }

        // 3. Lock Conflicting Settings
        setTimeout(() => {
            const elementsToLock = [
                'visualizer-style-select',
                'emoji-select',
                'theme-select',
                'animation-select',
                'toggle-use-custom-color',
                'toggle-gradient-title',
                'accent-color-picker'
            ];

            elementsToLock.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.disabled = true;
            });

            // Ensure "Custom Color" toggle is off
            const colorToggle = document.getElementById('toggle-use-custom-color');
            if (colorToggle && colorToggle.checked) {
                colorToggle.checked = false;
            }
        }, 100);

        // 4. Create Intro
        const overlay = document.createElement('div');
        overlay.id = 'retro-intro-layer';
        overlay.className = 'retro-intro-overlay';
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:#000; z-index:2147483647; display:flex; flex-direction:column; align-items:center; justify-content:center;';

        overlay.innerHTML = `
            <div class="retro-logo"></div>
            <div class="retro-text">NOVAWAVE 8-BIT</div>
            <button id="retro-start-btn" class="retro-btn">PRESS START</button>
        `;

        document.body.appendChild(overlay);

        const btn = overlay.querySelector('#retro-start-btn');
        if (btn) {
            btn.onclick = () => {
                playStartSound();
                overlay.style.transition = 'opacity 0.5s';
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 500);
            };
        } else {
            setTimeout(() => overlay.remove(), 3000);
        }

        // Background animation class
        const bgAnim = document.querySelector('.background-animation');
        if (bgAnim) {
            bgAnim.className = 'background-animation';
            bgAnim.classList.add('type-8bit');
        }
    },

    onDisable: (app) => {
        console.log("8-BIT THEME DEACTIVATED");
        document.documentElement.removeAttribute('data-theme');
        document.body.classList.remove('8-bit-active');

        if (app.visualizer) {
            app.visualizer.updateSettings({ accentColor: '#38bdf8' });
        }

        // Unlock
        const elementsToLock = [
            'visualizer-style-select',
            'emoji-select',
            'theme-select',
            'animation-select',
            'toggle-use-custom-color',
            'toggle-gradient-title',
            'accent-color-picker'
        ];

        elementsToLock.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = false;
        });

        const overlay = document.getElementById('retro-intro-layer');
        if (overlay) overlay.remove();

        const bgAnim = document.querySelector('.background-animation');
        if (bgAnim) bgAnim.classList.remove('type-8bit');

        if (audioCtx) {
            audioCtx.close();
            audioCtx = null;
        }
    }
};
