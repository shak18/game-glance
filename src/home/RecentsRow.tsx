import { Focusable } from '@decky/ui';
import type { GamepadEvent } from '@decky/ui';
import { memo, Ref, useEffect, useMemo, useRef, useState } from 'react';
import { browserStores, capsuleUrls, heroUrls, landscapeUrls, useArtworkVersion } from './artwork';
import { displayInfo } from './artShrink';
import { ArtBox, cardBox } from './cardArt';
import { wideArt } from './homeView';
import { knownCardArt, lastCardArt, resolveCardArt } from './wideCardArt';
import { clampFocus, isLibraryFocus, MAX_GHOSTS, RecentsGeometry, recentsLayout } from './recentsLayout';
import type { HomeGame } from './useHomeData';
import { tr } from '../i18n/steamText';

function urls(read: () => string[]): string[] {
    try {
        return read();
    } catch {
        return [];
    }
}

/** Several urls as stacked backgrounds: the first that exists paints over the rest (missing files draw nothing). */
function backgrounds(list: string[]): { backgroundImage?: string } {
    if (list.length === 0) return {};
    return { backgroundImage: list.map((u) => `url("${u.replace(/"/g, '%22')}")`).join(', ') };
}

/**
 * The art to draw on a wide card (null: none yet, or none loads). Known art draws at once; otherwise it is looked up and
 * drawn once loaded and decoded, so the card never waits on a decode (it used to stack all its files as backgrounds,
 * the game's 3840 px hero under the landscape art, each decoded on every step).
 */
