import * as App from '../../wailsjs/go/main/App.js';

export const AppShutdown = {
    shutdown: async () => {
        try {
            await App.ShutdownApp();
        } catch (e) {
            console.error("Shutdown failed:", e);
            window.close();
        }
    }
};