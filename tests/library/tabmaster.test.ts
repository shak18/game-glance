import { describe, expect, it } from 'vitest';
import {
    applyTabMasterCategories,
    evaluateTabMasterFilters,
    extractTabsFromNativeTree,
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
    it('adds custom filter game groups (whitelist, deck compatibility, regex) into the categories ribbon', () => {
        const pool: LibraryGameItem[] = [
            { ...dummyGame(101, 'Elden Ring'), compat: 3, installed: true, isShortcut: false },
            { ...dummyGame(102, 'Cyberpunk 2077'), compat: 3, installed: false, isShortcut: false },
            { ...dummyGame(103, 'Emulated Zelda'), compat: 0, installed: true, isShortcut: true },
        ];

        const tmData: TabMasterSettingsResult = {
            found: true,
            tabs: [
                {
                    id: 'verified-games',
                    title: 'Deck Verified',
                    position: 0,
                    filters: [{ type: 'deck compatibility', params: { category: 3 } }],
                },
                {
                    id: 'whitelist-group',
                    title: 'Favorites Whitelist',
                    position: 1,
                    filters: [{ type: 'whitelist', params: { games: [103] } }],
                },
                {
                    id: 'regex-group',
                    title: 'Cyber Games',
                    position: 2,
                    filters: [{ type: 'regex', params: { regex: 'cyber' } }],
                },
            ],
        };

        const result = applyTabMasterCategories(baseCategories, mockCollections, tmData, pool);
        const verifiedCat = result.find((c) => c.id === 'tm-verified-games');
        expect(verifiedCat).toBeDefined();
        expect(verifiedCat?.name).toBe('DECK VERIFIED');
        expect(verifiedCat?.count).toBe(2);
        expect(verifiedCat?.games.map((g) => g.name)).toEqual(['Elden Ring', 'Cyberpunk 2077']);

        const whitelistCat = result.find((c) => c.id === 'tm-whitelist-group');
        expect(whitelistCat).toBeDefined();
        expect(whitelistCat?.count).toBe(1);
        expect(whitelistCat?.games[0].name).toBe('Emulated Zelda');

        const regexCat = result.find((c) => c.id === 'tm-regex-group');
        expect(regexCat).toBeDefined();
        expect(regexCat?.count).toBe(1);
        expect(regexCat?.games[0].name).toBe('Cyberpunk 2077');
    });

    it('evaluates filters applied on existing standard categories', () => {
        const tmData: TabMasterSettingsResult = {
            found: true,
            tabs: [
                {
                    id: 'Installed',
                    title: 'Installed Hades Only',
                    position: 0,
                    filters: [{ type: 'whitelist', params: { games: [1] } }],
                },
            ],
        };

        const result = applyTabMasterCategories(baseCategories, mockCollections, tmData);
        const instCat = result.find((c) => c.id === 'installed');
        expect(instCat).toBeDefined();
        expect(instCat?.count).toBe(1);
        expect(instCat?.games[0].name).toBe('Hades');
    });
});

describe('tabmaster: evaluateTabMasterFilters', () => {
    const testGames: LibraryGameItem[] = [
        { ...dummyGame(1, 'Hades'), compat: 3, installed: true, isShortcut: false, playedMinutes: 300 },
        { ...dummyGame(2, 'Celeste'), compat: 2, installed: false, isShortcut: false, playedMinutes: 30 },
        { ...dummyGame(3, 'RetroArch'), compat: 0, installed: true, isShortcut: true, playedMinutes: 1200 },
    ];

    it('filters installed vs uninstalled games', () => {
        const installed = evaluateTabMasterFilters(testGames, [{ type: 'installed', params: { installed: true } }]);
        expect(installed.map((g) => g.appId)).toEqual([1, 3]);

        const uninstalled = evaluateTabMasterFilters(testGames, [{ type: 'installed', params: { installed: false } }]);
        expect(uninstalled.map((g) => g.appId)).toEqual([2]);
    });

    it('filters platform (non-steam vs steam)', () => {
        const nonSteam = evaluateTabMasterFilters(testGames, [{ type: 'platform', params: { platform: 'non-steam' } }]);
        expect(nonSteam.map((g) => g.appId)).toEqual([3]);

        const steamOnly = evaluateTabMasterFilters(testGames, [{ type: 'platform', params: { platform: 'steam' } }]);
        expect(steamOnly.map((g) => g.appId)).toEqual([1, 2]);
    });

    it('filters by time played', () => {
        // Over 1 hour (60 min)
        const playedOverHour = evaluateTabMasterFilters(testGames, [
            { type: 'time played', params: { timeThreshold: 1, units: 'hours', condition: 'above' } },
        ]);
        expect(playedOverHour.map((g) => g.appId)).toEqual([1, 3]);
    });
});

describe('tabmaster: extractTabsFromNativeTree', () => {
    it('returns null if tree is not patched by TabMaster', () => {
        expect(extractTabsFromNativeTree(null)).toBeNull();
        expect(extractTabsFromNativeTree({})).toBeNull();
        // Standard unpatched Steam element
        const standardTree = {
            props: {
                tabs: [{ id: '1', title: 'Home' }, { id: '2', title: 'Library' }],
            },
        };
        expect(extractTabsFromNativeTree(standardTree)).toBeNull();
    });

    it('extracts live tabs if tree was patched by TabMaster', () => {
        const patchedTree = {
            props: {
                children: {
                    props: {
                        tabs: [
                            { id: 'tabmaster-rpg', title: 'RPG Vault', position: 0, tabMasterType: 'custom', filters: [] },
                            { id: 'Installed', title: 'Ready to Play', position: 1, customTitle: 'Ready to Play' },
                        ],
                    },
                },
            },
        };

        const liveTabs = extractTabsFromNativeTree(patchedTree);
        expect(liveTabs).not.toBeNull();
        expect(liveTabs?.length).toBe(2);
        expect(liveTabs?.[0].id).toBe('tabmaster-rpg');
        expect(liveTabs?.[0].title).toBe('RPG Vault');
        expect(liveTabs?.[1].title).toBe('Ready to Play');
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
