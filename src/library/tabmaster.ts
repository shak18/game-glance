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
    position: number;
    autoHide?: boolean;
    filters?: TabMasterFilter[];
    filtersMode?: 'and' | 'or';
    categoriesToInclude?: number;
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
const TABMASTER_ID_MAP: Record<string, string> = {
    installed: 'installed',
    'local-install': 'installed',
    greatondeck: 'great-on-deck',
    greatonmachine: 'great-on-deck',
    steamoscompatible: 'great-on-deck',
    'great-on-deck': 'great-on-deck',
    'deck-games': 'great-on-deck',
    deckgames: 'great-on-deck',
    allgames: 'all',
    'all-games': 'all',
    all: 'all',
    'type-games': 'all',
    favorites: 'favorites',
    favorite: 'favorites',
    collections: 'collections',
    'my-collections': 'collections',
    nonsteam: 'non-steam',
    'non-steam': 'non-steam',
    'desk-desktop-apps': 'non-steam',
    desktop: 'non-steam',
    soundtracks: 'soundtracks',
    'type-music': 'soundtracks',
    music: 'soundtracks',
};

export function normalizeTabMasterId(rawId: string): string {
    const cleaned = rawId.toLowerCase().trim();
    return TABMASTER_ID_MAP[cleaned] ?? cleaned;
}

