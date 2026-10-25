import { useSyncExternalStore } from 'react';
import { backendKv, KvBackend } from './kv';
import { resetTabMasterCache } from '../library/tabmaster';
import { LOG_PREFIX } from '../constants';

export interface Settings {
    enabled: boolean; // master toggle
    spotlightLibrary: boolean; // active state of the Spotlight Library replacement
    libraryGridColumns: number; // poster columns in Spotlight Library grid (3-7, default 3)
    libraryCollectionColumns: number; // columns in Spotlight Library collections view (3-8, default 5)
    gameLogo: boolean; // show game logo in inspector header
    dimUninstalledGames: boolean; // dim and grayscale games in the library grid that are not installed
    tabMasterSync: boolean; // sync tab order, visibility, and custom tabs from TabMaster when installed
    pulsingBackground: boolean; // gentle breathing ambient motion on background images
    zoomTransition: boolean; // animates the banner expanding into full screen when opening a game
    libraryStatusBar: boolean; // sleek status bar with clock, battery, connection & profile avatar
    statusAvatar: boolean; // display your avatar in the status bar instead of the dot
    collectionConsoleIcons: boolean; // auto-match console icons for collection cards
    collectionArtMode: CollectionArtMode; // global default mode for collection cards ('fan' | 'custom' | 'icon')
    collectionArtFit: CollectionArtFit; // fit for custom collection artwork and console icons ('cover' | 'contain' | 'fill' | 'center')
    collectionCustomArt: Record<string, CollectionCustomArtEntry>; // per-collection customizations
    librarySort: LibrarySortMode; // sort order for games and collections in library
}

export type LibrarySortMode = 'recent' | 'alpha' | 'playtime' | 'size';
export type CollectionArtFit = 'cover' | 'contain' | 'fill' | 'center';
export type CollectionArtMode = 'fan' | 'custom' | 'icon';

export interface CollectionCustomArtEntry {
    mode?: CollectionArtMode;
    url?: string;
    fit?: CollectionArtFit;
    hasCustomFit?: boolean;
    icon?: string;
}

export const SETTINGS_KEY = 'settings';
export const LOCAL_STORAGE_KEY = 'glance_library_settings';

export const DEFAULTS: Settings = {
    enabled: true,
    spotlightLibrary: true,
    libraryGridColumns: 3,
    libraryCollectionColumns: 5,
    gameLogo: false,
    dimUninstalledGames: false,
    tabMasterSync: true,
    pulsingBackground: true,
    zoomTransition: true,
    libraryStatusBar: true,
    statusAvatar: true,
    collectionConsoleIcons: true,
    collectionArtMode: 'fan',
    collectionArtFit: 'cover',
    collectionCustomArt: {},
    librarySort: 'recent',
};

export function parseSettings(raw: Partial<Settings> | null | undefined): Settings {
    const pick = <K extends keyof Settings>(key: K): Settings[K] =>
        typeof raw?.[key] === 'boolean' ? (raw[key] as Settings[K]) : DEFAULTS[key];
    return {
        enabled: pick('enabled'),
        spotlightLibrary: pick('spotlightLibrary'),
        libraryGridColumns:
            typeof raw?.libraryGridColumns === 'number' && raw.libraryGridColumns >= 2 && raw.libraryGridColumns <= 8
                ? raw.libraryGridColumns
                : DEFAULTS.libraryGridColumns,
        libraryCollectionColumns:
            typeof raw?.libraryCollectionColumns === 'number' && raw.libraryCollectionColumns >= 2 && raw.libraryCollectionColumns <= 8
                ? raw.libraryCollectionColumns
                : DEFAULTS.libraryCollectionColumns,
        gameLogo: pick('gameLogo'),
        dimUninstalledGames: pick('dimUninstalledGames'),
        tabMasterSync: pick('tabMasterSync'),
        pulsingBackground: pick('pulsingBackground'),
        zoomTransition: pick('zoomTransition'),
        libraryStatusBar: pick('libraryStatusBar'),
        statusAvatar: pick('statusAvatar'),
        collectionConsoleIcons: pick('collectionConsoleIcons'),
        collectionArtMode:
            raw?.collectionArtMode === 'custom' || raw?.collectionArtMode === 'icon' || raw?.collectionArtMode === 'fan'
                ? raw.collectionArtMode
                : DEFAULTS.collectionArtMode,
        collectionArtFit:
            raw?.collectionArtFit === 'contain' || raw?.collectionArtFit === 'fill' || raw?.collectionArtFit === 'cover' || raw?.collectionArtFit === 'center'
                ? raw.collectionArtFit
                : DEFAULTS.collectionArtFit,
        collectionCustomArt:
            typeof raw?.collectionCustomArt === 'object' && raw?.collectionCustomArt !== null && !Array.isArray(raw?.collectionCustomArt)
                ? (raw.collectionCustomArt as Record<string, CollectionCustomArtEntry>)
                : DEFAULTS.collectionCustomArt,
        librarySort:
            raw?.librarySort === 'alpha' || raw?.librarySort === 'playtime' || raw?.librarySort === 'size' || raw?.librarySort === 'recent'
                ? raw.librarySort
                : DEFAULTS.librarySort,
    };
}

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear?(): void;
}

const memoryStorage = new Map<string, string>();

export const defaultStorage: StorageLike = {
    getItem: (key) => {
        try {
            if (typeof localStorage !== 'undefined') {
                const val = localStorage.getItem(key);
                if (val !== null) return val;
            }
        } catch {}
        return memoryStorage.get(key) ?? null;
    },
    setItem: (key, value) => {
        try {
            if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        } catch {}
        memoryStorage.set(key, value);
    },
    removeItem: (key) => {
        try {
            if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        } catch {}
        memoryStorage.delete(key);
    },
    clear: () => {
        try {
            if (typeof localStorage !== 'undefined') localStorage.clear();
        } catch {}
        memoryStorage.clear();
    },
};

