const themeConfigs = import.meta.glob('./*/theme.json', { eager: true });
const themeStyles = import.meta.glob('./*/theme.css', { eager: true });

export const ThemeListener = {

    init: function () {
        const select = document.getElementById('theme-select');
        if (!select) return;

        const currentVal = select.value;

        select.innerHTML = '';

        const themes = Object.keys(themeConfigs).map(key => {
            return themeConfigs[key].default || themeConfigs[key];
        });

        const sortOrder = ['midnight', 'slate', 'ocean', 'forest', 'cherry', 'electric_violet', 'gold', 'coffee', 'glacier', 'lavender'];

        themes.sort((a, b) => {
            const indexA = sortOrder.indexOf(a.id);
            const indexB = sortOrder.indexOf(b.id);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.name.localeCompare(b.name);
        });

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
