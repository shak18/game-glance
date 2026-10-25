import React, { useEffect, useRef } from 'react';
import { FaFolder } from 'react-icons/fa';
import {
    browserStores,
    capsuleUrls as getCapsuleUrls,
    heroUrls as getHeroUrls,
    landscapeUrls as getLandscapeUrls,
    logoUrls as getLogoUrls,
    registerArtworkCacheClearer,
    soundtrackCoverUrls as getSoundtrackCoverUrls,
    useArtworkVersion,
} from './artwork';
import { LibraryCollectionItem, LibraryGameItem } from './libraryData';
import { resolveCollectionArt, useImageUri } from './enhancedCollection';
import { getBundledConsoleIcon } from './consoleIconData';
import { useSettings } from '../data/settings';

interface LibraryGridProps {
    games: LibraryGameItem[];
    collections?: LibraryCollectionItem[];
    isCollectionsView?: boolean;
    selectedIndex: number;
    accent: string;
    dimUninstalled?: boolean;
    columns?: number;
    onSelectGame: (index: number) => void;
    onLaunchGame?: (game: LibraryGameItem, sourceEl?: HTMLElement) => void;
    onOpenCollection?: (collection: LibraryCollectionItem) => void;
    onCustomizeCollection?: (collection: LibraryCollectionItem) => void;
    onContextMenu?: (game: LibraryGameItem, index: number, target: HTMLElement) => void;
    isGridFocused?: boolean;
}

export interface BannerCardProps {
    game: LibraryGameItem;
    index?: number;
    isFocused: boolean;
    accent: string;
    dimUninstalled?: boolean;
    onClick?: () => void;
    onSelectGame?: (index: number) => void;
    onDoubleClick?: (sourceEl?: HTMLElement) => void;
    onLaunchGame?: (game: LibraryGameItem, sourceEl?: HTMLElement) => void;
    onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onContextAction?: (game: LibraryGameItem, index: number, anchorEl: HTMLElement) => void;
    isDragSuppressed?: () => boolean;
}

export type ResolvedCardArt =
    | { mode: 'banner'; url: string }
    | { mode: 'hero-logo'; heroUrl: string; logoUrl: string }
    | { mode: 'hero'; heroUrl: string }
    | { mode: 'logo'; logoUrl: string }
    | { mode: 'poster'; url: string }
    | { mode: 'none' };

export const cardArtMemo = new Map<number, ResolvedCardArt>();
const inFlightArt = new Map<number, Promise<ResolvedCardArt>>();
registerArtworkCacheClearer(() => {
    cardArtMemo.clear();
    inFlightArt.clear();
});

function checkImageLoads(url: string, timeoutMs = 2500): Promise<boolean> {
    if (!url) return Promise.resolve(false);
    if (typeof Image === 'undefined') {
        return Promise.resolve(true);
    }
    return new Promise((resolve) => {
        let done = false;
        const img = new Image();
        const timer = setTimeout(() => {
            if (!done) {
                done = true;
                img.onload = null;
                img.onerror = null;
                resolve(false);
            }
        }, timeoutMs);

        img.onload = () => {
            if (!done) {
                done = true;
                clearTimeout(timer);
                resolve(img.naturalWidth > 0);
            }
        };

        img.onerror = () => {
            if (!done) {
                done = true;
                clearTimeout(timer);
                resolve(false);
            }
        };

        img.src = url;
    });
}

async function findFirstWorkingImage(urls: string[]): Promise<string | null> {
    for (const url of urls) {
        if (await checkImageLoads(url)) {
            return url;
        }
    }
    return null;
}

