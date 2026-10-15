import { callable } from '@decky/api';
import { LOG_PREFIX } from '../constants';
import { LibraryCategory, LibraryCollectionItem } from './libraryData';

export interface TabMasterFilter {
    type: string;
    params?: {
        id?: string;
        collection?: string;
        name?: string;
        installed?: boolean;
        regex?: string;
        category?: number;
        platform?: string;
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
    if (tabMasterFetchPromise) {
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

/**
 * Applies TabMaster tabs ordering, visibility (hidden if position < 0), and custom tabs onto
 * Spotlight Library's categories list.
 */
export function applyTabMasterCategories(
    baseCategories: LibraryCategory[],
    collections: LibraryCollectionItem[],
    tabMasterData: TabMasterSettingsResult | null
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

        // Check if this matches a built-in category
        const existingCat = baseMap.get(mappedId);
        if (existingCat) {
            handledCategoryIds.add(mappedId);
            resultCategories.push({
                position: tab.position ?? 0,
                category: {
                    ...existingCat,
                    name: tabTitle ? tabTitle.toUpperCase() : existingCat.name,
                },
            });
            continue;
        }

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
            const idKey = typeof tab.id === 'string' ? tab.id.toLowerCase() : '';
            const titleKey = tabTitle ? tabTitle.toLowerCase() : '';
            customCollection = collectionsMap.get(idKey) ?? (titleKey ? collectionsMap.get(titleKey) : undefined);
        }

        if (customCollection && customCollection.games.length > 0) {
            handledCategoryIds.add(`tm-${tab.id}`);
            const finalTitle = tabTitle || customCollection.name;
            resultCategories.push({
                position: tab.position ?? 0,
                category: {
                    id: `tm-${tab.id}`,
                    name: finalTitle.toUpperCase(),
                    count: customCollection.games.length,
                    games: customCollection.games,
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
