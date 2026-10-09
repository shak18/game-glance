import { memoDetails } from './detailsMemo';

export interface SteamStores {
    details(appId: number): {
        libraryAssets?: {
            strHeroImage?: string;
            strHeaderImage?: string;
            strLogoImage?: string;
            strCoverImage?: string;
            strCapsuleImage?: string;
        };
    } | undefined;
    overview(appId: number): {
        header_filename?: string;
        library_capsule_filename?: string;
        cover_filename?: string;
        album_cover_filename?: string;
        strCoverImage?: string;
        strCapsuleFilename?: string;
        m_strCustomCapsulePath?: string;
        strCustomCapsulePath?: string;
        m_strCustomHeroPath?: string;
        strCustomHeroPath?: string;
        m_strCustomLogoPath?: string;
        strCustomLogoPath?: string;
        m_strCustomHeaderPath?: string;
        strCustomHeaderPath?: string;
        m_gameid?: string;
        app_type?: number;
    } | undefined;
    /** Steam's own landscape (header) art list for the app, custom art first; root-relative or absolute urls. */
    landscape?(appId: number): string[] | undefined;
    /** Custom (SteamGridDB) hero art, jpg then png; root-relative urls; [] without custom art. */
    customHero?(appId: number): string[] | undefined;
    /** Custom (SteamGridDB) portrait capsule art, jpg then png; root-relative urls; [] without custom art. */
    customCapsule?(appId: number): string[] | undefined;
    /** Custom (SteamGridDB) logo art; root-relative urls; [] without custom art. */
    customLogo?(appId: number): string[] | undefined;
    /** Soundtracks square cover art list; root-relative or absolute urls. */
    soundtrackCover?(appId: number): string[] | undefined;
}

const HOST = 'https://steamloopback.host';
const ASSETS = `${HOST}/assets`;

function guarded<T>(read: () => T | undefined): T | undefined {
    try {
        return read();
    } catch {
        return undefined; // store not loaded for this app
    }
}

function toUrls(appId: number, paths: (string | undefined)[]): string[] {
    return paths.filter((p): p is string => typeof p === 'string' && p.length > 0).map((p) => `${ASSETS}/${appId}/${p}`);
}

/** Root-relative urls ("/customimages/...") resolve against Big Picture's origin. */
function absolute(url: string): string {
    return url.startsWith('/') && !url.startsWith('//') ? `${HOST}${url}` : url;
}

const isLocal = (url: string) => url.startsWith(`${HOST}/`);

/** A Steam url list helper's result: anything but an array (or a throwing helper) counts as empty; garbage dropped. */
function listed(read: () => unknown): string[] {
    const raw: unknown = guarded(read);
    return (Array.isArray(raw) ? raw : []).filter((u): u is string => typeof u === 'string' && u.length > 0).map(absolute);
}

/** Steam's app type for a game (not a shortcut, tool or mod). */
const GAME_APP_TYPE = 1;

/**
 * Where a Steam game's library hero is when its hashed file name is unknown (no details from Steam yet): the old,
 * unhashed local path, then Steam's image server (the CDN pattern storeHeaderUrl uses). Only for Steam games: a
 * shortcut has no such art. Tried after everything known and before the blurred-capsule fallback.
 */
export function guessedHeroUrls(appId: number): string[] {
    return [`${ASSETS}/${appId}/library_hero.jpg`, `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`];
}

/**
 * Hero first: it is the widest. Custom (SteamGridDB) hero art first (`appStore.GetCustomHeroImageURLs`, probed on
 * the Ally: `/customimages/<id>_hero.jpg|.png`, listed whenever the game has any custom art, so a listed file may
 * not exist), then the library assets in their hashed folders. A Steam game whose hero file name is not known yet
 * gets guessedHeroUrls in its place.
 */
export function heroUrls(appId: number, stores: SteamStores): string[] {
    const custom = listed(() => stores.customHero?.(appId));
    const hero = guarded(() => stores.details(appId))?.libraryAssets?.strHeroImage;
    const overview = guarded(() => stores.overview(appId));
    const guessed = !hero && overview?.app_type === GAME_APP_TYPE ? guessedHeroUrls(appId) : [];
    return [...new Set([...custom, ...toUrls(appId, [hero]), ...guessed, ...toUrls(appId, [overview?.header_filename, overview?.library_capsule_filename])])];
}

/**
 * The game's logo (the transparent title art Steam shows on its game page): custom (SteamGridDB) logo first
 * (`appStore.GetCustomLogoImageURLs`), then the library asset in its hashed folder (`strLogoImage`, known once Steam
 * or its details callback has loaded the game), then, for a Steam game, Steam's image server (`apps/<id>/logo.png`,
 * probed: present for games whose local file name is not known yet; the unhashed local `<id>_logo.png` is not).
 * A shortcut (Unifideck, non-Steam) has only custom art. [] means no logo: the caller shows the title.
 */