export function resolveGameArt(game: LibraryGameItem): Promise<ResolvedCardArt> {
    const cached = cardArtMemo.get(game.appId);
    if (cached) return Promise.resolve(cached);

    const pending = inFlightArt.get(game.appId);
    if (pending) return pending;

    const promise = (async (): Promise<ResolvedCardArt> => {
        // 1. Primary: Long horizontal banner (soundtracks check square cover first)
        const bannerCandidates = game.landscapeUrl
            ? [game.landscapeUrl]
            : game.isSoundtrack
                ? [...getSoundtrackCoverUrls(game.appId, browserStores), ...getLandscapeUrls(game.appId, browserStores)]
                : getLandscapeUrls(game.appId, browserStores);

        const bannerUrl = await findFirstWorkingImage(bannerCandidates);
        if (bannerUrl) {
            const res: ResolvedCardArt = { mode: 'banner', url: bannerUrl };
            cardArtMemo.set(game.appId, res);
            return res;
        }

        // 2. Banner not available -> Option 1 & 2: Check Hero and Logo
        const heroCandidates = game.heroUrl ? [game.heroUrl] : getHeroUrls(game.appId, browserStores);
        const logoCandidates = game.logoUrl ? [game.logoUrl] : getLogoUrls(game.appId, browserStores);

        const [heroUrl, logoUrl] = await Promise.all([
            findFirstWorkingImage(heroCandidates),
            findFirstWorkingImage(logoCandidates),
        ]);

        if (heroUrl && logoUrl) {
            const res: ResolvedCardArt = { mode: 'hero-logo', heroUrl, logoUrl };
            cardArtMemo.set(game.appId, res);
            return res;
        }

        if (logoUrl) {
            const res: ResolvedCardArt = { mode: 'logo', logoUrl };
            cardArtMemo.set(game.appId, res);
            return res;
        }

        if (heroUrl) {
            const res: ResolvedCardArt = { mode: 'hero', heroUrl };
            cardArtMemo.set(game.appId, res);
            return res;
        }

        // 3. Option 3: Poster capsule ONLY if no logo and no hero background!
        const posterCandidates = game.capsuleUrl ? [game.capsuleUrl] : getCapsuleUrls(game.appId, browserStores);
        const posterUrl = await findFirstWorkingImage(posterCandidates);
        if (posterUrl) {
            const res: ResolvedCardArt = { mode: 'poster', url: posterUrl };
            cardArtMemo.set(game.appId, res);
            return res;
        }

        // 4. Option 4: None (fallback title on dark card)
        const res: ResolvedCardArt = { mode: 'none' };
        cardArtMemo.set(game.appId, res);
        return res;
    })().finally(() => {
        inFlightArt.delete(game.appId);
    });

    inFlightArt.set(game.appId, promise);
    return promise;
}

