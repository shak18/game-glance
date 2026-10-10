import React, { useEffect, useState } from 'react';
import { FaPlay, FaInfoCircle, FaMusic, FaFolderOpen } from 'react-icons/fa';
import {
    browserStores,
    capsuleUrls as getCapsuleUrls,
    getCachedCoverUrl,
    heroUrls as getHeroUrls,
    landscapeUrls as getLandscapeUrls,
    logoUrls as getLogoUrls,
    setCachedCoverUrl,
    soundtrackCoverUrls as getSoundtrackCoverUrls,
} from '../home/artwork';
import { Chip, gameChips } from '../home/chips';
import { formatHours, minutesToHours, steamLanguageToLocale } from '../logic/format';
import { formatLastPlayed } from '../home/recents';
import { peekSteamLanguage } from '../data/steam';
import { LibraryCollectionItem, LibraryGameItem } from './libraryData';
import { getActionGlyph, useInputMode } from './useInputMode';

interface LibraryInspectorProps {
    game: LibraryGameItem | null;
    collection?: LibraryCollectionItem | null;
    isCollectionView?: boolean;
    accent: string;
    description: string | null;
    hltbMainHours: number | null;
    preferLogos?: boolean;
    onPlay: () => void;
    onDetails: () => void;
    onOpenCollection?: () => void;
}

function InspectorFanCover({ game, className }: { game?: LibraryGameItem; className: string }) {
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
            <div className={`sgl-insp-col-card ${className}`}>
                <div style={{ width: '100%', height: '100%', background: '#1c2433', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaFolderOpen size={24} color="rgba(255,255,255,0.4)" />
                </div>
            </div>
        );
    }

    return (
        <div className={`sgl-insp-col-card ${className}`}>
            <img src={src} alt={game.name} onError={handleError} />
        </div>
    );
}

