import { useSyncExternalStore } from 'react';
import { backendKv, KvBackend } from './kv';
import { resetTabMasterCache } from '../library/tabmaster';

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
}

const KEY = 'settings';
const DEFAULTS: Settings = {
    enabled: true,
    spotlightLibrary: true,
    libraryGridColumns: 3,
    libraryCollectionColumns: 5,
    gameLogo: false,
    dimUninstalledGames: false,
    tabMasterSync: true,
    pulsingBackground: true,
    zoomTransition: true,
};

export function createSettingsStore(kv: KvBackend) {
    let current: Settings = { ...DEFAULTS };
    const listeners = new Set<() => void>();
    const emit = () => listeners.forEach((listener) => listener());
    return {
        async load(): Promise<void> {
            const raw = (await kv.get(KEY)) as Partial<Settings> | null;
            const pick = <K extends keyof Settings>(key: K): Settings[K] =>
                typeof raw?.[key] === 'boolean' ? (raw[key] as Settings[K]) : DEFAULTS[key];
            current = {
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
            };
            emit();
        },
        get: (): Settings => current,
        async setEnabled(enabled: boolean): Promise<void> {
            current = { ...current, enabled };
            emit();
            await kv.set(KEY, current);
        },
        async setSpotlightLibrary(spotlightLibrary: boolean): Promise<void> {
            current = { ...current, spotlightLibrary };
            emit();
            await kv.set(KEY, current);
        },
        async setLibraryGridColumns(libraryGridColumns: number): Promise<void> {
            current = { ...current, libraryGridColumns };
            emit();
            await kv.set(KEY, current);
        },
        async setLibraryCollectionColumns(libraryCollectionColumns: number): Promise<void> {
            current = { ...current, libraryCollectionColumns };
            emit();
            await kv.set(KEY, current);
        },
        async setGameLogo(gameLogo: boolean): Promise<void> {
            current = { ...current, gameLogo };
            emit();
            await kv.set(KEY, current);
        },
        async setDimUninstalledGames(dimUninstalledGames: boolean): Promise<void> {
            current = { ...current, dimUninstalledGames };
            emit();
            await kv.set(KEY, current);
        },
        async setTabMasterSync(tabMasterSync: boolean): Promise<void> {
            try {
                resetTabMasterCache();
            } catch {}
            current = { ...current, tabMasterSync };
            emit();
            await kv.set(KEY, current);
        },
        async setPulsingBackground(pulsingBackground: boolean): Promise<void> {
            current = { ...current, pulsingBackground };
            emit();
            await kv.set(KEY, current);
        },
        async setZoomTransition(zoomTransition: boolean): Promise<void> {
            current = { ...current, zoomTransition };
            emit();
            await kv.set(KEY, current);
        },
        subscribe(listener: () => void): () => void {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

export const settings = createSettingsStore(backendKv);

export function useSettings(): Settings {
    return useSyncExternalStore(settings.subscribe, settings.get);
}
