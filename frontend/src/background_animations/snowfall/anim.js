import { createParticleAnim } from '../particle_canvas.js';

export default createParticleAnim({
    spawnPerSec: 2.6,
    max: 48,
    spawn: (w, h) => {
        const size = Math.random() * 10 + 12;
        const dur = Math.random() * 5 + 8;
        return {
            x: Math.random() * w,
            y: -20,
            size,
            dur,
            life: 0,
            vy: (h + 40) / dur,
            swayAmp: Math.random() * 14 + 6,
            swaySpeed: Math.random() * 0.8 + 0.4,
            swayPhase: Math.random() * Math.PI * 2,
            rot: Math.random() * Math.PI * 2,
            vrot: (Math.random() * 2 - 1) * 1.4,
            opacity: Math.random() * 0.7 + 0.3
        };
    },
    update: (p, dt, w, h) => {
        p.life += dt;
        p.y += p.vy * dt;
        p.swayPhase += p.swaySpeed * dt;
        p.rot += p.vrot * dt;
        return p.y < h + 30;
    },
    draw: (ctx, p) => {
        const t = p.life / p.dur;
        let fade = 1;
        if (t < 0.1) fade = t / 0.1;
        else if (t > 0.9) fade = Math.max(0, (1 - t) / 0.1);
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity * fade));
        ctx.fillStyle = '#ffffff';
        ctx.font = p.size + 'px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.translate(p.x + Math.sin(p.swayPhase) * p.swayAmp, p.y);
        ctx.rotate(p.rot);
        ctx.fillText('❄', 0, 0);
        ctx.restore();
    }
});