export function logoUrls(appId: number, stores: SteamStores): string[] {
    const custom = listed(() => stores.customLogo?.(appId));
    const logo = guarded(() => stores.details(appId))?.libraryAssets?.strLogoImage;
    const steamGame = guarded(() => stores.overview(appId))?.app_type === GAME_APP_TYPE;
    const remote = steamGame ? [`https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/logo.png`] : [];
    return [...new Set([...custom, ...toUrls(appId, [logo]), ...remote])];
}

/**
 * Resolves artwork candidates for a Soundtrack/Music app:
 * In Steam, soundtracks use a square format cover.
 * Prioritizes:
 * 1. Custom cover art (if user set custom art in Steam or SteamGridDB)
 * 2. Official square cover (details.libraryAssets.strCoverImage or overview.strCoverImage)
 * 3. Hashed cover files (overview.cover_filename or overview.album_cover_filename)
 * 4. Local asset guesses (/assets/<id>/cover.jpg, album_cover.jpg)
 * 5. Steam's high-resolution store/CDN assets (capsule_616x353.jpg, header.jpg, library_capsule.jpg, album_cover.jpg)
 * 6. Overview header_filename fallback
 */
export function soundtrackCoverUrls(appId: number, stores: SteamStores): string[] {
    const custom = listed(() => stores.soundtrackCover?.(appId) ?? stores.customCapsule?.(appId));
    const overview = guarded(() => stores.overview(appId));
    const details = guarded(() => stores.details(appId));

    const coverImage = details?.libraryAssets?.strCoverImage ?? overview?.strCoverImage;
    const coverFiles = [
        coverImage,
        overview?.cover_filename,
        overview?.album_cover_filename,
        overview?.library_capsule_filename,
    ];

    const localGuesses = [
        `${ASSETS}/${appId}/cover.jpg`,
        `${ASSETS}/${appId}/album_cover.jpg`,
        `${ASSETS}/${appId}/album_cover.png`,
        `${ASSETS}/${appId}/cover.png`,
    ];

    const remoteCdn =
        Number.isInteger(appId) && appId > 0
            ? [
                  `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_616x353.jpg`,
                  `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
                  `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/library_capsule.jpg`,
                  `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/album_cover.jpg`,
              ]
            : [];

    return [
        ...new Set([
            ...custom,
            ...toUrls(appId, coverFiles),
            ...localGuesses,
            ...remoteCdn,
            ...toUrls(appId, [overview?.header_filename]),
        ]),
    ];
}

/** Custom portrait art first (`appStore.GetCustomVerticalCapsuleURLs`: `/customimages/<id>p.jpg|.png`), then the assets. */
export function capsuleUrls(appId: number, stores: SteamStores): string[] {
    const custom = listed(() => stores.customCapsule?.(appId));
    const overview = guarded(() => stores.overview(appId));
    return [...new Set([...custom, ...toUrls(appId, [overview?.library_capsule_filename, overview?.header_filename])])];
}

/**
 * Wide (landscape) art for the expanded recents card: the image stock Home shows for its first Recently Played
 * game. Steam's own list first (`appDetailsStore.GetHeaderImages`, probed on the Ally: custom/SteamGridDB art
 * `/customimages/<id>.jpg|.png`, then the cached library header, then a CDN url); remote urls are kept only when
 * nothing local is listed, so no network fetch on every focus. Without the helper: the library header asset,
 * then `header_filename`. [] when nothing is known (the caller falls back to the hero).
 */
export function landscapeUrls(appId: number, stores: SteamStores): string[] {
    // Anything but an array (or a throwing helper) counts as an empty list, so the header fallbacks still apply.
    const all = listed(() => stores.landscape?.(appId));
    const local = all.filter(isLocal);
    const fromSteam = local.length > 0 ? local : all;
    if (fromSteam.length > 0) return [...new Set(fromSteam)];
    const header = guarded(() => stores.details(appId))?.libraryAssets?.strHeaderImage;
    const overview = guarded(() => stores.overview(appId));
    return [...new Set(toUrls(appId, [header, overview?.header_filename]))];
}

interface StoreGlobals {
    appDetailsStore?: {
        GetAppDetails?(appId: number): ReturnType<SteamStores['details']>;
        GetHeaderImages?(overview: unknown, want2x: boolean): string[] | undefined;
    };
    appStore?: {
        GetAppOverviewByAppID?(appId: number): ReturnType<SteamStores['overview']>;
        GetAppOverviewByGameID?(gameId: string | number | bigint): ReturnType<SteamStores['overview']>;
        GetCustomHeroImageURLs?(overview: unknown): string[] | undefined;
        GetCustomVerticalCapsuleURLs?(overview: unknown): string[] | undefined;
        GetCustomCapsuleURLs?(overview: unknown): string[] | undefined;
        GetCustomLogoImageURLs?(overview: unknown): string[] | undefined;
        GetCustomBoxartURL?(overview: unknown): string | undefined;
    };
}

const globals = (): StoreGlobals => ((globalThis as unknown as StoreGlobals | undefined) ?? {});

function getOverviewWithFallback(id: number): ReturnType<SteamStores['overview']> {
    const store = globals().appStore;
    if (!store) return undefined;
    let ov = store.GetAppOverviewByAppID?.(id);
    if (!ov && (id < 0 || id > 0x7fffffff)) {
        ov = store.GetAppOverviewByAppID?.(id < 0 ? (id >>> 0) : (id | 0));
    }
    return ov ?? undefined;
}

export const browserStores: SteamStores = {
    // Steam's store when it has the game's assets; else what its details callback sent (detailsMemo).
    details: (id) => {
        const store = globals().appDetailsStore;
        let details = store?.GetAppDetails?.(id);
        if (!details && (id < 0 || id > 0x7fffffff)) {
            details = store?.GetAppDetails?.(id < 0 ? (id >>> 0) : (id | 0));
        }
        if (details?.libraryAssets) return details;
        const remembered = memoDetails(id);
        return remembered ? { ...details, libraryAssets: remembered } : details;
    },
    overview: (id) => getOverviewWithFallback(id),
    landscape: (id) => {
        const g = globals();
        const overview = getOverviewWithFallback(id);
        const steamUrls: string[] = [];
        if (overview) {
            const headers = g.appDetailsStore?.GetHeaderImages?.(overview, false);
            if (Array.isArray(headers)) steamUrls.push(...headers);
            const customPath = (overview as Record<string, unknown>).strCustomHeaderPath ?? (overview as Record<string, unknown>).m_strCustomHeaderPath;
            if (typeof customPath === 'string' && customPath) steamUrls.push(customPath);
        }

        // Direct custom horizontal images from Steam's config/grid folder (served at /customimages/)
        // Windows Steam and SteamGridDB save custom artwork directly here
        if (g.appStore || g.appDetailsStore) {
            steamUrls.push(`/customimages/${id}.png`, `/customimages/${id}.jpg`);
            if (id < 0) {
                const unsigned = id >>> 0;
                steamUrls.push(`/customimages/${unsigned}.png`, `/customimages/${unsigned}.jpg`);
            } else if (id > 0x7fffffff) {
                const signed = id | 0;
                steamUrls.push(`/customimages/${signed}.png`, `/customimages/${signed}.jpg`);
            }
            const gid = (overview as Record<string, unknown> | undefined)?.m_gameid;
            if (gid && String(gid) !== String(id)) {
                steamUrls.push(`/customimages/${gid}.png`, `/customimages/${gid}.jpg`);
            }
        }

        return steamUrls.length > 0 ? steamUrls : undefined;
    },
    customHero: (id) => {
        const store = globals().appStore;
        const overview = getOverviewWithFallback(id);
        const steamUrls: string[] = [];
        if (overview) {
            const hUrls = store?.GetCustomHeroImageURLs?.(overview);
            if (Array.isArray(hUrls)) steamUrls.push(...hUrls);
            const customPath = (overview as Record<string, unknown>).strCustomHeroPath ?? (overview as Record<string, unknown>).m_strCustomHeroPath;
            if (typeof customPath === 'string' && customPath) steamUrls.push(customPath);
        }
        if (store) {
            steamUrls.push(`/customimages/${id}_hero.jpg`, `/customimages/${id}_hero.png`);
            const gid = (overview as Record<string, unknown> | undefined)?.m_gameid;
            if (gid && String(gid) !== String(id)) {
                steamUrls.push(`/customimages/${gid}_hero.jpg`, `/customimages/${gid}_hero.png`);
            }
        }
        return steamUrls.length > 0 ? steamUrls : undefined;
    },
    customCapsule: (id) => {
        const store = globals().appStore;
        const overview = getOverviewWithFallback(id);
        const steamUrls: string[] = [];
        if (overview) {
            const customPath = (overview as Record<string, unknown>).strCustomCapsulePath ?? (overview as Record<string, unknown>).m_strCustomCapsulePath;
            if (typeof customPath === 'string' && customPath) steamUrls.push(customPath);
            const vUrls = store?.GetCustomVerticalCapsuleURLs?.(overview);
            if (Array.isArray(vUrls)) steamUrls.push(...vUrls);
            const cUrls = store?.GetCustomCapsuleURLs?.(overview);
            if (Array.isArray(cUrls)) steamUrls.push(...cUrls);
            const boxUrl = store?.GetCustomBoxartURL?.(overview);
            if (typeof boxUrl === 'string' && boxUrl) steamUrls.push(boxUrl);
        }

        // Direct custom portrait images in config/grid (served at /customimages/)
        // Windows Steam and SteamGridDB save custom artwork directly here
        if (store) {
            steamUrls.push(`/customimages/${id}p.png`, `/customimages/${id}p.jpg`);
            if (id < 0) {
                const unsigned = id >>> 0;
                steamUrls.push(`/customimages/${unsigned}p.png`, `/customimages/${unsigned}p.jpg`);
            } else if (id > 0x7fffffff) {
                const signed = id | 0;
                steamUrls.push(`/customimages/${signed}p.png`, `/customimages/${signed}p.jpg`);
            }
            const gid = (overview as Record<string, unknown> | undefined)?.m_gameid;
            if (gid && String(gid) !== String(id)) {
                steamUrls.push(`/customimages/${gid}p.png`, `/customimages/${gid}p.jpg`);
            }
        }

        return steamUrls.length > 0 ? steamUrls : undefined;
    },
    customLogo: (id) => {
        const store = globals().appStore;
        const overview = getOverviewWithFallback(id);
        const steamUrls: string[] = [];
        if (overview) {
            const lUrls = store?.GetCustomLogoImageURLs?.(overview);
            if (Array.isArray(lUrls)) steamUrls.push(...lUrls);
            const customPath = (overview as Record<string, unknown>).strCustomLogoPath ?? (overview as Record<string, unknown>).m_strCustomLogoPath;
            if (typeof customPath === 'string' && customPath) steamUrls.push(customPath);
        }
        if (store) {
            steamUrls.push(`/customimages/${id}_logo.png`);
            const gid = (overview as Record<string, unknown> | undefined)?.m_gameid;
            if (gid && String(gid) !== String(id)) {
                steamUrls.push(`/customimages/${gid}_logo.png`);
            }
        }
        return steamUrls.length > 0 ? steamUrls : undefined;
    },
    soundtrackCover: (id) => {
        const store = globals().appStore;
        const overview = getOverviewWithFallback(id);
        const steamUrls: string[] = [];
        if (overview) {
            const customPath = (overview as Record<string, unknown>).strCustomCapsulePath ?? (overview as Record<string, unknown>).m_strCustomCapsulePath;
            if (typeof customPath === 'string' && customPath) steamUrls.push(customPath);
        }
        if (store) {
            steamUrls.push(`/customimages/${id}p.jpg`, `/customimages/${id}p.png`, `/customimages/${id}.jpg`, `/customimages/${id}.png`);
        }
        return steamUrls.length > 0 ? steamUrls : undefined;
    },
};

/**
 * A game's store header on Steam's CDN (the url pattern Steam's own GetHeaderImages lists last, probed on the Ally),
 * for games with no local art: wishlist sales, which are not in the library. Only the Recommended tab's deal row
 * uses it, and only when Show wishlist deals is on (that feature already talks to the store).
 */
export function storeHeaderUrl(appId: number): string | null {
    return Number.isInteger(appId) && appId > 0 ? `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg` : null;
}

/** In-memory cache of verified working artwork URLs to prevent flickering and redundant 404 retries */
const workingGridUrlCache = new Map<number, string>();
const workingCoverUrlCache = new Map<number, string>();

export function getCachedGridUrl(appId: number): string | undefined {
    return workingGridUrlCache.get(appId);
}

export function setCachedGridUrl(appId: number, url: string): void {
    workingGridUrlCache.set(appId, url);
}

export function getCachedCoverUrl(appId: number): string | undefined {
    return workingCoverUrlCache.get(appId);
}

export function setCachedCoverUrl(appId: number, url: string): void {
    workingCoverUrlCache.set(appId, url);
}

export interface CachedGridCardState {
    mode: 'banner' | 'hero-logo' | 'hero-title' | 'logo-only' | 'poster' | 'title-only';
    bannerUrl?: string;
    heroUrl?: string;
    logoUrl?: string;
    posterUrl?: string;
}

const cardStateCache = new Map<number, CachedGridCardState>();

export function getCachedCardState(appId: number): CachedGridCardState | undefined {
    return cardStateCache.get(appId);
}

export function setCachedCardState(appId: number, state: CachedGridCardState): void {
    cardStateCache.set(appId, state);
}



