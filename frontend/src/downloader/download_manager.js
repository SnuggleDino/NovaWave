export class DownloadManager {
    constructor(callbacks) {
        this.queue = [];
        this.activeDownloads = 0;
        this.concurrencyLimit = 2;
        this.history = [];
        this.callbacks = callbacks || {};
        // callbacks: { onStatsUpdate: (stats) => void, onLog: (msg, type) => void }
    }

    add(url, type) {
        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        const task = {
            id,
            url,
            type,
            status: 'pending', // pending, processing, success, error
            addedAt: new Date()
        };

        this.queue.push(task);
        this._notifyStats();
        this._processQueue();

        return id;
    }

    async _processQueue() {
        if (this.activeDownloads >= this.concurrencyLimit) return;

        const nextTask = this.queue.find(t => t.status === 'pending');
        if (!nextTask) return;

        nextTask.status = 'processing';
        this.activeDownloads++;
        this._notifyStats();

        if (this.callbacks.onLog) {
            this.callbacks.onLog('logStartingDownload', 'info', nextTask.url);
        }

        try {
            if (nextTask.type === 'youtube') {
                await window.go.main.App.DownloadFromYouTube(nextTask.url);
            } else if (nextTask.type === 'spotify') {
                await window.go.main.App.DownloadFromSpotify(nextTask.url);
            }

            nextTask.status = 'success';
            if (this.callbacks.onLog) {
                this.callbacks.onLog('logDownloadComplete', 'success', nextTask.url);
            }
        } catch (err) {
            nextTask.status = 'error';
            nextTask.error = err;
            if (this.callbacks.onLog) {
                this.callbacks.onLog('logDownloadFailed', 'error', err);
            }
        } finally {
            this.activeDownloads--;
            this.history.push(nextTask);
            this.queue = this.queue.filter(t => t.id !== nextTask.id);

            this._notifyStats();
            this._processQueue();
        }
    }

    getAllItems() {
        return {
            queue: [...this.queue],
            history: [...this.history]
        };
    }

    getStats() {

        const pending = this.queue.filter(t => t.status === 'pending').length;
        const processing = this.activeDownloads;
        const success = this.history.filter(t => t.status === 'success').length;
        const failed = this.history.filter(t => t.status === 'error').length;

        return { pending, processing, success, failed };
    }

    _notifyStats() {
        if (this.callbacks.onStatsUpdate) {
            this.callbacks.onStatsUpdate(this.getStats());
        }
    }
}
