import updateData from './update_news.json';

/**
 * UPDATE MANAGER
 * Handles the "What's New" popup logic.
 * Checks app version against local storage to determine if the user should see the changelog.
 */

export const UpdateManager = {
    currentVersion: '0.0.0', // Will be set via init
    
    init: async function (api) {
        this.api = api;
        
        try {
            // Fetch current app version from backend
            const meta = await this.api.getAppMeta();
            if (meta && meta.version) {
                this.currentVersion = meta.version;
            }
        } catch (e) {
            console.error("UpdateManager: Could not fetch app version", e);
            // Fallback if API fails (should not happen in prod)
            this.currentVersion = updateData.version || '2.0.0';
        }

        this.setupUI();
        this.checkIfUpdateIsNew();
    },

    setupUI: function () {
        const modal = document.getElementById('update-info-overlay');
        const closeBtn = document.getElementById('update-info-close-btn');
        const okBtn = document.getElementById('update-info-ok-btn');
        const footerBtn = document.getElementById('footer-update-btn');

        // Logic to close modal and save version
        const markAsSeenAndClose = () => {
            if (modal) modal.classList.remove('visible');
            localStorage.setItem('lastSeenUpdateVersion', this.currentVersion);
            
            // Remove "NEW" badge from footer button if it exists
            if (footerBtn) footerBtn.classList.remove('has-update');
        };

        if (closeBtn) closeBtn.addEventListener('click', markAsSeenAndClose);
        if (okBtn) okBtn.addEventListener('click', markAsSeenAndClose);

        // Footer button to open modal manually
        if (footerBtn) {
            footerBtn.addEventListener('click', () => {
                // Re-render to catch language changes
                this.renderChangelog();
                if (modal) modal.classList.add('visible');
            });
        }
        
        // Initial render
        this.renderChangelog();
    },

    checkIfUpdateIsNew: function () {
        const lastSeen = localStorage.getItem('lastSeenUpdateVersion');
        const footerBtn = document.getElementById('footer-update-btn');
        const modal = document.getElementById('update-info-overlay');

        if (lastSeen !== this.currentVersion) {
            // New version detected!
            if (modal) {
                // Wait a bit for app to load, then show
                setTimeout(() => modal.classList.add('visible'), 1500);
            }
            if (footerBtn) footerBtn.classList.add('has-update');
        }
    },

    renderChangelog: function() {
        const container = document.getElementById('changelog-content');
        if(!container) return;

        // Determine current language
        const lang = document.documentElement.lang || 'en';
        // Fallback to English if key missing
        const getLocalized = (obj) => obj[lang] || obj['en'] || obj['de'] || '';

        // Build HTML from JSON
        let listItems = '';
        if (updateData.changes && Array.isArray(updateData.changes)) {
            listItems = updateData.changes.map(change => {
                return `
                <li>
                    <div class="feature-title">${change.icon} ${getLocalized(change.title)}</div>
                    <div class="feature-desc">${getLocalized(change.desc)}</div>
                </li>`;
            }).join('');
        }

        const html = `
            <div class="changelog-entry">
                <ul class="changelog-list">
                    ${listItems}
                </ul>
            </div>
        `;

        container.innerHTML = html;
        
        // Update version in header and add dino image
        const titleVer = document.getElementById('update-modal-version');
        if(titleVer) titleVer.textContent = `v${this.currentVersion}`;

        // Replace rocket with dino image dynamically if not already there
        const iconContainer = document.querySelector('.rocket-icon');
        if(iconContainer) {
            // Check if we need to update image (e.g. if JSON changed image path)
            const currentImg = iconContainer.querySelector('img');
            if(!currentImg || !currentImg.src.includes(updateData.headerImage)) {
                 iconContainer.innerHTML = `<img src="${updateData.headerImage}" alt="Update Icon" style="width: 120px; height: auto; filter: drop-shadow(0 0 15px rgba(255,255,255,0.2));">`;
                 iconContainer.style.animation = 'none';
            }
        }
        
        // Update sub-text
        const subText = document.querySelector('.update-title-box p');
        if(subText) subText.textContent = getLocalized(updateData.subTitle);
    }
};
