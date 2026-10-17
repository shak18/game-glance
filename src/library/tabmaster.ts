import { callable } from '@decky/api';
import { LOG_PREFIX } from '../constants';
import { LibraryCategory, LibraryCollectionItem, LibraryGameItem } from './libraryData';

export interface TabMasterFilter {
    type: string;
    inverted?: boolean;
    params?: {
        id?: string;
        collection?: string;
        name?: string;
        installed?: boolean;
        regex?: string;
        category?: number;
        platform?: string;
        games?: number[];
        timeThreshold?: number;
        condition?: 'above' | 'below';
        units?: 'minutes' | 'hours' | 'days';
        filters?: TabMasterFilter[];
        mode?: 'and' | 'or';
        [key: string]: unknown;
    };
}

export interface TabMasterTab {
    id: string;
    title: string;
    customTitle?: string;
    position: number;
    autoHide?: boolean;
    filters?: TabMasterFilter[];
    filtersMode?: 'and' | 'or';
    categoriesToInclude?: number;
    appIds?: number[];
    sort?: string | number;
    sortMethod?: string | number;
    bReverseSort?: boolean;
}

export interface TabMasterSettingsResult {
    found: boolean;
    path?: string;
    tabs: TabMasterTab[];
}

let cachedTabMasterData: TabMasterSettingsResult | null = null;
let tabMasterFetchPromise: Promise<TabMasterSettingsResult> | null = null;

const getTabMasterSettingsCall = callable<[], TabMasterSettingsResult>('get_tabmaster_settings');

export async function fetchTabMasterSettings(force = false): Promise<TabMasterSettingsResult> {
    if (!force && cachedTabMasterData !== null) {
        return cachedTabMasterData;
    }
    if (tabMasterFetchPromise && !force) {
        return tabMasterFetchPromise;
    }
    tabMasterFetchPromise = (async () => {
        try {
            const res = await getTabMasterSettingsCall();
            cachedTabMasterData = res && typeof res === 'object' && Array.isArray(res.tabs) ? res : { found: false, tabs: [] };
        } catch (e) {
            console.warn(`${LOG_PREFIX} TabMaster: failed to load settings`, e);
            cachedTabMasterData = { found: false, tabs: [] };
        } finally {
            tabMasterFetchPromise = null;
        }
        return cachedTabMasterData;
    })();
    return tabMasterFetchPromise;
}

export function getCachedTabMasterSettings(): TabMasterSettingsResult | null {
    return cachedTabMasterData;
}

export function resetTabMasterCache(): void {
    cachedTabMasterData = null;
    tabMasterFetchPromise = null;
}

export function setCachedTabMasterSettingsForTest(data: TabMasterSettingsResult | null): void {
    cachedTabMasterData = data;
}

/** Standard TabMaster Tab IDs mapped to Spotlight Library category IDs */
export const TABMASTER_ID_MAP: Record<string, string> = {
    installed: 'installed',
    '#librarytab_installed': 'installed',
    librarytab_installed: 'installed',
    librarytabinstalled: 'installed',
    'local-install': 'installed',
    greatondeck: 'great-on-deck',
    'great-on-deck': 'great-on-deck',
    '#librarytab_deckgames': 'great-on-deck',
    librarytab_deckgames: 'great-on-deck',
    librarytabdeckgames: 'great-on-deck',
    'deck-games': 'great-on-deck',
    deckgames: 'great-on-deck',
    deck_games: 'great-on-deck',
    steamoscompatible: 'steamos-compatible',
    'steamos-compatible': 'steamos-compatible',
    'steamos_compatible': 'steamos-compatible',
    '#librarytab_steamoscompatiblegames': 'steamos-compatible',
    librarytab_steamoscompatiblegames: 'steamos-compatible',
    librarytabsteamoscompatiblegames: 'steamos-compatible',
    '#librarytab_steamos': 'steamos-compatible',
    librarytab_steamos: 'steamos-compatible',
    steamos: 'steamos-compatible',
    greatonmachine: 'great-on-machine',
    'great-on-machine': 'great-on-machine',
    'great_on_machine': 'great-on-machine',
    '#librarytab_greatonmachine': 'great-on-machine',
    librarytab_greatonmachine: 'great-on-machine',
    librarytabgreatonmachine: 'great-on-machine',
    allgames: 'all',
    'all-games': 'all',
    all_games: 'all',
    all: 'all',
    '#librarytab_allgames': 'all',
    librarytab_allgames: 'all',
    librarytaballgames: 'all',
    '#librarytab_all': 'all',
    librarytab_all: 'all',
    'type-games': 'all',
    favorites: 'favorites',
    favorite: 'favorites',
    favorite_games: 'favorites',
    '#librarytab_favorites': 'favorites',
    librarytab_favorites: 'favorites',
    librarytabfavorites: 'favorites',
    collections: 'collections',
    '#librarytab_collections': 'collections',
    librarytab_collections: 'collections',
    librarytabcollections: 'collections',
    'my-collections': 'collections',
    'my_collections': 'collections',
    nonsteam: 'non-steam',
    'non-steam': 'non-steam',
    '#librarytab_nonsteam': 'non-steam',
    librarytab_nonsteam: 'non-steam',
    librarytabnonsteam: 'non-steam',
    '#librarytab_desktopapps': 'non-steam',
    librarytab_desktopapps: 'non-steam',
    librarytabdesktopapps: 'non-steam',
    'desk-desktop-apps': 'non-steam',
    'desk_desktop_apps': 'non-steam',
    desktop: 'non-steam',
    soundtracks: 'soundtracks',
    soundtrack: 'soundtracks',
    '#librarytab_soundtracks': 'soundtracks',
    librarytab_soundtracks: 'soundtracks',
    librarytabsoundtracks: 'soundtracks',
    'type-music': 'soundtracks',
    music: 'soundtracks',
};

