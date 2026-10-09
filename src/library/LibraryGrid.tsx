import React, { useEffect, useRef } from 'react';
import { FaFolder } from 'react-icons/fa';
import {
    browserStores,
    capsuleUrls as getCapsuleUrls,
    getCachedGridUrl,
    heroUrls as getHeroUrls,
    landscapeUrls as getLandscapeUrls,
    logoUrls as getLogoUrls,
    setCachedGridUrl,
    soundtrackCoverUrls as getSoundtrackCoverUrls,
} from '../home/artwork';
import { LibraryCollectionItem, LibraryGameItem } from './libraryData';

interface LibraryGridProps {
    games: LibraryGameItem[];
    collections?: LibraryCollectionItem[];
    isCollectionsView?: boolean;
    selectedIndex: number;
    accent: string;
    columns?: number;
    onSelectGame: (index: number) => void;
    onLaunchGame?: (game: LibraryGameItem) => void;
    onOpenCollection?: (collection: LibraryCollectionItem) => void;
    onContextMenu?: (game: LibraryGameItem, index: number, target: HTMLElement) => void;
    isGridFocused?: boolean;
}

interface BannerCardProps {
    game: LibraryGameItem;
    isFocused: boolean;
    accent: string;
    onClick: () => void;
    onDoubleClick: () => void;
    onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function BannerCard({ game, isFocused, accent, onClick, onDoubleClick, onContextMenu }: BannerCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

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

    const candidates = React.useMemo(() => {
        if (game.landscapeUrl) return [game.landscapeUrl];
        const cached = getCachedGridUrl(game.appId);
        if (cached !== undefined) return cached ? [cached] : [];

        if (game.isSoundtrack) {
            return [
                ...getSoundtrackCoverUrls(game.appId, browserStores),
                ...getLandscapeUrls(game.appId, browserStores),
            ];
        }

        if (game.isShortcut) {
            // For shortcuts / non-Steam games:
            // Custom art set via Steam is virtually always the vertical capsule (`p.png`/`p.jpg`).
            // Check portrait capsule FIRST to avoid cascading 404 errors on missing horizontal files!
            return [
                ...getCapsuleUrls(game.appId, browserStores),
                ...getLandscapeUrls(game.appId, browserStores),
            ];
        }

        return [
            ...getLandscapeUrls(game.appId, browserStores),
            ...getCapsuleUrls(game.appId, browserStores),
        ];
    }, [game.appId, game.landscapeUrl, game.isSoundtrack, game.isShortcut]);

    const [src, setSrc] = React.useState<string>(candidates[0] ?? '');
    const [candidateIdx, setCandidateIdx] = React.useState(0);
    const [hasError, setHasError] = React.useState(candidates.length === 0);
    const [isImgLoaded, setIsImgLoaded] = React.useState(Boolean(getCachedGridUrl(game.appId)));

    useEffect(() => {
        setCandidateIdx(0);
        setHasError(candidates.length === 0);
        setIsImgLoaded(Boolean(getCachedGridUrl(game.appId)));
        setSrc(candidates[0] ?? '');
    }, [candidates, game.appId]);

    const handleLoad = () => {
        setIsImgLoaded(true);
        if (src) setCachedGridUrl(game.appId, src);
    };

    const handleError = () => {
        const next = candidateIdx + 1;
        if (next < candidates.length) {
            setCandidateIdx(next);
            setSrc(candidates[next]);
        } else {
            setHasError(true);
            setCachedGridUrl(game.appId, '');
        }
    };

    const isBannerAvailable = Boolean(src && !hasError);

    // Fallback: Hero background image
    const heroCandidates = React.useMemo(() => {
        if (isBannerAvailable) return [];
        if (game.heroUrl) return [game.heroUrl];
        return getHeroUrls(game.appId, browserStores);
    }, [isBannerAvailable, game.appId, game.heroUrl]);

    const [heroSrc, setHeroSrc] = React.useState<string>(heroCandidates[0] ?? '');
    const [heroIdx, setHeroIdx] = React.useState(0);
    const [hasHeroError, setHasHeroError] = React.useState(false);

    useEffect(() => {
        setHeroIdx(0);
        setHasHeroError(false);
        setHeroSrc(heroCandidates[0] ?? '');
    }, [heroCandidates]);

    const handleHeroError = () => {
        const next = heroIdx + 1;
        if (next < heroCandidates.length) {
            setHeroIdx(next);
            setHeroSrc(heroCandidates[next]);
        } else {
            setHasHeroError(true);
        }
    };

    // Fallback: Centered game logo
    const logoCandidates = React.useMemo(() => {
        if (isBannerAvailable) return [];
        if (game.logoUrl) return [game.logoUrl];
        return getLogoUrls(game.appId, browserStores);
    }, [isBannerAvailable, game.appId, game.logoUrl]);

    const [logoSrc, setLogoSrc] = React.useState<string>(logoCandidates[0] ?? '');
    const [logoIdx, setLogoIdx] = React.useState(0);
    const [hasLogoError, setHasLogoError] = React.useState(false);

    useEffect(() => {
        setLogoIdx(0);
        setHasLogoError(false);
        setLogoSrc(logoCandidates[0] ?? '');
    }, [logoCandidates]);

    const handleLogoError = () => {
        const next = logoIdx + 1;
        if (next < logoCandidates.length) {
            setLogoIdx(next);
            setLogoSrc(logoCandidates[next]);
        } else {
            setHasLogoError(true);
        }
    };

    const isLogoAvailable = Boolean(logoSrc && !hasLogoError);

    return (
        <div
            ref={cardRef}
            role="button"
            tabIndex={0}
            data-app-id={game.appId}
            className={`sgl-card${isFocused ? ' focused' : ''}`}
            style={{
                '--accent': accent,
                '--accent-glow': `${accent}55`,
            } as React.CSSProperties}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isFocused) {
                    onDoubleClick();
                } else {
                    onClick();
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
                onContextMenu?.(e);
            }}
        >
            {isBannerAvailable ? (
                <img
                    src={src}
                    alt={game.name}
                    className="sgl-card-img"
                    onLoad={handleLoad}
                    onError={handleError}
                    style={{
                        opacity: isImgLoaded ? 1 : 0,
                        transition: 'opacity 0.15s ease',
                    }}
                />
            ) : (
                <div className="sgl-card-fallback">
                    {heroSrc && !hasHeroError && (
                        <img
                            key={heroSrc}
                            src={heroSrc}
                            alt=""
                            className="sgl-card-fallback-bg"
                            onError={handleHeroError}
                            loading="lazy"
                        />
                    )}
                    <div className="sgl-card-fallback-overlay" />
                    {isLogoAvailable ? (
                        <img
                            key={logoSrc}
                            src={logoSrc}
                            alt={game.name}
                            className="sgl-card-fallback-logo"
                            onError={handleLogoError}
                        />
                    ) : (
                        <span className="sgl-card-fallback-title">{game.name}</span>
                    )}
                </div>
            )}

