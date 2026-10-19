import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryKv } from '../../src/data/kv';
import { createSettingsStore, defaultStorage } from '../../src/data/settings';

describe('settings', () => {
    beforeEach(() => {
        defaultStorage.clear?.();
    });

    it('defaults to enabled with Spotlight Library active and persists changes', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({
            enabled: true,
            spotlightLibrary: true,
            libraryGridColumns: 3,
            libraryCollectionColumns: 5,
            gameLogo: false,
            dimUninstalledGames: false,
            tabMasterSync: true,
            pulsingBackground: true,
            zoomTransition: true,
        });
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
        const store = createSettingsStore(kv, null);
        await store.load();
        expect(store.get()).toEqual({
            enabled: true,
            spotlightLibrary: true,
            libraryGridColumns: 3,
            libraryCollectionColumns: 5,
            gameLogo: false,
            dimUninstalledGames: false,
            tabMasterSync: true,
            pulsingBackground: true,
            zoomTransition: true,
        });
    });

    it('spotlight library remembers being turned off', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().spotlightLibrary).toBe(true);
        await store.setSpotlightLibrary(false);
        expect(store.get().spotlightLibrary).toBe(false);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().spotlightLibrary).toBe(false);
    });

    it('library grid columns defaults to 3 and persists valid values within bounds', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().libraryGridColumns).toBe(3);
        await store.setLibraryGridColumns(6);
        expect(store.get().libraryGridColumns).toBe(6);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().libraryGridColumns).toBe(6);
    });

    it('library collection columns defaults to 5 and persists valid values within bounds', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().libraryCollectionColumns).toBe(5);
        await store.setLibraryCollectionColumns(7);
        expect(store.get().libraryCollectionColumns).toBe(7);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().libraryCollectionColumns).toBe(7);
    });

    it('dim uninstalled games is off by default and remembers being turned on', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().dimUninstalledGames).toBe(false);
        await store.setDimUninstalledGames(true);
        expect(store.get().dimUninstalledGames).toBe(true);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().dimUninstalledGames).toBe(true);
    });

    it('tabmaster sync is on by default and remembers being turned off', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().tabMasterSync).toBe(true);
        await store.setTabMasterSync(false);
        expect(store.get().tabMasterSync).toBe(false);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().tabMasterSync).toBe(false);
    });

    it('pulsing background is on by default and remembers being turned off', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().pulsingBackground).toBe(true);
        await store.setPulsingBackground(false);
        expect(store.get().pulsingBackground).toBe(false);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().pulsingBackground).toBe(false);
    });

    it('zoom transition is on by default and remembers being turned off', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().zoomTransition).toBe(true);
        await store.setZoomTransition(false);
        expect(store.get().zoomTransition).toBe(false);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().zoomTransition).toBe(false);
    });

    it('retries when backend is temporarily unavailable at startup', async () => {
        let attempts = 0;
        const flapper = {
            async get() {
                attempts++;
                if (attempts < 3) throw new Error('backend not ready');
                return { libraryGridColumns: 5 };
            },
            async set() {},
            async delete() {},
            async deletePrefix() { return 0; },
        };
        const store = createSettingsStore(flapper, null);
        await store.load(5, 5);
        expect(attempts).toBe(3);
        expect(store.get().libraryGridColumns).toBe(5);
    });

    it('instant local cache restores settings before backend load finishes', async () => {
        const kv = memoryKv();
        const store1 = createSettingsStore(kv);
        await store1.setLibraryGridColumns(6);
        expect(store1.get().libraryGridColumns).toBe(6);

        // A new store created without loading from kv yet immediately has 6
        const store2 = createSettingsStore(kv);
        expect(store2.get().libraryGridColumns).toBe(6);
    });
});
