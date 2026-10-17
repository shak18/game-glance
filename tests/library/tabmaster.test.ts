import { describe, expect, it } from 'vitest';
import {
    applyTabMasterCategories,
    evaluateTabMasterFilters,
    extractTabsFromNativeTree,
    getCachedTabMasterSettings,
    normalizeTabMasterId,
    resetTabMasterCache,
    resolveTabTitle,
    setCachedTabMasterSettingsForTest,
    sortTabMasterGames,
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
        expect(normalizeTabMasterId('SteamOSCompatible')).toBe('steamos-compatible');
        expect(normalizeTabMasterId('GreatOnMachine')).toBe('great-on-machine');
        expect(normalizeTabMasterId('AllGames')).toBe('all');
        expect(normalizeTabMasterId('Favorites')).toBe('favorites');
        expect(normalizeTabMasterId('Collections')).toBe('collections');
        expect(normalizeTabMasterId('NonSteam')).toBe('non-steam');
        expect(normalizeTabMasterId('Soundtracks')).toBe('soundtracks');
        expect(normalizeTabMasterId('#LibraryTab_NonSteam')).toBe('non-steam');
        expect(normalizeTabMasterId('librarytab_nonsteam')).toBe('non-steam');
        expect(normalizeTabMasterId('librarytabnonsteam')).toBe('non-steam');
        expect(normalizeTabMasterId('#librarytab_favorites')).toBe('favorites');
        expect(normalizeTabMasterId('librarytab_favorites')).toBe('favorites');
        expect(normalizeTabMasterId('#librarytab_installed')).toBe('installed');
        expect(normalizeTabMasterId('librarytab_installed')).toBe('installed');
        expect(normalizeTabMasterId('#librarytab_allgames')).toBe('all');
        expect(normalizeTabMasterId('#librarytab_deckgames')).toBe('great-on-deck');
        expect(normalizeTabMasterId('#librarytab_soundtracks')).toBe('soundtracks');
        expect(normalizeTabMasterId('#librarytab_collections')).toBe('collections');
    });

    it('retains custom tab IDs untouched', () => {
        expect(normalizeTabMasterId('custom-tab-uuid-1234')).toBe('custom-tab-uuid-1234');
    });
});

describe('tabmaster: resolveTabTitle', () => {
    it('resolves standard Steam library tab tokens to clean titles', () => {
        expect(resolveTabTitle('#LibraryTab_NonSteam')).toBe('Non-Steam');
        expect(resolveTabTitle('#librarytab_nonsteam')).toBe('Non-Steam');
        expect(resolveTabTitle('#LibraryTab_Favorites')).toBe('Favorites');
        expect(resolveTabTitle('#librarytab_favorites')).toBe('Favorites');
        expect(resolveTabTitle('#LibraryTab_Installed')).toBe('Installed');
        expect(resolveTabTitle('#LibraryTab_AllGames')).toBe('All Steam Games');
        expect(resolveTabTitle('#LibraryTab_DeckGames')).toBe('Great on Deck');
        expect(resolveTabTitle('#LibraryTab_Soundtracks')).toBe('Soundtracks');
        expect(resolveTabTitle('#LibraryTab_Collections')).toBe('Collections');
    });

    it('preserves custom tab titles as given', () => {
        expect(resolveTabTitle('My Most Played Games')).toBe('My Most Played Games');
        expect(resolveTabTitle('Deck Verified Hits')).toBe('Deck Verified Hits');
        expect(resolveTabTitle('Backlog 2026')).toBe('Backlog 2026');
    });

    it('falls back to defaultName or effectiveType when title is empty', () => {
        expect(resolveTabTitle('', 'Installed', 'installed')).toBe('Installed');
        expect(resolveTabTitle(null, 'Favorites', 'favorites')).toBe('Favorites');
        expect(resolveTabTitle(undefined, undefined, 'non-steam')).toBe('Non-Steam');
    });
});

