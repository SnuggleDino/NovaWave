
let rainInterval;

export default {
    start: () => {
        const container = document.querySelector('.background-animation');
        if (!container) return;

        const createRain = () => {
            if (!container.classList.contains('type-rain')) return;
            const drop = document.createElement('div');
            drop.className = 'raindrop';
            drop.style.left = Math.random() * 100 + 'vw';
            drop.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';
            drop.style.opacity = Math.random() * 0.5;
            container.appendChild(drop);
            setTimeout(() => { drop.remove(); }, 1000);
        };
        
        rainInterval = setInterval(createRain, 50);
    },
    stop: () => {
        if (rainInterval) clearInterval(rainInterval);
        const container = document.querySelector('.background-animation');
        if (container) container.innerHTML = '';
    }
};