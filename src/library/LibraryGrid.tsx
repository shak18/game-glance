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

export type ResolvedCardArt =
    | { mode: 'banner'; url: string }
    | { mode: 'hero-logo'; heroUrl: string; logoUrl: string }
    | { mode: 'hero'; heroUrl: string }
    | { mode: 'logo'; logoUrl: string }
    | { mode: 'poster'; url: string }
    | { mode: 'none' };

export const cardArtMemo = new Map<number, ResolvedCardArt>();
const inFlightArt = new Map<number, Promise<ResolvedCardArt>>();

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

export function BannerCard({ game, isFocused, accent = '#1a9fff', onClick, onDoubleClick, onContextMenu }: BannerCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

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
    }, [game.appId, game.landscapeUrl, game.heroUrl, game.logoUrl, game.capsuleUrl, game.isSoundtrack]);

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
                        key={`${game.appId}-${game.isSoundtrack ? 'ost' : 'game'}`}
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