export function normalizeTabMasterId(rawId: string): string {
    const cleaned = rawId.toLowerCase().trim();
    if (TABMASTER_ID_MAP[cleaned]) return TABMASTER_ID_MAP[cleaned];
    const withoutHash = cleaned.startsWith('#') ? cleaned.slice(1) : cleaned;
    if (TABMASTER_ID_MAP[withoutHash]) return TABMASTER_ID_MAP[withoutHash];
    const withoutPrefix = withoutHash.startsWith('librarytab_')
        ? withoutHash.slice('librarytab_'.length)
        : withoutHash.startsWith('librarytab')
        ? withoutHash.slice('librarytab'.length)
        : withoutHash;
    if (TABMASTER_ID_MAP[withoutPrefix]) return TABMASTER_ID_MAP[withoutPrefix];
    const stripped = cleaned.replace(/[^a-z0-9]/g, '');
    if (TABMASTER_ID_MAP[stripped]) return TABMASTER_ID_MAP[stripped];
    return cleaned;
}

export const DEFAULT_NAMES_BY_TYPE: Record<string, string> = {
    installed: 'Installed',
    'great-on-deck': 'Great on Deck',
    'steamos-compatible': 'SteamOS Compatible',
    'great-on-machine': 'Great on Machine',
    all: 'All Steam Games',
    favorites: 'Favorites',
    collections: 'Collections',
    'non-steam': 'Non-Steam',
    soundtracks: 'Soundtracks',
};

export const STANDARD_TAB_TOKENS: Record<string, string> = {
    '#librarytab_installed': 'Installed',
    '#librarytab_favorites': 'Favorites',
    '#librarytab_allgames': 'All Steam Games',
    '#librarytab_all': 'All Steam Games',
    '#librarytab_deckgames': 'Great on Deck',
    '#librarytab_steamoscompatiblegames': 'SteamOS Compatible',
    '#librarytab_steamos': 'SteamOS Compatible',
    '#librarytab_greatonmachine': 'Great on Machine',
    '#librarytab_soundtracks': 'Soundtracks',
    '#librarytab_collections': 'Collections',
    '#librarytab_nonsteam': 'Non-Steam',
    '#librarytab_desktopapps': 'Non-Steam',
    '#librarytab_recentgames': 'Recent Games',
    '#librarytab_recent': 'Recent Games',
};

/**
 * Resolves a tab title, translating Steam tokens (e.g. #LibraryTab_NonSteam, #LibraryTab_Favorites)
 * using Steam's LocalizationManager or standard fallback dictionary.
 */
export function resolveTabTitle(
    rawTitle: string | null | undefined,
    defaultName?: string,
    effectiveType?: string
): string {
    const trimmed = typeof rawTitle === 'string' ? rawTitle.trim() : '';
    if (!trimmed) {
        return defaultName || (effectiveType && DEFAULT_NAMES_BY_TYPE[effectiveType]) || 'Games';
    }

    if (trimmed.startsWith('#')) {
        try {
            const loc = (globalThis as any).LocalizationManager?.LocalizeString?.(trimmed);
            if (typeof loc === 'string' && loc.length > 0 && !loc.startsWith('#')) {
                return loc;
            }
        } catch {}

        const lower = trimmed.toLowerCase();
        if (STANDARD_TAB_TOKENS[lower]) {
            return STANDARD_TAB_TOKENS[lower];
        }

        if (defaultName && !defaultName.startsWith('#')) {
            return defaultName;
        }
        if (effectiveType && DEFAULT_NAMES_BY_TYPE[effectiveType]) {
            return DEFAULT_NAMES_BY_TYPE[effectiveType];
        }

        const clean = trimmed.replace(/^#librarytab_/i, '').replace(/^#/, '').replace(/[-_]/g, ' ');
        return clean.length > 0 ? clean.charAt(0).toUpperCase() + clean.slice(1) : trimmed;
    }

    const lowerNoHash = trimmed.toLowerCase();
    if (STANDARD_TAB_TOKENS[`#${lowerNoHash}`]) {
        try {
            const loc = (globalThis as any).LocalizationManager?.LocalizeString?.(`#${trimmed}`);
            if (typeof loc === 'string' && loc.length > 0 && !loc.startsWith('#')) {
                return loc;
            }
        } catch {}
        return STANDARD_TAB_TOKENS[`#${lowerNoHash}`];
    }

    return trimmed;
}

/**
 * Sorts games for a TabMaster tab respecting TabMaster's order (e.g. playtime descending for most played).
 */
export function sortTabMasterGames(games: LibraryGameItem[], tab: TabMasterTab): LibraryGameItem[] {
    const list = [...games];
    const titleLower = (tab.title || '').toLowerCase();
    const idLower = (tab.id || '').toLowerCase();

    const rawSort = tab.sortMethod ?? tab.sort;
    const sortStr = typeof rawSort === 'string' ? rawSort.toLowerCase().trim() : '';
    const sortNum = typeof rawSort === 'number' ? rawSort : -1;

    // Steam sort enum values:
    // 0 = Alphabetical, 1 = Release Date, 2 = Date Added, 3 = Playtime, 4 = Size On Disk, 5 = Last Played
    const isPlaytimeSort =
        sortNum === 3 ||
        sortStr.includes('playtime') ||
        sortStr.includes('time') ||
        sortStr.includes('hour') ||
        sortStr.includes('jugad');

    const isLastPlayedSort =
        sortNum === 5 ||
        sortStr.includes('recent') ||
        sortStr.includes('last');

    const isSizeSort =
        sortNum === 4 ||
        sortStr.includes('size') ||
        sortStr.includes('disk');

    const timeFilter = tab.filters?.find((f) => {
        if (!f || !f.type) return false;
        const norm = f.type.toLowerCase().trim().replace(/[-_]/g, ' ');
        return norm === 'time played' || norm === 'playtime' || norm === 'hours played';
    });

    const lastPlayedFilter = tab.filters?.find((f) => {
        if (!f || !f.type) return false;
        const norm = f.type.toLowerCase().trim().replace(/[-_]/g, ' ');
        return norm === 'last played';
    });

    const isMostPlayedTitle =
        titleLower.includes('most played') ||
        titleLower.includes('most-played') ||
        titleLower.includes('mas jugado') ||
        titleLower.includes('más jugado') ||
        titleLower.includes('playtime') ||
        titleLower.includes('tiempo jugado') ||
        titleLower.includes('horas jugadas') ||
        idLower.includes('mostplayed') ||
        idLower.includes('most-played') ||
        idLower.includes('playtime');

    if (isPlaytimeSort || isMostPlayedTitle || timeFilter) {
        const isBelow = timeFilter?.params?.condition === 'below';
        if (isBelow) {
            list.sort((a, b) => (a.playedMinutes ?? 0) - (b.playedMinutes ?? 0));
        } else {
            list.sort((a, b) => (b.playedMinutes ?? 0) - (a.playedMinutes ?? 0));
        }
        if (tab.bReverseSort) list.reverse();
        return list;
    }

    if (isLastPlayedSort || lastPlayedFilter) {
        list.sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0));
        if (tab.bReverseSort) list.reverse();
        return list;
    }

    if (isSizeSort) {
        list.sort((a, b) => (b.sizeOnDisk ?? 0) - (a.sizeOnDisk ?? 0));
        if (tab.bReverseSort) list.reverse();
        return list;
    }

    if (tab.bReverseSort) {
        list.reverse();
    }

    return list;
}

