// FIX: The original file imported from '../translations.js' which does not exist
// in the repository. This would cause an immediate module resolution error.
// We now use the global window.tr() function (provided by LangHandler) which
// is already available at the time design_tab functions are called.
// setDesignTabLanguage() is kept for API compatibility but is no longer needed.

let _currentLanguage = 'de';

export function setDesignTabLanguage(lang) {
    _currentLanguage = lang;
}

function tr(key) {
    if (typeof window !== 'undefined' && typeof window.tr === 'function') {
        return window.tr(key);
    }
    // Graceful fallback if called before LangHandler is ready
    return key;
}

// --- Icons ---
const LEGACY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18"/>
    <path d="M9 21V9"/>
</svg>`;

const V2_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
</svg>`;

// --- Render ---
export function renderDesignCards() {
    const container = document.getElementById('design-ui-cards');
    if (!container) return;

    const isV2 = window.location.pathname.includes('v2.html');
    const activeUi = isV2 ? 'v2' : 'legacy';

    const cards = [
        {
            key: 'legacy',
            label: tr('designLegacyLabel'),
            badge: tr('designLegacyBadge'),
            desc: tr('designLegacyDesc'),
            icon: LEGACY_ICON,
            target: 'index.html'
        },
        {
            key: 'v2',
            label: tr('designV2Label'),
            badge: tr('designV2Badge'),
            desc: tr('designV2Desc'),
            icon: V2_ICON,
            target: 'v2.html'
        }
    ];

    container.innerHTML = cards.map(card => {
        const isActive = card.key === activeUi;
        return buildCard(card, isActive, tr('designActiveBadge'), tr('designBtnActive'), tr('designBtnSwitch'));
    }).join('');

    // NOTE: Attach click handlers after innerHTML (avoids inline onclick in ES modules)
    container.querySelectorAll('.design-switch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.uiKey;
            const target = btn.dataset.uiTarget;
            switchUiVersion(key, target);
        });
    });
}

function buildCard(card, isActive, activeBadgeText, btnActiveText, btnSwitchText) {
    const cardBg = isActive ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.03)';
    const cardBorder = isActive ? 'var(--accent)' : 'rgba(255,255,255,0.08)';
    const cardShadow = isActive ? '0 0 20px rgba(56,189,248,0.15)' : 'none';
    const iconColor = isActive ? 'var(--accent)' : 'var(--text-muted)';
    const badgeBg = card.key === 'v2' ? 'rgba(99,179,237,0.15)' : 'rgba(255,255,255,0.08)';
    const badgeColor = card.key === 'v2' ? '#63b3ed' : 'var(--text-muted)';
    const btnBg = isActive ? 'rgba(255,255,255,0.05)' : 'var(--accent)';
    const btnColor = isActive ? 'var(--text-muted)' : '#000';
    const btnOpacity = isActive ? '0.5' : '1';
    const btnCursor = isActive ? 'default' : 'pointer';
    const btnText = isActive ? btnActiveText : btnSwitchText;

    const activeBadge = isActive
        ? `<div style="position:absolute;top:10px;right:10px;background:var(--accent);color:#000;font-size:0.65rem;font-weight:700;padding:3px 8px;border-radius:20px;letter-spacing:0.05em;">${activeBadgeText}</div>`
        : '';

    return `
        <div class="design-ui-card${isActive ? ' active' : ''}" style="flex:1;min-width:200px;max-width:280px;background:${cardBg};border:1.5px solid ${cardBorder};border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:12px;box-shadow:${cardShadow};transition:all 0.2s ease;position:relative;overflow:hidden;">
            ${activeBadge}
            <div style="color:${iconColor};">${card.icon}</div>
            <div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <strong style="font-size:0.95rem;color:var(--text-primary,#f0f4f8);">${card.label}</strong>
                    <span style="font-size:0.6rem;font-weight:700;padding:2px 7px;border-radius:20px;background:${badgeBg};color:${badgeColor};letter-spacing:0.05em;">${card.badge}</span>
                </div>
                <p style="font-size:0.78rem;color:var(--text-muted);line-height:1.5;margin:0;">${card.desc}</p>
            </div>
            <button
                class="design-switch-btn"
                data-ui-key="${card.key}"
                data-ui-target="${card.target}"
                ${isActive ? 'disabled' : ''}
                style="margin-top:auto;padding:8px 16px;border-radius:8px;border:none;cursor:${btnCursor};font-size:0.8rem;font-weight:600;font-family:inherit;background:${btnBg};color:${btnColor};opacity:${btnOpacity};transition:all 0.2s ease;">
                ${btnText}
            </button>
        </div>`;
}

// --- Switch ---
export function switchUiVersion(key, target) {
    localStorage.setItem('uiVersion', key);
    window.location.href = target;
}

// --- Init ---
export function initDesignTab() {
    const designNavBtn = document.getElementById('design-tab-nav-btn');
    if (designNavBtn) {
        designNavBtn.addEventListener('click', renderDesignCards);
    }
}