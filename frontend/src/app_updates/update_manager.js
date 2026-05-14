import updateData from './update_news.json';
import dinoImg from '../assets/Two_Loving_Cute_Dinos.png';
import { LangHandler } from '../app_language/lang_handler.js';

export const UpdateManager = {
    currentVersion: '0.0.0',
    _releaseUrl: null,

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

        this._setupChangelogModal();
        this._setupCheckModal();
        this.checkIfUpdateIsNew();
    },

    _setupChangelogModal: function () {
        const modal = document.getElementById('update-info-overlay');
        const closeBtn = document.getElementById('update-info-close-btn');
        const okBtn = document.getElementById('update-info-ok-btn');
        const footerBtn = document.getElementById('footer-update-btn');

        const markAsSeenAndClose = () => {
            if (modal) modal.classList.remove('visible');
            if (this.api && this.api.setSetting) {
                this.api.setSetting('lastSeenUpdateVersion', this.currentVersion);
            }
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

    checkIfUpdateIsNew: async function () {
        let lastSeen = localStorage.getItem('lastSeenUpdateVersion');

        if (this.api && this.api.getSettings) {
            try {
                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('timeout')), 3000)
                );
                const config = await Promise.race([this.api.getSettings(), timeout]);
                if (config && config.lastSeenUpdateVersion) {
                    lastSeen = config.lastSeenUpdateVersion;
                }
            } catch (e) {
                console.warn('UpdateManager: getSettings timed out or failed', e);
            }
        }

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

        container.innerHTML = `
            <div class="changelog-entry">
                <ul class="changelog-list">${listItems}</ul>
            </div>`;

        const titleVer = document.getElementById('update-modal-version');
        if (titleVer) titleVer.textContent = `v${this.currentVersion}`;

        const iconContainer = document.querySelector('.rocket-icon');
        if (iconContainer) {
            iconContainer.innerHTML = `<img src="${dinoImg}" alt="Update Icon" style="width: 120px; height: auto; filter: drop-shadow(0 0 15px rgba(255,255,255,0.2));">`;
            iconContainer.style.animation = 'none';
        }

        const subText = document.querySelector('.update-title-box p');
        if (subText) subText.textContent = getLocalized(updateData.subTitle);
    },

    _setupCheckModal: function () {
        const overlay = document.getElementById('update-check-overlay');
        const closeBtn = document.getElementById('update-check-close-btn');
        const downloadBtn = document.getElementById('uc-download-btn');
        const settingsBtn = document.getElementById('btn-check-update');
        const footerCheckBtn = document.getElementById('footer-check-update-btn');

        const currentVerEl = document.getElementById('uc-current-ver');
        if (currentVerEl) currentVerEl.textContent = `v${this.currentVersion}`;

        if (closeBtn) closeBtn.addEventListener('click', () => this.closeCheckModal());
        if (overlay) overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeCheckModal();
        });

        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                if (this._releaseUrl && this.api && this.api.openURL) {
                    this.api.openURL(this._releaseUrl);
                } else if (this._releaseUrl) {
                    window.open(this._releaseUrl, '_blank');
                }
                if (footerCheckBtn) footerCheckBtn.classList.remove('has-update');
                this.closeCheckModal();
            });
        }

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openAndCheck());
        }

        if (footerCheckBtn) {
            footerCheckBtn.addEventListener('click', () => this.openAndCheck());
        }
    },

    openAndCheck: function () {
        const overlay = document.getElementById('update-check-overlay');
        if (overlay) overlay.classList.add('visible');
        this._setStatus('checking');

        const icon = document.querySelector('#footer-check-update-btn svg');
        if (icon) icon.classList.add('spinning');
        this._runCheck().finally(() => {
            if (icon) icon.classList.remove('spinning');
        });
    },

    closeCheckModal: function () {
        const overlay = document.getElementById('update-check-overlay');
        if (overlay) overlay.classList.remove('visible');
    },

    silentCheck: async function () {
        if (!this.api || !this.api.checkForUpdate) return;
        try {
            const result = await this.api.checkForUpdate();
            if (result && result.available) {
                this._applyResult(result);
                const overlay = document.getElementById('update-check-overlay');
                if (overlay) overlay.classList.add('visible');
            }
        } catch (_) { /* silent */ }
    },

    _runCheck: async function () {
        if (!this.api || !this.api.checkForUpdate) {
            this._setStatus('error');
            return;
        }
        try {
            const raw = await this.api.checkForUpdate();
            const result = {
                available:     raw.available === true || raw.available === 'true',
                latestVersion: raw.latestVersion || raw.LatestVersion || '',
                releaseUrl:    raw.releaseUrl    || raw.ReleaseUrl    || '',
                error:         raw.error         || raw.Error         || '',
            };
            this._applyResult(result);
        } catch (_) {
            this._setStatus('error');
        }
    },

    _applyResult: function (result) {
        const latestEl = document.getElementById('uc-latest-ver');

        if (result.error) {
            this._setStatus('error');
            if (latestEl) latestEl.textContent = '—';
            return;
        }

        if (latestEl) latestEl.textContent = result.latestVersion ? `v${result.latestVersion}` : '—';
        this._releaseUrl = result.releaseUrl || null;

        const isNewer = result.available ||
            (result.latestVersion && result.latestVersion !== this.currentVersion &&
             this._semverGreater(result.latestVersion, this.currentVersion));

        const downloadBtn = document.getElementById('uc-download-btn');
        const footerCheckBtn = document.getElementById('footer-check-update-btn');
        if (isNewer) {
            this._setStatus('update');
            if (downloadBtn) {
                downloadBtn.style.display = 'flex';
                downloadBtn.disabled = false;
            }
            if (footerCheckBtn) footerCheckBtn.classList.add('has-update');
        } else {
            this._setStatus('ok');
            if (downloadBtn) downloadBtn.style.display = 'none';
            if (footerCheckBtn) footerCheckBtn.classList.remove('has-update');
        }
    },

    _semverGreater: function (a, b) {
        const clean = v => v.replace(/^[v.]+/, '');
        const parse = v => clean(v).split('.').map(n => parseInt(n, 10) || 0);
        const [a1, a2, a3] = parse(a);
        const [b1, b2, b3] = parse(b);
        if (a1 !== b1) return a1 > b1;
        if (a2 !== b2) return a2 > b2;
        return a3 > b3;
    },

    _setStatus: function (state) {
        const tr = (key) => (window.tr ? window.tr(key) : key);

        const iconEl = document.getElementById('uc-status-icon');
        const titleEl = document.getElementById('uc-status-title');
        const descEl = document.getElementById('uc-status-desc');

        const configs = {
            idle: {
                cls: 'idle',
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
                title: tr('checkUpdateLabel'),
                desc: tr('checkUpdateDesc'),
            },
            checking: {
                cls: 'checking',
                icon: `<svg class="uc-spinner" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
                title: tr('updateChecking'),
                desc: '',
            },
            ok: {
                cls: 'ok',
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
                title: tr('updateUpToDate'),
                desc: '',
            },
            update: {
                cls: 'update',
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/></svg>`,
                title: tr('updateAvailable'),
                desc: '',
            },
            error: {
                cls: 'error',
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
                title: tr('updateError'),
                desc: '',
            },
        };

        const cfg = configs[state] || configs.idle;
        if (iconEl) {
            iconEl.className = `uc-status-icon ${cfg.cls}`;
            iconEl.innerHTML = cfg.icon;
        }
        if (titleEl) titleEl.textContent = cfg.title;
        if (descEl) descEl.textContent = cfg.desc;
    },
};
