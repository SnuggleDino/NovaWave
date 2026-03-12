export const PlaylistManager = {
    items: [],
    favOnly: false,
    currentSortMode: 'name',

    // FIX: Reusable compare function — avoids duplicating the same sort logic
    // across sortItems(), _sortList(), and getAllTracks().
    _buildCompare(mode) {
        return (a, b) => {
            if (mode === 'name')     return a.data.title.localeCompare(b.data.title, undefined, { numeric: true });
            if (mode === 'nameDesc') return b.data.title.localeCompare(a.data.title, undefined, { numeric: true });
            if (mode === 'newest')   return (b.data.mtime || 0) - (a.data.mtime || 0);
            return 0;
        };
    },

    init() {
        this.items = [];
        this.favOnly = false;
        this.currentSortMode = 'name';
    },

    loadTracks(tracks) {
        this.items = tracks.map(t => ({
            type: 'track',
            id: t.path,
            data: t,
            groupId: null,
            searchString: (t.title + ' ' + (t.artist || '')).toLowerCase()
        }));
    },

    appendTracks(tracks) {
        const existingIds = new Set(this.items.filter(i => i.type === 'track').map(i => i.id));
        tracks.forEach(t => {
            if (!existingIds.has(t.path)) {
                this.items.push({
                    type: 'track',
                    id: t.path,
                    data: t,
                    groupId: null,
                    searchString: (t.title + ' ' + (t.artist || '')).toLowerCase()
                });
            }
        });
    },

    toggleFavOnly() {
        this.favOnly = !this.favOnly;
    },

    getUniqueName(name, excludeId = null) {
        let uniqueName = name;
        let counter = 1;

        const exists = (n) => this.items.some(
            i => i.type === 'folder' &&
                 i.name.toLowerCase() === n.toLowerCase() &&
                 i.id !== excludeId
        );

        while (exists(uniqueName)) {
            uniqueName = `${name} (${counter})`;
            counter++;
        }
        return uniqueName;
    },

    addFolder(name, color = null) {
        const uniqueName = this.getUniqueName(name);
        const folderId = 'folder-' + Date.now();
        const folder = {
            type: 'folder',
            id: folderId,
            name: uniqueName,
            color: color || '#38bdf8',
            collapsed: false
        };
        this.items.push(folder);
        return folder;
    },

    deleteFolder(folderId) {
        // Ungroup all tracks that belonged to this folder
        this.items.forEach(item => {
            if (item.type === 'track' && item.groupId === folderId) {
                item.groupId = null;
            }
        });
        this.items = this.items.filter(i => i.id !== folderId);
    },

    renameFolder(folderId, newName, newColor = null) {
        const folder = this.items.find(i => i.id === folderId);
        if (folder) {
            folder.name = this.getUniqueName(newName, folderId);
            if (newColor) folder.color = newColor;
        }
    },

    toggleFolder(folderId) {
        const folder = this.items.find(i => i.id === folderId);
        if (folder) folder.collapsed = !folder.collapsed;
    },

    // FIX: Previously sorted only a filtered local copy, leaving this.items
    // untouched. The sort therefore had no persistent effect — only _sortList()
    // calls inside getRenderList() and getAllTracks() were actually doing work.
    // Now sortItems() mutates this.items directly so the order is consistent
    // everywhere (e.g. moveItem(), exportStructure(), iterators in main.js).
    sortItems(mode) {
        this.currentSortMode = mode;

        const compare = this._buildCompare(mode);

        // Sort tracks within each group independently, then rebuild items:
        // folders keep their relative order; their child tracks are sorted,
        // as are the root-level (ungrouped) tracks.
        const folders   = this.items.filter(i => i.type === 'folder');
        const rootTracks = this.items.filter(i => i.type === 'track' && !i.groupId);
        rootTracks.sort(compare);

        const newItems = [];
        folders.forEach(folder => {
            newItems.push(folder);
            const children = this.items.filter(i => i.type === 'track' && i.groupId === folder.id);
            children.sort(compare);
            newItems.push(...children);
        });
        newItems.push(...rootTracks);

        this.items = newItems;
    },

    getRenderList(filterText = '', favoritesSet = null) {
        const activeFilter = filterText.trim().toLowerCase();

        if (favoritesSet) {
            return this.items.filter(i => {
                if (i.type !== 'track') return false;
                const path = i.id.replace(/\\/g, '/');
                const isMatch = activeFilter.length === 0 || i.searchString.includes(activeFilter);
                return isMatch && favoritesSet.has(path);
            });
        }

        if (activeFilter.length > 0) {
            return this.items.filter(i => i.type === 'track' && i.searchString.includes(activeFilter));
        }

        // No filter — return the full structured list (folders + their children
        // + root tracks). Because sortItems() now keeps this.items sorted, we
        // no longer need to re-sort here on every render call.
        const renderList = [];
        const folders = this.items.filter(i => i.type === 'folder');
        const rootTracks = this.items.filter(i => i.type === 'track' && !i.groupId);

        folders.forEach(folder => {
            renderList.push(folder);
            if (!folder.collapsed) {
                const children = this.items.filter(i => i.type === 'track' && i.groupId === folder.id);
                renderList.push(...children);
            }
        });

        renderList.push(...rootTracks);
        return renderList;
    },

    // Internal helper — sorts a list in-place. Still used by getAllTracks()
    // for cases where items may arrive unsorted (e.g. after importStructure).
    _sortList(list, mode) {
        list.sort(this._buildCompare(mode));
    },

    moveItemToFolder(trackId, folderId) {
        const item   = this.items.find(i => i.type === 'track'  && i.id === trackId);
        const folder = this.items.find(i => i.type === 'folder' && i.id === folderId);

        if (item && folder) {
            item.groupId = folderId;
            folder.collapsed = false;
        }
    },

    moveItem(fromIndex, toIndex) {
        if (
            fromIndex < 0 || fromIndex >= this.items.length ||
            toIndex   < 0 || toIndex   >= this.items.length
        ) return;
        const item = this.items.splice(fromIndex, 1)[0];
        this.items.splice(toIndex, 0, item);
    },

    getAllTracks() {
        const allTracks = this.items.filter(i => i.type === 'track');
        this._sortList(allTracks, this.currentSortMode || 'name');
        return allTracks.map(i => i.data);
    },

    getFolderCount() {
        return this.items.filter(i => i.type === 'folder').length;
    },

    exportStructure() {
        return this.items.map(item => {
            if (item.type === 'folder') {
                return {
                    type: 'folder',
                    id: item.id,
                    name: item.name,
                    color: item.color,
                    collapsed: item.collapsed
                };
            } else {
                return {
                    type: 'track',
                    id: item.id,
                    groupId: item.groupId
                };
            }
        });
    },

    importStructure(savedItems, availableTracks) {
        if (!savedItems || !Array.isArray(savedItems)) {
            this.loadTracks(availableTracks);
            return;
        }

        const newItems = [];
        const trackMap = new Map(availableTracks.map(t => [t.path, t]));
        const usedTrackIds = new Set();

        savedItems.forEach(savedItem => {
            if (savedItem.type === 'folder') {
                newItems.push({
                    type: 'folder',
                    id: savedItem.id,
                    name: savedItem.name,
                    color: savedItem.color || '#38bdf8',
                    collapsed: savedItem.collapsed || false
                });
            } else if (savedItem.type === 'track') {
                const trackData = trackMap.get(savedItem.id);
                if (trackData) {
                    newItems.push({
                        type: 'track',
                        id: trackData.path,
                        data: trackData,
                        groupId: savedItem.groupId || null,
                        searchString: (trackData.title + ' ' + (trackData.artist || '')).toLowerCase()
                    });
                    usedTrackIds.add(trackData.path);
                }
            }
        });

        availableTracks.forEach(t => {
            if (!usedTrackIds.has(t.path)) {
                newItems.push({
                    type: 'track',
                    id: t.path,
                    data: t,
                    groupId: null,
                    searchString: (t.title + ' ' + (t.artist || '')).toLowerCase()
                });
            }
        });

        this.items = newItems;
    }
};