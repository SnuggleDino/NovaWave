let _currentLanguage = 'de';

export function setDesignTabLanguage(lang) {
    _currentLanguage = lang;
}

function tr(key) {
    if (typeof window !== 'undefined' && typeof window.tr === 'function') {
        return window.tr(key);
    }
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

// --- NEU: Lite UI Icon ---
const LITE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="10 8 16 12 10 16 10 8"/>
</svg>`;

// --- Render ---
export function renderDesignCards() {
    const container = document.getElementById('design-ui-cards');
    if (!container) return;

    const isV2 = window.location.pathname.includes('v2.html');
    const isLite = window.location.pathname.includes('lite.html');
    const activeUi = isV2 ? 'v2' : isLite ? 'lite' : 'legacy';

    const cards = [
        {
            key: 'legacy',
            label: tr('designLegacyLabel'),
            badge: 'STABLE',
            desc: tr('designLegacyDesc'),
            icon: LEGACY_ICON,
            target: 'index.html'
        },
        {
            key: 'v2',
            label: tr('designV2Label'),
            badge: 'V2-PRO',
            desc: tr('designV2Desc'),
            icon: V2_ICON,
            target: 'v2.html'
        },
        {
            key: 'lite',
            label: tr('designLiteLabel'),
            badge: 'LITE',
            desc: tr('designLiteDesc'),
            icon: LITE_ICON,
            target: 'lite.html'
        }
    ];

    // --- Sector: UI Selection Grid ---
    container.innerHTML = `
        <style>
            .nw-design-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 2.5px;
                width: 100%;
                margin-top: 10px;
            }
            .nw-design-card {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                padding: 25px;
                display: flex;
                flex-direction: column;
                gap: 15px;
                min-height: 260px;
                position: relative;
                transition: all 0.2s ease;
            }
            .nw-design-card.active {
                border-color: var(--accent);
                background: rgba(56, 189, 248, 0.05);
            }
            .nw-design-badge {
                align-self: flex-start;
                font-size: 0.65rem;
                font-weight: 800;
                padding: 3px 8px;
                border-radius: 4px;
                background: rgba(255, 255, 255, 0.1);
                color: var(--text-muted);
                letter-spacing: 1px;
            }
            .nw-design-card.active .nw-design-badge {
                background: var(--accent);
                color: #000;
            }
            .nw-shortcut-row {
                background: rgba(255, 255, 255, 0.03);
                padding: 15px 20px;
                border-radius: 8px;
                border: 1px solid var(--border-soft);
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 10px;
            }
        </style>

        <div class="nw-design-grid">
            ${cards.map(card => buildCard(card, card.key === activeUi)).join('')}
        </div>

        <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid var(--border-soft); width: 100%;">
            <div class="setting-label" style="margin-bottom: 25px;">
                <strong>UI Shortcuts</strong>
                <p>Quickly switch between interfaces using your keyboard</p>
            </div>
            
            <div>
                ${_hotkeyItem('Legacy UI', '1')}
                ${_hotkeyItem('NovaWave V2', '2')}
                ${_hotkeyItem('Lite UI', '3')}
            </div>
        </div>
    `;

    // Re-bind click handlers
    container.querySelectorAll('.design-switch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchUiVersion(btn.dataset.uiKey, btn.dataset.uiTarget);
        });
    });
}

function _hotkeyItem(label, key) {
    const kbdStyle = `background: rgba(0,0,0,0.4); border: 1px solid var(--border-soft); padding: 4px 8px; border-radius: 4px; color: var(--accent); font-family: monospace; font-weight: bold;`;
    const plus = `<span style="margin: 0 8px; opacity: 0.5;">+</span>`;
    
    return `
        <div class="nw-shortcut-row">
            <span style="font-weight: 600;">${label}</span>
            <div style="display: flex; align-items: center;">
                <kbd style="${kbdStyle}">CTRL</kbd>${plus}<kbd style="${kbdStyle}">U</kbd>${plus}<kbd style="${kbdStyle}">${key}</kbd>
            </div>
        </div>`;
}

function buildCard(card, isActive) {
    const btnText = isActive ? tr('designBtnActive') : tr('designBtnSwitch');
    const badgeText = isActive ? tr('designActiveBadge') : card.badge;

    return `
        <div class="nw-design-card ${isActive ? 'active' : ''}">
            <div class="nw-design-badge">${badgeText}</div>
            <div style="color: ${isActive ? 'var(--accent)' : 'var(--text-muted)'}; opacity: 0.8; text-align: center;">
                ${card.icon}
            </div>
            <div style="flex: 1; text-align: center;">
                <strong style="display: block; font-size: 1rem; margin-bottom: 8px;">${card.label}</strong>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0; line-height: 1.5;">${card.desc}</p>
            </div>
            <button
                class="design-switch-btn"
                data-ui-key="${card.key}"
                data-ui-target="${card.target}"
                ${isActive ? 'disabled' : ''}
                style="width: 100%; padding: 10px; border-radius: 6px; border: none; cursor: ${isActive ? 'default' : 'pointer'}; background: ${isActive ? 'rgba(255,255,255,0.05)' : 'var(--accent)'}; color: ${isActive ? 'var(--text-muted)' : '#000'}; font-weight: bold; text-transform: uppercase; font-size: 0.7rem;">
                ${btnText}
            </button>
        </div>`;
}

// --- Switch ---
export function switchUiVersion(key, target) {
    if (window.switchUI) {
        window.switchUI(key, target);
    } else {
        localStorage.setItem('uiVersion', key);
        window.location.href = target;
    }
}

// --- Init ---
export function initDesignTab() {
    const designNavBtn = document.getElementById('design-tab-nav-btn');
    if (designNavBtn) designNavBtn.addEventListener('click', renderDesignCards);
}