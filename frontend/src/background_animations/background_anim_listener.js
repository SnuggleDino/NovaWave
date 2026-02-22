/**
 * BACKGROUND ANIMATION LISTENER
 * Handles dynamic background animations via Vite glob imports.
 */

// Load configurations and styles
const animConfigs = import.meta.glob('./*/anim.json', { eager: true });
const animStyles = import.meta.glob('./*/anim.css', { eager: true });

// Load JS logic modules
const animModules = import.meta.glob('./*/anim.js', { eager: true });

let activeAnimId = null;
let currentModule = null;

export const BackgroundAnimListener = {

    init: function () {
        const select = document.getElementById('animation-select');
        if (!select) return;

        const currentVal = select.value;
        select.innerHTML = '';

        const anims = Object.keys(animConfigs).map(key => {
            return animConfigs[key].default || animConfigs[key];
        });

        const sortOrder = ['off', 'flow', 'nebula', 'aurora', 'plasma', 'snowfall', 'stellar', 'rain', 'fireflies', 'matrix'];

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
    },

    setAnimation: function (id) {
        const container = document.querySelector('.background-animation');
        if (!container) return;

        // Stop previous
        if (currentModule && currentModule.stop) {
            try {
                currentModule.stop();
            } catch (e) {
                console.error("Error stopping animation:", e);
            }
        }
        currentModule = null;

        // Reset classes
        container.className = 'background-animation';

        if (id === 'off') {
            container.style.display = 'none';
            activeAnimId = 'off';
            return;
        }

        container.style.display = 'block';
        container.classList.add(`type-${id}`);
        activeAnimId = id;

        // Find module
        // Construct path: ./id/anim.js
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
    }
};