export const BannerCard = React.memo(
    function BannerCard({
        game,
        index,
        isFocused,
        accent = '#1a9fff',
        dimUninstalled,
        onClick,
        onSelectGame,
        onDoubleClick,
        onLaunchGame,
        onContextMenu,
        onContextAction,
        isDragSuppressed,
    }: BannerCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const artworkVersion = useArtworkVersion();

    // Initial state directly from memo: instantaneous if already visited!
    const [art, setArt] = React.useState<ResolvedCardArt>(() => cardArtMemo.get(game.appId) ?? { mode: 'none' });

    useEffect(() => {
        const cached = cardArtMemo.get(game.appId);
        if (cached) {
            setArt(cached);
            return;
        }
        let active = true;
        resolveGameArt(game).then((res) => {
            if (active) {
                setArt(res);
            }
        });
        return () => {
            active = false;
        };
    }, [game.appId, game.landscapeUrl, game.heroUrl, game.logoUrl, game.capsuleUrl, game.isSoundtrack, artworkVersion]);

    // Ensure focused card scrolls into view vertically within the grid panel (never scrolls parent layout)
    useEffect(() => {
        if (isFocused && cardRef.current) {
            const container = cardRef.current.closest('.sgl-grid-panel');
            if (container) {
                const cRect = container.getBoundingClientRect();
                const elRect = cardRef.current.getBoundingClientRect();
                if (elRect.top < cRect.top + 20) {
                    container.scrollTop += elRect.top - cRect.top - 20;
                } else if (elRect.bottom > cRect.bottom - 20) {
                    container.scrollTop += elRect.bottom - cRect.bottom + 20;
                }
            }
        }
    }, [isFocused]);

    const isUninstalled = Boolean(dimUninstalled && !game.installed);
    const cardAccent = isUninstalled ? '#707784' : accent;

    return (
        <div
            ref={cardRef}
            role="button"
            tabIndex={0}
            data-app-id={game.appId}
            className={`sgl-card${isFocused ? ' focused' : ''}${isUninstalled ? ' sgl-card-uninstalled' : ''}`}
            style={{
                '--accent': cardAccent,
                '--accent-glow': `${cardAccent}55`,
            } as React.CSSProperties}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isDragSuppressed?.()) {
                    return;
                }
                if (isFocused) {
                    if (onLaunchGame) {
                        onLaunchGame(game, e.currentTarget);
                    } else {
                        onDoubleClick?.(e.currentTarget);
                    }
                } else {
                    if (onSelectGame && index !== undefined) {
                        onSelectGame(index);
                    } else {
                        onClick?.();
                    }
                }
            }}
            onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onLaunchGame) {
                    onLaunchGame(game, e.currentTarget);
                } else {
                    onDoubleClick?.(e.currentTarget);
                }
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onContextAction && index !== undefined) {
                    onContextAction(game, index, e.currentTarget);
                } else {
                    onContextMenu?.(e);
                }
            }}
        >
            {/* Primary Banner (Wide image) */}
            {art.mode === 'banner' ? (
                <img
                    src={art.url}
                    alt={game.name}
                    className="sgl-card-img"
                />
            ) : art.mode === 'hero-logo' || art.mode === 'logo' || art.mode === 'hero' ? (
                /* Option 1 & 2: Hero background with logo / Logo only / Hero only */
                <div className="sgl-card-fallback">
                    {(art.mode === 'hero-logo' || art.mode === 'hero') && (
                        <img
                            src={art.heroUrl}
                            alt=""
                            className="sgl-card-fallback-bg"
                        />
                    )}
                    {(art.mode === 'hero-logo' || art.mode === 'hero') && (
                        <div className="sgl-card-fallback-overlay" />
                    )}
                    {(art.mode === 'hero-logo' || art.mode === 'logo') ? (
                        <img
                            src={art.logoUrl}
                            alt={game.name}
                            className="sgl-card-fallback-logo"
                        />
                    ) : (
                        <span className="sgl-card-fallback-title">{game.name}</span>
                    )}
                </div>
            ) : art.mode === 'poster' ? (
                /* Option 3: Poster capsule (used ONLY if no hero & no logo) */
                <img
                    src={art.url}
                    alt={game.name}
                    className="sgl-card-img"
                />
            ) : (
                /* Option 4: Solid fallback title on dark card */
                <div className="sgl-card-fallback">
                    <span className="sgl-card-fallback-title">{game.name}</span>
                </div>
            )}

            {game.running && (
                <div className="sgl-card-running-badge">
                    <div className="sgl-running-dot" />
                    <span className="sgl-card-running-text">PLAYING</span>
                </div>
            )}

            <div className="sgl-card-bar" />
        </div>
    );
},
(prev, next) => {
    if (prev.index !== next.index) return false;
    if (prev.isFocused !== next.isFocused) return false;
    if (prev.game.appId !== next.game.appId) return false;
    if (prev.game.installed !== next.game.installed) return false;
    if (prev.game.running !== next.game.running) return false;
    if (prev.dimUninstalled !== next.dimUninstalled) return false;
    if (prev.onSelectGame !== next.onSelectGame) return false;
    if (prev.onClick !== next.onClick) return false;
    if (prev.onLaunchGame !== next.onLaunchGame) return false;
    if (prev.onDoubleClick !== next.onDoubleClick) return false;
    if (prev.onContextAction !== next.onContextAction) return false;
    if (prev.onContextMenu !== next.onContextMenu) return false;
    if (prev.isDragSuppressed !== next.isDragSuppressed) return false;
    if (next.isFocused && prev.accent !== next.accent) return false;
    return true;
});

