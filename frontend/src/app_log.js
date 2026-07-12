// ---- APP LOG: lightweight in-memory ring buffer for debugging ----
const MAX_ENTRIES = 500;
const entries = [];

function stringify(a) {
    if (a instanceof Error) return a.stack || a.message;
    if (typeof a === 'object' && a !== null) {
        try { return JSON.stringify(a); } catch { return String(a); }
    }
    return String(a);
}

function push(level, args) {
    entries.push({ t: new Date().toISOString(), level, msg: args.map(stringify).join(' ') });
    if (entries.length > MAX_ENTRIES) entries.shift();
}

export const AppLog = {
    record(level, ...args) { push(level, args); },
    dump() {
        const head =
            `NovaWave Debug Log\n` +
            `Exported: ${new Date().toISOString()}\n` +
            `UserAgent: ${navigator.userAgent}\n` +
            `Entries: ${entries.length}\n\n`;
        if (!entries.length) return head + '(no log entries recorded)\n';
        return head + entries.map(e => `[${e.t}] [${e.level.toUpperCase()}] ${e.msg}`).join('\n') + '\n';
    }
};

// Mirror console output into the buffer without swallowing it.
['log', 'info', 'warn', 'error'].forEach(level => {
    const orig = console[level].bind(console);
    console[level] = (...args) => { push(level, args); orig(...args); };
});

// Capture uncaught errors + rejected promises (with stack traces where available).
window.addEventListener('error', e => {
    push('error', [e.message, e.error && e.error.stack ? e.error.stack : `${e.filename}:${e.lineno}:${e.colno}`]);
});
window.addEventListener('unhandledrejection', e => {
    const r = e.reason;
    push('error', ['unhandledrejection', r && r.stack ? r.stack : r]);
});

// Startup marker so the log is never empty and each session is timestamped.
push('info', ['AppLog ready - session started']);
