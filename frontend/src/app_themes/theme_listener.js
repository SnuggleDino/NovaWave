const themeConfigs = import.meta.glob('./*/theme.json', { eager: true });
const themeStyles = import.meta.glob('./*/theme.css', { eager: true });

const sortOrder = ['midnight', 'slate', 'ocean', 'forest', 'cherry', 'electric_violet', 'gold', 'coffee', 'glacier', 'lavender'];

function getSortedThemes() {
    const themes = Object.keys(themeConfigs).map(key => {
        return themeConfigs[key].default || themeConfigs[key];
    });
    themes.sort((a, b) => {
        const indexA = sortOrder.indexOf(a.id);
        const indexB = sortOrder.indexOf(b.id);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.name.localeCompare(b.name);
    });
    return themes;
}

export const ThemeListener = {

    init: function (initialTheme) {
        const select = document.getElementById('theme-select');
        const grid = document.getElementById('theme-grid');
        const themes = getSortedThemes();

        if (select) {
            const currentVal = initialTheme || select.value || 'midnight';
            select.innerHTML = '';
            themes.forEach(theme => {
                const option = document.createElement('option');
                option.value = theme.id;
                option.textContent = theme.name;
                select.appendChild(option);
            });
            select.value = themes.find(t => t.id === currentVal) ? currentVal : 'midnight';
        }

        if (grid) {
            const activeId = (select && select.value) || initialTheme || 'midnight';
            grid.innerHTML = '';
            themes.forEach(theme => this._renderCard(grid, theme, activeId));
        }
    },

    _renderCard: function (container, theme, activeId) {
        const isActive = theme.id === activeId;
        const card = document.createElement('div');
        card.className = 'tc-card' + (isActive ? ' tc-card--active' : '');
        card.dataset.themeId = theme.id;

        const bg = theme.preview_bg || '#111';
        const accent = theme.preview_accent || '#38bdf8';

        card.innerHTML = `
            <div class="tc-preview" style="background:${bg}">
                <span class="tc-accent-dot" style="background:${accent};box-shadow:0 0 6px ${accent}80"></span>
            </div>
            <div class="tc-info">
                <span class="tc-name">${theme.name}</span>
                <button class="tc-btn${isActive ? ' tc-btn--active' : ''}" data-theme-id="${theme.id}"
                    style="${isActive ? `--tc-accent:${accent}` : ''}">
                    ${isActive ? (window.tr ? window.tr('themeActiveBtn') : '✓ Active') : (window.tr ? window.tr('themeUseBtn') : 'Use')}
                </button>
            </div>
        `;

        card.querySelector('.tc-btn').addEventListener('click', () => {
            const sel = document.getElementById('theme-select');
            if (sel && sel.disabled) return;
            this._applyTheme(theme.id, accent);
        });

        container.appendChild(card);
    },

    _applyTheme: function (themeId, accent) {
        const select = document.getElementById('theme-select');
        const grid = document.getElementById('theme-grid');

        if (select) {
            select.value = themeId;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (grid) {
            const themes = getSortedThemes();
            grid.querySelectorAll('.tc-card').forEach(card => {
                const cId = card.dataset.themeId;
                const isActive = cId === themeId;
                card.classList.toggle('tc-card--active', isActive);
                const btn = card.querySelector('.tc-btn');
                if (!btn) return;
                btn.classList.toggle('tc-btn--active', isActive);
                btn.textContent = isActive ? (window.tr ? window.tr('themeActiveBtn') : '✓ Active') : (window.tr ? window.tr('themeUseBtn') : 'Use');
                if (isActive && accent) {
                    btn.style.setProperty('--tc-accent', accent);
                } else {
                    btn.style.removeProperty('--tc-accent');
                }
            });
        }
    },

    setActiveCard: function (themeId) {
        if (!themeId) return;
        const themes = getSortedThemes();
        const theme = themes.find(t => t.id === themeId);
        this._applyTheme(themeId, theme ? theme.preview_accent : null);
    }
};
