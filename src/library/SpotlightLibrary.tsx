import { RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Focusable, GamepadButton, GamepadEvent, Navigation } from '@decky/ui';
import { LOG_PREFIX } from '../constants';
import { cache } from '../data/cache';
import { HltbResult, lookupHltb } from '../data/hltb';
import { settings, useSettings } from '../data/settings';
import { getDescription, peekSteamLanguage } from '../data/steam';
import { openGameActions } from './gameActions';
import { accentFor, DEFAULT_ACCENT, legibleAccent } from './accent';
import { sampleAccent } from './accentSample';
import { browserStores, guessedHeroUrls, heroUrls as getHeroUrls, useArtworkVersion } from './artwork';
import { playNavSound } from './navSound';
import { LibraryBackground } from './LibraryBackground';
import { LibraryCategoryBar } from './LibraryCategoryBar';
import { mountOpenBridge, RETURN_TIMINGS, steamEnterOffCss } from './libraryTransition';
import { libraryCanvas, usableSize } from './libraryScale';
import { cardArtMemo, LibraryGrid } from './LibraryGrid';
import { LibraryInspector } from './LibraryInspector';
import { CollectionArtModal } from './CollectionArtModal';
import { preloadPresetIcons } from './enhancedCollection';
import { LIBRARY_CSS } from './libraryCss';
import { LibraryStatusBar } from './LibraryStatusBar';
import { buildCategories, LibraryCategory, LibraryCollectionItem, LibraryGameItem } from './libraryData';
import { getNextSortMode, sortCollections, sortGames } from './librarySort';
import { markLeavingLibrary, noteLibrary, resetLibraryMemory, takeLibraryRestore } from './libraryMemory';
import {
    extractTabsFromNativeTree,
    fetchTabMasterSettings,
    getCachedTabMasterSettings,
    TabMasterSettingsResult,
} from './tabmaster';

interface BoxSize {
    width: number;
    height: number;
}

function useBoxSize(ref: RefObject<HTMLDivElement | null>): BoxSize | null {
    const [size, setSize] = useState<BoxSize | null>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const view = (el.ownerDocument?.defaultView ?? null) as (Window & { ResizeObserver?: typeof ResizeObserver }) | null;
        const measure = () => {
            try {
                const rect = { width: el.offsetWidth, height: el.offsetHeight };
                if (!usableSize(rect.width, rect.height)) return;
                setSize((old) => (old && old.width === rect.width && old.height === rect.height ? old : { width: rect.width, height: rect.height }));
            } catch {
                // keep the last size
            }
        };
        measure();
        let observer: ResizeObserver | null = null;
        try {
            const Observer = view?.ResizeObserver ?? (typeof ResizeObserver === 'function' ? ResizeObserver : undefined);
            if (Observer) {
                observer = new Observer(() => measure());
                observer.observe(el);
            }
        } catch {
            observer = null;
        }
        if (!observer) {
            try {
                view?.addEventListener('resize', measure);
            } catch {
                // no way to follow resizes
            }
        }
        return () => {
            try {
                if (observer) observer.disconnect();
                else view?.removeEventListener('resize', measure);
            } catch {
                // window already gone
            }
        };
    }, [ref]);
    return size;
}

interface SpotlightLibraryProps {
    mockGames?: LibraryGameItem[];
    compact?: boolean;
    fallbackTree?: ReactElement | null;
}

/** Launch source 100 is Steam's Big Picture library launch source */
const LAUNCH_SOURCE = 100;

function runGameId(appId: number, shortcutGameId: string | undefined): string {
    return typeof shortcutGameId === 'string' && shortcutGameId.length > 0 ? shortcutGameId : String(appId);
}

/**
 * If the user scrolled the library grid using mouse wheel or touch gestures, the currently
 * selected card may have moved out of the viewport. When resuming keyboard/gamepad navigation,
 * this reconciles the active focus to the topmost visible card instead of abruptly jumping back.
 */
export function getReconciledSelectedIndex(currentIdx: number, totalCount: number): number {
    if (typeof document === 'undefined' || totalCount <= 0) return currentIdx;
    const container = document.querySelector('.sgl-grid-panel');
    if (!container) return currentIdx;

    const cards = container.querySelectorAll('.sgl-card, .sgl-card-collection');
    if (cards.length === 0) return currentIdx;

    const currentCard = cards[currentIdx];
    if (currentCard) {
        const cRect = container.getBoundingClientRect();
        const elRect = currentCard.getBoundingClientRect();
        if (elRect.bottom >= cRect.top + 20 && elRect.top <= cRect.bottom - 20) {
            return currentIdx;
        }
    }

    const cRect = container.getBoundingClientRect();
    for (let i = 0; i < cards.length; i++) {
        const cardRect = cards[i].getBoundingClientRect();
        if (cardRect.bottom > cRect.top + 20 && cardRect.top < cRect.bottom - 20) {
            return i;
        }
    }

    return currentIdx;
}

export function libraryOpenArt(game: LibraryGameItem): string[] {
    const urls: string[] = [];
    const memoArt = cardArtMemo.get(game.appId);
    if (memoArt) {
        if (memoArt.mode === 'banner' && memoArt.url) {
            urls.push(memoArt.url);
        } else if (memoArt.mode === 'hero-logo' && memoArt.heroUrl) {
            urls.push(memoArt.heroUrl);
        } else if (memoArt.mode === 'hero' && memoArt.heroUrl) {
            urls.push(memoArt.heroUrl);
        } else if (memoArt.mode === 'poster' && memoArt.url) {
            urls.push(memoArt.url);
        }
    }
    if (game.landscapeUrl) urls.push(game.landscapeUrl);
    if (game.heroUrl) urls.push(game.heroUrl);
    if (game.capsuleUrl) urls.push(game.capsuleUrl);
    try {
        const heroes = getHeroUrls(game.appId, browserStores);
        for (const u of heroes) {
            if (!urls.includes(u)) urls.push(u);
        }
    } catch {
        // fallback
    }
    return urls;
}

