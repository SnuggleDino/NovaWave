
export default {
    start: () => {
        const container = document.querySelector('.background-animation');
        if (!container) return;

        for(let i=0; i<30; i++) {
            const fly = document.createElement('div');
            fly.className = 'firefly';
            fly.style.left = Math.random() * 100 + '%';
            fly.style.top = Math.random() * 100 + '%';
            fly.style.setProperty('--mx', (Math.random() * 200 - 100) + 'px');
            fly.style.setProperty('--my', (Math.random() * 200 - 100) + 'px');
            fly.style.animationDuration = (Math.random() * 10 + 10) + 's';
            fly.style.animationDelay = (Math.random() * 5) + 's';
            container.appendChild(fly);
        }
    },
    stop: () => {
        const container = document.querySelector('.background-animation');
        if (container) container.innerHTML = '';
    }
};