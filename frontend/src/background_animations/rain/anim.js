import { createParticleAnim } from '../particle_canvas.js';

export default createParticleAnim({
    spawnPerSec: 22,
    max: 40,
    spawn: (w, h) => {
        const dur = Math.random() * 0.5 + 0.5;
        return {
            x: Math.random() * w,
            y: -60,
            len: 60,
            vy: (h + 120) / dur,
            opacity: Math.random() * 0.45 + 0.08
        };
    },
    update: (p, dt, w, h) => {
        p.y += p.vy * dt;
        return p.y - p.len < h;
    },
    draw: (ctx, p) => {
        ctx.globalAlpha = p.opacity;
        ctx.strokeStyle = 'rgba(220, 235, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - p.len);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    }
});
