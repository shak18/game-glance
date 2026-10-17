import { useSyncExternalStore } from 'react';
import { RECENT_ROW, RowSort, rowSortOf } from '../home/collections';
import { RowStyle, rowStyleOf } from '../home/recentsLayout';
import { backendKv, KvBackend } from './kv';
import { resetTabMasterCache } from '../library/tabmaster';
import { readScreensaverOptions, SCREENSAVER_DEFAULTS, ScreensaverOptions } from '../screensaver/options';

export interface Settings {
    enabled: boolean;
    autoPreload: boolean; // pre-load game data for installed games in the background
    spotlightHome: boolean; // replace Steam's Home screen with Spotlight Home
    spotlightLibrary: boolean; // replace Steam's Library screen with Spotlight Library
    libraryGridColumns: number; // poster columns in Spotlight Library grid (3-7, default 3)
    libraryCollectionColumns: number; // columns in Spotlight Library collections view (3-8, default 5)
    wishlistDeals: boolean; // look up wishlist sales on Steam's public store
    cleanPage: boolean; // the Game Glance page's Clean look: one row at the bottom, no description or HowLongToBeat cards
    zoomTransition: boolean; // animates the banner expanding into full screen when opening a game
    dimUninstalledGames: boolean; // dim and grayscale games in the library grid that are not installed
    homeStatusBar: boolean; // Spotlight Home's status bar: clock, battery and connection in Steam's top strip
    statusAvatar: boolean; // your avatar, round and ringed in your status colour, in the status bar instead of the dot
    gameLogo: boolean; // the game's logo instead of its name on Home and the game page (the name when it has none)
    homeRow: string; // Home's games row: 'recent' (Steam's recent games, with those new to the library) or a collection id
    homeRowSort: RowSort; // how a collection's games are sorted in the row
    homeRowStyle: RowStyle; // how the row moves: 'steam' (Steam's Home: the first game wide) or 'spotlight' (the selected game wide, at the left)
    homeWhatsNew: boolean; // Spotlight Home feed: What's New tab
    homeFriends: boolean; // Spotlight Home feed: Friends tab
    homeRecommended: boolean; // Spotlight Home feed: Recommended tab
    homeCollections: boolean; // Spotlight Home feed: Collections tab
    tabMasterSync: boolean; // sync tab order, visibility, and custom tabs from TabMaster when installed
    pulsingBackground: boolean; // gentle breathing ambient motion on background images
    screensaver: ScreensaverOptions; // Steam's screensaver drawn by Game Glance (screensaver/options)
}

