import { createParticleAnim } from '../particle_canvas.js';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Each column's glyphs are rendered once into an offscreen canvas and then
// composited with drawImage every frame - far cheaper than re-running fillText
// for every character on every frame.
export default createParticleAnim({
    spawnPerSec: 11,
    max: 55,
    spawn: (w, h) => {
        const fontSize = Math.random() * 10 + 10;
        const count = 20;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cw = Math.ceil(fontSize * 1.4);
        const ch = Math.ceil(fontSize * count);
        const oc = document.createElement('canvas');
        oc.width = Math.round(cw * dpr);
        oc.height = Math.round(ch * dpr);
        const octx = oc.getContext('2d');
        octx.scale(dpr, dpr);
        octx.fillStyle = '#00ff00';
        octx.font = fontSize + 'px monospace';
        octx.textAlign = 'center';
        octx.textBaseline = 'top';
        for (let i = 0; i < count; i++) {
            octx.fillText(CHARS.charAt(Math.floor(Math.random() * CHARS.length)), cw / 2, i * fontSize);
        }
        const dur = Math.random() * 2 + 2;
        return {
            x: Math.floor(Math.random() * w),
            y: -ch,
            oc,
            cw,
            ch,
            vy: (h + ch) / dur
        };
    },
    update: (p, dt, w, h) => {
        p.y += p.vy * dt;
        return p.y < h + 20;
    },
    draw: (ctx, p) => {
        ctx.globalAlpha = 0.7;
        ctx.drawImage(p.oc, p.x - p.cw / 2, p.y, p.cw, p.ch);
    }
});