/** Evaluates a single TabMaster filter against a game item */
export function evaluateFilter(
    game: LibraryGameItem,
    filter: TabMasterFilter,
    collectionsMap?: Map<string, LibraryCollectionItem>
): boolean {
    if (!filter || !filter.type) return true;
    const params = filter.params ?? {};
    const normType = String(filter.type).toLowerCase().trim().replace(/[-_]/g, ' ');
    let matches = false;

    switch (normType) {
        case 'installed': {
            matches = params.installed !== false ? Boolean(game.installed) : !game.installed;
            break;
        }

        case 'streamable': {
            // Streamable in Steam means: game is installed on another PC on the LAN, but NOT installed locally
            const isStreamable = !game.installed && !game.isShortcut;
            matches = params.isStreamable !== false ? isStreamable : !isStreamable;
            break;
        }

        case 'whitelist': {
            const list = Array.isArray(params.games) ? params.games : [];
            matches = list.includes(game.appId);
            break;
        }

        case 'blacklist': {
            const list = Array.isArray(params.games) ? params.games : [];
            matches = !list.includes(game.appId);
            break;
        }

        case 'platform': {
            const plat = String(params.platform ?? '').toLowerCase().trim();
            if (plat === 'nonsteam' || plat === 'non-steam' || plat === 'non steam') {
                matches = Boolean(game.isShortcut);
            } else {
                matches = !game.isShortcut;
            }
            break;
        }

        case 'deck compatibility':
        case 'steam deck compatibility':
        case 'deck compat': {
            if (typeof params.category === 'number') {
                matches = game.compat === params.category;
            } else if (Array.isArray(params.categories)) {
                matches = params.categories.includes(game.compat);
            } else {
                matches = game.compat === 3;
            }
            break;
        }

        case 'steamos compatibility':
        case 'steamos compat':
        case 'steamos': {
            if (params.category === 1) {
                matches = game.compat === 1;
            } else {
                // Category 2 = Compatible (Verified: 3 or Playable: 2)
                matches = game.compat === 3 || game.compat === 2;
            }
            break;
        }

        case 'type':
        case 'app type': {
            if (params.category === 8192 || params.type === 'music' || params.type === 'soundtrack') {
                matches = Boolean(game.isSoundtrack);
            } else if (params.category === 1 || params.type === 'game') {
                matches = !game.isSoundtrack;
            } else {
                matches = true;
            }
            break;
        }

        case 'regex': {
            if (typeof params.regex === 'string' && params.regex.length > 0) {
                try {
                    matches = new RegExp(params.regex, 'i').test(game.name);
                } catch {
                    matches = true;
                }
            } else {
                matches = true;
            }
            break;
        }

        case 'collection': {
            const targetId = String(params.id ?? params.collection ?? params.name ?? '').toLowerCase().trim();
            if (targetId && collectionsMap) {
                const targetCol = collectionsMap.get(targetId);
                if (targetCol) {
                    matches = targetCol.games.some((g) => g.appId === game.appId);
                } else {
                    matches = false;
                }
            } else {
                matches = true;
            }
            break;
        }

        case 'time played':
        case 'timeplayed':
        case 'playtime':
        case 'hours played':
        case 'played time':
        case 'most played':
        case 'hours': {
            const rawThreshold =
                params.timeThreshold ??
                params.threshold ??
                params.time ??
                params.hours ??
                params.minutes ??
                params.value ??
                params.playtime;
            const numThreshold = Number(rawThreshold);
            if (Number.isFinite(numThreshold)) {
                let minutesThreshold = numThreshold;
                const units = String(params.units ?? '').toLowerCase().trim();
                if (units === 'hours' || (!units && params.hours !== undefined)) {
                    minutesThreshold = numThreshold * 60;
                } else if (units === 'days') {
                    minutesThreshold = numThreshold * 1440;
                } else if (units === 'minutes') {
                    minutesThreshold = numThreshold;
                } else {
                    // Default in TabMaster: if threshold is <= 300, it's typically hours (e.g. 50 hours)
                    minutesThreshold = numThreshold <= 300 && params.hours === undefined && params.minutes === undefined
                        ? numThreshold * 60
                        : numThreshold;
                }

                const cond = String(params.condition ?? 'above').toLowerCase().trim();
                const isBelow =
                    cond === 'below' ||
                    cond === 'less' ||
                    cond === 'under' ||
                    cond === '<' ||
                    cond === '<=' ||
                    cond === 'at most' ||
                    cond === 'atmost';
                const played = typeof game.playedMinutes === 'number' && Number.isFinite(game.playedMinutes)
                    ? game.playedMinutes
                    : 0;
                matches = isBelow ? played <= minutesThreshold : played >= minutesThreshold;
            } else {
                // If filter exists without a threshold, require non-zero playtime
                matches = (game.playedMinutes ?? 0) > 0;
            }
            break;
        }

        case 'last played':
        case 'lastplayed': {
            const lastPlayedSec = game.lastPlayed ?? 0;
            if (lastPlayedSec === 0) {
                matches = false;
                break;
            }
            const lastPlayedMs = lastPlayedSec * 1000;
            const cond = String(params.condition ?? 'above').toLowerCase().trim();
            const isBelow =
                cond === 'below' ||
                cond === 'before' ||
                cond === 'earlier' ||
                cond === '<' ||
                cond === '<=';

            if (params.daysAgo !== undefined && Number.isFinite(Number(params.daysAgo))) {
                const cutoffMs = Date.now() - (Number(params.daysAgo) * 86400000);
                matches = isBelow ? lastPlayedMs < cutoffMs : lastPlayedMs >= cutoffMs;
            } else if (params.date && typeof params.date === 'object') {
                const d = params.date as { day?: number; month?: number; year?: number };
                const year = d.year ?? 1970;
                const month = (d.month ?? 1) - 1;
                const day = d.day ?? 1;
                const targetMs = new Date(year, month, day).getTime();
                matches = isBelow ? lastPlayedMs < targetMs : lastPlayedMs >= targetMs;
            } else {
                matches = true;
            }
            break;
        }

        case 'size on disk':
        case 'size': {
            const gbThreshold = Number(params.gbThreshold ?? params.threshold ?? params.size ?? 0);
            const sizeGb = (game.sizeOnDisk ?? 0) / (1024 ** 3);
            const cond = String(params.condition ?? 'above').toLowerCase().trim();
            const isBelow = cond === 'below' || cond === 'less' || cond === '<' || cond === '<=';
            matches = isBelow ? sizeGb <= gbThreshold : sizeGb >= gbThreshold;
            break;
        }

        case 'achievements':
        case 'achievement': {
            const thresh = Number(params.threshold ?? params.completionPercentage ?? 0);
            const threshType = String(params.thresholdType ?? 'percent').toLowerCase().trim();
            const cond = String(params.condition ?? 'above').toLowerCase().trim();
            const isBelow = cond === 'below' || cond === 'less' || cond === '<' || cond === '<=';
            if (!game.achievements) {
                matches = isBelow && thresh === 0;
            } else {
                const val = threshType === 'count'
                    ? game.achievements.achieved
                    : (game.achievements.total > 0 ? (game.achievements.achieved / game.achievements.total) * 100 : 0);
                matches = isBelow ? val <= thresh : val >= thresh;
            }
            break;
        }

        case 'demo': {
            const isDemo = game.name.toLowerCase().includes('demo');
            matches = params.isDemo !== false ? isDemo : !isDemo;
            break;
        }

        case 'merge': {
            if (Array.isArray(params.filters) && params.filters.length > 0) {
                const subMode = params.mode === 'or' ? 'or' : 'and';
                matches = subMode === 'or'
                    ? params.filters.some((sf: TabMasterFilter) => evaluateFilter(game, sf, collectionsMap))
                    : params.filters.every((sf: TabMasterFilter) => evaluateFilter(game, sf, collectionsMap));
            } else {
                matches = true;
            }
            break;
        }

        default:
            matches = true;
            break;
    }

    return filter.inverted ? !matches : matches;
}