function useCardArt(appId: number, list: string[] | null, box: ArtBox): string | null {
    const known = list ? knownCardArt(appId, list) : null;
    const key = list ? `${appId}|${list.join('|')}` : '';
    const [loaded, setLoaded] = useState<{ key: string; url: string | null } | null>(null);
    useEffect(() => {
        if (!list || known !== undefined) return undefined;
        let live = true;
        resolveCardArt(appId, list, box).then((url) => {
            if (live) setLoaded({ key, url });
        }, () => undefined);
        return () => {
            live = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    if (!list) return null;
    if (known !== undefined) return known;
    if (loaded && loaded.key === key) return loaded.url;
    // Steam just listed another file for the game (its details loaded): the art it had stays up while that is looked up.
    return lastCardArt(appId) ?? null;
}

/**
 * Blurred base, the sharp portrait capsule at the right, then `art` (the wide card's art, on the expanded capsule only)
 * mounted last so it sits on top and fades in over the portrait. The portrait is never hidden: if no wide art loads,
 * base plus portrait remain (the handoff's fallback).
 */
function CapsuleArt({ cover, art, blur }: { cover: string[]; art: string | null; blur: boolean }) {
    return (
        <>
            {blur && <div className="gh-cap-blur" style={backgrounds(cover.slice(0, 1))} />}
            <div className="gh-cap-cover" style={backgrounds(cover)} />
            {art && <div className="gh-cap-art" style={backgrounds([art])} />}
        </>
    );
}

/**
 * Whether card `i` draws its blurred base: only the selected card and the ones next to it. A narrow card's portrait is
 * exactly its width and covers the blur completely, so elsewhere it would only cost: every L1/R1 step slides every
 * card, and each blurred layer is re-composited (20 recents, 35 px blur docked). The neighbours keep theirs so the
 * card that is growing or shrinking during a step never shows a bare edge.
 */
export function capsuleBlur(i: number, selected: number): boolean {
    return Math.abs(i - selected) <= 1;
}

/** Helper to compute target card index change from drag offset in pixels. Pure. */
export function cardStepFromDrag(dragOffset: number, stepWidth: number): number {
    if (!Number.isFinite(dragOffset) || !Number.isFinite(stepWidth) || stepWidth <= 0) return 0;
    const threshold = Math.min(40, stepWidth * 0.25);
    if (Math.abs(dragOffset) < threshold) return 0;
    const stepCount = Math.max(1, Math.round(Math.abs(dragOffset) / (stepWidth * 0.75)));
    return dragOffset < 0 ? stepCount : -stepCount;
}

/** Determines if pointer movement qualifies as an intentional horizontal drag gesture. */
export function isDragGesture(deltaX: number, deltaY: number, threshold = 8): boolean {
    return Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY);
}

/** Determines step direction from wheel delta (+1 for forward/right/down, -1 for backward/left/up). */
export function wheelStep(delta: number, threshold = 15): -1 | 1 | 0 {
    if (!Number.isFinite(delta) || Math.abs(delta) < threshold) return 0;
    return delta > 0 ? 1 : -1;
}

/** Returns true if an activation event is from a pointer or mouse click (which should be ignored by the Focusable container). Pure. */
export function isPointerActivation(e?: unknown): boolean {
    if (e && typeof e === 'object') {
        const evt = e as { type?: string; clientX?: number; clientY?: number; pointerType?: string };
        if (evt.type === 'click' || evt.pointerType === 'mouse' || evt.pointerType === 'touch') {
            return true;
        }
        if (typeof evt.clientX === 'number' && typeof evt.clientY === 'number' && (evt.clientX > 0 || evt.clientY > 0)) {
            return true;
        }
    }
    return false;
}

/**
 * One recents card. Memoized on plain props, so an L1/R1 step re-renders only the cards whose place or state changed;
 * its art urls are read from Steam's stores only when the game or its expanded state changes.
 */
const GameCapsule = memo(function GameCapsule({
    game,
    left,
    width,
    dim,
    wide,
    selected,
    blur,
    box,
    onClick,
}: {
    game: HomeGame;
    left: number;
    width: number;
    dim: boolean;
    wide: boolean;
    selected: boolean;
    blur: boolean;
    box: ArtBox;
    onClick?: (e: React.MouseEvent) => void;
}) {
    const artworkVersion = useArtworkVersion();
    const appId = game.appId;
    const cover = useMemo(() => urls(() => capsuleUrls(appId, browserStores)), [appId, artworkVersion]);
    const list = useMemo(
        () => (wide ? wideArt(urls(() => landscapeUrls(appId, browserStores)), urls(() => heroUrls(appId, browserStores)), cover) : null),
        [appId, wide, cover, artworkVersion],
    );
    const art = useCardArt(appId, list, box);
    return (
        <div
            className={`gh-cap${wide ? ' gh-cap-wide' : selected ? ' gh-cap-sel' : ''}`}
            style={{ left: `${left}px`, width: `${width}px`, opacity: dim ? 0.35 : 1 }}
            onClick={onClick}
            role="button"
            tabIndex={-1}
            aria-label={game.name}
        >
            <CapsuleArt cover={cover} art={art} blur={blur} />
            {/* A game new to the library (the "New to library" setting), as Steam's Home marks it. */}
            {game.isNew && <div className="gh-cap-new">{tr('newMark')}</div>}
            <div className="gh-cap-bar" />
        </div>
    );
});

/** The row's gamepad and mouse/touch handling, given by SpotlightHome (it owns the selection, bumpers, and pages to open). */
export interface RecentsRowNav {
    /** Takes focus when Home first gets focus (a cold start: the first game card, as on Steam's own Home). */
    preferred: boolean;
    setRef(el: HTMLDivElement | null): void;
    onFocus(): void;
    /** Left/Right, L1/R1, View/Menu (focusZones.recentsButton). */
    onButtonDown(evt: GamepadEvent): void;
    /** A held Left/Right let go: its repeat stops. */
    onButtonUp?(evt: GamepadEvent): void;
    /** A: the selected game's page, or the Library on the Library card. */
    onActivate(): void;
    /** Selects a game or the Library card by index (mouse clicks, touch taps, mouse wheel, swipe gestures). */
    onSelect?(index: number): void;
}

/**
 * The recents row: games, then "View more in your Library", then the loop preview of the first games. One focusable for
 * the whole row (the cards slide by transform, so Steam's spatial navigation never moves between them): while it has
 * focus the selected card is highlighted, Left/Right select games and A opens the selected one (`nav`, from
 * SpotlightHome, which owns `selected`: it drives hero, title and actions; the row slides to follow).
 * Mouse and touch events are fully supported: clicking/tapping an unselected card selects it, clicking/tapping the
 * currently selected card opens/activates it, mouse wheel scrolls the carousel, and horizontal swipe/drag smoothly
 * tracks and snaps across items.
 */
export function RecentsRow({ games, selected, geometry, nav, expand = true, snap = false }: { games: HomeGame[]; selected: number; geometry: RecentsGeometry; nav: RecentsRowNav; expand?: boolean; snap?: boolean }) {
    const count = games.length;
    const at = clampFocus(count, selected);
    const layout = recentsLayout(count, at, geometry, expand);
    // The wide card in device px: its art is loaded for that size (home/artShrink).
    const perCanvas = displayInfo().perCanvas;
    const box = useMemo(() => cardBox(geometry, perCanvas), [geometry, perCanvas]);
    const onLibrary = isLibraryFocus(count, at);
    const library = layout.items[count];
    // The loop preview's portraits, read once per list of games (not on every step).
    const ghostCovers = useMemo(() => games.slice(0, MAX_GHOSTS).map((g) => urls(() => capsuleUrls(g.appId, browserStores))), [games]);

    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const pointerStart = useRef<{ x: number; y: number; time: number } | null>(null);
    const wasDragged = useRef(false);
    const dragEndTime = useRef(0);
    const lastWheelTime = useRef(0);

    const onPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        pointerStart.current = { x: e.clientX, y: e.clientY, time: Date.now() };
        wasDragged.current = false;
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!pointerStart.current) return;
        const deltaX = e.clientX - pointerStart.current.x;
        const deltaY = e.clientY - pointerStart.current.y;

        if (!isDragging) {
            if (isDragGesture(deltaX, deltaY)) {
                setIsDragging(true);
                wasDragged.current = true;
                try {
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                } catch {
                    // Ignore capture errors in tests/mock environments
                }
            } else {
                return;
            }
        }

        let offset = deltaX;
        // Rubber-band resistance at bounds
        if (at === 0 && offset > 0) {
            offset *= 0.35;
        } else if (onLibrary && offset < 0) {
            offset *= 0.35;
        }
        setDragOffset(offset);
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (!pointerStart.current) return;
        pointerStart.current = null;

        if (isDragging) {
            setIsDragging(false);
            dragEndTime.current = Date.now();
            wasDragged.current = true;
            try {
                e.currentTarget.releasePointerCapture?.(e.pointerId);
            } catch {
                // Ignore
            }

            const deltaX = dragOffset;
            setDragOffset(0);

            const step = cardStepFromDrag(deltaX, geometry.step);
            if (step !== 0) {
                const target = Math.min(count, Math.max(0, at + step));
                if (target !== at) {
                    nav.onSelect?.(target);
                }
            }

            setTimeout(() => {
                wasDragged.current = false;
            }, 400);
        } else {
            setDragOffset(0);
        }
    };

    const onPointerCancel = () => {
        pointerStart.current = null;
        if (isDragging) {
            setIsDragging(false);
            dragEndTime.current = Date.now();
            setDragOffset(0);
            setTimeout(() => {
                wasDragged.current = false;
            }, 400);
        }
    };

    const onWheel = (e: React.WheelEvent) => {
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const step = wheelStep(delta);
        if (step === 0) return;

        const now = Date.now();
        if (now - lastWheelTime.current < 180) return;
        lastWheelTime.current = now;

        e.preventDefault?.();
        e.stopPropagation?.();

        const target = Math.min(count, Math.max(0, at + step));
        if (target !== at) {
            nav.onSelect?.(target);
        }
    };

    /**
     * Focusable onActivate handler. Steam / Decky UI triggers Focusable.onActivate on synthetic
     * and bubbling mouse/touch click events. We guard against any pointer/mouse click so that:
     * 1) Gamepad 'A' press still activates the selected game as expected.
     * 2) Mouse or touch clicks (on cards, other screen elements like news articles, or drag release)
     *    never accidentally activate/open the game view.
     */
    const handleFocusableActivate = (e?: unknown) => {
        if (isPointerActivation(e)) return;
        nav.onActivate();
    };

    const handleCardClick = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (wasDragged.current || Date.now() - dragEndTime.current < 400) return;
        if (index === at) {
            nav.onActivate();
        } else {
            nav.onSelect?.(index);
        }
    };

    const handleGhostClick = (e: React.MouseEvent, ghostIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (wasDragged.current || Date.now() - dragEndTime.current < 400) return;
        nav.onSelect?.(ghostIndex === 0 ? 0 : Math.min(count, ghostIndex));
    };

    return (
        <Focusable
            ref={nav.setRef as Ref<HTMLDivElement>}
            className={`gh-recents${isDragging ? ' gh-recents-dragging' : ''}`}
            focusClassName="gh-recents-focus"
            noFocusRing
            preferredFocus={nav.preferred}
            onFocus={nav.onFocus}
            onGamepadFocus={nav.onFocus}
            onButtonDown={nav.onButtonDown}
            onButtonUp={nav.onButtonUp}
            onActivate={handleFocusableActivate}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onWheel={onWheel}
            role="listbox"
            aria-label={tr('recentGames')}
        >
            <div
                className={`gh-recents-track${snap ? ' gh-recents-snap' : ''}`}
                style={{
                    transform: `translateX(${layout.scrollX + dragOffset}px)`,
                    transition: isDragging ? 'none' : undefined,
                }}
            >
                {games.map((game, i) => (
                    <GameCapsule
                        key={game.appId}
                        game={game}
                        left={layout.items[i].left}
                        width={layout.items[i].width}
                        dim={layout.items[i].dim}
                        wide={expand && !onLibrary && i === at}
                        selected={!onLibrary && i === at}
                        box={box}
                        blur={capsuleBlur(i, at)}
                        onClick={(e) => handleCardClick(e, i)}
                    />
                ))}
                <div
                    className={`gh-cap gh-cap-lib${onLibrary ? ' gh-cap-lib-on' : ''}`}
                    style={{ left: `${library.left}px`, width: `${library.width}px` }}
                    onClick={(e) => handleCardClick(e, count)}
                    role="button"
                    tabIndex={-1}
                    aria-label={tr('viewLibrary')}
                >
                    <div className="gh-lib-body">
                        <div className="gh-lib-grid">
                            <div className="gh-lib-cell gh-lib-cell-accent" />
                            <div className="gh-lib-cell" />
                            <div className="gh-lib-cell" />
                            <div className="gh-lib-cell" />
                        </div>
                        <div className="gh-lib-label">{tr('viewLibrary')}</div>
                    </div>
                    <div className="gh-cap-bar" />
                </div>
                {layout.ghosts.map((ghost, j) => (
                    <div
                        key={`ghost-${games[j].appId}`}
                        className="gh-cap gh-ghost"
                        aria-hidden="true"
                        style={{ left: `${ghost.left}px`, width: `${geometry.capsuleW}px`, opacity: ghost.opacity }}
                        onClick={(e) => handleGhostClick(e, j)}
                    >
                        {/* Cover only: a ghost is exactly the portrait's width, so a blur base would be fully hidden. */}
                        <div className="gh-cap-cover" style={backgrounds(ghostCovers[j] ?? [])} />
                        {j === 0 && (
                            <div className="gh-ghost-badge">
                                <div className="gh-ghost-icon">↻</div>
                                <div className="gh-ghost-label">BACK TO START</div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </Focusable>
    );
}
