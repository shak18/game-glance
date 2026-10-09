import React, { useEffect, useRef } from 'react';
import { FaFolder } from 'react-icons/fa';
import {
    browserStores,
    capsuleUrls as getCapsuleUrls,
    heroUrls as getHeroUrls,
    landscapeUrls as getLandscapeUrls,
    logoUrls as getLogoUrls,
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

    // Primary: Long horizontal banner (soundtracks use square cover)
    const bannerCandidates = React.useMemo(() => {
        if (game.landscapeUrl) return [game.landscapeUrl];
        if (game.isSoundtrack) {
            return [
                ...getSoundtrackCoverUrls(game.appId, browserStores),
                ...getLandscapeUrls(game.appId, browserStores),
            ];
        }
        return getLandscapeUrls(game.appId, browserStores);
    }, [game.appId, game.landscapeUrl, game.isSoundtrack]);

    const [src, setSrc] = React.useState<string>(bannerCandidates[0] ?? '');
    const [candidateIdx, setCandidateIdx] = React.useState(0);
    const [hasError, setHasError] = React.useState(bannerCandidates.length === 0);

    useEffect(() => {
        setCandidateIdx(0);
        setHasError(bannerCandidates.length === 0);
        setSrc(bannerCandidates[0] ?? '');
    }, [bannerCandidates]);

    const handleError = () => {
        const next = candidateIdx + 1;
        if (next < bannerCandidates.length) {
            setCandidateIdx(next);
            setSrc(bannerCandidates[next]);
        } else {
            setHasError(true);
        }
    };

    const isBannerAvailable = Boolean(src && !hasError);

    // Fallback 1: Hero background image
    const heroCandidates = React.useMemo(() => {
        if (game.heroUrl) return [game.heroUrl];
        return getHeroUrls(game.appId, browserStores);
    }, [game.appId, game.heroUrl]);

    const [heroSrc, setHeroSrc] = React.useState<string>(heroCandidates[0] ?? '');
    const [heroIdx, setHeroIdx] = React.useState(0);
    const [hasHeroError, setHasHeroError] = React.useState(heroCandidates.length === 0);

    useEffect(() => {
        setHeroIdx(0);
        setHasHeroError(heroCandidates.length === 0);
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

    // Fallback 2: Centered game logo
    const logoCandidates = React.useMemo(() => {
        if (game.logoUrl) return [game.logoUrl];
        return getLogoUrls(game.appId, browserStores);
    }, [game.appId, game.logoUrl]);

    const [logoSrc, setLogoSrc] = React.useState<string>(logoCandidates[0] ?? '');
    const [logoIdx, setLogoIdx] = React.useState(0);
    const [hasLogoError, setHasLogoError] = React.useState(logoCandidates.length === 0);

    useEffect(() => {
        setLogoIdx(0);
        setHasLogoError(logoCandidates.length === 0);
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

    // Fallback 3 (Option 3): Poster capsule art
    // Used ONLY if no logo and no hero background exist!
    const posterCandidates = React.useMemo(() => {
        if (game.capsuleUrl) return [game.capsuleUrl];
        return getCapsuleUrls(game.appId, browserStores);
    }, [game.appId, game.capsuleUrl]);

    const [posterSrc, setPosterSrc] = React.useState<string>(posterCandidates[0] ?? '');
    const [posterIdx, setPosterIdx] = React.useState(0);
    const [hasPosterError, setHasPosterError] = React.useState(posterCandidates.length === 0);

    useEffect(() => {
        setPosterIdx(0);
        setHasPosterError(posterCandidates.length === 0);
        setPosterSrc(posterCandidates[0] ?? '');
    }, [posterCandidates]);

    const handlePosterError = () => {
        const next = posterIdx + 1;
        if (next < posterCandidates.length) {
            setPosterIdx(next);
            setPosterSrc(posterCandidates[next]);
        } else {
            setHasPosterError(true);
        }
    };

    const isHeroAvailable = Boolean(heroSrc && !hasHeroError);
    const isLogoAvailable = Boolean(logoSrc && !hasLogoError);
    const isPosterAvailable = Boolean(posterSrc && !hasPosterError);

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
                    onError={handleError}
                />
            ) : isLogoAvailable || isHeroAvailable ? (
                <div className="sgl-card-fallback">
                    {isHeroAvailable && (
                        <img
                            src={heroSrc}
                            alt=""
                            className="sgl-card-fallback-bg"
                            onError={handleHeroError}
                        />
                    )}
                    {isHeroAvailable && <div className="sgl-card-fallback-overlay" />}
                    {isLogoAvailable ? (
                        <img
                            src={logoSrc}
                            alt={game.name}
                            className="sgl-card-fallback-logo"
                            onError={handleLogoError}
                        />
                    ) : (
                        <span className="sgl-card-fallback-title">{game.name}</span>
                    )}
                </div>
            ) : isPosterAvailable ? (
                <img
                    src={posterSrc}
                    alt={game.name}
                    className="sgl-card-img"
                    onError={handlePosterError}
                />
            ) : (
                <div className="sgl-card-fallback">
                    <span className="sgl-card-fallback-title">{game.name}</span>
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
