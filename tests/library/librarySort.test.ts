import { describe, expect, it } from 'vitest';
import { getNextSortMode, sortCollections, sortGames, SORT_LABELS, SORT_MODES } from '../../src/library/librarySort';
import { LibraryCollectionItem, LibraryGameItem } from '../../src/library/libraryData';

function makeGame(overrides: Partial<LibraryGameItem>): LibraryGameItem {
    return {
        appId: overrides.appId ?? 1,
        name: overrides.name ?? 'Game',
        isShortcut: false,
        installed: true,
        running: false,
        playedMinutes: overrides.playedMinutes ?? 0,
        achievements: null,
        heroic: null,
        source: 'steam',
        lastPlayed: overrides.lastPlayed ?? 0,
        sizeOnDisk: overrides.sizeOnDisk ?? 0,
        ...overrides,
    };
}

describe('librarySort', () => {
    it('cycles sort modes correctly', () => {
        expect(getNextSortMode('recent')).toBe('alpha');
        expect(getNextSortMode('alpha')).toBe('playtime');
        expect(getNextSortMode('playtime')).toBe('size');
        expect(getNextSortMode('size')).toBe('recent');
    });

    it('has labels for all sort modes', () => {
        for (const mode of SORT_MODES) {
            expect(SORT_LABELS[mode]).toBeDefined();
            expect(typeof SORT_LABELS[mode]).toBe('string');
        }
    });

    describe('sortGames', () => {
        const gameA = makeGame({ appId: 1, name: 'Zelda', lastPlayed: 100, playedMinutes: 50, sizeOnDisk: 1000 });
        const gameB = makeGame({ appId: 2, name: 'Mario', lastPlayed: 300, playedMinutes: 200, sizeOnDisk: 500 });
        const gameC = makeGame({ appId: 3, name: 'Metroid', lastPlayed: 200, playedMinutes: 100, sizeOnDisk: 2000 });
        const games = [gameA, gameB, gameC];

        it('sorts by recent (lastPlayed descending)', () => {
            const sorted = sortGames(games, 'recent');
            expect(sorted.map((g) => g.name)).toEqual(['Mario', 'Metroid', 'Zelda']);
        });

        it('sorts by alpha (name ascending)', () => {
            const sorted = sortGames(games, 'alpha');
            expect(sorted.map((g) => g.name)).toEqual(['Mario', 'Metroid', 'Zelda'].sort());
            expect(sorted.map((g) => g.name)).toEqual(['Mario', 'Metroid', 'Zelda']);
        });

        it('sorts by playtime (playedMinutes descending)', () => {
            const sorted = sortGames(games, 'playtime');
            expect(sorted.map((g) => g.name)).toEqual(['Mario', 'Metroid', 'Zelda']);
        });

        it('sorts by size (sizeOnDisk descending)', () => {
            const sorted = sortGames(games, 'size');
            expect(sorted.map((g) => g.name)).toEqual(['Metroid', 'Zelda', 'Mario']);
        });

        it('handles empty or single item arrays safely', () => {
            expect(sortGames([], 'recent')).toEqual([]);
            expect(sortGames([gameA], 'recent')).toEqual([gameA]);
        });
    });

    describe('sortCollections', () => {
        const colA: LibraryCollectionItem = {
            id: 'n64',
            name: 'Nintendo 64',
            count: 10,
            games: [makeGame({ lastPlayed: 100, playedMinutes: 20 })],
        };
        const colB: LibraryCollectionItem = {
            id: 'ps1',
            name: 'PlayStation',
            count: 5,
            games: [makeGame({ lastPlayed: 500, playedMinutes: 100 })],
        };
        const colC: LibraryCollectionItem = {
            id: 'dc',
            name: 'Dreamcast',
            count: 20,
            games: [makeGame({ lastPlayed: 200, playedMinutes: 10 })],
        };
        const cols = [colA, colB, colC];

        it('sorts collections by recent (highest lastPlayed in collection)', () => {
            const sorted = sortCollections(cols, 'recent');
            expect(sorted.map((c) => c.name)).toEqual(['PlayStation', 'Dreamcast', 'Nintendo 64']);
        });

        it('sorts collections by alpha (name ascending)', () => {
            const sorted = sortCollections(cols, 'alpha');
            expect(sorted.map((c) => c.name)).toEqual(['Dreamcast', 'Nintendo 64', 'PlayStation']);
        });

        it('sorts collections by playtime (total playedMinutes in collection)', () => {
            const sorted = sortCollections(cols, 'playtime');
            expect(sorted.map((c) => c.name)).toEqual(['PlayStation', 'Nintendo 64', 'Dreamcast']);
        });

        it('sorts collections by size (count descending)', () => {
            const sorted = sortCollections(cols, 'size');
            expect(sorted.map((c) => c.name)).toEqual(['Dreamcast', 'Nintendo 64', 'PlayStation']);
        });
    });
});
