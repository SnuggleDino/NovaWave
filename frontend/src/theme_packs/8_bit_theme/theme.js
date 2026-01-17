
let persistentCtx = null;

// Helper to create or get context
const getCtx = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    
    if (!persistentCtx || persistentCtx.state === 'closed') {
        persistentCtx = new AudioContext();
    }
    return persistentCtx;
};

// Helper for 8-bit sounds using shared context
const playTone = (freq, type, duration) => {
    try {
        const ctx = getCtx();
        if (!ctx) return;
        
        // Ensure running
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type || 'square';
        osc.frequency.value = freq;
        
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.start(now);
        osc.stop(now + duration);
        
        // No closing here, we keep it open while theme is active

    } catch (e) {
        console.error('8-Bit Sound Error:', e);
    }
};

const playCoinSound = () => {
    try {
        const ctx = getCtx();
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        // E5
        osc.frequency.setValueAtTime(659.25, now);
        gain.gain.setValueAtTime(0.1, now);
        // B5
        osc.frequency.setValueAtTime(987.77, now + 0.1);
        gain.gain.setValueAtTime(0.1, now + 0.1);
        
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc.start(now);
        osc.stop(now + 0.5);

    } catch (e) {
        console.error('8-Bit Intro Sound Error:', e);
    }
};

const clickHandler = (e) => {
    // Play a small 'tick' for clicks on interactive elements
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) {
        playTone(400, 'square', 0.1);
    }
};

export default {
    /**
     * @function onEnable
     * Called when the user selects the 8-Bit theme.
     * @param {Object} app - The NovaWave application instance.
     */
    onEnable: (app) => {
        console.log('Applying theme: 8-Bit');

        // 1. Activate CSS Variables
        document.documentElement.setAttribute('data-theme', '8_bit_theme');

        // 2. Force Retro Visualizer Style
        if (app.visualizer) {
            // Save previous style to restore later if needed (optional)
            app.visualizer.setStyle('retro');
        }

        // 3. Play Intro Animation & Sound
        const introElement = document.getElementById('8_bit_theme-intro');
        if (introElement) {
            introElement.classList.add('visible');
            
            // Play Intro Sound
            playCoinSound();

            // Remove the overlay after 3 seconds
            setTimeout(() => {
                introElement.classList.remove('visible');
            }, 3000);
        }

        // 4. Set Background Animation
        const bgAnim = document.querySelector('.background-animation');
        if (bgAnim) {
            // Remove other types
            bgAnim.className = 'background-animation';
            bgAnim.style.display = 'block';
            bgAnim.classList.add('type-8bit');
        }

        // 5. Add Global Click Sound Listener
        window.addEventListener('click', clickHandler);
    },

    /**
     * @function onDisable
     * Called when the user switches to another theme.
     */
    onDisable: (app) => {
        // 1. Remove the theme attribute
        document.documentElement.removeAttribute('data-theme');
        
        // 2. Hide Intro if still active
        const introElement = document.getElementById('8_bit_theme-intro');
        if (introElement) {
            introElement.classList.remove('visible');
        }

        // 3. Remove Background Animation
        const bgAnim = document.querySelector('.background-animation');
        if (bgAnim) {
            bgAnim.classList.remove('type-8bit');
        }

        // 4. Remove Global Click Sound Listener
        window.removeEventListener('click', clickHandler);

        // 5. Cleanup Audio Context
        if (persistentCtx && persistentCtx.state !== 'closed') {
            persistentCtx.close().then(() => {
                persistentCtx = null;
            });
        }
    }
};
