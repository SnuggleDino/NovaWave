import updateData from './update_news.json';
import dinoImg from '../assets/Two_Loving_Cute_Dinos.png';
import { LangHandler } from '../app_language/lang_handler.js';

export const UpdateManager = {
    currentVersion: '0.0.0',

    init: async function (api) {
        this.api = api;

        try {
            const meta = await this.api.getAppMeta();
            if (meta && meta.version) {
                this.currentVersion = meta.version;
            }
        } catch (e) {
            console.error("UpdateManager: Could not fetch app version", e);
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

        const markAsSeenAndClose = () => {
            if (modal) modal.classList.remove('visible');
            localStorage.setItem('lastSeenUpdateVersion', this.currentVersion);

            if (footerBtn) footerBtn.classList.remove('has-update');
        };

        if (closeBtn) closeBtn.addEventListener('click', markAsSeenAndClose);
        if (okBtn) okBtn.addEventListener('click', markAsSeenAndClose);

        if (footerBtn) {
            footerBtn.addEventListener('click', () => {
                this.renderChangelog();
                if (modal) modal.classList.add('visible');
            });
        }

        this.renderChangelog();
    },

    checkIfUpdateIsNew: function () {
        const lastSeen = localStorage.getItem('lastSeenUpdateVersion');
        const footerBtn = document.getElementById('footer-update-btn');
        const modal = document.getElementById('update-info-overlay');

        if (lastSeen !== this.currentVersion) {
            if (modal) {
                setTimeout(() => modal.classList.add('visible'), 1500);
            }
            if (footerBtn) footerBtn.classList.add('has-update');
        }
    },

    renderChangelog: function () {
        const container = document.getElementById('changelog-content');
        if (!container) return;

        const lang = LangHandler.currentLang || 'de';
        const getLocalized = (obj) => obj[lang] || obj['en'] || obj['de'] || '';

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

        const titleVer = document.getElementById('update-modal-version');
        if (titleVer) titleVer.textContent = `v${this.currentVersion}`;

        const iconContainer = document.querySelector('.rocket-icon');
        if (iconContainer) {
            iconContainer.innerHTML = `<img src="${dinoImg}" alt="Update Icon" style="width: 120px; height: auto; filter: drop-shadow(0 0 15px rgba(255,255,255,0.2));">`;
            iconContainer.style.animation = 'none';
        }

        const subText = document.querySelector('.update-title-box p');
        if (subText) subText.textContent = getLocalized(updateData.subTitle);
    }
};