            {game.running && (
                <div className="sgl-card-running-badge">
                    <div className="sgl-running-dot" />
                    <span>PLAYING</span>
                </div>
            )}

            <div className="sgl-card-bar" />
        </div>
    );
}

function MiniCover({ game, className }: { game?: LibraryGameItem; className: string }) {
    const candidates = React.useMemo(() => {
        if (!game) return [];
        if (game.capsuleUrl) return [game.capsuleUrl];
        if (game.isSoundtrack) return getSoundtrackCoverUrls(game.appId, browserStores);
        return getCapsuleUrls(game.appId, browserStores);
    }, [game]);

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
    isFocused: boolean;
    accent: string;
    onClick: () => void;
    onDoubleClick: () => void;
}

function CollectionCard({ collection, isFocused, accent, onClick, onDoubleClick }: CollectionCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

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

    const games = collection.games;
    const game0 = games[0];
    const game1 = games[1];
    const game2 = games[2];
    const game3 = games[3];
    const game4 = games[4];

    return (
        <div
            ref={cardRef}
            role="button"
            tabIndex={0}
            data-collection-id={collection.id}
            className={`sgl-card-collection${isFocused ? ' focused' : ''}`}
            style={{
                '--accent': accent,
                '--accent-glow': `${accent}55`,
            } as React.CSSProperties}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isFocused) {
                    onDoubleClick();
                } else {
                    onClick();
                }
            }}
            onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDoubleClick();
            }}
        >
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
                ) : (
                    <div style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <FaFolder size={32} color="var(--accent, #58a6ff)" />
                        <span style={{ fontSize: 11, fontWeight: 600 }}>Empty Collection</span>
                    </div>
                )}
            </div>

            <div className="sgl-col-footer">
                <span className="sgl-col-footer-title">{collection.name}</span>
                <span className="sgl-col-footer-badge">{collection.count} {collection.count === 1 ? 'GAME' : 'GAMES'}</span>
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
    columns = 3,
    onSelectGame,
    onLaunchGame,
    onOpenCollection,
    onContextMenu,
    isGridFocused = true,
}: LibraryGridProps) {
    if (isCollectionsView) {
        const cols = collections ?? [];
        if (cols.length === 0) {
            return (
                <main className="sgl-grid-panel">
                    <div className="sgl-empty">
                        <span>No user collections found</span>
                    </div>
                </main>
            );
        }

        return (
            <main className="sgl-grid-panel">
                <div className="sgl-grid" style={{ '--sgl-columns': columns } as React.CSSProperties}>
                    {cols.map((col, idx) => (
                        <CollectionCard
                            key={`col-${col.id}-${idx}`}
                            collection={col}
                            isFocused={isGridFocused && idx === selectedIndex}
                            accent={accent}
                            onClick={() => onSelectGame(idx)}
                            onDoubleClick={() => onOpenCollection?.(col)}
                        />
                    ))}
                </div>
            </main>
        );
    }

    if (games.length === 0) {
        return (
            <main className="sgl-grid-panel">
                <div className="sgl-empty">
                    <span>No games found in this category</span>
                </div>
            </main>
        );
    }

    return (
        <main className="sgl-grid-panel">
            <div className="sgl-grid" style={{ '--sgl-columns': columns } as React.CSSProperties}>
                {games.map((game, idx) => (
                    <BannerCard
                        key={`${game.appId}-${game.isSoundtrack ? 'ost' : 'game'}-${idx}`}
                        game={game}
                        isFocused={isGridFocused && idx === selectedIndex}
                        accent={accent}
                        onClick={() => onSelectGame(idx)}
                        onDoubleClick={() => onLaunchGame?.(game)}
                        onContextMenu={(e) => onContextMenu?.(game, idx, e.currentTarget)}
                    />
                ))}
            </div>
        </main>
    );
}