/** Evaluates a group of TabMaster filters with and/or logic */
export function evaluateTabMasterFilters(
    games: LibraryGameItem[],
    filters: TabMasterFilter[],
    mode: 'and' | 'or' = 'and',
    collectionsMap?: Map<string, LibraryCollectionItem>
): LibraryGameItem[] {
    if (!filters || filters.length === 0) return games;
    return games.filter((game) => {
        if (mode === 'or') {
            return filters.some((f) => evaluateFilter(game, f, collectionsMap));
        }
        return filters.every((f) => evaluateFilter(game, f, collectionsMap));
    });
}

/**
 * Applies TabMaster tabs ordering, visibility (hidden if position < 0), and custom tabs onto
 * Spotlight Library's categories list. TabMaster exclusively dictates the tabs shown.
 */
export function applyTabMasterCategories(
    baseCategories: LibraryCategory[],
    collections: LibraryCollectionItem[],
    tabMasterData: TabMasterSettingsResult | null,
    allGames?: LibraryGameItem[],
    soundtrackItems?: LibraryGameItem[]
): LibraryCategory[] {
    if (!tabMasterData?.found || !Array.isArray(tabMasterData.tabs) || tabMasterData.tabs.length === 0) {
        return baseCategories;
    }

    const baseMap = new Map<string, LibraryCategory>();
    for (const cat of baseCategories) {
        baseMap.set(cat.id, cat);
    }

    const collectionsMap = new Map<string, LibraryCollectionItem>();
    for (const col of collections) {
        collectionsMap.set(col.id.toLowerCase(), col);
        collectionsMap.set(col.name.toLowerCase(), col);
    }

    // Pool of all regular games for custom filter evaluation
    const gamesPool: LibraryGameItem[] = allGames && allGames.length > 0
        ? allGames
        : (baseMap.get('all')?.games ?? baseMap.get('installed')?.games ?? []);

    // Pool of soundtracks
    const soundtracksPool: LibraryGameItem[] = soundtrackItems && soundtrackItems.length > 0
        ? soundtrackItems
        : (baseMap.get('soundtracks')?.games ?? []);

    const resultCategories: Array<{ position: number; category: LibraryCategory }> = [];
    const usedCategoryIds = new Set<string>();

    const getUniqueCategoryId = (desiredId: string): string => {
        let id = desiredId;
        let suffix = 2;
        while (usedCategoryIds.has(id)) {
            id = `${desiredId}-${suffix++}`;
        }
        usedCategoryIds.add(id);
        return id;
    };

    // Sort tabs by position
    const sortedTabs = [...tabMasterData.tabs].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    for (const tab of sortedTabs) {
        if (!tab || typeof tab !== 'object' || typeof tab.id !== 'string') continue;

        // Position < 0 means hidden in TabMaster
        if (typeof tab.position === 'number' && tab.position < 0) {
            continue;
        }

        const mappedId = normalizeTabMasterId(tab.id);
        const tabTitle = typeof tab.title === 'string' && tab.title.trim().length > 0 ? tab.title.trim() : null;

        // Check if title itself suggests a standard category if id didn't map to one
        let effectiveType = mappedId;
        if (effectiveType === tab.id.toLowerCase()) {
            const titleNormalized = normalizeTabMasterId(tabTitle || '');
            if (titleNormalized !== (tabTitle || '').toLowerCase()) {
                effectiveType = titleNormalized;
            } else {
                const titleLower = (tabTitle || '').toLowerCase();
                if (titleLower === 'steamos compatible' || titleLower === 'steamos-compatible' || titleLower === 'steamos') {
                    effectiveType = 'steamos-compatible';
                } else if (titleLower === 'great on deck' || titleLower === 'great-on-deck') {
                    effectiveType = 'great-on-deck';
                } else if (titleLower === 'great on machine' || titleLower === 'great-on-machine') {
                    effectiveType = 'great-on-machine';
                } else if (titleLower === 'installed' || titleLower === 'instalados') {
                    effectiveType = 'installed';
                } else if (titleLower === 'soundtracks' || titleLower === 'soundtrack' || titleLower === 'music' || titleLower === 'bandas sonoras') {
                    effectiveType = 'soundtracks';
                } else if (titleLower === 'collections' || titleLower === 'my collections' || titleLower === 'colecciones') {
                    effectiveType = 'collections';
                } else if (titleLower === 'favorites' || titleLower === 'favoritos') {
                    effectiveType = 'favorites';
                } else if (titleLower === 'all games' || titleLower === 'all steam games' || titleLower === 'todos los juegos') {
                    effectiveType = 'all';
                } else if (titleLower === 'non-steam' || titleLower === 'non steam' || titleLower === 'no steam') {
                    effectiveType = 'non-steam';
                }
            }
        }

        // 0. Tab with pre-computed appIds (from TabMaster native tree collection or direct list)
        if (Array.isArray(tab.appIds) && tab.appIds.length > 0 && effectiveType !== 'collections') {
            const gameMap = new Map<number, LibraryGameItem>();
            for (const g of gamesPool) gameMap.set(g.appId, g);
            for (const g of soundtracksPool) gameMap.set(g.appId, g);
            let matchedGames: LibraryGameItem[] = [];
            for (const id of tab.appIds) {
                const g = gameMap.get(id);
                if (g) matchedGames.push(g);
            }
            if (tab.autoHide && matchedGames.length === 0) continue;
            matchedGames = sortTabMasterGames(matchedGames, tab);
            const tabIdSafe = tab.id.replace(/[^a-z0-9_-]/gi, '');
            const defaultId = mappedId === tab.id.toLowerCase() ? `tm-${tabIdSafe || 'custom'}` : mappedId;
            const uniqueId = getUniqueCategoryId(defaultId);
            resultCategories.push({
                position: tab.position ?? 0,
                category: {
                    id: uniqueId,
                    name: resolveTabTitle(tabTitle, defaultId, effectiveType).toUpperCase(),
                    count: matchedGames.length,
                    games: matchedGames,
                    isSoundtracksTab: effectiveType === 'soundtracks' || tab.categoriesToInclude === 8192,
                },
            });
            continue;
        }

        // 1. Collections Overview tab special rule: displays collection grid/cards
        const hasSpecificCollectionFilter = Array.isArray(tab.filters) && tab.filters.some((f) => f && f.type === 'collection');
        if (effectiveType === 'collections' && !hasSpecificCollectionFilter) {
            if (tab.autoHide && collections.length === 0) continue;
            const uniqueId = getUniqueCategoryId('collections');
            resultCategories.push({
                position: tab.position ?? 0,
                category: {
                    id: uniqueId,
                    name: resolveTabTitle(tabTitle, 'COLLECTIONS', effectiveType).toUpperCase(),
                    count: collections.length,
                    games: [],
                    collections: collections,
                    isCollectionsTab: true,
                },
            });
            continue;
        }

        // 2. Soundtracks tab special rule: displays soundtrack album items with cover art
        if (effectiveType === 'soundtracks' || tab.categoriesToInclude === 8192) {
            let catGames = soundtracksPool;
            if (Array.isArray(tab.filters) && tab.filters.length > 0) {
                catGames = evaluateTabMasterFilters(catGames, tab.filters, tab.filtersMode ?? 'and', collectionsMap);
            }
            if (tab.autoHide && catGames.length === 0) continue;
            catGames = sortTabMasterGames(catGames, tab);
            const uniqueId = getUniqueCategoryId('soundtracks');
            resultCategories.push({
                position: tab.position ?? 0,
                category: {
                    id: uniqueId,
                    name: resolveTabTitle(tabTitle, 'SOUNDTRACKS', effectiveType).toUpperCase(),
                    count: catGames.length,
                    games: catGames,
                    isSoundtracksTab: true,
                },
            });
            continue;
        }

        // 3. Custom tab targeting a specific user collection
        let customCollection: LibraryCollectionItem | undefined;
        if (Array.isArray(tab.filters)) {
            for (const f of tab.filters) {
                if (f && f.type === 'collection' && f.params) {
                    const colKey = String(f.params.id ?? f.params.collection ?? f.params.name ?? '').toLowerCase();
                    customCollection = collectionsMap.get(colKey);
                    if (customCollection) break;
                }
            }
        }
        if (!customCollection && effectiveType !== 'collections') {
            const idKey = tab.id.toLowerCase();
            const titleKey = tabTitle ? tabTitle.toLowerCase() : '';
            customCollection = collectionsMap.get(idKey) ?? (titleKey ? collectionsMap.get(titleKey) : undefined);
        }

        if (customCollection) {
            let matchedGames = customCollection.games;
            if (Array.isArray(tab.filters) && tab.filters.length > 0) {
                const nonColFilters = tab.filters.filter((f) => f.type !== 'collection');
                if (nonColFilters.length > 0) {
                    matchedGames = evaluateTabMasterFilters(matchedGames, nonColFilters, tab.filtersMode ?? 'and', collectionsMap);
                }
            }
            if (tab.autoHide && matchedGames.length === 0) continue;
            matchedGames = sortTabMasterGames(matchedGames, tab);
            const tabIdSafe = tab.id.replace(/[^a-z0-9_-]/gi, '');
            const uniqueId = getUniqueCategoryId(tab.id.startsWith('tm-') ? tab.id : `tm-${tabIdSafe || 'custom'}`);
            resultCategories.push({
                position: tab.position ?? 0,
                category: {
                    id: uniqueId,
                    name: resolveTabTitle(tabTitle, customCollection.name, effectiveType).toUpperCase(),
                    count: matchedGames.length,
                    games: matchedGames,
                },
            });
            continue;
        }

        // 4. Standard Deck / Machine / SteamOS compatibility categories
        if (effectiveType === 'steamos-compatible') {
            let catGames = (allGames && allGames.length > 0)
                ? gamesPool.filter((g) => g.compat === 3 || g.compat === 2)
                : (gamesPool.filter((g) => g.compat === 3 || g.compat === 2).length > 0
                    ? gamesPool.filter((g) => g.compat === 3 || g.compat === 2)
                    : (baseMap.get('great-on-deck')?.games ?? []));
            if (Array.isArray(tab.filters) && tab.filters.length > 0) {
                catGames = evaluateTabMasterFilters(catGames, tab.filters, tab.filtersMode ?? 'and', collectionsMap);
            }
            if (tab.autoHide && catGames.length === 0) continue;
            catGames = sortTabMasterGames(catGames, tab);
            const uniqueId = getUniqueCategoryId('steamos-compatible');
            resultCategories.push({
                position: tab.position ?? 0,
                category: {
                    id: uniqueId,
                    name: resolveTabTitle(tabTitle, 'STEAMOS COMPATIBLE', effectiveType).toUpperCase(),
                    count: catGames.length,
                    games: catGames,
                },
            });
            continue;
        }

        if (effectiveType === 'great-on-deck') {
            let catGames = (allGames && allGames.length > 0)
                ? gamesPool.filter((g) => g.compat === 3)
                : (baseMap.get('great-on-deck')?.games ?? gamesPool.filter((g) => g.compat === 3));
            if (Array.isArray(tab.filters) && tab.filters.length > 0) {
                catGames = evaluateTabMasterFilters(catGames, tab.filters, tab.filtersMode ?? 'and', collectionsMap);
            }
            if (tab.autoHide && catGames.length === 0) continue;
            catGames = sortTabMasterGames(catGames, tab);
            const uniqueId = getUniqueCategoryId('great-on-deck');
            resultCategories.push({
                position: tab.position ?? 0,
                category: {
                    id: uniqueId,
                    name: resolveTabTitle(tabTitle, 'GREAT ON DECK', effectiveType).toUpperCase(),
                    count: catGames.length,
                    games: catGames,
                },
            });
            continue;
        }

        if (effectiveType === 'great-on-machine') {
            let catGames = (allGames && allGames.length > 0)
                ? gamesPool.filter((g) => g.compat === 3 || g.compat === 2)
                : (gamesPool.filter((g) => g.compat === 3 || g.compat === 2).length > 0
                    ? gamesPool.filter((g) => g.compat === 3 || g.compat === 2)
                    : (baseMap.get('great-on-deck')?.games ?? []));
            if (Array.isArray(tab.filters) && tab.filters.length > 0) {
                catGames = evaluateTabMasterFilters(catGames, tab.filters, tab.filtersMode ?? 'and', collectionsMap);
            }
            if (tab.autoHide && catGames.length === 0) continue;
            catGames = sortTabMasterGames(catGames, tab);
            const uniqueId = getUniqueCategoryId('great-on-machine');
            resultCategories.push({
                position: tab.position ?? 0,
                category: {
                    id: uniqueId,
                    name: resolveTabTitle(tabTitle, 'GREAT ON MACHINE', effectiveType).toUpperCase(),
                    count: catGames.length,
                    games: catGames,
                },
            });
            continue;
        }

        // 5. Other built-in categories (installed, all, favorites, non-steam)
        if (effectiveType === 'installed' || effectiveType === 'all' || effectiveType === 'favorites' || effectiveType === 'non-steam') {
            let baseGames: LibraryGameItem[] = [];
            let defaultName = '';
            if (effectiveType === 'installed') {
                baseGames = baseMap.get('installed')?.games ?? gamesPool.filter((g) => g.installed);
                defaultName = 'INSTALLED';
            } else if (effectiveType === 'all') {
                baseGames = baseMap.get('all')?.games ?? gamesPool.filter((g) => !g.isShortcut);
                defaultName = 'ALL STEAM GAMES';
            } else if (effectiveType === 'favorites') {
                baseGames = baseMap.get('favorites')?.games ?? gamesPool.filter((g) => (g.playedMinutes ?? 0) > 3000);
                defaultName = 'FAVORITES';
            } else if (effectiveType === 'non-steam') {
                baseGames = baseMap.get('non-steam')?.games ?? gamesPool.filter((g) => g.isShortcut);
                defaultName = 'NON-STEAM';
            }

            if (Array.isArray(tab.filters) && tab.filters.length > 0) {
                baseGames = evaluateTabMasterFilters(baseGames, tab.filters, tab.filtersMode ?? 'and', collectionsMap);
            }
            if (tab.autoHide && baseGames.length === 0) continue;
            baseGames = sortTabMasterGames(baseGames, tab);
            const uniqueId = getUniqueCategoryId(effectiveType);
            resultCategories.push({
                position: tab.position ?? 0,
                category: {
                    id: uniqueId,
                    name: resolveTabTitle(tabTitle, defaultName, effectiveType).toUpperCase(),
                    count: baseGames.length,
                    games: baseGames,
                },
            });
            continue;
        }

        // 6. Custom game group with TabMaster filters
        if (Array.isArray(tab.filters) && tab.filters.length > 0) {
            let matchedGames = evaluateTabMasterFilters(gamesPool, tab.filters, tab.filtersMode ?? 'and', collectionsMap);
            if (tab.autoHide && matchedGames.length === 0) continue;
            matchedGames = sortTabMasterGames(matchedGames, tab);
            const rawIdSafe = tab.id.replace(/[^a-z0-9_-]/gi, '');
            const uniqueId = getUniqueCategoryId(`tm-${rawIdSafe || 'custom'}`);
            resultCategories.push({
                position: tab.position ?? 0,
                category: {
                    id: uniqueId,
                    name: resolveTabTitle(tabTitle, tab.id, effectiveType).toUpperCase(),
                    count: matchedGames.length,
                    games: matchedGames,
                },
            });
            continue;
        }

        // 7. Custom tab without filters
        if (!tab.autoHide) {
            const rawIdSafe = tab.id.replace(/[^a-z0-9_-]/gi, '');
            const uniqueId = getUniqueCategoryId(`tm-${rawIdSafe || 'custom'}`);
            resultCategories.push({
                position: tab.position ?? 0,
                category: {
                    id: uniqueId,
                    name: resolveTabTitle(tabTitle, tab.id, effectiveType).toUpperCase(),
                    count: 0,
                    games: [],
                },
            });
        }
    }

    // TabMaster exclusively dictates the tabs shown: do NOT append leftover baseCategories.
    // Fall back to baseCategories only if all tabs were filtered out or empty.
    return resultCategories.length > 0 ? resultCategories.map((r) => r.category) : baseCategories;
}

