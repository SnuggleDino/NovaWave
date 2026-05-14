export namespace main {
	
	export class AppMeta {
	    version: string;
	    buildDate: string;
	    author: string;
	    goVersion: string;
	    githubUser: string;
	    repoLink: string;
	
	    static createFrom(source: any = {}) {
	        return new AppMeta(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.buildDate = source["buildDate"];
	        this.author = source["author"];
	        this.goVersion = source["goVersion"];
	        this.githubUser = source["githubUser"];
	        this.repoLink = source["repoLink"];
	    }
	}
	export class Config {
	    theme: string;
	    volume: number;
	    downloadFolder: string;
	    language: string;
	    coverMode: string;
	    customCoverEmoji: string;
	    bassGain: number;
	    bassBoostEnabled: boolean;
	    bassBoostValue: number;
	    trebleBoostEnabled: boolean;
	    trebleBoostValue: number;
	    reverbEnabled: boolean;
	    reverbValue: number;
	    animationMode: string;
	    visualizerEnabled: boolean;
	    visualizerStyle: string;
	    visSensitivity: number;
	    autoLoadLastFolder: boolean;
	    currentFolderPath: string;
	    enableFocusMode: boolean;
	    enableDragAndDrop: boolean;
	    useCustomColor: boolean;
	    customAccentColor: string;
	    sortMode: string;
	    targetFps: number;
	    performanceMode: boolean;
	    showStatsOverlay: boolean;
	    cinemaMode: boolean;
	    playbackSpeed: number;
	    favorites: string[];
	    enableFavoritesPlaylist: boolean;
	    miniMode: boolean;
	    audioQuality: string;
	    deleteSongsEnabled: boolean;
	    loop: string;
	    shuffle: boolean;
	    snuggleTimeEnabled: boolean;
	    sleepTimeEnabled: boolean;
	    cyberpunkEnabled: boolean;
	    playlistPosition: string;
	    playlistHidden: boolean;
	    gradientTitleEnabled: boolean;
	    activeIntro: string;
	    sunsetEnabled: boolean;
	    sakuraEnabled: boolean;
	    novaWave95Enabled: boolean;
	    playlistStructure: any[];
	    eqEnabled: boolean;
	    eqValues: number[];
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme = source["theme"];
	        this.volume = source["volume"];
	        this.downloadFolder = source["downloadFolder"];
	        this.language = source["language"];
	        this.coverMode = source["coverMode"];
	        this.customCoverEmoji = source["customCoverEmoji"];
	        this.bassGain = source["bassGain"];
	        this.bassBoostEnabled = source["bassBoostEnabled"];
	        this.bassBoostValue = source["bassBoostValue"];
	        this.trebleBoostEnabled = source["trebleBoostEnabled"];
	        this.trebleBoostValue = source["trebleBoostValue"];
	        this.reverbEnabled = source["reverbEnabled"];
	        this.reverbValue = source["reverbValue"];
	        this.animationMode = source["animationMode"];
	        this.visualizerEnabled = source["visualizerEnabled"];
	        this.visualizerStyle = source["visualizerStyle"];
	        this.visSensitivity = source["visSensitivity"];
	        this.autoLoadLastFolder = source["autoLoadLastFolder"];
	        this.currentFolderPath = source["currentFolderPath"];
	        this.enableFocusMode = source["enableFocusMode"];
	        this.enableDragAndDrop = source["enableDragAndDrop"];
	        this.useCustomColor = source["useCustomColor"];
	        this.customAccentColor = source["customAccentColor"];
	        this.sortMode = source["sortMode"];
	        this.targetFps = source["targetFps"];
	        this.performanceMode = source["performanceMode"];
	        this.showStatsOverlay = source["showStatsOverlay"];
	        this.cinemaMode = source["cinemaMode"];
	        this.playbackSpeed = source["playbackSpeed"];
	        this.favorites = source["favorites"];
	        this.enableFavoritesPlaylist = source["enableFavoritesPlaylist"];
	        this.miniMode = source["miniMode"];
	        this.audioQuality = source["audioQuality"];
	        this.deleteSongsEnabled = source["deleteSongsEnabled"];
	        this.loop = source["loop"];
	        this.shuffle = source["shuffle"];
	        this.snuggleTimeEnabled = source["snuggleTimeEnabled"];
	        this.sleepTimeEnabled = source["sleepTimeEnabled"];
	        this.cyberpunkEnabled = source["cyberpunkEnabled"];
	        this.playlistPosition = source["playlistPosition"];
	        this.playlistHidden = source["playlistHidden"];
	        this.gradientTitleEnabled = source["gradientTitleEnabled"];
	        this.activeIntro = source["activeIntro"];
	        this.sunsetEnabled = source["sunsetEnabled"];
	        this.sakuraEnabled = source["sakuraEnabled"];
	        this.novaWave95Enabled = source["novaWave95Enabled"];
	        this.playlistStructure = source["playlistStructure"];
	        this.eqEnabled = source["eqEnabled"];
	        this.eqValues = source["eqValues"];
	    }
	}
	export class DownloadOptions {
	    id: string;
	    url: string;
	    customName: string;
	    quality: string;
	
	    static createFrom(source: any = {}) {
	        return new DownloadOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.url = source["url"];
	        this.customName = source["customName"];
	        this.quality = source["quality"];
	    }
	}
	export class Track {
	    path: string;
	    title: string;
	    artist: string;
	    duration: number;
	    mtime: number;
	
	    static createFrom(source: any = {}) {
	        return new Track(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.title = source["title"];
	        this.artist = source["artist"];
	        this.duration = source["duration"];
	        this.mtime = source["mtime"];
	    }
	}
	export class FolderResult {
	    tracks: Track[];
	    folderPath: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new FolderResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tracks = this.convertValues(source["tracks"], Track);
	        this.folderPath = source["folderPath"];
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SimpleResult {
	    success: boolean;
	    error?: string;
	    newPath?: string;
	
	    static createFrom(source: any = {}) {
	        return new SimpleResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.error = source["error"];
	        this.newPath = source["newPath"];
	    }
	}
	
	export class UpdateResult {
	    available: boolean;
	    latestVersion: string;
	    releaseUrl: string;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.available = source["available"];
	        this.latestVersion = source["latestVersion"];
	        this.releaseUrl = source["releaseUrl"];
	        this.error = source["error"];
	    }
	}

}