let activeLibraryBridge: { cancel(): void } | null = null;

export function cancelLibraryOpen() {
    activeLibraryBridge?.cancel();
    activeLibraryBridge = null;
}

const SGL_BRIDGE_DROP = [
    '.sgl-header',
    '.sgl-inspector',
    '.sgl-grid-panel',
    '.sgl-category-bar',
    '.sgl-grid-viewport',
];

export function openLibraryGameDetails(game: LibraryGameItem, _sourceEl?: HTMLElement | null) {
    playNavSound('IntoGameDetail');
    markLeavingLibrary();
    try {
        Navigation.Navigate(`/library/app/${game.appId}`);
    } catch {
        // ignore
    }
}

export function SpotlightLibrary({ mockGames, compact, fallbackTree }: SpotlightLibraryProps) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const size = useBoxSize(rootRef);
    const canvas = libraryCanvas(size?.width ?? 0, size?.height ?? 0);
    const currentSettings = useSettings();
    const userSelectedTabRef = useRef(false);

    const [tabMasterData, setTabMasterData] = useState<TabMasterSettingsResult | null>(() => {
        if (fallbackTree) {
            const liveTabs = extractTabsFromNativeTree(fallbackTree);
            if (liveTabs && liveTabs.length > 0) {
                return { found: true, tabs: liveTabs };
            }
        }
        return getCachedTabMasterSettings();
    });

    useEffect(() => {
        if (!currentSettings.tabMasterSync) {
            setTabMasterData(null);
            return;
        }
        let active = true;

        if (fallbackTree) {
            const liveTabs = extractTabsFromNativeTree(fallbackTree);
            if (liveTabs && liveTabs.length > 0) {
                console.log(`${LOG_PREFIX} TabMaster: sync from nativeTree (${liveTabs.length} tabs)`);
                setTabMasterData({ found: true, tabs: liveTabs });
                return;
            }
        }

        fetchTabMasterSettings(true).then((data) => {
            if (active && data) {
                console.log(`${LOG_PREFIX} TabMaster: sync from disk (${data.tabs?.length ?? 0} tabs, found=${data.found})`);
                setTabMasterData(data);
            }
        });
        return () => {
            active = false;
        };
    }, [currentSettings.tabMasterSync, fallbackTree]);

    const effectiveTabMasterData = currentSettings.tabMasterSync ? tabMasterData : null;
    const categories: LibraryCategory[] = useMemo(
        () => buildCategories(mockGames, effectiveTabMasterData),
        [mockGames, effectiveTabMasterData]
    );

    // Memory restore on mount
    const restoreRef = useRef(takeLibraryRestore());
    const initialRestore = restoreRef.current;

    // Back from a page (B): suppress Steam's page enter fade and fade in library UI
    const [back, setBack] = useState(initialRestore !== null);
    useEffect(() => {
        if (!back) return undefined;
        const timer = setTimeout(() => setBack(false), RETURN_TIMINGS.hold);
        return () => clearTimeout(timer);
    }, [back]);
    const enterOff = useMemo(() => (back ? steamEnterOffCss() : ''), [back]);

    const initialCatId = useMemo(() => {
        if (initialRestore && categories.some((c) => c.id === initialRestore.categoryId)) {
            return initialRestore.categoryId;
        }
        return categories[0]?.id ?? 'installed';
    }, [categories, initialRestore]);

    const [activeCategoryId, setActiveCategoryId] = useState<string>(initialCatId);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(initialRestore?.subCollectionId ?? null);

    // Synchronize activeCategoryId if categories change (e.g. TabMaster async load)
    useEffect(() => {
        if (categories.length === 0) return;
        const currentExists = categories.some((c) => c.id === activeCategoryId);
        if (!currentExists) {
            setActiveCategoryId(categories[0].id);
        } else if (!userSelectedTabRef.current && !initialRestore && categories[0]?.id && activeCategoryId !== categories[0].id) {
            setActiveCategoryId(categories[0].id);
        }
    }, [categories, activeCategoryId, initialRestore]);

    const activeCategory = useMemo(() => {
        return categories.find((c) => c.id === activeCategoryId) ?? categories[0];
    }, [categories, activeCategoryId]);

    const isCollectionsTab = Boolean(
        activeCategory?.isCollectionsTab ||
        activeCategory?.id === 'collections' ||
        (activeCategory?.collections && activeCategory.collections.length > 0 && (!activeCategory.games || activeCategory.games.length === 0))
    );
    const isInsideSubCollection = isCollectionsTab && Boolean(selectedCollectionId);
    const isCollectionsView = isCollectionsTab && !isInsideSubCollection;

    const gameColumns = Math.min(7, Math.max(3, currentSettings.libraryGridColumns ?? 3));
    const collectionColumns = Math.min(8, Math.max(3, currentSettings.libraryCollectionColumns ?? 5));
    const columns = isCollectionsView ? collectionColumns : gameColumns;

    const activeSubCollection: LibraryCollectionItem | null = useMemo(() => {
        if (!isInsideSubCollection || !selectedCollectionId) return null;
        return activeCategory?.collections?.find((c) => String(c.id) === String(selectedCollectionId) || c.name === selectedCollectionId) ?? null;
    }, [isInsideSubCollection, activeCategory, selectedCollectionId]);

    const sortMode = currentSettings.librarySort ?? 'recent';

    const handleCycleSort = useCallback(() => {
        const nextSort = getNextSortMode(sortMode);
        void settings.setLibrarySort(nextSort);
        playNavSound('ChangeTabs');
        setSelectedGameIdx(0);
    }, [sortMode]);

    // Items list for current view: games in standard categories or sub-collection; collections in collections overview
    const currentGames: LibraryGameItem[] = useMemo(() => {
        const rawGames = isCollectionsTab
            ? (activeSubCollection?.games ?? [])
            : (activeCategory?.games ?? []);
        return sortGames(rawGames, sortMode);
    }, [isCollectionsTab, activeSubCollection, activeCategory, sortMode]);

    const currentCollections: LibraryCollectionItem[] = useMemo(() => {
        if (isCollectionsTab && !isInsideSubCollection) {
            const rawCols = activeCategory?.collections ?? [];
            return sortCollections(rawCols, sortMode);
        }
        return [];
    }, [isCollectionsTab, isInsideSubCollection, activeCategory, sortMode]);

    const totalItemsCount = isCollectionsTab && !isInsideSubCollection ? currentCollections.length : currentGames.length;

    const initialGameIdx = useMemo(() => {
        if (initialRestore) {
            if (initialRestore.appId && currentGames.length > 0) {
                const found = currentGames.findIndex((g) => g.appId === initialRestore.appId);
                if (found >= 0) return found;
            }
            if (isCollectionsTab && !initialRestore.subCollectionId && currentCollections.length > 0) {
                const colIdx = initialRestore.collectionIndex ?? 0;
                if (colIdx >= 0 && colIdx < currentCollections.length) return colIdx;
            }
        }
        return 0;
    }, [currentGames, currentCollections, isCollectionsTab, initialRestore]);

    const [selectedGameIdx, setSelectedGameIdx] = useState<number>(initialGameIdx);
    const [focusZone, setFocusZone] = useState<'grid' | 'tabs'>(initialRestore?.focusZone ?? 'grid');

    const selectedGame: LibraryGameItem | null = currentGames[selectedGameIdx] ?? null;
    const selectedCollectionItem: LibraryCollectionItem | null = currentCollections[selectedGameIdx] ?? null;
    const [customizingCollection, setCustomizingCollection] = useState<LibraryCollectionItem | null>(null);
    const customizingColRef = useRef<LibraryCollectionItem | null>(null);
    useEffect(() => {
        customizingColRef.current = customizingCollection;
    }, [customizingCollection]);

    const prevCustomizingColIdRef = useRef<string | number | null>(null);
    const modalGamepadHandlerRef = useRef<((evt: GamepadEvent) => void) | null>(null);
    const modalKeyDownHandlerRef = useRef<((evt: KeyboardEvent) => void) | null>(null);
    const lastNavTimeRef = useRef<number>(0);

    const handleCloseModal = useCallback(() => {
        const targetColId = customizingColRef.current?.id ?? customizingCollection?.id;
        setCustomizingCollection(null);
        if (targetColId) {
            const foundIdx = currentCollections.findIndex(
                (c) => String(c.id) === String(targetColId) || c.name === targetColId
            );
            if (foundIdx >= 0) {
                setSelectedGameIdx(foundIdx);
            }
            setFocusZone('grid');
        }
    }, [currentCollections, customizingCollection]);

    // When modal closes, restore focus specifically to the collection card that was customized
    useEffect(() => {
        if (customizingCollection) {
            prevCustomizingColIdRef.current = customizingCollection.id;
            return undefined;
        }
        if (prevCustomizingColIdRef.current !== null) {
            const targetColId = prevCustomizingColIdRef.current;
            prevCustomizingColIdRef.current = null;
            setFocusZone('grid');

            const restoreFocus = () => {
                const targetCard = (
                    document.querySelector(`.sgl-card-collection[data-collection-id="${targetColId}"]`) ??
                    document.querySelector('.sgl-card-collection.focused')
                ) as HTMLElement | null;
                targetCard?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
                targetCard?.focus?.();
            };

            requestAnimationFrame(restoreFocus);
            const t1 = setTimeout(restoreFocus, 30);
            const t2 = setTimeout(restoreFocus, 100);
            return () => {
                clearTimeout(t1);
                clearTimeout(t2);
            };
        }
        return undefined;
    }, [customizingCollection]);

    useEffect(() => {
        preloadPresetIcons().catch(() => {});
    }, []);

    // Reset game index when category changes
    const selectCategory = useCallback((id: string) => {
        userSelectedTabRef.current = true;
        setActiveCategoryId(id);
        setSelectedCollectionId(null);
        setSelectedGameIdx(0);
        const gridPanel = document.querySelector('.sgl-grid-panel');
        if (gridPanel) {
            gridPanel.scrollTop = 0;
        }
        playNavSound();
    }, []);

    // Select specific sub-collection directly (e.g. from top nav tab)
    const selectSubCollection = useCallback((colId: string) => {
        setSelectedCollectionId(colId);
        setSelectedGameIdx(0);
        const gridPanel = document.querySelector('.sgl-grid-panel');
        if (gridPanel) {
            gridPanel.scrollTop = 0;
        }
        playNavSound();
    }, []);

    // Tab / Collection bumper cycling
    const cycleCategory = useCallback((direction: -1 | 1) => {
        // When inside a sub-collection, bumpers cycle between available collections
        if (isInsideSubCollection && activeCategory?.collections && activeCategory.collections.length > 0) {
            const cols = activeCategory.collections;
            const curIdx = cols.findIndex((c) => c.id === selectedCollectionId);
            const nextIdx = (curIdx + direction + cols.length) % cols.length;
            setSelectedCollectionId(cols[nextIdx].id);
            setSelectedGameIdx(0);
            const gridPanel = document.querySelector('.sgl-grid-panel');
            if (gridPanel) {
                gridPanel.scrollTop = 0;
            }
            playNavSound();
            return;
        }

        const curIdx = categories.findIndex((c) => c.id === activeCategoryId);
        if (curIdx < 0) return;
        const nextIdx = (curIdx + direction + categories.length) % categories.length;
        selectCategory(categories[nextIdx].id);
    }, [isInsideSubCollection, activeCategory, selectedCollectionId, categories, activeCategoryId, selectCategory]);

    const isExitingHomeRef = useRef(false);
    const [isLeaving, setIsLeaving] = useState(false);

    // Save position whenever leaving or unmounting (so Steam sub-screens like Properties restore exact state)
    useEffect(() => {
        return () => {
            if (!isExitingHomeRef.current) {
                markLeavingLibrary();
            }
        };
    }, []);

    const navigateHome = useCallback(() => {
        if (isExitingHomeRef.current) return;
        isExitingHomeRef.current = true;
        setIsLeaving(true);
        resetLibraryMemory();
        if (rootRef.current) {
            rootRef.current.classList.add('sgl-leaving');
            rootRef.current.setAttribute('data-sgl-leaving', 'true');
        }
        setTimeout(() => {
            try {
                if (rootRef.current) {
                    const bridge = mountOpenBridge(rootRef.current, steamEnterOffCss(), [], SGL_BRIDGE_DROP);
                    bridge.fadeOut(240);
                    setTimeout(() => bridge.remove(), 290);
                }
            } catch {}
            try {
                Navigation.Navigate('/library/home');
            } catch {
                try {
                    Navigation.Navigate('/');
                } catch {}
            }
        }, 200);
    }, []);

    // Open a collection to view its games
    const handleOpenCollection = useCallback((col: LibraryCollectionItem | null = selectedCollectionItem) => {
        if (!col || typeof col !== 'object') return;
        const colId = col.id !== undefined ? String(col.id) : (col.name ? String(col.name) : '');
        if (!colId) return;
        setSelectedCollectionId(colId);
        setSelectedGameIdx(0);
        const gridPanel = document.querySelector('.sgl-grid-panel');
        if (gridPanel) {
            gridPanel.scrollTop = 0;
        }
        playNavSound();
    }, [selectedCollectionItem]);

    // Back to collections list
    const handleBackToCollections = useCallback(() => {
        if (!isInsideSubCollection) return;
        const prevIdx = activeCategory?.collections?.findIndex((c) => String(c.id) === String(selectedCollectionId) || c.name === selectedCollectionId) ?? 0;
        setSelectedCollectionId(null);
        setSelectedGameIdx(Math.max(0, prevIdx));
        playNavSound();
    }, [isInsideSubCollection, activeCategory, selectedCollectionId]);

    // Keep memory updated with latest position
    useEffect(() => {
        noteLibrary({
            categoryId: activeCategoryId,
            subCollectionId: selectedCollectionId,
            appId: selectedGame?.appId ?? 0,
            collectionIndex: isCollectionsTab && !selectedCollectionId ? selectedGameIdx : 0,
            focusZone,
        });
    }, [activeCategoryId, selectedCollectionId, selectedGame?.appId, selectedGameIdx, isCollectionsTab, focusZone]);

    // Asynchronous details for selected game (HLTB, Description, Accent)
    const artworkVersion = useArtworkVersion();
    const [gameAccent, setGameAccent] = useState<string>(selectedGame?.accent ?? DEFAULT_ACCENT);
    const [gameDesc, setGameDesc] = useState<string | null>(selectedGame?.description ?? null);
    const [gameHltb, setGameHltb] = useState<HltbResult | null>(null);

    // Resolve hero candidate URLs for ambient background (includes custom, local, and Steam CDN fallbacks)
    const heroCandidates = useMemo(() => {
        if (isCollectionsTab && !isInsideSubCollection && selectedCollectionItem) {
            const games = Array.isArray(selectedCollectionItem.games) ? selectedCollectionItem.games : [];
            const firstGame = games[0];
            if (!firstGame) return [];
            if (firstGame.heroUrl) return [firstGame.heroUrl];
            const heroes = getHeroUrls(firstGame.appId, browserStores);
            return [...heroes, ...guessedHeroUrls(firstGame.appId)];
        }
        if (!selectedGame) return [];
        if (selectedGame.heroUrl) return [selectedGame.heroUrl];
        const heroes = getHeroUrls(selectedGame.appId, browserStores);
        return [...heroes, ...guessedHeroUrls(selectedGame.appId)];
    }, [selectedGame, isCollectionsTab, isInsideSubCollection, selectedCollectionItem, artworkVersion]);

    // Keep parent containers pinned at scrollLeft 0 (guards against layout shifts)
    useEffect(() => {
        const el = document.querySelector('.sgl-root') as HTMLElement | null;
        let parent: HTMLElement | null = el;
        while (parent) {
            if (parent.scrollLeft !== 0) {
                parent.scrollLeft = 0;
            }
            parent = parent.parentElement;
        }
    }, [activeCategoryId, selectedGameIdx]);

    useEffect(() => {
        if (!selectedGame) return;

        // Reset details for new game
        setGameAccent(selectedGame.accent ?? DEFAULT_ACCENT);
        setGameDesc(selectedGame.description ?? null);
        setGameHltb(null);

        let cancelled = false;

        // Sample accent color
        if (!selectedGame.accent) {
            accentFor(selectedGame.appId, { cache, sample: sampleAccent })
                .then((color) => {
                    if (!cancelled) setGameAccent(color);
                })
                .catch(() => {});
        }

        // Fetch description if not already present
        if (!selectedGame.description) {
            const lang = peekSteamLanguage() ?? 'english';
            getDescription(selectedGame.appId, lang)
                .then((desc) => {
                    if (!cancelled) setGameDesc(desc);
                })
                .catch(() => {});
        }

        // Fetch HLTB stats
        lookupHltb({
            appId: selectedGame.appId,
            name: selectedGame.name,
            isShortcut: selectedGame.isShortcut,
        })
            .then((result) => {
                if (!cancelled) setGameHltb(result);
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [selectedGame, artworkVersion]);

    // Primary action: Open game details (A button) with zoom-into-fullscreen transition
    const handleDetails = useCallback((gameToShow: LibraryGameItem | null = selectedGame, sourceEl?: HTMLElement | null) => {
        const game = gameToShow ?? selectedGame;
        if (!game) return;
        setIsLeaving(true);
        openLibraryGameDetails(game, sourceEl ?? rootRef.current);
    }, [selectedGame]);

    // Secondary action: Play game (Y button)
    const handlePlayGame = useCallback((gameToPlay: LibraryGameItem | null = selectedGame) => {
        if (!gameToPlay) return;
        markLeavingLibrary();
        try {
            const steamClient = (globalThis as unknown as { SteamClient?: { Apps?: { RunGame?(id: string, opts: string, param: number, src: number): void } } }).SteamClient;
            if (typeof steamClient?.Apps?.RunGame === 'function') {
                steamClient.Apps.RunGame(runGameId(gameToPlay.appId, gameToPlay.gameId), '', -1, LAUNCH_SOURCE);
                return;
            }
        } catch (error) {
            console.warn(`${LOG_PREFIX} SpotlightLibrary: RunGame failed`, error);
        }
        // Fallback: navigate to app page
        try {
            Navigation.Navigate(`/library/app/${gameToPlay.appId}`);
        } catch {
            // ignore
        }
    }, [selectedGame]);

    // Selection with sound feedback
    const handleSelectGame = useCallback((index: number) => {
        setSelectedGameIdx(index);
        setFocusZone('grid');
        playNavSound();
    }, []);

    // Context menu on right-click (matching Controller START button behavior)
    const handleContextMenu = useCallback((game: LibraryGameItem, index: number, anchorEl: HTMLElement) => {
        setSelectedGameIdx(index);
        setFocusZone('grid');
        playNavSound();
        markLeavingLibrary();
        openGameActions(game.appId, anchorEl);
    }, []);

    // Activation debounce and mount guard
    const mountTimeRef = useRef(Date.now());
    const lastActivateRef = useRef(0);

    const onActivate = useCallback(() => {
        const now = Date.now();
        // Swallow activations within 400ms of mount (prevents double-tap on enter from launching immediately)
        if (now - mountTimeRef.current < 400) return;
        if (now - lastActivateRef.current < 800) return;
        lastActivateRef.current = now;

        if (isCollectionsTab && !isInsideSubCollection) {
            handleOpenCollection();
            return;
        }

        const sourceCard = (
            document.querySelector('.sgl-card.focused') ??
            document.querySelector(`.sgl-card[data-app-id="${selectedGame?.appId}"]`) ??
            document.querySelector('.sgl-poster-wrapper')
        ) as HTMLElement | null;

        handleDetails(selectedGame, sourceCard);
    }, [handleDetails, handleOpenCollection, isCollectionsTab, isInsideSubCollection, selectedGame]);

    // Activation on the Focusable root container. Guard against synthetic/bubbled mouse pointer clicks
    // so mouse clicks on background or items never trigger an accidental launch of the selected game.
    const handleRootActivate = useCallback((e?: unknown) => {
        if (customizingColRef.current || customizingCollection) {
            return;
        }
        if (e && typeof e === 'object') {
            const evt = e as { type?: string; clientX?: number; clientY?: number; pointerType?: string };
            if (evt.type === 'click' || evt.pointerType === 'mouse' || evt.pointerType === 'touch') {
                return;
            }
            if (typeof evt.clientX === 'number' && typeof evt.clientY === 'number' && (evt.clientX > 0 || evt.clientY > 0)) {
                return;
            }
        }
        onActivate();
    }, [onActivate, customizingCollection]);

    const onCancel = useCallback(() => {
        if (isLeaving || isExitingHomeRef.current) return;
        if (customizingColRef.current || customizingCollection) {
            handleCloseModal();
            return;
        }
        cancelLibraryOpen();
        if (isInsideSubCollection) {
            handleBackToCollections();
            return;
        }
        if (focusZone === 'grid') {
            setFocusZone('tabs');
            playNavSound();
            return;
        }
        // At root tabs level: nowhere else to go back inside Library -> take user to Home
        navigateHome();
    }, [focusZone, handleBackToCollections, isInsideSubCollection, navigateHome, isLeaving, customizingCollection, handleCloseModal]);

    // Gamepad controller event handler for Decky's Focusable tree
    const onGamepadButtonDown = useCallback((evt: GamepadEvent) => {
        try {
            if (isLeaving || isExitingHomeRef.current) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                return;
            }
            if (customizingColRef.current || customizingCollection) {
                if (modalGamepadHandlerRef.current) {
                    modalGamepadHandlerRef.current(evt);
                }
                evt.preventDefault?.();
                evt.stopPropagation?.();
                return;
            }
            const btn = Number(evt?.detail?.button);
            const now = Date.now();

            // Ignore inputs within 400ms of mount
            if (now - mountTimeRef.current < 400) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                return;
            }

            // Bumpers: L1 (5) and R1 (6)
            if (btn === GamepadButton.BUMPER_LEFT || btn === 5) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                cycleCategory(-1);
                return;
            }
            if (btn === GamepadButton.BUMPER_RIGHT || btn === 6) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                cycleCategory(1);
                return;
            }

            // START / Options / View Menu: Open Steam Game Options Menu (START = 14, SELECT = 13)
            if (btn === GamepadButton.START || btn === 14 || btn === GamepadButton.SELECT || btn === 13) {
                if (isCollectionsTab && !isInsideSubCollection) {
                    if (selectedCollectionItem) {
                        evt.preventDefault?.();
                        evt.stopPropagation?.();
                        setCustomizingCollection(selectedCollectionItem);
                        return;
                    }
                }
                if (selectedGame) {
                    evt.preventDefault?.();
                    evt.stopPropagation?.();
                    const cardEl = (
                        document.querySelector(`.sgl-card[data-app-id="${selectedGame.appId}"]`) ??
                        document.querySelectorAll('.sgl-card')[selectedGameIdx] ??
                        document.querySelector('.sgl-card.focused') ??
                        document.querySelector('.sgl-inspector') ??
                        document.querySelector('.sgl-root') ??
                        document.body
                    ) as HTMLElement;
                    markLeavingLibrary();
                    openGameActions(selectedGame.appId, cardEl);
                    return;
                }
            }

            // Y Button: Play / Launch for games; Customize Art for collections (OPTIONS = 4)
            if (btn === GamepadButton.OPTIONS || btn === 4) {
                if (isCollectionsTab && !isInsideSubCollection) {
                    if (selectedCollectionItem) {
                        evt.preventDefault?.();
                        evt.stopPropagation?.();
                        setCustomizingCollection(selectedCollectionItem);
                    }
                    return;
                }
                evt.preventDefault?.();
                evt.stopPropagation?.();
                handlePlayGame();
                return;
            }

            // X Button: Customize Art for collections (SECONDARY = 3)
            if (btn === GamepadButton.SECONDARY || btn === 3) {
                if (isCollectionsTab && !isInsideSubCollection && selectedCollectionItem) {
                    evt.preventDefault?.();
                    evt.stopPropagation?.();
                    setCustomizingCollection(selectedCollectionItem);
                    return;
                }
            }

            // A Button: Details / Open Collection (OK = 1 in GamepadButton, or 0 in ControllerInputGamepadButton / raw Gamepad API)
            if (btn === GamepadButton.OK || btn === 1 || btn === 0) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                onActivate();
                return;
            }

            // B Button: Cancel (CANCEL = 2) - returns to collections list, to tabs, or to Home screen
            if (btn === GamepadButton.CANCEL || btn === 2) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                onCancel();
                return;
            }

            // D-Pad and Left Stick Navigation
            if (btn === GamepadButton.DIR_LEFT || btn === 11) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                lastNavTimeRef.current = Date.now();
                if (focusZone === 'tabs') {
                    cycleCategory(-1);
                } else if (totalItemsCount > 0) {
                    if (selectedGameIdx > 0) {
                        handleSelectGame(selectedGameIdx - 1);
                    }
                }
                return;
            }

            if (btn === GamepadButton.DIR_RIGHT || btn === 12) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                lastNavTimeRef.current = Date.now();
                if (focusZone === 'tabs') {
                    cycleCategory(1);
                } else if (totalItemsCount > 0) {
                    if (selectedGameIdx < totalItemsCount - 1) {
                        handleSelectGame(selectedGameIdx + 1);
                    }
                }
                return;
            }

            if (btn === GamepadButton.DIR_UP || btn === 9) {
                if (focusZone === 'grid') {
                    evt.preventDefault?.();
                    evt.stopPropagation?.();
                    lastNavTimeRef.current = Date.now();
                    if (selectedGameIdx >= columns) {
                        handleSelectGame(selectedGameIdx - columns);
                    } else {
                        setFocusZone('tabs');
                        playNavSound();
                    }
                    return;
                }
                // When ALREADY in tabs: DO NOT preventDefault or stopPropagation!
                // Allow Steam's native spatial navigator to move focus UP into the top header (Search bar)!
                return;
            }

            if (btn === GamepadButton.DIR_DOWN || btn === 10) {
                evt.preventDefault?.();
                evt.stopPropagation?.();
                lastNavTimeRef.current = Date.now();
                if (focusZone === 'tabs') {
                    setFocusZone('grid');
                    playNavSound();
                } else if (totalItemsCount > 0) {
                    if (selectedGameIdx + columns < totalItemsCount) {
                        handleSelectGame(selectedGameIdx + columns);
                    } else {
                        const curRow = Math.floor(selectedGameIdx / columns);
                        const lastRow = Math.floor((totalItemsCount - 1) / columns);
                        if (curRow < lastRow) {
                            handleSelectGame(totalItemsCount - 1);
                        }
                    }
                }
                return;
            }
        } catch (error) {
            console.warn(`${LOG_PREFIX} SpotlightLibrary: Gamepad button error`, error);
        }
    }, [columns, cycleCategory, focusZone, totalItemsCount, handleBackToCollections, handlePlayGame, handleSelectGame, isCollectionsTab, isInsideSubCollection, onActivate, selectedGameIdx, customizingCollection, handleCloseModal]);

    // Ensure initial focus lands in SpotlightLibrary if nothing else is focused on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            const active = document.activeElement;
            if (!active || active === document.body) {
                const rootEl = document.querySelector('.sgl-root') as HTMLElement | null;
                rootEl?.focus();
            }
        }, 50);
        return () => clearTimeout(timer);
    }, []);

    // Keyboard handlers for browser preview and physical keyboards
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isLeaving || isExitingHomeRef.current) return;
            if (customizingColRef.current || customizingCollection) {
                if (modalKeyDownHandlerRef.current) {
                    modalKeyDownHandlerRef.current(e);
                }
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                // When focused on Steam's top search bar, allow ArrowDown or Escape to return focus
                // down into the Spotlight Library category tabs!
                const isModal = Boolean((e.target as HTMLElement).closest?.('[role="dialog"], [aria-modal="true"], .ModalPosition_Content, .decky-modal'));
                if (!isModal && (e.key === 'ArrowDown' || e.key === 'Escape')) {
                    (e.target as HTMLElement).blur();
                    const rootEl = document.querySelector('.sgl-root') as HTMLElement | null;
                    rootEl?.focus();
                    setFocusZone('tabs');
                    playNavSound();
                    e.preventDefault();
                    return;
                }
                return;
            }

            // Bumper controls: [ and ] or PageUp / PageDown
            if (e.key === 'PageUp' || e.key === '[' || e.key === 'q') {
                cycleCategory(-1);
                e.preventDefault();
                return;
            }
            if (e.key === 'PageDown' || e.key === ']' || e.key === 'e') {
                cycleCategory(1);
                e.preventDefault();
                return;
            }

            if (focusZone === 'tabs') {
                if (e.key === 'ArrowLeft') {
                    cycleCategory(-1);
                    e.preventDefault();
                } else if (e.key === 'ArrowRight') {
                    cycleCategory(1);
                    e.preventDefault();
                } else if (e.key === 'ArrowDown') {
                    setFocusZone('grid');
                    playNavSound();
                    e.preventDefault();
                } else if (e.key === 'ArrowUp') {
                    // Navigate UP into Steam's top search input
                    const searchInput = (
                        document.querySelector('input[type="search"]') ??
                        document.querySelector('header input') ??
                        document.querySelector('input')
                    ) as HTMLInputElement | null;
                    if (searchInput) {
                        searchInput.focus();
                        playNavSound();
                        e.preventDefault();
                    }
                }
                // Allow ArrowUp from tabs to bubble up to Steam's top bar
                return;
            }

            // In Grid
            if (totalItemsCount === 0) return;

            // If recently handled by gamepad button down event, ignore duplicate synthetic key event
            const isArrow = e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown';
            if (isArrow && Date.now() - lastNavTimeRef.current < 120) {
                e.preventDefault();
                return;
            }

            if (e.key === 'ArrowLeft') {
                if (selectedGameIdx > 0) {
                    handleSelectGame(selectedGameIdx - 1);
                }
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                if (selectedGameIdx < totalItemsCount - 1) {
                    handleSelectGame(selectedGameIdx + 1);
                }
                e.preventDefault();
            } else if (e.key === 'ArrowUp') {
                if (selectedGameIdx >= columns) {
                    handleSelectGame(selectedGameIdx - columns);
                } else {
                    setFocusZone('tabs');
                    playNavSound();
                }
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                if (selectedGameIdx + columns < totalItemsCount) {
                    handleSelectGame(selectedGameIdx + columns);
                } else {
                    const currentRow = Math.floor(selectedGameIdx / columns);
                    const lastRow = Math.floor((totalItemsCount - 1) / columns);
                    if (currentRow < lastRow) {
                        handleSelectGame(totalItemsCount - 1);
                    }
                }
                e.preventDefault();
            } else if (e.key === 'Enter' || e.key === ' ') {
                onActivate();
                e.preventDefault();
            } else if (e.key === 'y' || e.key === 'Y' || e.key === 'x' || e.key === 'X' || e.key === 'c' || e.key === 'C') {
                if (isCollectionsTab && !isInsideSubCollection) {
                    if (selectedCollectionItem) {
                        setCustomizingCollection(selectedCollectionItem);
                    }
                } else if (e.key === 'y' || e.key === 'Y') {
                    handlePlayGame();
                }
                e.preventDefault();
            } else if (e.key === 'm' || e.key === 'M' || e.key === 'ContextMenu') {
                if (isCollectionsTab && !isInsideSubCollection) {
                    if (selectedCollectionItem) {
                        setCustomizingCollection(selectedCollectionItem);
                        e.preventDefault();
                    }
                    return;
                }
                if (selectedGame) {
                    const cardEl = (
                        document.querySelector(`.sgl-card[data-app-id="${selectedGame.appId}"]`) ??
                        document.querySelectorAll('.sgl-card')[selectedGameIdx] ??
                        document.querySelector('.sgl-inspector') ??
                        document.body
                    ) as HTMLElement;
                    markLeavingLibrary();
                    openGameActions(selectedGame.appId, cardEl);
                    e.preventDefault();
                }
            } else if (e.key === 's' || e.key === 'S') {
                handleCycleSort();
                e.preventDefault();
            } else if (e.key === 'Escape') {
                onCancel();
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [focusZone, selectedGameIdx, totalItemsCount, columns, cycleCategory, handleSelectGame, onActivate, handlePlayGame, onCancel, isCollectionsTab, isInsideSubCollection, selectedGame, isLeaving, customizingCollection, selectedCollectionItem, handleCycleSort]);

    const activeCategoryIdx = categories.findIndex((c) => c.id === activeCategoryId);
    const activeCollectionIdx = isInsideSubCollection
        ? (activeCategory?.collections?.findIndex((c) => c.id === selectedCollectionId) ?? 0)
        : -1;
    const hltbHours = gameHltb?.status === 'found' ? gameHltb.times.main : null;

    return (
        <Focusable
            ref={rootRef as unknown as React.Ref<HTMLDivElement>}
            className={`sgl-root${compact ? ' sgl-compact' : ''}${back ? ' sgl-back' : ''}${isLeaving ? ' sgl-leaving' : ''}${currentSettings.libraryStatusBar ? ' sgl-has-status-bar' : ''}`}
            data-sgl-leaving={isLeaving ? 'true' : undefined}
            preferredFocus={!customizingCollection}
            noFocusRing
            tabIndex={0}
            style={{
                '--sgl-d': size ? `${canvas.scale}px` : undefined,
                '--accent': gameAccent,
                '--glance-accent': gameAccent,
                '--glance-accent-text': legibleAccent(gameAccent),
                '--accent-glow': `${gameAccent}55`,
                lineHeight: 'normal',
                WebkitTextSizeAdjust: '100%',
                textSizeAdjust: '100%',
            } as React.CSSProperties}
            onGamepadFocus={() => {
                // Keep the active focus zone (grid by default or as restored from memory)
            }}
            onFocus={() => {
                // Keep the active focus zone
            }}
            onButtonDown={onGamepadButtonDown}
            onActivate={handleRootActivate}
            onCancel={onCancel}
        >
            <style>{LIBRARY_CSS}</style>
            {enterOff && <style>{enterOff}</style>}

            {/* Status Bar */}
            <LibraryStatusBar hidden={isLeaving} />

            {/* Ambient Blurred Background */}
            <LibraryBackground candidates={heroCandidates} />

            {/* Top Categories Ribbon */}
            <LibraryCategoryBar
                categories={categories}
                activeCategoryId={activeCategoryId}
                onSelectCategory={selectCategory}
                focusedIndex={
                    isInsideSubCollection
                        ? (activeCollectionIdx >= 0 ? activeCollectionIdx : 0)
                        : (activeCategoryIdx >= 0 ? activeCategoryIdx : 0)
                }
                isHeaderFocused={focusZone === 'tabs' && !customizingCollection}
                isInsideSubCollection={isInsideSubCollection}
                collections={activeCategory?.collections ?? []}
                activeSubCollectionId={selectedCollectionId}
                onSelectSubCollection={selectSubCollection}
                activeSubCollectionName={activeSubCollection?.name}
                onBackToCollections={handleBackToCollections}
                sortMode={sortMode}
                onCycleSort={handleCycleSort}
            />

            {/* Main Split Layout: Left Inspector + Right Grid */}
            <div className="sgl-body">
                <LibraryInspector
                    game={selectedGame}
                    collection={selectedCollectionItem}
                    isCollectionView={isCollectionsTab && !isInsideSubCollection}
                    accent={Boolean(currentSettings.dimUninstalledGames && selectedGame && !selectedGame.installed) ? '#707784' : gameAccent}
                    description={gameDesc}
                    hltbMainHours={hltbHours}
                    preferLogos={currentSettings.gameLogo}
                    onPlay={() => handlePlayGame()}
                    onDetails={(sourceEl) => handleDetails(selectedGame, sourceEl)}
                    onOpenCollection={handleOpenCollection}
                    onCustomizeCollection={() => setCustomizingCollection(selectedCollectionItem)}
                />

                <LibraryGrid
                    key={activeCategoryId + (selectedCollectionId ? `-${selectedCollectionId}` : '')}
                    games={currentGames}
                    collections={currentCollections}
                    isCollectionsView={isCollectionsTab && !isInsideSubCollection}
                    selectedIndex={selectedGameIdx}
                    accent={gameAccent}
                    dimUninstalled={Boolean(currentSettings.dimUninstalledGames)}
                    columns={columns}
                    isGridFocused={focusZone === 'grid' && !customizingCollection}
                    onSelectGame={handleSelectGame}
                    onLaunchGame={handleDetails}
                    onOpenCollection={handleOpenCollection}
                    onCustomizeCollection={(col) => setCustomizingCollection(col)}
                    onContextMenu={handleContextMenu}
                />
            </div>

            {/* Collection Artwork Customization Modal */}
            {customizingCollection && (
                <CollectionArtModal
                    collection={customizingCollection}
                    accent={gameAccent || DEFAULT_ACCENT}
                    isOpen={Boolean(customizingCollection)}
                    onClose={handleCloseModal}
                    onSaveSuccess={handleCloseModal}
                    registerGamepadHandler={(fn) => {
                        modalGamepadHandlerRef.current = fn;
                    }}
                    registerKeyDownHandler={(fn) => {
                        modalKeyDownHandlerRef.current = fn;
                    }}
                />
            )}
        </Focusable>
    );
}
