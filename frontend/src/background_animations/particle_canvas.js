// ---- SHARED CANVAS PARTICLE ENGINE --------------------
// One <canvas> + one requestAnimationFrame loop, replacing per-particle DOM
// nodes (no layout/reflow, no create/destroy churn). start/stop build and tear
// down; pause/resume only cancel/restart the rAF, so the particle field is
// frozen and continued rather than rebuilt when the window is hidden.
//
// config: { spawnPerSec, max, spawn(w,h)->particle, update(p,dt,w,h)->keep?, draw(ctx,p) }
export function createParticleAnim(config) {
    let canvas = null;
    let ctx = null;
    let raf = null;
    let running = false;
    let particles = [];
    let spawnAcc = 0;
    let lastTime = 0;

    const onResize = () => resize();

    function resize() {
        if (!canvas || !ctx) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function loop(now) {
        if (!running) return;
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        const w = window.innerWidth;
        const h = window.innerHeight;

        if (config.spawnPerSec > 0) {
            spawnAcc += dt * config.spawnPerSec;
            while (spawnAcc >= 1) {
                spawnAcc -= 1;
                if (particles.length < config.max) particles.push(config.spawn(w, h));
            }
        }

        ctx.clearRect(0, 0, w, h);
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            if (!config.update(p, dt, w, h)) {
                particles.splice(i, 1);
                continue;
            }
            ctx.globalAlpha = 1;
            config.draw(ctx, p);
        }

        raf = requestAnimationFrame(loop);
    }

    return {
        start() {
            const container = document.querySelector('.background-animation');
            if (!container) return;
            canvas = document.createElement('canvas');
            canvas.className = 'anim-canvas';
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.pointerEvents = 'none';
            container.appendChild(canvas);
            ctx = canvas.getContext('2d');
            resize();
            window.addEventListener('resize', onResize);
            particles = [];
            spawnAcc = 0;
            running = true;
            lastTime = performance.now();
            raf = requestAnimationFrame(loop);
        },
        stop() {
            running = false;
            if (raf) cancelAnimationFrame(raf);
            raf = null;
            window.removeEventListener('resize', onResize);
            const container = document.querySelector('.background-animation');
            if (container) container.innerHTML = '';
            canvas = null;
            ctx = null;
            particles = [];
        },
        pause() {
            if (!running) return;
            running = false;
            if (raf) cancelAnimationFrame(raf);
            raf = null;
        },
        resume() {
            if (running || !canvas) return;
            running = true;
            lastTime = performance.now();
            raf = requestAnimationFrame(loop);
        }
    };
}