/** Evaluates a single TabMaster filter against a game item */
function evaluateFilter(game: LibraryGameItem, filter: TabMasterFilter): boolean {
    if (!filter || !filter.type) return true;
    const params = filter.params ?? {};
    let matches = true;

    switch (filter.type) {
        case 'installed':
            matches = params.installed !== false ? Boolean(game.installed) : !game.installed;
            break;
        case 'whitelist':
            if (Array.isArray(params.games)) {
                matches = params.games.includes(game.appId);
            }
            break;
        case 'blacklist':
            if (Array.isArray(params.games)) {
                matches = !params.games.includes(game.appId);
            }
            break;
        case 'platform':
            if (params.platform === 'non-steam') {
                matches = Boolean(game.isShortcut);
            } else {
                matches = !game.isShortcut;
            }
            break;
        case 'deck compatibility':
            if (typeof params.category === 'number') {
                matches = game.compat === params.category;
            }
            break;
        case 'regex':
            if (typeof params.regex === 'string' && params.regex.length > 0) {
                try {
                    matches = new RegExp(params.regex, 'i').test(game.name);
                } catch {
                    matches = true;
                }
            }
            break;
        case 'time played':
            if (typeof params.timeThreshold === 'number') {
                const minutes = params.units === 'hours' ? params.timeThreshold * 60 : params.timeThreshold;
                matches = params.condition === 'below'
                    ? (game.playedMinutes ?? 0) <= minutes
                    : (game.playedMinutes ?? 0) >= minutes;
            }
            break;
        case 'merge':
            if (Array.isArray(params.filters)) {
                const subMode = params.mode === 'or' ? 'or' : 'and';
                matches = subMode === 'or'
                    ? params.filters.some((sf: TabMasterFilter) => evaluateFilter(game, sf))
                    : params.filters.every((sf: TabMasterFilter) => evaluateFilter(game, sf));
            }
            break;
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
    mode: 'and' | 'or' = 'and'
): LibraryGameItem[] {
    if (!filters || filters.length === 0) return games;
    return games.filter((game) => {
        if (mode === 'or') {
            return filters.some((f) => evaluateFilter(game, f));
        }
        return filters.every((f) => evaluateFilter(game, f));
    });
}

/**
 * Applies TabMaster tabs ordering, visibility (hidden if position < 0), and custom tabs onto
 * Spotlight Library's categories list.
 */
export function applyTabMasterCategories(
    baseCategories: LibraryCategory[],
    collections: LibraryCollectionItem[],
    tabMasterData: TabMasterSettingsResult | null,
    allGames?: LibraryGameItem[]
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

    const resultCategories: Array<{ position: number; category: LibraryCategory }> = [];
    const handledCategoryIds = new Set<string>();

    for (const tab of tabMasterData.tabs) {
        if (!tab || typeof tab !== 'object' || typeof tab.id !== 'string') continue;

        // Position < 0 means hidden in TabMaster
        if (typeof tab.position === 'number' && tab.position < 0) {
            const mappedId = normalizeTabMasterId(tab.id);
            handledCategoryIds.add(mappedId);
            continue;
        }

        const mappedId = normalizeTabMasterId(tab.id);
        const tabTitle = typeof tab.title === 'string' && tab.title.trim().length > 0 ? tab.title.trim() : null;

        // 1. Check if this matches a built-in category
        const existingCat = baseMap.get(mappedId);
        if (existingCat) {
            handledCategoryIds.add(mappedId);
            let catGames = existingCat.games;
            if (Array.isArray(tab.filters) && tab.filters.length > 0) {
                catGames = evaluateTabMasterFilters(catGames, tab.filters, tab.filtersMode ?? 'and');
            }
            resultCategories.push({
                position: tab.position ?? 0,
                category: {
                    ...existingCat,
                    name: tabTitle ? tabTitle.toUpperCase() : existingCat.name,
                    count: catGames.length,
                    games: catGames,
                },
            });
            continue;
        }

        // 2. Custom tab / game group evaluation
        let matchedGames: LibraryGameItem[] = [];

        // Check if this is a custom tab with a collection filter
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

        // Also check if tab.id itself matches a collection id or name
        if (!customCollection) {
            const idKey = tab.id.toLowerCase();
            const titleKey = tabTitle ? tabTitle.toLowerCase() : '';
            customCollection = collectionsMap.get(idKey) ?? (titleKey ? collectionsMap.get(titleKey) : undefined);
        }

        if (customCollection) {
            matchedGames = customCollection.games;
            if (Array.isArray(tab.filters) && tab.filters.length > 1) {
                const nonColFilters = tab.filters.filter((f) => f.type !== 'collection');
                if (nonColFilters.length > 0) {
                    matchedGames = evaluateTabMasterFilters(matchedGames, nonColFilters, tab.filtersMode ?? 'and');
                }
            }
        } else if (Array.isArray(tab.filters) && tab.filters.length > 0) {
            // Evaluate custom TabMaster filters (installed, deck compat, platform, whitelist, regex, etc.)
            matchedGames = evaluateTabMasterFilters(gamesPool, tab.filters, tab.filtersMode ?? 'and');
        }

        // If autoHide is set and no games matched, skip tab
        if (tab.autoHide && matchedGames.length === 0) {
            continue;
        }

        if (matchedGames.length > 0 || !tab.autoHide) {
            const finalTitle = tabTitle || customCollection?.name || tab.id;
            handledCategoryIds.add(`tm-${tab.id}`);
            resultCategories.push({
                position: tab.position ?? 0,
                category: {
                    id: `tm-${tab.id}`,
                    name: finalTitle.toUpperCase(),
                    count: matchedGames.length,
                    games: matchedGames,
                },
            });
        }
    }

    // If TabMaster didn't define settings for some base categories, append them at the end
    // so user content isn't lost if TabMaster only configured a subset of tabs.
    for (const cat of baseCategories) {
        if (!handledCategoryIds.has(cat.id)) {
            resultCategories.push({
                position: 999,
                category: cat,
            });
        }
    }

    // Sort according to TabMaster position
    resultCategories.sort((a, b) => a.position - b.position);

    const finalCategories = resultCategories.map((r) => r.category);
    return finalCategories.length > 0 ? finalCategories : baseCategories;
}

/** Extracts live tabs from Steam's native tree if patched by TabMaster */
export function extractTabsFromNativeTree(element: unknown): TabMasterTab[] | null {
    if (!element || typeof element !== 'object') return null;
    try {
        const queue: unknown[] = [element];
        const visited = new Set<unknown>();
        let iterations = 0;
        while (queue.length > 0 && iterations < 60) {
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
                            (typeof t.id === 'string' && (t.id.startsWith('tabmaster') || t.id.includes('-custom-'))))
                );
                if (isTabMasterPatched) {
                    return tabs.map((t: Record<string, unknown>, idx: number) => ({
                        id: String(t.id),
                        title: String(t.customTitle ?? t.title ?? t.id),
                        position: typeof t.position === 'number' ? t.position : idx,
                        autoHide: Boolean(t.autoHide),
                        filters: Array.isArray(t.filters) ? (t.filters as TabMasterFilter[]) : undefined,
                        filtersMode: t.filtersMode as 'and' | 'or' | undefined,
                    }));
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

