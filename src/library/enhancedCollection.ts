import { useEffect, useState } from 'react';
import { callable, openFilePicker, FileSelectionType } from '@decky/api';
import { CollectionArtFit, CollectionArtMode, Settings } from '../data/settings';
import { registerArtworkCacheClearer } from './artwork';

const getImageDataCall = callable<[path: string], string | null>('get_image_data');
const findCollectionArtCall = callable<[name: string, id: string], { found?: boolean; path?: string; url?: string }>('find_collection_art');
const getStorageLocationsCall = callable<[], Array<{ label: string; path: string }>>('get_storage_locations');

export interface StorageLocationItem {
    label: string;
    path: string;
}

export async function fetchStorageLocations(): Promise<StorageLocationItem[]> {
    try {
        const res = await getStorageLocationsCall();
        if (Array.isArray(res) && res.length > 0) {
            return res;
        }
    } catch {
        // fallback
    }
    return [
        { label: 'Pictures (~/Pictures)', path: '/home/deck/Pictures' },
        { label: 'User Home (~)', path: '/home/deck' },
        { label: 'SD Card (/run/media)', path: '/run/media' },
        { label: 'Root (/)', path: '/' },
    ];
}

export interface CollectionArtResult {
    mode: CollectionArtMode;
    customUrl?: string;
    fit: CollectionArtFit;
    iconUrl?: string;
    iconKey?: string;
}

export interface CollectionIconResult {
    iconUrl: string;
    color?: string;
    source: 'custom' | 'auto-detect';
}

export const CONSOLE_ICONS: Record<string, string> = {
    '32x': '32x.png',
    '3ds': '3ds.png',
    'dc': 'dc.png',
    'ds': 'ds.png',
    'emu': 'emu.png',
    'gb': 'gb.png',
    'gba': 'gba.png',
    'gbc': 'gbc.png',
    'gc': 'gc.png',
    'genesis': 'genesis.webp',
    'md': 'md.png',
    'msx': 'msx.png',
    'n64': 'n64.png',
    'nes': 'nes.png',
    'ps1': 'ps1.webp',
    'ps2': 'ps2.png',
    'ps3': 'ps3.webp',
    'ps4': 'ps4.webp',
    'psp': 'psp.png',
    'snes': 'snes.png',
    'switch': 'switch.png',
    'wii': 'wii.webp',
    'wiiu': 'wiiu.png',
    'x360': 'x360.png',
    'xbox': 'xbox.png',
};

export const CONSOLE_LABELS: Record<string, string> = {
    '32x': 'Sega 32X',
    '3ds': 'Nintendo 3DS',
    'dc': 'Sega Dreamcast',
    'ds': 'Nintendo DS',
    'emu': 'Emulator / Retro',
    'gb': 'Game Boy',
    'gba': 'Game Boy Advance',
    'gbc': 'Game Boy Color',
    'gc': 'GameCube',
    'genesis': 'Sega Genesis',
    'md': 'Sega Mega Drive',
    'msx': 'MSX',
    'n64': 'Nintendo 64',
    'nes': 'NES / Famicom',
    'ps1': 'PlayStation 1',
    'ps2': 'PlayStation 2',
    'ps3': 'PlayStation 3',
    'ps4': 'PlayStation 4',
    'psp': 'PlayStation Portable',
    'snes': 'Super Nintendo / SNES',
    'switch': 'Nintendo Switch',
    'wii': 'Nintendo Wii',
    'wiiu': 'Nintendo Wii U',
    'x360': 'Xbox 360',
    'xbox': 'Original Xbox',
};

export const CONSOLE_SHORT_LABELS: Record<string, string> = {
    '32x': '32X',
    '3ds': '3DS',
    'dc': 'Dreamcast',
    'ds': 'NDS',
    'emu': 'Retro',
    'gb': 'Game Boy',
    'gba': 'GBA',
    'gbc': 'GBC',
    'gc': 'GameCube',
    'genesis': 'Genesis',
    'md': 'Mega Drive',
    'msx': 'MSX',
    'n64': 'N64',
    'nes': 'NES',
    'ps1': 'PS1',
    'ps2': 'PS2',
    'ps3': 'PS3',
    'ps4': 'PS4',
    'psp': 'PSP',
    'snes': 'SNES',
    'switch': 'Switch',
    'wii': 'Wii',
    'wiiu': 'Wii U',
    'x360': 'Xbox 360',
    'xbox': 'Xbox',
};

