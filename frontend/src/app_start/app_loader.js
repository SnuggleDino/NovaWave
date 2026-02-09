// DONT REMOVE THIS FILE OR EDIT IT - APP WILL BREAK IF YOU DO SO

import './loader.css';
import iconPng from '../assets/icon.png';

export const AppLoader = {
    init: function () {
        if (document.getElementById('app-loader')) return;

        const loader = document.createElement('div');
        loader.id = 'app-loader';
        loader.innerHTML = `
            <img src="${iconPng}" class="loader-logo" alt="Loading...">
            <div class="loader-progress-container">
                <div class="loader-progress-bar" id="loader-bar"></div>
            </div>
            <div class="loader-status" id="loader-status">Initializing...</div>
        `;
        document.body.prepend(loader);
    },

    update: function (percent, message) {
        const bar = document.getElementById('loader-bar');
        const status = document.getElementById('loader-status');

        if (bar) bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        if (status && message) status.textContent = message;
    },

    finish: function () {
        this.update(100, 'Starting...');
        setTimeout(() => {
            const loader = document.getElementById('app-loader');
            if (loader) {
                loader.classList.add('hidden');
                setTimeout(() => loader.remove(), 800);
            }
        }, 400);
    }
};