// Stellar Logic
export default {
    start: () => {
        const container = document.querySelector('.background-animation');
        if (!container) return;
        
        for(let i=0; i<50; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.setProperty('--duration', (Math.random() * 3 + 2) + 's');
            star.style.setProperty('--delay', (Math.random() * 5) + 's');
            container.appendChild(star);
        }
    },
    stop: () => {
        const container = document.querySelector('.background-animation');
        if (container) container.innerHTML = '';
    }
};