function MiniCover({ game, className }: { game?: LibraryGameItem; className: string }) {
    const artworkVersion = useArtworkVersion();
    const candidates = React.useMemo(() => {
        if (!game) return [];
        if (game.capsuleUrl) return [game.capsuleUrl];
        if (game.isSoundtrack) return getSoundtrackCoverUrls(game.appId, browserStores);
        return getCapsuleUrls(game.appId, browserStores);
    }, [game, artworkVersion]);

    const [src, setSrc] = React.useState<string>(candidates[0] ?? '');
    const [idx, setIdx] = React.useState(0);
    const [hasError, setHasError] = React.useState(false);

    useEffect(() => {
        setIdx(0);
        setHasError(false);
        setSrc(candidates[0] ?? '');
    }, [candidates]);

    const handleError = () => {
        const next = idx + 1;
        if (next < candidates.length) {
            setIdx(next);
            setSrc(candidates[next]);
        } else {
            setHasError(true);
        }
    };

    if (!game || !src || hasError) {
        return (
            <div className={`sgl-col-fan-card ${className}`}>
                <div style={{ width: '100%', height: '100%', background: '#1c2433', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaFolder size={18} color="rgba(255,255,255,0.4)" />
                </div>
            </div>
        );
    }

    return (
        <div className={`sgl-col-fan-card ${className}`}>
            <img src={src} alt={game.name} onError={handleError} loading="lazy" />
        </div>
    );
}

interface CollectionCardProps {
    collection: LibraryCollectionItem;
    index?: number;
    isFocused: boolean;
    accent: string;
    onClick?: () => void;
    onSelectGame?: (index: number) => void;
    onDoubleClick: () => void;
    onCustomizeCollection?: (collection: LibraryCollectionItem) => void;
    isDragSuppressed?: () => boolean;
}

export function CollectionCard({
    collection,
    index = 0,
    isFocused,
    accent,
    onClick,
    onSelectGame,
    onDoubleClick,
    onCustomizeCollection,
    isDragSuppressed,
}: CollectionCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const settings = useSettings();
    const [imgFailed, setImgFailed] = React.useState(false);

    const art = resolveCollectionArt(collection, settings);
    const cardAccent = accent;

    useEffect(() => {
        setImgFailed(false);
    }, [collection.id, art.mode, art.customUrl, art.iconKey]);

    useEffect(() => {
        if (isFocused && cardRef.current) {
            const container = cardRef.current.closest('.sgl-grid-panel');
            if (container) {
                const cRect = container.getBoundingClientRect();
                const elRect = cardRef.current.getBoundingClientRect();
                if (elRect.top < cRect.top + 20) {
                    container.scrollTop += elRect.top - cRect.top - 20;
                } else if (elRect.bottom > cRect.bottom - 20) {
                    container.scrollTop += elRect.bottom - cRect.bottom + 20;
                }
            }
        }
    }, [isFocused]);

    const games = Array.isArray(collection?.games) ? collection.games : [];
    const game0 = games[0];
    const game1 = games[1];
    const game2 = games[2];
    const game3 = games[3];
    const game4 = games[4];
    const colName = typeof collection?.name === 'string' ? collection.name : String(collection?.name ?? '');

    // Unconditional hook call
    const customUri = useImageUri(art.customUrl);
    // Direct synchronous bundled console icon lookup
    const safeIconSrc = art.iconKey ? getBundledConsoleIcon(art.iconKey) : null;
    const safeCustomSrc = customUri || (art.customUrl && (art.customUrl.startsWith('data:') || art.customUrl.startsWith('http')) ? art.customUrl : undefined);

    const displayMode = imgFailed ? 'fan' : art.mode;

    return (
        <div
            ref={cardRef}
            role="button"
            tabIndex={-1}
            data-collection-id={collection.id}
            className={`sgl-card-collection${isFocused ? ' focused' : ''}`}
            style={{
                '--accent': cardAccent,
                '--accent-glow': `${cardAccent}55`,
            } as React.CSSProperties}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isDragSuppressed?.()) {
                    return;
                }
                if (isFocused) {
                    onDoubleClick();
                } else {
                    if (onSelectGame && index !== undefined) {
                        onSelectGame(index);
                    } else {
                        onClick?.();
                    }
                }
            }}
            onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDoubleClick();
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onSelectGame && index !== undefined) {
                    onSelectGame(index);
                }
                onCustomizeCollection?.(collection);
            }}
        >
            {displayMode === 'custom' && safeCustomSrc ? (
                <div className={`sgl-col-custom-art-area sgl-fit-${art.fit || 'cover'}`}>
                    <img
                        src={safeCustomSrc}
                        alt={colName}
                        className={`sgl-col-custom-img sgl-fit-${art.fit || 'cover'}`}
                        onError={() => setImgFailed(true)}
                    />
                </div>
            ) : displayMode === 'icon' && safeIconSrc ? (
                <div className={`sgl-col-icon-art-area sgl-fit-${art.fit || 'center'}`}>
                    <img
                        src={safeIconSrc}
                        alt=""
                        className={`sgl-col-icon-large sgl-fit-${art.fit || 'center'}`}
                        onError={() => setImgFailed(true)}
                    />
                </div>
            ) : (
                <div className="sgl-col-fan-area">
                    {games.length >= 5 ? (
                        <>
                            <MiniCover game={game3} className="sgl-col-card-far-left" />
                            <MiniCover game={game1} className="sgl-col-card-left" />
                            <MiniCover game={game4} className="sgl-col-card-far-right" />
                            <MiniCover game={game2} className="sgl-col-card-right" />
                            <MiniCover game={game0} className="sgl-col-card-center" />
                        </>
                    ) : games.length === 4 ? (
                        <>
                            <MiniCover game={game3} className="sgl-col-card-far-left" />
                            <MiniCover game={game1} className="sgl-col-card-left" />
                            <MiniCover game={game2} className="sgl-col-card-right" />
                            <MiniCover game={game0} className="sgl-col-card-center" />
                        </>
                    ) : games.length === 3 ? (
                        <>
                            <MiniCover game={game1} className="sgl-col-card-left" />
                            <MiniCover game={game2} className="sgl-col-card-right" />
                            <MiniCover game={game0} className="sgl-col-card-center" />
                        </>
                    ) : games.length === 2 ? (
                        <>
                            <MiniCover game={game1} className="sgl-col-card-left" />
                            <MiniCover game={game0} className="sgl-col-card-center" />
                        </>
                    ) : games.length === 1 ? (
                        <MiniCover game={game0} className="sgl-col-card-center" />
                    ) : safeIconSrc ? (
                        <div style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <img
                                src={safeIconSrc}
                                style={{ width: 38, height: 38, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}
                                alt=""
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                            <span style={{ fontSize: 11, fontWeight: 600 }}>Empty Collection</span>
                        </div>
                    ) : (
                        <div style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <FaFolder size={32} color="var(--accent, #58a6ff)" />
                            <span style={{ fontSize: 11, fontWeight: 600 }}>Empty Collection</span>
                        </div>
                    )}
                </div>
            )}

            <div className="sgl-col-footer">
                <div className="sgl-col-footer-header">
                    {safeIconSrc && (
                        <img
                            src={safeIconSrc}
                            className="sgl-col-icon-img"
                            alt=""
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                    )}
                    <div className="sgl-col-footer-title">{collection.name}</div>
                </div>
                <div className="sgl-col-footer-badge">{collection.count} {collection.count === 1 ? 'GAME' : 'GAMES'}</div>
            </div>

            <div className="sgl-card-bar" />
        </div>
    );
}