function InspectorGameCover({ game }: { game: LibraryGameItem }) {
    // 1. Primary: Square cover for soundtracks (1:1), Vertical capsule art for games (2:3)
    const posterCandidates = React.useMemo(() => {
        if (game.capsuleUrl) return [game.capsuleUrl];
        const cached = getCachedCoverUrl(game.appId);
        if (cached !== undefined) return cached ? [cached] : [];
        if (game.isSoundtrack) {
            return getSoundtrackCoverUrls(game.appId, browserStores);
        }
        return getCapsuleUrls(game.appId, browserStores);
    }, [game.appId, game.capsuleUrl, game.isSoundtrack]);

    const [posterSrc, setPosterSrc] = useState<string>(posterCandidates[0] ?? '');
    const [posterIdx, setPosterIdx] = useState(0);
    const [hasPosterError, setHasPosterError] = useState(posterCandidates.length === 0);
    const [isPosterLoaded, setIsPosterLoaded] = useState(Boolean(getCachedCoverUrl(game.appId)));

    useEffect(() => {
        setPosterIdx(0);
        setHasPosterError(posterCandidates.length === 0);
        setIsPosterLoaded(Boolean(getCachedCoverUrl(game.appId)));
        setPosterSrc(posterCandidates[0] ?? '');
    }, [posterCandidates, game.appId]);

    const handlePosterLoad = () => {
        setIsPosterLoaded(true);
        if (posterSrc) setCachedCoverUrl(game.appId, posterSrc);
    };

    const handlePosterError = () => {
        const next = posterIdx + 1;
        if (next < posterCandidates.length) {
            setPosterIdx(next);
            setPosterSrc(posterCandidates[next]);
        } else {
            setHasPosterError(true);
            setCachedCoverUrl(game.appId, '');
        }
    };

    const isPosterAvailable = Boolean(posterSrc && !hasPosterError);

    // 2. Fallback backdrop: Blurred hero art (with landscape banner as fallback)
    const bgCandidates = React.useMemo(() => {
        if (isPosterAvailable) return [];
        const heroes = game.heroUrl ? [game.heroUrl] : getHeroUrls(game.appId, browserStores);
        const landscapes = game.landscapeUrl ? [game.landscapeUrl] : getLandscapeUrls(game.appId, browserStores);
        return [...new Set([...heroes, ...landscapes])];
    }, [isPosterAvailable, game.appId, game.heroUrl, game.landscapeUrl]);

    const [bgSrc, setBgSrc] = useState<string>(bgCandidates[0] ?? '');
    const [bgIdx, setBgIdx] = useState(0);

    useEffect(() => {
        setBgIdx(0);
        setBgSrc(bgCandidates[0] ?? '');
    }, [bgCandidates]);

    const handleBgError = () => {
        const next = bgIdx + 1;
        if (next < bgCandidates.length) {
            setBgIdx(next);
            setBgSrc(bgCandidates[next]);
        }
    };

    // 3. Fallback center: Preferred logo
    const logoCandidates = React.useMemo(() => {
        if (isPosterAvailable) return [];
        if (game.logoUrl) return [game.logoUrl];
        return getLogoUrls(game.appId, browserStores);
    }, [isPosterAvailable, game.appId, game.logoUrl]);

    const [logoSrc, setLogoSrc] = useState<string>(logoCandidates[0] ?? '');
    const [logoIdx, setLogoIdx] = useState(0);
    const [hasLogoError, setHasLogoError] = useState(false);

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

    // 4. Fallback center banner (if NO logo available): Clean horizontal banner
    const bannerCandidates = React.useMemo(() => {
        if (isPosterAvailable || isLogoAvailable) return [];
        if (game.landscapeUrl) return [game.landscapeUrl];
        return getLandscapeUrls(game.appId, browserStores);
    }, [isPosterAvailable, isLogoAvailable, game.appId, game.landscapeUrl]);

    const [bannerSrc, setBannerSrc] = useState<string>(bannerCandidates[0] ?? '');
    const [bannerIdx, setBannerIdx] = useState(0);
    const [hasBannerError, setHasBannerError] = useState(false);

    useEffect(() => {
        setBannerIdx(0);
        setHasBannerError(false);
        setBannerSrc(bannerCandidates[0] ?? '');
    }, [bannerCandidates]);

    const handleBannerError = () => {
        const next = bannerIdx + 1;
        if (next < bannerCandidates.length) {
            setBannerIdx(next);
            setBannerSrc(bannerCandidates[next]);
        } else {
            setHasBannerError(true);
        }
    };

    const isBannerAvailable = Boolean(bannerSrc && !hasBannerError);

    return (
        <div className={`sgl-poster-wrapper${game.isSoundtrack ? ' sgl-poster-square' : ''}`}>
            {isPosterAvailable ? (
                <img
                    src={posterSrc}
                    alt={game.name}
                    className="sgl-poster-img"
                    onLoad={handlePosterLoad}
                    onError={handlePosterError}
                    style={{
                        opacity: isPosterLoaded ? 1 : 0,
                        transition: 'opacity 0.15s ease',
                    }}
                />
            ) : (
                <div className="sgl-poster-fallback">
                    {bgSrc && (
                        <img
                            key={bgSrc}
                            src={bgSrc}
                            alt=""
                            className="sgl-poster-fallback-bg"
                            onError={handleBgError}
                        />
                    )}
                    <div className="sgl-poster-fallback-overlay" />
                    <div className="sgl-poster-fallback-content">
                        {isLogoAvailable ? (
                            <img
                                key={logoSrc}
                                src={logoSrc}
                                alt={game.name}
                                className="sgl-poster-fallback-logo"
                                onError={handleLogoError}
                            />
                        ) : isBannerAvailable ? (
                            <img
                                key={bannerSrc}
                                src={bannerSrc}
                                alt={game.name}
                                className="sgl-poster-fallback-banner"
                                onError={handleBannerError}
                            />
                        ) : (
                            <div className="sgl-poster-fallback-title">{game.name}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export function LibraryInspector({
    game,
    collection,
    isCollectionView = false,
    accent,
    description,
    hltbMainHours,
    onPlay,
    onDetails,
    onOpenCollection,
}: LibraryInspectorProps) {
    const inputMode = useInputMode();
    const selectGlyph = getActionGlyph('select', inputMode);
    const playGlyph = getActionGlyph('play', inputMode);
    const badgeClass = `sgl-btn-badge${inputMode === 'keyboard' ? ' sgl-keycap' : ''}`;

    // Collection overview mode with multi-poster fan showcase
    if (isCollectionView && collection) {
        const games = collection.games;
        const game0 = games[0];
        const game1 = games[1];
        const game2 = games[2];
        const game3 = games[3];
        const game4 = games[4];

        return (
            <aside className="sgl-inspector" style={{ '--accent': accent } as React.CSSProperties}>
                <div className="sgl-inspector-col-fan">
                    {games.length >= 5 ? (
                        <>
                            <InspectorFanCover game={game3} className="sgl-insp-col-card-far-left" />
                            <InspectorFanCover game={game1} className="sgl-insp-col-card-left" />
                            <InspectorFanCover game={game4} className="sgl-insp-col-card-far-right" />
                            <InspectorFanCover game={game2} className="sgl-insp-col-card-right" />
                            <InspectorFanCover game={game0} className="sgl-insp-col-card-center" />
                        </>
                    ) : games.length === 4 ? (
                        <>
                            <InspectorFanCover game={game3} className="sgl-insp-col-card-far-left" />
                            <InspectorFanCover game={game1} className="sgl-insp-col-card-left" />
                            <InspectorFanCover game={game2} className="sgl-insp-col-card-right" />
                            <InspectorFanCover game={game0} className="sgl-insp-col-card-center" />
                        </>
                    ) : games.length === 3 ? (
                        <>
                            <InspectorFanCover game={game1} className="sgl-insp-col-card-left" />
                            <InspectorFanCover game={game2} className="sgl-insp-col-card-right" />
                            <InspectorFanCover game={game0} className="sgl-insp-col-card-center" />
                        </>
                    ) : games.length === 2 ? (
                        <>
                            <InspectorFanCover game={game1} className="sgl-insp-col-card-left" />
                            <InspectorFanCover game={game0} className="sgl-insp-col-card-center" />
                        </>
                    ) : games.length === 1 ? (
                        <InspectorFanCover game={game0} className="sgl-insp-col-card-center" />
                    ) : (
                        <div
                            style={{
                                width: 78,
                                height: 117,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#161b24',
                                borderRadius: 7,
                                border: '1px solid rgba(255,255,255,0.15)',
                            }}
                        >
                            <FaFolderOpen size={32} color="var(--accent, #58a6ff)" />
                        </div>
                    )}
                </div>

                <div className="sgl-title-box">
                    <div className="sgl-title-text">{collection.name}</div>
                </div>

                <div className="sgl-meta-row">
                    <span className="sgl-source-pill">Collection</span>
                    <span className="sgl-status-pill">{collection.count} Games</span>
                </div>

                <div className="sgl-stats-grid">
                    <div className="sgl-stat-card">
                        <span className="sgl-stat-label">Total Games</span>
                        <span className="sgl-stat-value">{collection.count}</span>
                    </div>
                </div>

                <div className="sgl-description">
                    Custom collection with {collection.count} {collection.count === 1 ? 'game' : 'games'}.
                </div>

                <div className="sgl-actions">
                    <button
                        className="sgl-btn-details"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenCollection?.();
                        }}
                        style={{ width: '100%' }}
                    >
                        <FaFolderOpen size={13} />
                        <span>Open Collection</span>
                        <span className={badgeClass}>{selectGlyph}</span>
                    </button>
                </div>
            </aside>
        );
    }

    if (!game) {
        return (
            <aside className="sgl-inspector">
                <div style={{ color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', marginTop: 40 }}>
                    Select an item
                </div>
            </aside>
        );
    }

    const locale = steamLanguageToLocale(peekSteamLanguage() ?? 'english');



    // Compute chips: customized for soundtracks vs regular games
    const chips: Chip[] = React.useMemo(() => {
        if (game.isSoundtrack) {
            const playedHours = minutesToHours(game.playedMinutes);
            const list: Chip[] = [];
            if (game.playedMinutes > 0) {
                list.push({ key: 'played', label: 'Time Listened', value: formatHours(playedHours, locale) });
            }
            if (game.lastPlayed) {
                list.push({ key: 'lastPlayed', label: 'Last played', value: formatLastPlayed(game.lastPlayed, Math.floor(Date.now() / 1000), locale) });
            }
            list.push({ key: 'type', label: 'Format', value: 'Soundtrack' });
            return list;
        }

        return gameChips(
            {
                playedMinutes: game.playedMinutes,
                achievements: game.achievements,
                lastPlayed: game.lastPlayed ?? 0,
                hltbMainHours,
            },
            Date.now(),
            locale
        );
    }, [game.isSoundtrack, game.playedMinutes, game.achievements, game.lastPlayed, hltbMainHours, locale]);

    const playLabel = game.running
        ? (game.isSoundtrack ? 'Playing' : 'Resume')
        : game.installed
            ? (game.isSoundtrack ? 'Play Soundtrack' : 'Play')
            : 'Install';

    return (
        <aside className="sgl-inspector" style={{ '--accent': accent } as React.CSSProperties}>
            {/* Poster Art: vertical 2:3 for games, square 1:1 for soundtracks, or blurred hero + logo fallback */}
            <InspectorGameCover game={game} />

            {/* Game Title: Clean typography, no cluttered secondary logo */}
            <div className="sgl-title-box">
                <div className="sgl-title-text">{game.name}</div>
            </div>

            {/* Badges row: Source and Status */}
            <div className="sgl-meta-row">
                <span className="sgl-source-pill">{game.isSoundtrack ? 'Soundtrack' : game.source}</span>
                {game.running && <span className="sgl-status-pill">Running</span>}
                {!game.installed && (
                    <span
                        className="sgl-source-pill"
                        style={{ background: 'rgba(238, 175, 43, 0.2)', color: '#e3b341', borderColor: 'rgba(238, 175, 43, 0.3)' }}
                    >
                        Not installed
                    </span>
                )}
            </div>

            {/* Glance Stats Grid */}
            <div className="sgl-stats-grid">
                {chips.map((chip) => (
                    <div key={chip.key} className="sgl-stat-card">
                        <span className="sgl-stat-label">{chip.label}</span>
                        <span className="sgl-stat-value">{chip.value}</span>
                        {typeof chip.progress === 'number' && (
                            <div className="sgl-stat-bar">
                                <div
                                    className="sgl-stat-fill"
                                    style={{
                                        width: `${Math.min(100, Math.max(0, chip.progress * 100))}%`,
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Short Description */}
            {description && <div className="sgl-description">{description}</div>}

            {/* Action Buttons: Single button for soundtracks, Details (A) and Play (Y) for games */}
            {game.isSoundtrack ? (
                <div className="sgl-actions">
                    <button
                        className="sgl-btn-details"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDetails?.();
                        }}
                        style={{ width: '100%' }}
                    >
                        <FaMusic size={12} />
                        <span>Open Soundtrack</span>
                        <span className={badgeClass}>{selectGlyph}</span>
                    </button>
                </div>
            ) : (
                <div className="sgl-actions">
                    <button
                        className="sgl-btn-details"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDetails?.();
                        }}
                    >
                        <FaInfoCircle size={13} />
                        <span>Details</span>
                        <span className={badgeClass}>{selectGlyph}</span>
                    </button>
                    <button
                        className="sgl-btn-play"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onPlay?.();
                        }}
                    >
                        <FaPlay size={11} />
                        <span>{playLabel}</span>
                        <span className={badgeClass}>{playGlyph}</span>
                    </button>
                </div>
            )}
        </aside>
    );
}
