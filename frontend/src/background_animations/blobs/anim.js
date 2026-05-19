export default {
    start: () => {
        const container = document.querySelector('.background-animation');
        if (!container) return;
        for (let i = 1; i <= 4; i++) {
            const blob = document.createElement('div');
            blob.className = `blob blob-${i}`;
            container.appendChild(blob);
        }
    },
    stop: () => {
        const container = document.querySelector('.background-animation');
        if (container) container.innerHTML = '';
    }
};