/** Safely extracts an array of app IDs from a native tab or collection object */
export function extractAppIdsFromTab(t: any): number[] | undefined {
    if (!t || typeof t !== 'object') return undefined;

    const getCollectionApps = (col: any): unknown[] | null => {
        if (!col || typeof col !== 'object') return null;
        if (typeof col.GetVisibleApps === 'function') {
            try {
                const res = col.GetVisibleApps();
                if (Array.isArray(res) && res.length > 0) return res;
            } catch {}
        }
        if (typeof col.visibleApps === 'function') {
            try {
                const res = col.visibleApps();
                if (Array.isArray(res) && res.length > 0) return res;
            } catch {}
        }
        if (Array.isArray(col.visibleApps) && col.visibleApps.length > 0) return col.visibleApps;
        if (Array.isArray(col.m_rgVisibleApps) && col.m_rgVisibleApps.length > 0) return col.m_rgVisibleApps;
        if (Array.isArray(col.asApps) && col.asApps.length > 0) return col.asApps;
        if (typeof col.GetApps === 'function') {
            try {
                const res = col.GetApps();
                if (Array.isArray(res) && res.length > 0) return res;
            } catch {}
        }
        if (Array.isArray(col.allApps) && col.allApps.length > 0) return col.allApps;
        if (Array.isArray(col.apps) && col.apps.length > 0) return col.apps;
        return null;
    };

    const candidates = [
        t.filteredApps,
        getCollectionApps(t.collection),
        getCollectionApps(t.content?.props?.collection),
        getCollectionApps(t.content?.props?.children?.props?.collection),
        t.visibleApps,
        t.appIds,
        t.rgApps,
        t.apps,
    ];

    for (const c of candidates) {
        if (!c) continue;
        const ids: number[] = [];
        if (Array.isArray(c)) {
            for (const item of c) {
                if (typeof item === 'number') {
                    if (Number.isFinite(item) && item > 0) ids.push(item);
                } else if (item && typeof item === 'object') {
                    const id = Number(item.appid ?? item.appId ?? item.m_appid);
                    if (Number.isFinite(id) && id > 0) ids.push(id);
                }
            }
        } else if (c instanceof Map || (typeof c === 'object' && typeof c.keys === 'function')) {
            for (const k of c.keys()) {
                const id = Number(k);
                if (Number.isFinite(id) && id > 0) ids.push(id);
            }
        } else if (c instanceof Set) {
            for (const k of c) {
                const id = Number(k);
                if (Number.isFinite(id) && id > 0) ids.push(id);
            }
        } else if (typeof c === 'object') {
            for (const v of Object.values(c)) {
                if (typeof v === 'number') {
                    if (Number.isFinite(v) && v > 0) ids.push(v);
                } else if (v && typeof v === 'object') {
                    const id = Number((v as any).appid ?? (v as any).appId);
                    if (Number.isFinite(id) && id > 0) ids.push(id);
                }
            }
        }
        if (ids.length > 0) return ids;
    }
    return undefined;
}

