// Snowfall Logic
let snowInterval;

export default {
    start: () => {
        const container = document.querySelector('.background-animation');
        if (!container) return;
        
        const isMini = document.body.classList.contains('is-mini');
        const interval = isMini ? 800 : 400;

        const createSnowflake = () => {
            if (!container.classList.contains('type-snowfall')) return;
            const flake = document.createElement('span');
            const duration = Math.random() * 5 + 8;

            flake.style.left = Math.random() * 100 + 'vw';
            flake.style.animationDuration = duration + 's';
            flake.style.opacity = Math.random() * 0.7 + 0.3;
            flake.style.fontSize = (Math.random() * 10 + 12) + 'px';
            flake.innerHTML = '\u2744';
            flake.style.position = 'absolute';
            flake.style.top = '-20px';
            flake.style.color = 'white';
            flake.style.pointerEvents = 'none';
            flake.style.animationName = 'snowfall';
            flake.style.animationTimingFunction = 'linear';
            flake.style.animationIterationCount = 'infinite';
            flake.style.filter = 'blur(1px)';
            container.appendChild(flake);

            setTimeout(() => { flake.remove(); }, (duration * 1000) + 100);
        };
        
        snowInterval = setInterval(createSnowflake, interval);
    },
    stop: () => {
        if (snowInterval) clearInterval(snowInterval);
        const container = document.querySelector('.background-animation');
        if (container) container.innerHTML = '';
    }
};