export function matchConsoleFromCollectionName(name: string): string | null {
    if (!name || typeof name !== 'string') return null;
    const clean = ` ${name.toLowerCase().replace(/[-_.:/]/g, ' ')} `;

    if (/\b(3ds|nintendo 3ds|citra)\b/.test(clean)) return '3ds';
    if (/\b(gba|game boy advance|gameboy advance)\b/.test(clean)) return 'gba';
    if (/\b(gbc|game boy color|gameboy color)\b/.test(clean)) return 'gbc';
    if (/\b(game boy|gameboy)\b/.test(clean)) return 'gb';
    if (/\b(gc|gamecube|game cube|dolphin)\b/.test(clean)) return 'gc';
    if (/\b(n64|nintendo 64)\b/.test(clean)) return 'n64';
    if (/\b(snes|super nintendo|super famicom|sfc)\b/.test(clean)) return 'snes';
    if (/\b(nes|famicom|nintendo entertainment system)\b/.test(clean)) return 'nes';
    if (/\b(switch|nintendo switch|yuzu|ryujinx)\b/.test(clean)) return 'switch';
    if (/\b(wii u|wiiu|cemu)\b/.test(clean)) return 'wiiu';
    if (/\b(wii)\b/.test(clean)) return 'wii';
    if (/\b(ps1|psx|playstation 1|duckstation)\b/.test(clean)) return 'ps1';
    if (/\b(ps2|playstation 2|pcsx2)\b/.test(clean)) return 'ps2';
    if (/\b(ps3|playstation 3|rpcs3)\b/.test(clean)) return 'ps3';
    if (/\b(ps4|playstation 4)\b/.test(clean)) return 'ps4';
    if (/\b(psp|playstation portable|ppsspp)\b/.test(clean)) return 'psp';
    if (/\b(32x|sega 32x)\b/.test(clean)) return '32x';
    if (/\b(dreamcast|sega dreamcast|flycast|redream)\b/.test(clean)) return 'dc';
    if (/\b(mega drive|megadrive|sega mega drive)\b/.test(clean)) return 'md';
    if (/\b(genesis|sega genesis)\b/.test(clean)) return 'genesis';
    if (/\b(msx|msx2)\b/.test(clean)) return 'msx';
    if (/\b(x360|xbox 360|xenia)\b/.test(clean)) return 'x360';
    if (/\b(xbox|original xbox)\b/.test(clean)) return 'xbox';
    if (/\b(ds|nds|nintendo ds|desmume|melonds)\b/.test(clean)) return 'ds';
    if (/\b(emu|emulation|emulator|emudeck|retroarch|retro games|retro)\b/.test(clean)) return 'emu';

    return null;
}

import { getBundledConsoleIcon } from './consoleIconData';

export function getBundledIconUrl(fileName: string): string {
    return `/plugins/glance-library/icons/${fileName}`;
}

const localArtCache = new Map<string, string | null>();
const imageUriCache = new Map<string, string>();

export function clearCollectionImageCache(): void {
    localArtCache.clear();
    imageUriCache.clear();
}

registerArtworkCacheClearer(clearCollectionImageCache);

