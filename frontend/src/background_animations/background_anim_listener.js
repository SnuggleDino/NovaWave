

const animConfigs = import.meta.glob('./*/anim.json', { eager: true });
const animStyles = import.meta.glob('./*/anim.css', { eager: true });

const animModules = import.meta.glob('./*/anim.js', { eager: true });

let activeAnimId = null;
let currentModule = null;
let _pausedForHidden = false;

export const BackgroundAnimListener = {

    init: function () {
        const select = document.getElementById('animation-select');
        if (!select) return;

        const currentVal = select.value;
        select.innerHTML = '';

        const anims = Object.keys(animConfigs).map(key => {
            return animConfigs[key].default || animConfigs[key];
        });

        const sortOrder = ['off', 'flow', 'nebula', 'aurora', 'blobs', 'plasma', 'snowfall', 'stellar', 'rain', 'fireflies', 'matrix'];

        anims.sort((a, b) => {
            const indexA = sortOrder.indexOf(a.id);
            const indexB = sortOrder.indexOf(b.id);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            return a.name.localeCompare(b.name);
        });

        anims.forEach(anim => {
            const option = document.createElement('option');
            option.value = anim.id;
            option.textContent = anim.name;
            select.appendChild(option);
        });

        const storedAnim = localStorage.getItem('animationMode');
        if (currentVal && anims.find(a => a.id === currentVal)) {
            select.value = currentVal;
        } else if (storedAnim && anims.find(a => a.id === storedAnim)) {
            select.value = storedAnim;
        } else {
            select.value = 'flow';
        }

        this.setAnimation(select.value);

        if (!this._visWired) {
            this._visWired = true;
            document.addEventListener('visibilitychange', () => this._handleVisibility());
        }
    },

    setAnimation: function (id) {
        const container = document.querySelector('.background-animation');
        if (!container) return;

        if (currentModule && currentModule.stop) {
            try {
                currentModule.stop();
            } catch (e) {
                console.error("Error stopping animation:", e);
            }
        }
        currentModule = null;

        container.className = 'background-animation';

        if (id === 'off') {
            container.style.display = 'none';
            activeAnimId = 'off';
            return;
        }

        container.style.display = 'block';
        container.classList.add(`type-${id}`);
        activeAnimId = id;

        const modulePath = `./${id}/anim.js`;
        const module = animModules[modulePath];

        if (module && module.default) {
            currentModule = module.default;
            if (currentModule.start) {
                try {
                    currentModule.start();
                } catch (e) {
                    console.error(`Error starting animation ${id}:`, e);
                }
            }
        }
    },

    // ---- VISIBILITY PAUSE --------------------
    // Stop spawners and pause CSS keyframes while the window is hidden/minimized,
    // then rebuild on return - background animations shouldn't burn CPU offscreen.
    _handleVisibility: function () {
        const container = document.querySelector('.background-animation');
        if (!container || !activeAnimId || activeAnimId === 'off') return;
        if (document.hidden) {
            if (_pausedForHidden) return;
            _pausedForHidden = true;
            container.classList.add('anim-paused');
            if (currentModule && currentModule.pause) {
                try { currentModule.pause(); } catch (e) {}
            }
        } else {
            if (!_pausedForHidden) return;
            _pausedForHidden = false;
            container.classList.remove('anim-paused');
            if (currentModule && currentModule.resume) {
                try { currentModule.resume(); } catch (e) {}
            }
        }
    }
};
