/**
 * Playlist Manager
 * Handles the logic for Virtual Folders and mixed content (Tracks/Folders).
 * Uses a Group-ID system: Tracks belong to a folder via 'groupId'.
 */

export const PlaylistManager = {
    items: [],
    // Mixed array of Tracks and Folders
    // Track Structure: { type: 'track', id: path, data: trackObj, groupId: string|null, searchString: string }
    // Folder Structure: { type: 'folder', id: string, name: string, collapsed: bool }

    init() {
        this.items = [];
    },

    /**
     * Loads a raw list of tracks. Resets current structure.
     * All tracks start in the Root (groupId: null).
     */
    loadTracks(tracks) {
        this.items = tracks.map(t => ({
            type: 'track',
            id: t.path,
            data: t,
            groupId: null,
            searchString: (t.title + ' ' + (t.artist || '')).toLowerCase()
        }));
    },

    /**
     * Helper to ensure unique folder names.
     */
    getUniqueName(name, excludeId = null) {
        let uniqueName = name;
        let counter = 1;

        const exists = (n) => this.items.some(i => i.type === 'folder' && i.name.toLowerCase() === n.toLowerCase() && i.id !== excludeId);

        while (exists(uniqueName)) {
            uniqueName = `${name} (${counter})`;
            counter++;
        }
        return uniqueName;
    },

    /**
     * Adds a new virtual folder.
     */
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

    /**
     * Delete a folder.
     * Tracks inside the folder are moved back to Root (groupId: null).
     */
    deleteFolder(folderId) {
        // 1. Reset Group ID for children
        this.items.forEach(item => {
            if (item.type === 'track' && item.groupId === folderId) {
                item.groupId = null;
            }
        });

        // 2. Remove the folder item itself
        const initialLength = this.items.length;
        this.items = this.items.filter(i => i.id !== folderId);

        // Safety check (optional debug)
        if (this.items.length !== initialLength - 1) {
            console.warn("PlaylistManager: Delete folder count mismatch", initialLength, this.items.length);
        }
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

    sortItems(mode) {
        const compare = (a, b) => {
            if (mode === 'name') return a.data.title.localeCompare(b.data.title, undefined, { numeric: true });
            if (mode === 'nameDesc') return b.data.title.localeCompare(a.data.title, undefined, { numeric: true });
            if (mode === 'newest') return (b.data.mtime || 0) - (a.data.mtime || 0);
            return 0;
        };

        const folders = this.items.filter(i => i.type === 'folder');
        const tracks = this.items.filter(i => i.type === 'track');

        tracks.sort(compare);

        this.currentSortMode = mode;
    },

    /**
     * Generates the flat list for the Virtual Scroll View.
     * Structure:
     * 1. Folders
     * 2. Root Tracks
     */
    getRenderList(filterText = '') {
        let activeFilter = filterText.trim().toLowerCase();

        // 1. Filter Logic
        let filteredItems = this.items;
        if (activeFilter.length > 0) {
            return this.items.filter(i => i.type === 'track' && i.searchString.includes(activeFilter));
        }

        // 2. Grouping Logic
        const folders = this.items.filter(i => i.type === 'folder');
        const rootTracks = this.items.filter(i => i.type === 'track' && !i.groupId);

        // Sort Root Tracks
        if (this.currentSortMode) this._sortList(rootTracks, this.currentSortMode);

        const renderList = [];

        // A) Add Folders and their children
        folders.forEach(folder => {
            renderList.push(folder);
            if (!folder.collapsed) {
                // Find children
                const children = this.items.filter(i => i.type === 'track' && i.groupId === folder.id);
                // Sort children
                if (this.currentSortMode) this._sortList(children, this.currentSortMode);
                renderList.push(...children);
            }
        });

        // B) Add Root Tracks
        renderList.push(...rootTracks);

        return renderList;
    },

    _sortList(list, mode) {
        list.sort((a, b) => {
            if (mode === 'name') return a.data.title.localeCompare(b.data.title, undefined, { numeric: true });
            if (mode === 'nameDesc') return b.data.title.localeCompare(a.data.title, undefined, { numeric: true });
            if (mode === 'newest') return (b.data.mtime || 0) - (a.data.mtime || 0);
            return 0;
        });
    },

    /**
     * Moves a track into a folder.
     */
    moveItemToFolder(trackId, folderId) {
        const item = this.items.find(i => i.type === 'track' && i.id === trackId);
        const folder = this.items.find(i => i.type === 'folder' && i.id === folderId);

        if (item && folder) {
            item.groupId = folderId;
            folder.collapsed = false;
        }
    },

    moveItem(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.items.length || toIndex < 0 || toIndex >= this.items.length) return;
        const item = this.items.splice(fromIndex, 1)[0];
        this.items.splice(toIndex, 0, item);
    },

    /**
     * Get all tracks (for player navigation: next/prev ignoring folders)
     */
    getAllTracks() {
        const allTracks = this.items.filter(i => i.type === 'track');
        this._sortList(allTracks, this.currentSortMode || 'name');
        return allTracks.map(i => i.data);
    },

    // Debug helper
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
                    id: item.id, // path
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
                    groupId: null, // Root
                    searchString: (t.title + ' ' + (t.artist || '')).toLowerCase()
                });
            }
        });

        this.items = newItems;
    }
};
