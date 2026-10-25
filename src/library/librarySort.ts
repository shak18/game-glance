import { LibraryCollectionItem, LibraryGameItem } from './libraryData';
import { LibrarySortMode } from '../data/settings';

export const SORT_MODES: LibrarySortMode[] = ['recent', 'alpha', 'playtime', 'size'];

export const SORT_LABELS: Record<LibrarySortMode, string> = {
    recent: 'Recent',
    alpha: 'A–Z',
    playtime: 'Playtime',
    size: 'Size on Disk',
};

export const SORT_ICONS: Record<LibrarySortMode, string> = {
    recent: '🕒',
    alpha: '🔤',
    playtime: '⏳',
    size: '💾',
};

export function getNextSortMode(current: LibrarySortMode): LibrarySortMode {
    const idx = SORT_MODES.indexOf(current);
    if (idx < 0) return 'recent';
    return SORT_MODES[(idx + 1) % SORT_MODES.length];
}

export function sortGames(games: LibraryGameItem[], mode: LibrarySortMode): LibraryGameItem[] {
    if (!games || games.length <= 1) return games ?? [];
    const list = [...games];

    switch (mode) {
        case 'alpha':
            return list.sort((a, b) => {
                const nameA = (a.name || '').trim();
                const nameB = (b.name || '').trim();
                return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
            });

        case 'playtime':
            return list.sort((a, b) => {
                const playA = typeof a.playedMinutes === 'number' ? a.playedMinutes : 0;
                const playB = typeof b.playedMinutes === 'number' ? b.playedMinutes : 0;
                if (playB !== playA) return playB - playA; // descending: highest playtime first
                return (a.name || '').localeCompare(b.name || '');
            });

        case 'size':
            return list.sort((a, b) => {
                const sizeA = typeof a.sizeOnDisk === 'number' ? a.sizeOnDisk : 0;
                const sizeB = typeof b.sizeOnDisk === 'number' ? b.sizeOnDisk : 0;
                if (sizeB !== sizeA) return sizeB - sizeA; // descending: largest first
                return (a.name || '').localeCompare(b.name || '');
            });

        case 'recent':
        default:
            return list.sort((a, b) => {
                const timeA = typeof a.lastPlayed === 'number' ? a.lastPlayed : 0;
                const timeB = typeof b.lastPlayed === 'number' ? b.lastPlayed : 0;
                if (timeB !== timeA) return timeB - timeA; // descending: most recent first
                return (a.name || '').localeCompare(b.name || '');
            });
    }
}

export function sortCollections(collections: LibraryCollectionItem[], mode: LibrarySortMode): LibraryCollectionItem[] {
    if (!collections || collections.length <= 1) return collections ?? [];
    const list = [...collections];

    switch (mode) {
        case 'alpha':
            return list.sort((a, b) => {
                const nameA = (a.name || '').trim();
                const nameB = (b.name || '').trim();
                return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
            });

        case 'playtime':
            return list.sort((a, b) => {
                const totalA = a.games?.reduce((sum, g) => sum + (g.playedMinutes || 0), 0) ?? 0;
                const totalB = b.games?.reduce((sum, g) => sum + (g.playedMinutes || 0), 0) ?? 0;
                if (totalB !== totalA) return totalB - totalA;
                return (a.name || '').localeCompare(b.name || '');
            });

        case 'size':
            return list.sort((a, b) => {
                const countA = typeof a.count === 'number' ? a.count : (a.games?.length ?? 0);
                const countB = typeof b.count === 'number' ? b.count : (b.games?.length ?? 0);
                if (countB !== countA) return countB - countA;
                return (a.name || '').localeCompare(b.name || '');
            });

        case 'recent':
        default:
            return list.sort((a, b) => {
                const maxA = a.games?.reduce((max, g) => Math.max(max, g.lastPlayed || 0), 0) ?? 0;
                const maxB = b.games?.reduce((max, g) => Math.max(max, g.lastPlayed || 0), 0) ?? 0;
                if (maxB !== maxA) return maxB - maxA;
                return (a.name || '').localeCompare(b.name || '');
            });
    }
}