export function LibraryGrid({
    games,
    collections,
    isCollectionsView = false,
    selectedIndex,
    accent,
    dimUninstalled,
    columns = 3,
    onSelectGame,
    onLaunchGame,
    onOpenCollection,
    onCustomizeCollection,
    onContextMenu,
    isGridFocused = true,
}: LibraryGridProps) {
    const gridPanelRef = useRef<HTMLElement | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [isScrolling, setIsScrolling] = React.useState(false);
    const pointerStartRef = useRef<{ y: number; scrollTop: number; time: number } | null>(null);
    const lastPositionsRef = useRef<Array<{ y: number; time: number }>>([]);
    const wasDraggedRef = useRef(false);
    const dragEndTimeRef = useRef(0);
    const momentumRafRef = useRef<number | null>(null);
    const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isDragSuppressed = React.useCallback(() => {
        return wasDraggedRef.current || Date.now() - dragEndTimeRef.current < 400;
    }, []);

    const stopMomentum = React.useCallback(() => {
        if (momentumRafRef.current !== null) {
            cancelAnimationFrame(momentumRafRef.current);
            momentumRafRef.current = null;
        }
    }, []);

    const startMomentum = React.useCallback((initialVelocity: number) => {
        const panel = gridPanelRef.current;
        if (!panel) return;

        let velocity = initialVelocity * 16;
        velocity = Math.max(-45, Math.min(45, velocity));

        let lastTime = performance.now();
        const step = (time: number) => {
            const dt = Math.min(32, time - lastTime);
            lastTime = time;
            if (!gridPanelRef.current || Math.abs(velocity) < 0.5) {
                momentumRafRef.current = null;
                return;
            }
            gridPanelRef.current.scrollTop += velocity * (dt / 16);
            velocity *= 0.93;
            momentumRafRef.current = requestAnimationFrame(step);
        };
        momentumRafRef.current = requestAnimationFrame(step);
    }, []);

    const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return;
        const panel = gridPanelRef.current;
        if (!panel) return;

        stopMomentum();
        pointerStartRef.current = {
            y: e.clientY,
            scrollTop: panel.scrollTop,
            time: performance.now(),
        };
        lastPositionsRef.current = [{ y: e.clientY, time: performance.now() }];
    };

    const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
        const start = pointerStartRef.current;
        const panel = gridPanelRef.current;
        if (!start || !panel) return;

        const deltaY = e.clientY - start.y;
        if (!isDragging && Math.abs(deltaY) > 8) {
            setIsDragging(true);
            try {
                e.currentTarget.setPointerCapture?.(e.pointerId);
            } catch {
                // Ignore pointer capture errors
            }
        }

        if (isDragging) {
            panel.scrollTop = start.scrollTop - deltaY;
            const now = performance.now();
            const filtered = lastPositionsRef.current.filter((p) => now - p.time < 120);
            filtered.push({ y: e.clientY, time: now });
            lastPositionsRef.current = filtered;
        }
    };

    const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
        if (!pointerStartRef.current) return;
        pointerStartRef.current = null;

        if (isDragging) {
            setIsDragging(false);
            wasDraggedRef.current = true;
            dragEndTimeRef.current = Date.now();

            try {
                e.currentTarget.releasePointerCapture?.(e.pointerId);
            } catch {
                // Ignore
            }

            const positions = lastPositionsRef.current;
            if (positions.length >= 2) {
                const first = positions[0];
                const last = positions[positions.length - 1];
                const dt = last.time - first.time;
                if (dt > 10 && dt < 200) {
                    const vy = (last.y - first.y) / dt;
                    if (Math.abs(vy) > 0.2) {
                        startMomentum(-vy);
                    }
                }
            }

            setTimeout(() => {
                wasDraggedRef.current = false;
            }, 400);
        }
    };

    const onPointerCancel = () => {
        pointerStartRef.current = null;
        if (isDragging) {
            setIsDragging(false);
            wasDraggedRef.current = true;
            dragEndTimeRef.current = Date.now();
            setTimeout(() => {
                wasDraggedRef.current = false;
            }, 400);
        }
    };

    const onWheel = (e: React.WheelEvent<HTMLElement>) => {
        const panel = gridPanelRef.current;
        if (!panel) return;
        if (e.ctrlKey || e.altKey) return;

        stopMomentum();
        panel.scrollTop += e.deltaY;

        setIsScrolling(true);
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = setTimeout(() => {
            setIsScrolling(false);
        }, 600);
    };

    React.useEffect(() => {
        return () => {
            stopMomentum();
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        };
    }, [stopMomentum]);

    if (isCollectionsView) {
        const cols = collections ?? [];
        if (cols.length === 0) {
            return (
                <main
                    ref={gridPanelRef}
                    className={`sgl-grid-panel${isDragging ? ' sgl-dragging' : ''}${isScrolling ? ' sgl-scrolling' : ''}`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerCancel}
                    onWheel={onWheel}
                >
                    <div className="sgl-empty">
                        <span>No user collections found</span>
                    </div>
                </main>
            );
        }

        return (
            <main
                ref={gridPanelRef}
                className={`sgl-grid-panel${isDragging ? ' sgl-dragging' : ''}${isScrolling ? ' sgl-scrolling' : ''}`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onWheel={onWheel}
            >
                <div className="sgl-grid" style={{ '--sgl-columns': columns } as React.CSSProperties}>
                    {cols.map((col, idx) => (
                        <CollectionCard
                            key={`col-${col.id}-${idx}`}
                            collection={col}
                            index={idx}
                            isFocused={isGridFocused && idx === selectedIndex}
                            accent={accent}
                            onSelectGame={onSelectGame}
                            onDoubleClick={() => onOpenCollection?.(col)}
                            onCustomizeCollection={onCustomizeCollection}
                            isDragSuppressed={isDragSuppressed}
                        />
                    ))}
                </div>
            </main>
        );
    }

    if (games.length === 0) {
        return (
            <main
                ref={gridPanelRef}
                className={`sgl-grid-panel${isDragging ? ' sgl-dragging' : ''}${isScrolling ? ' sgl-scrolling' : ''}`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onWheel={onWheel}
            >
                <div className="sgl-empty">
                    <span>No games found in this category</span>
                </div>
            </main>
        );
    }

    return (
        <main
            ref={gridPanelRef}
            className={`sgl-grid-panel${isDragging ? ' sgl-dragging' : ''}${isScrolling ? ' sgl-scrolling' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onWheel={onWheel}
        >
            <div className="sgl-grid" style={{ '--sgl-columns': columns } as React.CSSProperties}>
                {games.map((game, idx) => (
                    <BannerCard
                        key={`${game.appId}-${game.isSoundtrack ? 'ost' : 'game'}-${idx}`}
                        game={game}
                        index={idx}
                        isFocused={isGridFocused && idx === selectedIndex}
                        accent={accent}
                        dimUninstalled={dimUninstalled}
                        onSelectGame={onSelectGame}
                        onLaunchGame={onLaunchGame}
                        onContextAction={onContextMenu}
                        isDragSuppressed={isDragSuppressed}
                    />
                ))}
            </div>
        </main>
    );
}
