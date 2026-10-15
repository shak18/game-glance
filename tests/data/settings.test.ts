import { describe, expect, it, vi } from 'vitest';
import { memoryKv } from '../../src/data/kv';
import { createSettingsStore } from '../../src/data/settings';

describe('settings', () => {
    it('defaults to enabled and persists changes', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({ enabled: true, autoPreload: true, spotlightHome: false, spotlightLibrary: false, libraryGridColumns: 3, libraryCollectionColumns: 5, wishlistDeals: false, cleanPage: false, zoomTransition: true, dimUninstalledGames: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeWhatsNew: true, homeFriends: true, homeRecommended: true, homeCollections: true, tabMasterSync: true });
        const listener = vi.fn();
        store.subscribe(listener);
        await store.setEnabled(false);
        expect(store.get().enabled).toBe(false);
        expect(listener).toHaveBeenCalledOnce();
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().enabled).toBe(false);
    });
    it('falls back to defaults on corrupt data', async () => {
        const kv = memoryKv();
        await kv.set('settings', 'nonsense');
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({ enabled: true, autoPreload: true, spotlightHome: false, spotlightLibrary: false, libraryGridColumns: 3, libraryCollectionColumns: 5, wishlistDeals: false, cleanPage: false, zoomTransition: true, dimUninstalledGames: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeWhatsNew: true, homeFriends: true, homeRecommended: true, homeCollections: true, tabMasterSync: true });
    });
});

describe('settings: automatic pre-load', () => {
    it('is on by default and remembers being turned off', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        await store.setAutoPreload(false);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get()).toEqual({ enabled: true, autoPreload: false, spotlightHome: false, spotlightLibrary: false, libraryGridColumns: 3, libraryCollectionColumns: 5, wishlistDeals: false, cleanPage: false, zoomTransition: true, dimUninstalledGames: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeWhatsNew: true, homeFriends: true, homeRecommended: true, homeCollections: true, tabMasterSync: true });
    });
    it('keeps the other setting when one changes, including settings saved before this option existed', async () => {
        const kv = memoryKv();
        await kv.set('settings', { enabled: false });
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({ enabled: false, autoPreload: true, spotlightHome: false, spotlightLibrary: false, libraryGridColumns: 3, libraryCollectionColumns: 5, wishlistDeals: false, cleanPage: false, zoomTransition: true, dimUninstalledGames: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeWhatsNew: true, homeFriends: true, homeRecommended: true, homeCollections: true, tabMasterSync: true });
        await store.setAutoPreload(false);
        expect(store.get()).toEqual({ enabled: false, autoPreload: false, spotlightHome: false, spotlightLibrary: false, libraryGridColumns: 3, libraryCollectionColumns: 5, wishlistDeals: false, cleanPage: false, zoomTransition: true, dimUninstalledGames: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeWhatsNew: true, homeFriends: true, homeRecommended: true, homeCollections: true, tabMasterSync: true });
    });
});

describe('settings: spotlight home', () => {
    it('spotlight home is off by default and remembers being turned on', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().spotlightHome).toBe(false);
        await store.setSpotlightHome(true);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().spotlightHome).toBe(true);
    });
});

describe('settings: spotlight library', () => {
    it('spotlight library is off by default and remembers being turned on', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().spotlightLibrary).toBe(false);
        await store.setSpotlightLibrary(true);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().spotlightLibrary).toBe(true);
    });
    it('library grid columns defaults to 3 and persists changes', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().libraryGridColumns).toBe(3);
        await store.setLibraryGridColumns(5);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().libraryGridColumns).toBe(5);
    });
    it('library collection columns defaults to 5 and persists changes', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().libraryCollectionColumns).toBe(5);
        await store.setLibraryCollectionColumns(6);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().libraryCollectionColumns).toBe(6);
    });
});

describe('settings: wishlist deals', () => {
    it('wishlist deals is off by default and remembers being turned on', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().wishlistDeals).toBe(false);
        await store.setWishlistDeals(true);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().wishlistDeals).toBe(true);
    });
});