export function readLocalSettings(storage: StorageLike = defaultStorage): Partial<Settings> | null {
    try {
        const raw = storage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return parsed;
        }
    } catch {
        // storage not available or parse failed
    }
    return null;
}

export function writeLocalSettings(val: Settings, storage: StorageLike = defaultStorage): void {
    try {
        storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(val));
    } catch {
        // ignore
    }
}

export function createSettingsStore(kv: KvBackend, storage: StorageLike | null | false = defaultStorage) {
    const cached = storage ? readLocalSettings(storage) : null;
    let current: Settings = cached ? parseSettings(cached) : { ...DEFAULTS };
    const listeners = new Set<() => void>();
    const emit = () => listeners.forEach((listener) => listener());

    const persist = async (next: Settings) => {
        current = next;
        if (storage) {
            writeLocalSettings(current, storage);
        }
        emit();
        try {
            await Promise.race([
                kv.set(SETTINGS_KEY, current),
                new Promise((_, reject) => setTimeout(() => reject(new Error('kv.set timeout')), 1000)),
            ]);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Failed to persist settings to backend`, error);
        }
    };

    return {
        async load(retries = 5, delayMs = 250): Promise<void> {
            for (let attempt = 0; attempt < retries; attempt++) {
                try {
                    let raw = await kv.get(SETTINGS_KEY);
                    if (typeof raw === 'string') {
                        try {
                            raw = JSON.parse(raw);
                        } catch {}
                    }
                    if (raw && typeof raw === 'object') {
                        current = parseSettings(raw as Partial<Settings>);
                        if (storage) {
                            writeLocalSettings(current, storage);
                        }
                        emit();
                        return;
                    }
                    if (raw === null && cached) {
                        // Backend has no saved record yet, but local cache exists: sync to backend
                        try {
                            await kv.set(SETTINGS_KEY, current);
                        } catch {}
                        return;
                    }
                    if (raw === null) {
                        // Backend returned null and no cached settings: use defaults
                        current = { ...DEFAULTS };
                        emit();
                        return;
                    }
                    // Non-null non-object: corrupt data, keep defaults or cached
                    current = cached ? parseSettings(cached) : { ...DEFAULTS };
                    emit();
                    return;
                } catch (error) {
                    if (attempt === retries - 1) {
                        console.warn(
                            `${LOG_PREFIX} Could not load settings from backend after ${retries} attempts, using cached/default values`,
                            error
                        );
                    } else {
                        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
                    }
                }
            }
        },
        get: (): Settings => current,
        async setEnabled(enabled: boolean): Promise<void> {
            await persist({ ...current, enabled });
        },
        async setSpotlightLibrary(spotlightLibrary: boolean): Promise<void> {
            await persist({ ...current, spotlightLibrary });
        },
        async setLibraryGridColumns(libraryGridColumns: number): Promise<void> {
            await persist({ ...current, libraryGridColumns });
        },
        async setLibraryCollectionColumns(libraryCollectionColumns: number): Promise<void> {
            await persist({ ...current, libraryCollectionColumns });
        },
        async setGameLogo(gameLogo: boolean): Promise<void> {
            await persist({ ...current, gameLogo });
        },
        async setDimUninstalledGames(dimUninstalledGames: boolean): Promise<void> {
            await persist({ ...current, dimUninstalledGames });
        },
        async setTabMasterSync(tabMasterSync: boolean): Promise<void> {
            try {
                resetTabMasterCache();
            } catch {}
            await persist({ ...current, tabMasterSync });
        },
        async setPulsingBackground(pulsingBackground: boolean): Promise<void> {
            await persist({ ...current, pulsingBackground });
        },
        async setZoomTransition(zoomTransition: boolean): Promise<void> {
            await persist({ ...current, zoomTransition });
        },
        async setLibraryStatusBar(libraryStatusBar: boolean): Promise<void> {
            await persist({ ...current, libraryStatusBar });
        },
        async setStatusAvatar(statusAvatar: boolean): Promise<void> {
            await persist({ ...current, statusAvatar });
        },
        async setCollectionConsoleIcons(collectionConsoleIcons: boolean): Promise<void> {
            await persist({ ...current, collectionConsoleIcons });
        },
        async setCollectionArtMode(collectionArtMode: CollectionArtMode): Promise<void> {
            await persist({ ...current, collectionArtMode });
        },
        async setCollectionArtFit(collectionArtFit: CollectionArtFit): Promise<void> {
            await persist({ ...current, collectionArtFit });
        },
        async setCollectionCustomArt(idOrName: string | string[], entry: CollectionCustomArtEntry): Promise<void> {
            const keys = Array.isArray(idOrName) ? idOrName : [idOrName];
            const nextMap = { ...current.collectionCustomArt };
            for (const k of keys) {
                if (k) nextMap[k] = entry;
            }
            await persist({ ...current, collectionCustomArt: nextMap });
        },
        async removeCollectionCustomArt(idOrName: string | string[]): Promise<void> {
            const keys = Array.isArray(idOrName) ? idOrName : [idOrName];
            const nextMap = { ...current.collectionCustomArt };
            for (const k of keys) {
                if (k) delete nextMap[k];
            }
            await persist({ ...current, collectionCustomArt: nextMap });
        },
        async setLibrarySort(librarySort: LibrarySortMode): Promise<void> {
            await persist({ ...current, librarySort });
        },
        subscribe(listener: () => void): () => void {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

export const settings = createSettingsStore(backendKv);

export function useSettings(): Settings {
    return useSyncExternalStore(settings.subscribe, settings.get, settings.get);
}
