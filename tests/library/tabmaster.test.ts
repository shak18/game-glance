import { describe, expect, it } from 'vitest';
import {
    applyTabMasterCategories,
    getCachedTabMasterSettings,
    normalizeTabMasterId,
    resetTabMasterCache,
    setCachedTabMasterSettingsForTest,
    TabMasterSettingsResult,
} from '../../src/library/tabmaster';
import { LibraryCategory, LibraryCollectionItem, LibraryGameItem } from '../../src/library/libraryData';

const dummyGame = (id: number, name: string): LibraryGameItem => ({
    appId: id,
    name,
    isShortcut: false,
    installed: true,
    running: false,
    playedMinutes: 100,
    achievements: null,
    heroic: null,
    source: 'Steam',
});

const baseCategories: LibraryCategory[] = [
    { id: 'installed', name: 'INSTALLED', count: 2, games: [dummyGame(1, 'Hades'), dummyGame(2, 'Celeste')] },
    { id: 'great-on-deck', name: 'GREAT ON DECK', count: 1, games: [dummyGame(1, 'Hades')] },
    { id: 'all', name: 'ALL STEAM GAMES', count: 2, games: [dummyGame(1, 'Hades'), dummyGame(2, 'Celeste')] },
    { id: 'favorites', name: 'FAVORITES', count: 1, games: [dummyGame(2, 'Celeste')] },
    { id: 'collections', name: 'COLLECTIONS', count: 1, games: [] },
    { id: 'soundtracks', name: 'SOUNDTRACKS', count: 1, games: [dummyGame(99, 'Hades OST')] },
];

const mockCollections: LibraryCollectionItem[] = [
    {
        id: 'rpg-favs',
        name: 'RPG Favorites',
        count: 1,
        games: [dummyGame(10, 'Chrono Trigger')],
    },
];

describe('tabmaster: normalizeTabMasterId', () => {
    it('normalizes standard TabMaster tab IDs', () => {
        expect(normalizeTabMasterId('Installed')).toBe('installed');
        expect(normalizeTabMasterId('GreatOnDeck')).toBe('great-on-deck');
        expect(normalizeTabMasterId('AllGames')).toBe('all');
        expect(normalizeTabMasterId('Favorites')).toBe('favorites');
        expect(normalizeTabMasterId('Collections')).toBe('collections');
        expect(normalizeTabMasterId('NonSteam')).toBe('non-steam');
        expect(normalizeTabMasterId('Soundtracks')).toBe('soundtracks');
    });

    it('retains custom tab IDs untouched', () => {
        expect(normalizeTabMasterId('custom-tab-uuid-1234')).toBe('custom-tab-uuid-1234');
    });
});

describe('tabmaster: applyTabMasterCategories', () => {
    it('returns base categories untouched when tabMasterData is null or not found', () => {
        expect(applyTabMasterCategories(baseCategories, mockCollections, null)).toBe(baseCategories);
        expect(applyTabMasterCategories(baseCategories, mockCollections, { found: false, tabs: [] })).toBe(baseCategories);
    });

    it('reorders categories according to TabMaster positions', () => {
        const tmData: TabMasterSettingsResult = {
            found: true,
            tabs: [
                { id: 'Favorites', title: 'Favorites', position: 0 },
                { id: 'Collections', title: 'Collections', position: 1 },
                { id: 'Installed', title: 'Installed', position: 2 },
            ],
        };

        const result = applyTabMasterCategories(baseCategories, mockCollections, tmData);
        expect(result[0].id).toBe('favorites');
        expect(result[1].id).toBe('collections');
        expect(result[2].id).toBe('installed');
    });

    it('excludes hidden tabs (position < 0)', () => {
        const tmData: TabMasterSettingsResult = {
            found: true,
            tabs: [
                { id: 'Installed', title: 'Installed', position: 0 },
                { id: 'Soundtracks', title: 'Soundtracks', position: -1 }, // hidden!
                { id: 'GreatOnDeck', title: 'Great on Deck', position: -1 }, // hidden!
            ],
        };

        const result = applyTabMasterCategories(baseCategories, mockCollections, tmData);
        const ids = result.map((c) => c.id);
        expect(ids).toContain('installed');
        expect(ids).not.toContain('soundtracks');
        expect(ids).not.toContain('great-on-deck');
    });

    it('applies custom titles defined in TabMaster', () => {
        const tmData: TabMasterSettingsResult = {
            found: true,
            tabs: [
                { id: 'AllGames', title: 'Steam Vault', position: 0 },
            ],
        };

        const result = applyTabMasterCategories(baseCategories, mockCollections, tmData);
        const allCat = result.find((c) => c.id === 'all');
        expect(allCat?.name).toBe('STEAM VAULT');
    });

    it('adds custom collection tabs with their games into the categories ribbon', () => {
        const tmData: TabMasterSettingsResult = {
            found: true,
            tabs: [
                {
                    id: 'custom-rpg',
                    title: 'RPGs Only',
                    position: 0,
                    filters: [
                        { type: 'collection', params: { id: 'rpg-favs' } },
                    ],
                },
                { id: 'Installed', title: 'Installed', position: 1 },
            ],
        };

        const result = applyTabMasterCategories(baseCategories, mockCollections, tmData);
        expect(result[0].id).toBe('tm-custom-rpg');
        expect(result[0].name).toBe('RPGS ONLY');
        expect(result[0].count).toBe(1);
        expect(result[0].games[0].name).toBe('Chrono Trigger');
    });
});

describe('tabmaster: cache helpers', () => {
    it('manages cached tabmaster data properly', () => {
        resetTabMasterCache();
        expect(getCachedTabMasterSettings()).toBeNull();

        const mockData: TabMasterSettingsResult = { found: true, tabs: [] };
        setCachedTabMasterSettingsForTest(mockData);
        expect(getCachedTabMasterSettings()).toBe(mockData);

        resetTabMasterCache();
        expect(getCachedTabMasterSettings()).toBeNull();
    });
});
