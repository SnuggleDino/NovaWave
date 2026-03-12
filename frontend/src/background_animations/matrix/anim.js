
let matrixInterval;

export default {
    start: () => {
        const container = document.querySelector('.background-animation');
        if (!container) return;

        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        
        const createCol = () => {
            if (!container.classList.contains('type-matrix')) return;
            const col = document.createElement('div');
            col.className = 'matrix-col';
            col.style.left = Math.floor(Math.random() * 100) + 'vw';
            col.style.animationDuration = (Math.random() * 3 + 2) + 's';
            col.style.fontSize = (Math.random() * 10 + 10) + 'px';
            
            let str = "";
            for(let i=0; i<20; i++) {
                str += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            col.textContent = str;
            
            container.appendChild(col);
            setTimeout(() => { col.remove(); }, 5000);
        };
        
        matrixInterval = setInterval(createCol, 100);
    },
    stop: () => {
        if (matrixInterval) clearInterval(matrixInterval);
        const container = document.querySelector('.background-animation');
        if (container) container.innerHTML = '';
    }
};