function normalizePathKey(p: string): string {
    return p
        .replace(/^file:\/\//, '')
        .replace(/^\/plugins\/glance-library\/icons\//, '')
        .replace(/^\/?icons\//, '');
}

export function getCachedImageUri(pathOrUrl: string): string | undefined {
    if (!pathOrUrl) return undefined;
    if (pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        return pathOrUrl;
    }
    const clean = normalizePathKey(pathOrUrl);
    const embedded = getBundledConsoleIcon(clean) || getBundledConsoleIcon(pathOrUrl);
    if (embedded) return embedded;

    return imageUriCache.get(pathOrUrl) || imageUriCache.get(clean);
}

export function setCachedImageUri(pathOrUrl: string, uri: string): void {
    if (pathOrUrl && uri) {
        imageUriCache.set(pathOrUrl, uri);
        const clean = normalizePathKey(pathOrUrl);
        imageUriCache.set(clean, uri);
        imageUriCache.set(`/plugins/glance-library/icons/${clean}`, uri);
    }
}

/**
 * Resolves any image path (local filesystem, preset icon, or URL) into a browser-renderable URI.
 * Uses embedded console icons for 0ms instant display, or Decky backend's get_image_data to base64 encode local files.
 */
export async function resolveImageUri(pathOrUrl: string): Promise<string | null> {
    if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;
    if (pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        return pathOrUrl;
    }
    const cached = getCachedImageUri(pathOrUrl);
    if (cached) {
        return cached;
    }
    try {
        const cleanPath = normalizePathKey(pathOrUrl);
        // Also strip leading slash if left
        const param = cleanPath.startsWith('/') && !cleanPath.startsWith('/home') && !cleanPath.startsWith('/run') && !cleanPath.startsWith('/var')
            ? cleanPath.substring(1)
            : cleanPath;
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
        const dataUri = await Promise.race([getImageDataCall(param), timeoutPromise]);
        if (dataUri) {
            setCachedImageUri(pathOrUrl, dataUri);
            setCachedImageUri(cleanPath, dataUri);
            return dataUri;
        }
    } catch (e) {
        console.warn('[glance-library] resolveImageUri getImageDataCall failed:', pathOrUrl, e);
    }
    return null;
}

/**
 * Preloads all preset console icons in the background so they render immediately without flicker.
 */
export async function preloadPresetIcons(): Promise<void> {
    const promises = Object.values(CONSOLE_ICONS).map(async (fileName) => {
        const uri = await resolveImageUri(fileName);
        if (uri) {
            setCachedImageUri(fileName, uri);
            setCachedImageUri(`/plugins/glance-library/icons/${fileName}`, uri);
        }
    });
    await Promise.allSettled(promises);
}

/**
 * Hook to asynchronously resolve and return a safe Data URI for any image path or preset icon.
 * Returns cached URI synchronously if already in memory.
 */
export function useImageUri(rawPathOrUrl?: string | null): string | null {
    const [uri, setUri] = useState<string | null>(() => {
        if (!rawPathOrUrl) return null;
        return getCachedImageUri(rawPathOrUrl) ?? null;
    });

    useEffect(() => {
        if (!rawPathOrUrl) {
            setUri(null);
            return;
        }
        const cached = getCachedImageUri(rawPathOrUrl);
        if (cached) {
            setUri(cached);
            return;
        }
        let active = true;
        resolveImageUri(rawPathOrUrl).then((res) => {
            if (active && res) {
                setUri(res);
            }
        });
        return () => {
            active = false;
        };
    }, [rawPathOrUrl]);

    return uri;
}

/**
 * Opens Decky / SteamOS native file picker dialog for browsing local images.
 * includeFolders: true allows full directory navigation across internal storage and SD cards.
 */
export async function browseLocalCollectionImage(currentPathOrDir?: string): Promise<string | null> {
    try {
        if (typeof openFilePicker === 'function') {
            let startPath = '/home/deck/Pictures';
            if (currentPathOrDir && typeof currentPathOrDir === 'string') {
                const clean = currentPathOrDir.replace(/^file:\/\//, '').trim();
                if (clean.length > 0) {
                    if (/\.(png|jpe?g|webp|svg|bmp|gif|avif)$/i.test(clean)) {
                        const lastSlash = clean.lastIndexOf('/');
                        startPath = lastSlash > 0 ? clean.substring(0, lastSlash) : '/home/deck';
                    } else {
                        startPath = clean;
                    }
                }
            }
            const res = await openFilePicker(
                FileSelectionType.FILE,
                startPath,
                true,   // includeFiles: true (show images to select)
                true,   // includeFolders: true (crucial! enables browsing subfolders and drives)
                undefined,
                ['png', 'jpg', 'jpeg', 'webp', 'svg', 'PNG', 'JPG', 'JPEG', 'WEBP', 'SVG'],
                false,  // showHiddenFiles: false
                false   // allowAllFiles: false
            );
            const chosen = res?.path || res?.realpath || null;
            if (chosen) {
                await resolveImageUri(chosen);
                return chosen;
            }
        }
    } catch (e) {
        console.warn('[glance-library] browseLocalCollectionImage error/unavailable:', e);
    }
    return null;
}

export async function checkLocalCollectionArt(name: string, id: string): Promise<string | null> {
    const cacheKey = `${name}::${id}`;
    if (localArtCache.has(cacheKey)) {
        return localArtCache.get(cacheKey)!;
    }
    try {
        const resp = await findCollectionArtCall(name, id);
        if (resp?.found && resp.url) {
            localArtCache.set(cacheKey, resp.url);
            return resp.url;
        }
    } catch (e) {
        console.warn('[glance-library] checkLocalCollectionArt failed:', name, e);
    }
    localArtCache.set(cacheKey, null);
    return null;
}

/**
 * Resolves full artwork configuration for a collection card.
 */
export function resolveCollectionArt(
    collection: { name?: string; id?: string | number; count?: number },
    settings: Settings
): CollectionArtResult {
    const colId = collection?.id !== undefined ? String(collection.id) : '';
    const colName = typeof collection?.name === 'string' ? collection.name : String(collection?.name ?? '');

    const customConfig =
        (colId ? settings.collectionCustomArt?.[colId] : undefined) ??
        (colName ? settings.collectionCustomArt?.[colName] : undefined);

    // Check custom or auto-detected icon
    const consoleKey = customConfig?.icon ?? (settings.collectionConsoleIcons ? matchConsoleFromCollectionName(colName) : null);
    const iconUrl = consoleKey && CONSOLE_ICONS[consoleKey] ? getBundledIconUrl(CONSOLE_ICONS[consoleKey]) : undefined;

    // Check custom image URL
    const customUrl = customConfig?.url || (colName && colId ? localArtCache.get(`${colName}::${colId}`) ?? undefined : undefined);

    // Determine display mode:
    const resolvedMode: CollectionArtMode = customConfig?.mode
        ? customConfig.mode
        : customConfig?.url
            ? 'custom'
            : (settings.collectionArtMode === 'icon' || (collection.count === 0 && iconUrl))
                ? 'icon'
                : customUrl
                    ? 'custom'
                    : (settings.collectionArtMode ?? 'fan');

    // Sizing (fit) logic:
    // If customConfig explicitly has hasCustomFit: true (or an explicit fit for custom images), respect customConfig.fit.
    // For console icons without an explicit custom fit, dynamically follow global settings.collectionArtFit!
    const defaultFitForMode: CollectionArtFit = settings.collectionArtFit ?? (resolvedMode === 'icon' ? 'center' : 'cover');
    const hasExplicitFit = Boolean(customConfig?.hasCustomFit || (resolvedMode === 'custom' && customConfig?.fit));
    const fit: CollectionArtFit = hasExplicitFit && customConfig?.fit ? customConfig.fit : defaultFitForMode;

    return {
        mode: resolvedMode,
        customUrl: resolvedMode === 'custom' ? (customConfig?.url || customUrl) : undefined,
        fit,
        iconUrl,
        iconKey: consoleKey ?? undefined,
    };
}

/**
 * Resolves an icon badge for collection headers / footers.
 */
export function resolveCollectionIcon(
    collection: { name?: string; id?: string | number },
    _index?: number,
    enabled: boolean = true
): CollectionIconResult | null {
    if (!enabled || !collection) return null;
    const colName = typeof collection.name === 'string' ? collection.name : String(collection.name ?? '');
    if (!colName) return null;

    const consoleKey = matchConsoleFromCollectionName(colName);
    if (consoleKey && CONSOLE_ICONS[consoleKey]) {
        return {
            iconUrl: getBundledIconUrl(CONSOLE_ICONS[consoleKey]),
            source: 'auto-detect',
        };
    }

    return null;
}