const KEY = 'settings';
const DEFAULTS: Settings = {
    enabled: true,
    autoPreload: true,
    spotlightHome: false,
    spotlightLibrary: false,
    libraryGridColumns: 3,
    libraryCollectionColumns: 5,
    wishlistDeals: false,
    cleanPage: false,
    zoomTransition: true,
    dimUninstalledGames: false,
    homeStatusBar: true,
    statusAvatar: false,
    gameLogo: false,
    homeRow: RECENT_ROW,
    homeRowSort: 'lastPlayed',
    homeRowStyle: 'steam',
    homeWhatsNew: true,
    homeFriends: true,
    homeRecommended: true,
    homeCollections: true,
    tabMasterSync: true,
    pulsingBackground: true,
    screensaver: SCREENSAVER_DEFAULTS,
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
                autoPreload: pick('autoPreload'),
                spotlightHome: pick('spotlightHome'),
                spotlightLibrary: pick('spotlightLibrary'),
                libraryGridColumns:
                    typeof raw?.libraryGridColumns === 'number' && raw.libraryGridColumns >= 2 && raw.libraryGridColumns <= 8
                        ? raw.libraryGridColumns
                        : DEFAULTS.libraryGridColumns,
                libraryCollectionColumns:
                    typeof raw?.libraryCollectionColumns === 'number' && raw.libraryCollectionColumns >= 2 && raw.libraryCollectionColumns <= 8
                        ? raw.libraryCollectionColumns
                        : DEFAULTS.libraryCollectionColumns,
                wishlistDeals: pick('wishlistDeals'),
                cleanPage: pick('cleanPage'),
                zoomTransition: pick('zoomTransition'),
                dimUninstalledGames: pick('dimUninstalledGames'),
                homeStatusBar: pick('homeStatusBar'),
                statusAvatar: pick('statusAvatar'),
                gameLogo: pick('gameLogo'),
                homeRow: typeof raw?.homeRow === 'string' && raw.homeRow !== '' ? raw.homeRow : DEFAULTS.homeRow,
                homeRowSort: rowSortOf(raw?.homeRowSort),
                homeRowStyle: rowStyleOf(raw?.homeRowStyle),
                homeWhatsNew: pick('homeWhatsNew'),
                homeFriends: pick('homeFriends'),
                homeRecommended: pick('homeRecommended'),
                homeCollections: pick('homeCollections'),
                tabMasterSync: pick('tabMasterSync'),
                pulsingBackground: pick('pulsingBackground'),
                screensaver: readScreensaverOptions(raw?.screensaver),
            };
            emit();
        },
        get: (): Settings => current,
        async setEnabled(enabled: boolean): Promise<void> {
            current = { ...current, enabled };
            emit();
            await kv.set(KEY, current);
        },
        async setStatusAvatar(statusAvatar: boolean): Promise<void> {
            current = { ...current, statusAvatar };
            emit();
            await kv.set(KEY, current);
        },
        async setAutoPreload(autoPreload: boolean): Promise<void> {
            current = { ...current, autoPreload };
            emit();
            await kv.set(KEY, current);
        },
        async setSpotlightHome(spotlightHome: boolean): Promise<void> {
            current = { ...current, spotlightHome };
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
        async setWishlistDeals(wishlistDeals: boolean): Promise<void> {
            current = { ...current, wishlistDeals };
            emit();
            await kv.set(KEY, current);
        },
        async setHomeRow(homeRow: string): Promise<void> {
            current = { ...current, homeRow };
            emit();
            await kv.set(KEY, current);
        },
        async setHomeRowSort(homeRowSort: RowSort): Promise<void> {
            current = { ...current, homeRowSort };
            emit();
            await kv.set(KEY, current);
        },
        async setHomeRowStyle(homeRowStyle: RowStyle): Promise<void> {
            current = { ...current, homeRowStyle };
            emit();
            await kv.set(KEY, current);
        },
        async setCleanPage(cleanPage: boolean): Promise<void> {
            current = { ...current, cleanPage };
            emit();
            await kv.set(KEY, current);
        },
        async setZoomTransition(zoomTransition: boolean): Promise<void> {
            current = { ...current, zoomTransition };
            emit();
            await kv.set(KEY, current);
        },
        async setDimUninstalledGames(dimUninstalledGames: boolean): Promise<void> {
            current = { ...current, dimUninstalledGames };
            emit();
            await kv.set(KEY, current);
        },
        async setHomeStatusBar(homeStatusBar: boolean): Promise<void> {
            current = { ...current, homeStatusBar };
            emit();
            await kv.set(KEY, current);
        },
        async setGameLogo(gameLogo: boolean): Promise<void> {
            current = { ...current, gameLogo };
            emit();
            await kv.set(KEY, current);
        },
        async setHomeWhatsNew(homeWhatsNew: boolean): Promise<void> {
            current = { ...current, homeWhatsNew };
            emit();
            await kv.set(KEY, current);
        },
        async setHomeFriends(homeFriends: boolean): Promise<void> {
            current = { ...current, homeFriends };
            emit();
            await kv.set(KEY, current);
        },
        async setHomeRecommended(homeRecommended: boolean): Promise<void> {
            current = { ...current, homeRecommended };
            emit();
            await kv.set(KEY, current);
        },
        async setHomeCollections(homeCollections: boolean): Promise<void> {
            current = { ...current, homeCollections };
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
        /** One or more screensaver options. */
        async setScreensaver(change: Partial<ScreensaverOptions>): Promise<void> {
            current = { ...current, screensaver: { ...current.screensaver, ...change } };
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
