import { callable, fetchNoCors } from '@decky/api';
import { useEffect, useState } from 'react';
import { LOG_PREFIX, PLUGIN_NAME } from '../constants';
import { cache, Cache, DAY_MS } from './cache';

/**
 * Built-in updater for Glance Library:
 * Checks GitHub releases on shak18/game-glance, looks for releases with glance-library assets,
 * and hands updates to Decky's native installer ('utilities/install_plugin').
 */
export const GITHUB_REPO = 'shak18/game-glance';
export const RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`;

/** The release asset Decky installs. */
export const ASSET_NAME = 'glance-library.zip';
/** Versioned naming patterns accepted (e.g. glance-library-v1.0.1.zip or glance-library-1.0.1.zip). */
export const VERSIONED_ASSET = /^glance-library-v?\d+(\.\d+){1,3}\.zip$/i;

/** Decky's install type for an update of an installed plugin (1 reinstall, 2 update, 3 downgrade). */
export const INSTALL_TYPE_UPDATE = 2;

/**
 * Parses tags or version strings into numeric parts.
 * Supports prefixes like 'glance-library-v1.0.0', 'library-v1.0.0', 'v1.0.0', or '1.0.0'.
 * Returns null if not a valid semantic version.
 */
export function parseVersion(text: unknown): number[] | null {
    if (typeof text !== 'string') return null;
    const cleaned = text
        .trim()
        .replace(/^(glance[-_]?library|library)[-_]?/i, '')
        .replace(/^v/i, '')
        .split(/[-+]/)[0];
    if (!/^\d+(\.\d+){0,3}$/.test(cleaned)) return null;
    return cleaned.split('.').map(Number);
}

/** Formats parsed version numbers into a clean standard string "1.0.0". */
export function extractVersionString(text: unknown): string | null {
    const nums = parseVersion(text);
    return nums ? nums.join('.') : null;
}

/** Whether `latest` is a higher version than `current`. */
export function isNewer(latest: string, current: string): boolean {
    const a = parseVersion(latest);
    const b = parseVersion(current);
    if (!a || !b) return false;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const d = (a[i] ?? 0) - (b[i] ?? 0);
        if (d !== 0) return d > 0;
    }
    return false;
}

export interface Release {
    /** The clean semantic version string (e.g. "1.0.1") */
    version: string;
    /** Download URL for the zip */
    url: string;
    /** SHA-256 hash if provided by GitHub, or empty string */
    sha256: string;
}

/**
 * Accurately extracts the Glance Library version from a GitHub release item.
 * Supports:
 * - Release title containing "Glance Library v1.0.0"
 * - Tag name containing "glance-library-v1.0.0"
 * - Assets named "glance-library-v1.0.0.zip"
 * - Dedicated semver tags (e.g. "v1.0.0", "1.0.0")
 * Ignores legacy monolithic Game Glance tags (e.g. 2.x, 3.x) unless explicitly identified as Glance Library.
 */
export function extractGlanceLibraryVersion(r: {
    tag_name?: unknown;
    name?: unknown;
    body?: unknown;
    assets?: unknown;
}): string | null {
    const tagName = typeof r.tag_name === 'string' ? r.tag_name.trim() : '';
    const releaseName = typeof r.name === 'string' ? r.name.trim() : '';

    // 1. Explicit "Glance Library vX.Y.Z" in release name
    const nameMatch = releaseName.match(/glance[-_\s]?library[^0-9v]*v?(\d+(?:\.\d+)+)/i);
    if (nameMatch) {
        return nameMatch[1];
    }

    // 2. Explicit "glance-library-vX.Y.Z" in tag name
    const tagMatch = tagName.match(/glance[-_\s]?library[^0-9v]*v?(\d+(?:\.\d+)+)/i);
    if (tagMatch) {
        return tagMatch[1];
    }

    // 3. Asset named "glance-library-vX.Y.Z.zip"
    if (Array.isArray(r.assets)) {
        for (const a of r.assets) {
            const assetName = typeof a?.name === 'string' ? a.name : '';
            const assetMatch = assetName.match(/^glance[-_]library[-_]v?(\d+(?:\.\d+)+)\.zip$/i);
            if (assetMatch) {
                return assetMatch[1];
            }
        }
    }

    // 4. Tag starting with "v1." or "1." (Glance Library standalone releases)
    if (/^v?1\.\d+(\.\d+)?$/i.test(tagName)) {
        return extractVersionString(tagName);
    }

    // 5. If tag is 2.x or 3.x (monolithic Game Glance releases), DO NOT use tag as Glance Library version
    if (/^v?[23]\.\d+(\.\d+)?/i.test(tagName)) {
        return null;
    }

    // 6. Generic version string fallback
    return extractVersionString(tagName) || extractVersionString(releaseName);
}

/**
 * Extracts the newest installable Glance Library release from GitHub API output.
 * Handles both an array of releases (/releases) and a single release (/releases/latest).
 * Specifically requires the presence of glance-library.zip to avoid picking up unrelated fork releases.
 */
export function pickRelease(json: unknown): Release | null {
    try {
        const list = Array.isArray(json) ? json : [json];
        for (const item of list) {
            const r = item as {
                tag_name?: unknown;
                name?: unknown;
                draft?: unknown;
                prerelease?: unknown;
                assets?: unknown;
            } | null;
            if (!r || r.draft === true || r.prerelease === true) continue;

            const version = extractGlanceLibraryVersion(r);
            if (!version) continue;

            const assets = Array.isArray(r.assets)
                ? (r.assets as Array<{ name?: unknown; browser_download_url?: unknown; digest?: unknown }>)
                : [];
            const zip =
                assets.find((a) => a?.name === ASSET_NAME) ??
                assets.find((a) => typeof a?.name === 'string' && VERSIONED_ASSET.test(a.name));
            if (!zip) continue;

            const url = zip.browser_download_url;
            if (typeof url !== 'string' || !/^https:\/\//.test(url)) continue;

            const digest = typeof zip.digest === 'string' ? zip.digest : '';
            const sha256 = /^sha256:[0-9a-f]{64}$/i.test(digest) ? digest.slice(7).toLowerCase() : '';

            return { version, url, sha256 };
        }
        return null;
    } catch {
        return null;
    }
}

export type UpdateState =
    | { status: 'checking'; current: string | null }
    | { status: 'upToDate'; current: string }
    | { status: 'available'; current: string; release: Release }
    | { status: 'error'; current: string | null };

export interface UpdateDeps {
    currentVersion(): Promise<string | null>;
    latestRelease(): Promise<unknown>;
}

const getVersion = callable<[], string | null>('get_version');

export const UPDATE_CHECK_EVERY_MS = DAY_MS;
export const LATEST_TTL_MS = DAY_MS - 5 * 60_000;
const LATEST_KEY = 'update:latest';

function slimRelease(json: unknown): unknown {
    const list = Array.isArray(json) ? json : [json];
    return list.map((item) => {
        const r = item as { tag_name?: unknown; name?: unknown; draft?: unknown; prerelease?: unknown; assets?: unknown } | null;
        if (!r || typeof r !== 'object') return item;
        const assets = Array.isArray(r.assets)
            ? (r.assets as Array<Record<string, unknown> | null>).map((a) => ({
                  name: a?.name,
                  browser_download_url: a?.browser_download_url,
                  digest: a?.digest,
              }))
            : r.assets;
        return { tag_name: r.tag_name, name: r.name, draft: r.draft, prerelease: r.prerelease, assets };
    });
}

export function latestReleases(fetchLatest: () => Promise<unknown>, store: Cache): { daily(): Promise<unknown>; fresh(): Promise<unknown> } {
    const fresh = async () => {
        const json = slimRelease(await fetchLatest());
        await store.put(LATEST_KEY, { json }, LATEST_TTL_MS).catch(() => undefined);
        return json;
    };
    return {
        fresh,
        async daily() {
            const kept = await store.get<{ json: unknown }>(LATEST_KEY).catch(() => null);
            return kept ? kept.json : fresh();
        },
    };
}

async function fetchLatestRelease(): Promise<unknown> {
    const res = await fetchNoCors(RELEASES_URL, {
        method: 'GET',
        headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
    return res.json();
}

const releases = latestReleases(fetchLatestRelease, cache);

export const defaultUpdateDeps: UpdateDeps = {
    currentVersion: () => getVersion(),
    latestRelease: () => releases.daily(),
};

const freshUpdateDeps: UpdateDeps = {
    currentVersion: () => getVersion(),
    latestRelease: () => releases.fresh(),
};

export async function checkForUpdate(deps: UpdateDeps = defaultUpdateDeps): Promise<UpdateState> {
    let current: string | null = null;
    try {
        const raw = await deps.currentVersion();
        current = typeof raw === 'string' && extractVersionString(raw) ? extractVersionString(raw) : null;
        if (!current) return { status: 'error', current: null };
        const release = pickRelease(await deps.latestRelease());
        if (!release) return { status: 'upToDate', current };
        return isNewer(release.version, current)
            ? { status: 'available', current, release }
            : { status: 'upToDate', current };
    } catch (error) {
        console.warn(`${LOG_PREFIX} update check failed`, error);
        return { status: 'error', current };
    }
}

interface DeckyBackendLike {
    call(route: string, ...args: unknown[]): Promise<unknown>;
}

const deckyBackend = (): DeckyBackendLike | undefined =>
    (globalThis as { DeckyBackend?: DeckyBackendLike }).DeckyBackend;

/**
 * Hands the release to Decky's installer, which confirms with user, downloads, installs and reloads Glance Library.
 */
export async function installUpdate(
    release: Release,
    backend: DeckyBackendLike | undefined = deckyBackend()
): Promise<boolean> {
    try {
        if (!backend?.call) return false;
        await backend.call(
            'utilities/install_plugin',
            release.url,
            PLUGIN_NAME,
            release.version,
            release.sha256,
            INSTALL_TYPE_UPDATE
        );
        return true;
    } catch (error) {
        console.warn(`${LOG_PREFIX} update install failed`, error);
        return false;
    }
}

let latestCheck: Promise<UpdateState> | null = null;
const checkListeners = new Set<() => void>();

function runCheck(force: boolean): Promise<UpdateState> {
    const check = checkForUpdate(force ? freshUpdateDeps : defaultUpdateDeps);
    latestCheck = check;
    checkListeners.forEach((listener) => listener());
    return check;
}

export function startUpdateChecks(every = UPDATE_CHECK_EVERY_MS): () => void {
    void runCheck(false);
    const timer = setInterval(() => void runCheck(false), every);
    return () => clearInterval(timer);
}

export function useUpdate(): { state: UpdateState; recheck(): void } {
    const [state, setState] = useState<UpdateState>({ status: 'checking', current: null });
    useEffect(() => {
        let shown: Promise<UpdateState> | null = null;
        const show = () => {
            const check = latestCheck ?? runCheck(false);
            if (check === shown) return;
            shown = check;
            check.then(
                (next) => {
                    if (shown === check) setState(next);
                },
                () => undefined
            );
        };
        checkListeners.add(show);
        show();
        return () => {
            checkListeners.delete(show);
            shown = null;
        };
    }, []);
    const recheck = () => {
        setState((s) => ({ status: 'checking', current: s.current }));
        void runCheck(true);
    };
    return { state, recheck };
}

export function resetUpdateCheck() {
    latestCheck = null;
}