describe('tabmaster: sortTabMasterGames', () => {
    const g1 = { ...dummyGame(1, 'Game A'), playedMinutes: 50, lastPlayed: 1000 };
    const g2 = { ...dummyGame(2, 'Game B'), playedMinutes: 500, lastPlayed: 3000 };
    const g3 = { ...dummyGame(3, 'Game C'), playedMinutes: 200, lastPlayed: 2000 };
    const games = [g1, g2, g3];

    it('sorts by playtime descending when tab title suggests most played', () => {
        const tab = { id: 'custom-1', title: 'Most Played Games', position: 0 };
        const sorted = sortTabMasterGames(games, tab);
        expect(sorted.map((g) => g.appId)).toEqual([2, 3, 1]); // 500m, 200m, 50m
    });

    it('sorts by playtime descending when time played filter is present', () => {
        const tab = {
            id: 'custom-time',
            title: 'Custom Filter',
            position: 0,
            filters: [{ type: 'time played', params: { condition: 'above', timeThreshold: 10, units: 'minutes' } }],
        };
        const sorted = sortTabMasterGames(games, tab);
        expect(sorted.map((g) => g.appId)).toEqual([2, 3, 1]);
    });

    it('sorts by playtime ascending when condition is below', () => {
        const tab = {
            id: 'custom-below',
            title: 'Little Played',
            position: 0,
            filters: [{ type: 'time played', params: { condition: 'below', timeThreshold: 100, units: 'minutes' } }],
        };
        const sorted = sortTabMasterGames(games, tab);
        expect(sorted.map((g) => g.appId)).toEqual([1, 3, 2]); // 50m, 200m, 500m
    });

    it('sorts by last played descending when last played filter is present', () => {
        const tab = {
            id: 'recent-tab',
            title: 'Recently Active',
            position: 0,
            filters: [{ type: 'last played' }],
        };
        const sorted = sortTabMasterGames(games, tab);
        expect(sorted.map((g) => g.appId)).toEqual([2, 3, 1]); // 3000, 2000, 1000
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

    it('exclusively dictates tabs without appending unhandled base categories', () => {
        const tmData: TabMasterSettingsResult = {
            found: true,
            tabs: [
                { id: 'Installed', title: 'Installed', position: 0 },
                { id: 'Favorites', title: 'My Favs', position: 1 },
            ],
        };

        const result = applyTabMasterCategories(baseCategories, mockCollections, tmData);
        expect(result.length).toBe(2);
        expect(result.map((c) => c.id)).toEqual(['installed', 'favorites']);
        expect(result.some((c) => c.id === 'great-on-deck')).toBe(false);
        expect(result.some((c) => c.id === 'all')).toBe(false);
        expect(result.some((c) => c.id === 'collections')).toBe(false);
    });

    it('assigns unique IDs to steamos-compatible, great-on-deck, and great-on-machine with distinct compatibility filtering', () => {
        const pool: LibraryGameItem[] = [
            { ...dummyGame(1, 'Verified Game A'), compat: 3 },
            { ...dummyGame(2, 'Playable Game B'), compat: 2 },
            { ...dummyGame(3, 'Unsupported Game C'), compat: 1 },
            { ...dummyGame(4, 'Unknown Game D'), compat: 0 },
        ];

        const tmData: TabMasterSettingsResult = {
            found: true,
            tabs: [
                { id: 'SteamOSCompatible', title: 'SteamOS Compatible', position: 0 },
                { id: 'GreatOnDeck', title: 'Great on Deck', position: 1 },
                { id: 'GreatOnMachine', title: 'Great on Machine', position: 2 },
            ],
        };

        const result = applyTabMasterCategories(baseCategories, mockCollections, tmData, pool);
        expect(result.length).toBe(3);

        const steamosCat = result.find((c) => c.id === 'steamos-compatible');
        const deckCat = result.find((c) => c.id === 'great-on-deck');
        const machineCat = result.find((c) => c.id === 'great-on-machine');

        expect(steamosCat).toBeDefined();
        expect(deckCat).toBeDefined();
        expect(machineCat).toBeDefined();

        // Ensure IDs are strictly unique
        const ids = result.map((c) => c.id);
        expect(new Set(ids).size).toBe(3);

        // Great on deck should only include Deck Verified (compat: 3)
        expect(deckCat?.games.map((g) => g.name)).toEqual(['Verified Game A']);
        expect(deckCat?.count).toBe(1);

        // SteamOS Compatible should include Verified (3) and Playable (2)
        expect(steamosCat?.games.map((g) => g.name)).toEqual(['Verified Game A', 'Playable Game B']);
        expect(steamosCat?.count).toBe(2);

        // Great on Machine should include Verified (3) and Playable (2)
        expect(machineCat?.games.map((g) => g.name)).toEqual(['Verified Game A', 'Playable Game B']);
        expect(machineCat?.count).toBe(2);
    });

    it('properly configures collections overview tab with isCollectionsTab: true and collections items', () => {
        const tmData: TabMasterSettingsResult = {
            found: true,
            tabs: [
                { id: 'Collections', title: 'Collections', position: 0 },
            ],
        };

        const result = applyTabMasterCategories(baseCategories, mockCollections, tmData);
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('collections');
        expect(result[0].isCollectionsTab).toBe(true);
        expect(result[0].collections).toBe(mockCollections);
        expect(result[0].games).toEqual([]);
        expect(result[0].count).toBe(mockCollections.length);
    });

    it('properly configures soundtracks tab with isSoundtracksTab: true and soundtrack items', () => {
        const ostGames: LibraryGameItem[] = [
            { ...dummyGame(99, 'Hades OST'), isSoundtrack: true },
            { ...dummyGame(100, 'Celeste OST'), isSoundtrack: true },
        ];

        const tmData: TabMasterSettingsResult = {
            found: true,
            tabs: [
                { id: 'Soundtracks', title: 'OST Library', position: 0 },
            ],
        };

        const result = applyTabMasterCategories(baseCategories, mockCollections, tmData, undefined, ostGames);
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('soundtracks');
        expect(result[0].isSoundtracksTab).toBe(true);
        expect(result[0].name).toBe('OST LIBRARY');
        expect(result[0].count).toBe(2);
        expect(result[0].games.map((g) => g.name)).toEqual(['Hades OST', 'Celeste OST']);
    });

    it('disambiguates duplicate tab IDs so every tab in the ribbon has a unique category id', () => {
        const tmData: TabMasterSettingsResult = {
            found: true,
            tabs: [
                { id: 'Installed', title: 'Installed A', position: 0 },
                { id: 'Installed', title: 'Installed B', position: 1 },
            ],
        };

        const result = applyTabMasterCategories(baseCategories, mockCollections, tmData);
        expect(result.length).toBe(2);
        expect(result[0].id).toBe('installed');
        expect(result[1].id).toBe('installed-2');
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

describe('tabmaster: custom tabs with filtered game lists (1200 games pool)', () => {
    it('filters 1200 games down to exactly 17 most played games when using time played filter', () => {
        // Pool of 1200 games:
        // 17 games have >= 50 hours (3000 minutes)
        // 1183 games have < 50 hours or 0 playtime (including remote streamable uninstalled games)
        const pool: LibraryGameItem[] = [];
        for (let i = 1; i <= 1200; i++) {
            const isTop17 = i <= 17;
            pool.push({
                ...dummyGame(i, `Game ${i}`),
                // 17 most played games: 60-100 hours (3600-6000 minutes)
                // remaining games: either 0 minutes (uninstalled/streamable) or small playtime
                playedMinutes: isTop17 ? 3600 + i * 100 : i % 2 === 0 ? 120 : 0,
                installed: i <= 50, // Only 50 games are locally installed; others are uninstalled or remote streamable
            });
        }

        const tmData: TabMasterSettingsResult = {
            found: true,
            tabs: [
                {
                    id: 'custom-most-played',
                    title: 'Most Played',
                    position: 0,
                    filters: [
                        {
                            type: 'time played',
                            params: {
                                timeThreshold: 50,
                                condition: 'above',
                                units: 'hours',
                            },
                        },
                    ],
                },
            ],
        };

        const result = applyTabMasterCategories(baseCategories, mockCollections, tmData, pool);
        expect(result.length).toBe(1);
        const mostPlayedCat = result[0];
        expect(mostPlayedCat.id).toBe('tm-custom-most-played');
        expect(mostPlayedCat.name).toBe('MOST PLAYED');
        // Must show EXACTLY 17 elements, NOT all 1200!
        expect(mostPlayedCat.count).toBe(17);
        // Games are sorted by playtime descending (Game 17 has 5300m, Game 1 has 3700m)
        expect(mostPlayedCat.games.map((g) => g.appId)).toEqual(Array.from({ length: 17 }, (_, idx) => 17 - idx));
    });

    it('handles string time thresholds and different condition aliases', () => {
        const pool: LibraryGameItem[] = [
            { ...dummyGame(1, 'Hades'), playedMinutes: 6000 },
            { ...dummyGame(2, 'Celeste'), playedMinutes: 120 },
            { ...dummyGame(3, 'Short Game'), playedMinutes: 30 },
        ];

        // String threshold "50" with condition "at least"
        const filtered = evaluateTabMasterFilters(pool, [
            {
                type: 'time_played',
                params: {
                    timeThreshold: '50',
                    condition: 'at least' as any,
                    units: 'hours',
                },
            },
        ]);
        expect(filtered.map((g) => g.appId)).toEqual([1]);

        // String threshold with condition "below"
        const filteredBelow = evaluateTabMasterFilters(pool, [
            {
                type: 'Time Played',
                params: {
                    timeThreshold: '1',
                    condition: 'below',
                    units: 'hours',
                },
            },
        ]);
        expect(filteredBelow.map((g) => g.appId)).toEqual([3]);
    });

    it('directly uses tab.appIds when provided by live TabMaster native collection', () => {
        const pool: LibraryGameItem[] = [];
        for (let i = 1; i <= 1200; i++) {
            pool.push(dummyGame(i, `Game ${i}`));
        }

        // TabMaster already calculated 17 games in its collection
        const exact17Ids = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170];
        const tmData: TabMasterSettingsResult = {
            found: true,
            tabs: [
                {
                    id: 'tabmaster-live-tab',
                    title: 'My Custom Tab',
                    position: 0,
                    appIds: exact17Ids,
                },
            ],
        };

        const result = applyTabMasterCategories(baseCategories, mockCollections, tmData, pool);
        expect(result.length).toBe(1);
        expect(result[0].count).toBe(17);
        expect(result[0].games.length).toBe(17);
        expect(result[0].games.map((g) => g.appId)).toEqual(exact17Ids);
    });

    it('extracts appIds and TabMaster tabs from native Steam React tree', () => {
        const nativeTree = {
            props: {
                tabs: [
                    {
                        id: '7b8e1f54-5c92-4d2b-9bdd-2b0d7b3dcb6d',
                        title: 'Top Games',
                        footer: { onMenuActionDescription: 'Tab Master' },
                        content: {
                            props: {
                                collection: {
                                    visibleApps: [{ appid: 101 }, { appid: 102 }, { appid: 103 }],
                                    allApps: [{ appid: 101 }, { appid: 102 }, { appid: 103 }],
                                },
                            },
                        },
                    },
                ],
            },
        };

        const liveTabs = extractTabsFromNativeTree(nativeTree);
        expect(liveTabs).not.toBeNull();
        expect(liveTabs?.length).toBe(1);
        expect(liveTabs?.[0].title).toBe('Top Games');
        expect(liveTabs?.[0].appIds).toEqual([101, 102, 103]);
    });

    it('resolves Steam token titles (#librarytab_nonsteam, #librarytab_favorites) to clean names', () => {
        const pool = [
            dummyGame(10, 'Game 10'),
            dummyGame(20, 'Game 20'),
        ];
        const tmData: TabMasterSettingsResult = {
            found: true,
            tabs: [
                {
                    id: 'librarytab_nonsteam',
                    title: '#librarytab_nonsteam',
                    position: 0,
                    appIds: [10],
                },
                {
                    id: 'librarytab_favorites',
                    title: '#LibraryTab_Favorites',
                    position: 1,
                    appIds: [20],
                },
            ],
        };

        const result = applyTabMasterCategories(baseCategories, mockCollections, tmData, pool);
        expect(result.length).toBe(2);
        expect(result[0].name).toBe('NON-STEAM');
        expect(result[0].id).toBe('non-steam');
        expect(result[1].name).toBe('FAVORITES');
        expect(result[1].id).toBe('favorites');
    });

    it('sorts games in custom Most Played tab by playtime descending', () => {
        const gamesPool: LibraryGameItem[] = [
            { ...dummyGame(1, 'Alpha Game'), playedMinutes: 50 },
            { ...dummyGame(2, 'Beta Game'), playedMinutes: 500 },
            { ...dummyGame(3, 'Charlie Game'), playedMinutes: 200 },
            { ...dummyGame(4, 'Delta Game'), playedMinutes: 1000 },
        ];

        const tmData: TabMasterSettingsResult = {
            found: true,
            tabs: [
                {
                    id: 'most-played-tab',
                    title: 'Most Played',
                    position: 0,
                    filters: [
                        {
                            type: 'time played',
                            params: {
                                condition: 'above',
                                timeThreshold: 1,
                                units: 'hours', // > 60m: games 2 (500m), 3 (200m), 4 (1000m)
                            },
                        },
                    ],
                },
            ],
        };

        const result = applyTabMasterCategories(baseCategories, mockCollections, tmData, gamesPool);
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('MOST PLAYED');
        expect(result[0].games.length).toBe(3);
        // Should be ordered: Delta (1000m), Beta (500m), Charlie (200m)
        expect(result[0].games.map((g) => g.appId)).toEqual([4, 2, 3]);
    });
});