describe('settings: the removed Home switches', () => {
    it('settings saved with the old What\'s new / Clean Home switches load without them', async () => {
        const kv = memoryKv();
        await kv.set('settings', { enabled: true, autoPreload: true, spotlightHome: true, wishlistDeals: true, homeFeed: false, cleanHome: true });
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({ enabled: true, autoPreload: true, spotlightHome: true, spotlightLibrary: false, libraryGridColumns: 3, libraryCollectionColumns: 5, wishlistDeals: true, cleanPage: false, zoomTransition: true, dimUninstalledGames: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeWhatsNew: true, homeFriends: true, homeRecommended: true, homeCollections: true, tabMasterSync: true });
    });
});

describe('settings: tabmaster sync', () => {
    it('tabmaster sync is on by default and remembers being turned off', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().tabMasterSync).toBe(true);
        await store.setTabMasterSync(false);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().tabMasterSync).toBe(false);
    });
});

describe('settings: Games row', () => {
    it('shows the recent games, sorted by last played, by default and remembers a collection and its sort', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().homeRow).toBe('recent');
        expect(store.get().homeRowSort).toBe('lastPlayed');
        await store.setHomeRow('uc-vHNTb8+oFvas');
        await store.setHomeRowSort('name');
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().homeRow).toBe('uc-vHNTb8+oFvas');
        expect(reloaded.get().homeRowSort).toBe('name');
    });
    it('reads junk, and the old New to library switch, as the defaults', async () => {
        const kv = memoryKv();
        await kv.set('settings', { homeRow: 7, homeRowSort: 'bogus', homeNewGames: true });
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().homeRow).toBe('recent');
        expect(store.get().homeRowSort).toBe('lastPlayed');
        expect('homeNewGames' in store.get()).toBe(false);
    });
});

describe('settings: Clean game page', () => {
    it('is off by default and remembers being turned on', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().cleanPage).toBe(false);
        await store.setCleanPage(true);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().cleanPage).toBe(true);
    });
});

describe('settings: Spotlight Home status bar', () => {
    it('is on by default and remembers being turned off', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().homeStatusBar).toBe(true);
        await store.setHomeStatusBar(false);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().homeStatusBar).toBe(false);
    });
});

describe('settings: game logo instead of the title', () => {
    it('is off by default and remembers being turned on', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().gameLogo).toBe(false);
        await store.setGameLogo(true);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().gameLogo).toBe(true);
    });
});

describe('settings: zoom transition', () => {
    it('is on by default and remembers being turned off', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().zoomTransition).toBe(true);
        await store.setZoomTransition(false);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().zoomTransition).toBe(false);
    });
});

describe('settings: dim uninstalled games', () => {
    it('is off by default and remembers being turned on', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().dimUninstalledGames).toBe(false);
        await store.setDimUninstalledGames(true);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().dimUninstalledGames).toBe(true);
    });
});

describe('settings: feed sections', () => {
    it('feed sections are on by default and persist changes', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().homeWhatsNew).toBe(true);
        expect(store.get().homeFriends).toBe(true);
        expect(store.get().homeRecommended).toBe(true);
        expect(store.get().homeCollections).toBe(true);
        await store.setHomeWhatsNew(false);
        await store.setHomeFriends(false);
        await store.setHomeRecommended(false);
        await store.setHomeCollections(false);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().homeWhatsNew).toBe(false);
        expect(reloaded.get().homeFriends).toBe(false);
        expect(reloaded.get().homeRecommended).toBe(false);
        expect(reloaded.get().homeCollections).toBe(false);
    });
});


describe('statusAvatar (#9: your avatar in the status bar instead of the dot)', () => {
    it('is off by default and remembers its setting', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().statusAvatar).toBe(false);
        await store.setStatusAvatar(true);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().statusAvatar).toBe(true);
    });
});