/** Extracts live tabs from Steam's native tree if patched by TabMaster */
export function extractTabsFromNativeTree(element: unknown): TabMasterTab[] | null {
    if (!element || typeof element !== 'object') return null;
    try {
        const queue: unknown[] = [element];
        const visited = new Set<unknown>();
        let iterations = 0;
        while (queue.length > 0 && iterations < 80) {
            iterations++;
            const current = queue.shift() as Record<string, unknown> | null;
            if (!current || typeof current !== 'object' || visited.has(current)) continue;
            visited.add(current);

            const props = current.props as Record<string, unknown> | undefined;
            const tabs = props?.tabs;
            if (Array.isArray(tabs) && tabs.length > 0) {
                const isTabMasterPatched = tabs.some(
                    (t: any) =>
                        t &&
                        (typeof t.tabMasterType === 'string' ||
                            Array.isArray(t.filters) ||
                            typeof t.customTitle === 'string' ||
                            t.autoHide !== undefined ||
                            t.footer?.onMenuActionDescription === 'Tab Master' ||
                            t.footer?.onMenuActionDescription === 'TabMaster' ||
                            Boolean(t.renderTabAddon) ||
                            Boolean(t.collection) ||
                            Boolean(t.content?.props?.collection) ||
                            Boolean(t.content?.props?.children?.props?.collection) ||
                            (typeof t.id === 'string' &&
                                (t.id.startsWith('tabmaster') ||
                                    t.id.includes('-custom-') ||
                                    /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(t.id))))
                );
                if (isTabMasterPatched) {
                    return tabs.map((t: Record<string, unknown>, idx: number) => {
                        const appIds = extractAppIdsFromTab(t);
                        const sortMethod =
                            (t as any).sortMethod ??
                            (t as any).sort_method ??
                            (t as any).sort ??
                            (t as any).collection?.sort ??
                            (t as any).collection?.m_sort ??
                            (t as any).collection?.nSortMethod;
                        const bReverseSort = Boolean(
                            (t as any).bReverseSort ??
                            (t as any).reverseSort ??
                            (t as any).collection?.bReverseSort ??
                            (t as any).collection?.m_bReverseSort
                        );
                        const rawTitle = (t as any).customTitle ?? t.title ?? t.id;
                        return {
                            id: String(t.id),
                            title: resolveTabTitle(String(rawTitle)),
                            customTitle: (t as any).customTitle ? String((t as any).customTitle) : undefined,
                            position: typeof t.position === 'number' ? t.position : idx,
                            autoHide: Boolean((t as any).autoHide),
                            filters: Array.isArray((t as any).filters) ? ((t as any).filters as TabMasterFilter[]) : undefined,
                            filtersMode: (t as any).filtersMode as 'and' | 'or' | undefined,
                            categoriesToInclude: typeof (t as any).categoriesToInclude === 'number' ? (t as any).categoriesToInclude : undefined,
                            appIds,
                            sortMethod,
                            bReverseSort,
                        };
                    });
                }
            }

            const children = props?.children;
            if (children) {
                if (Array.isArray(children)) {
                    queue.push(...children);
                } else if (typeof children === 'object') {
                    queue.push(children);
                }
            }
        }
    } catch {
        return null;
    }
    return null;
}

