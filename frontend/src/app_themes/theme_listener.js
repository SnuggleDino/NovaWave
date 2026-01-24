/**
 * THEME LISTENER
 * Handles automatic detection and management of basic app themes via Vite glob imports.
 */

// Detect theme configurations
const themeConfigs = import.meta.glob('./*/theme.json', { eager: true });

// Eagerly load all theme CSS files
const themeStyles = import.meta.glob('./*/theme.css', { eager: true });

export const ThemeListener = {

    init: function () {
        const select = document.getElementById('theme-select');
        if (!select) return;

        // Save current selection if valid
        const currentVal = select.value;

        // Clear existing options
        select.innerHTML = '';

        // Extract themes from glob results
        const themes = Object.keys(themeConfigs).map(key => {
            return themeConfigs[key].default || themeConfigs[key];
        });

        // Define sort order
        const sortOrder = ['midnight', 'slate', 'ocean', 'forest', 'cherry', 'electric_violet', 'gold', 'coffee', 'glacier', 'lavender'];

        themes.sort((a, b) => {
            const indexA = sortOrder.indexOf(a.id);
            const indexB = sortOrder.indexOf(b.id);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.name.localeCompare(b.name);
        });

        // Populate Select
        themes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.id;
            option.textContent = theme.name;
            select.appendChild(option);
        });

        const exists = themes.find(t => t.id === currentVal);
        if (exists) {
            select.value = currentVal;
        } else {
            select.value = 'midnight';
        }
    }
};
