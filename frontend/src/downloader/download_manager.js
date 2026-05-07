export class DownloadManager {
    constructor(callbacks) {
        this.queue = [];
        this.activeDownloads = 0;
        this.concurrencyLimit = 2;
        this.history = [];
        this.callbacks = callbacks || {};

    }

    add(url, type, customName = "", quality = "best") {
        const id = Date.now() + Math.random().toString(36).substring(2, 11);
        const task = {
            id,
            url,
            type,
            customName,
            quality,
            status: 'pending',
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
            let result;
            if (nextTask.type === 'youtube') {
                result = await window.go.main.App.DownloadFromYouTube({
                    id: nextTask.id,
                    url: nextTask.url,
                    customName: nextTask.customName,
                    quality: nextTask.quality
                });
            } else if (nextTask.type === 'spotify') {
                result = await window.go.main.App.DownloadFromSpotify(nextTask.id, nextTask.url, nextTask.quality);
            }

            if (result && result.success) {
                nextTask.status = 'success';
                nextTask.finishedAt = new Date();
                if (this.callbacks.onLog) {
                    this.callbacks.onLog('logDownloadComplete', 'success', nextTask.url);
                }
            } else {
                throw new Error(result ? result.error : 'Unknown error');
            }
        } catch (err) {
            nextTask.status = 'error';
            nextTask.finishedAt = new Date();
            nextTask.error = err.message || err;
            if (this.callbacks.onLog) {
                this.callbacks.onLog('logDownloadFailed', 'error', nextTask.error);
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