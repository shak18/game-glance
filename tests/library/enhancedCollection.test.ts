import { describe, expect, it, vi } from 'vitest';
import {
    matchConsoleFromCollectionName,
    resolveCollectionArt,
    resolveCollectionIcon,
    CONSOLE_ICONS,
} from '../../src/library/enhancedCollection';
import { DEFAULTS, Settings } from '../../src/data/settings';

describe('enhancedCollection: matchConsoleFromCollectionName', () => {
    it('matches Sony PlayStation consoles', () => {
        expect(matchConsoleFromCollectionName('PlayStation 2')).toBe('ps2');
        expect(matchConsoleFromCollectionName('PS2 Classics')).toBe('ps2');
        expect(matchConsoleFromCollectionName('PS1 Hits')).toBe('ps1');
        expect(matchConsoleFromCollectionName('PSX')).toBe('ps1');
        expect(matchConsoleFromCollectionName('PS3 Collection')).toBe('ps3');
        expect(matchConsoleFromCollectionName('PS4')).toBe('ps4');
        expect(matchConsoleFromCollectionName('PSP Favorites')).toBe('psp');
    });

    it('matches Nintendo consoles', () => {
        expect(matchConsoleFromCollectionName('Nintendo Switch')).toBe('switch');
        expect(matchConsoleFromCollectionName('Switch')).toBe('switch');
        expect(matchConsoleFromCollectionName('GameCube')).toBe('gc');
        expect(matchConsoleFromCollectionName('Nintendo GC')).toBe('gc');
        expect(matchConsoleFromCollectionName('Nintendo 64')).toBe('n64');
        expect(matchConsoleFromCollectionName('N64')).toBe('n64');
        expect(matchConsoleFromCollectionName('SNES')).toBe('snes');
        expect(matchConsoleFromCollectionName('Super Nintendo')).toBe('snes');
        expect(matchConsoleFromCollectionName('NES')).toBe('nes');
        expect(matchConsoleFromCollectionName('Famicom')).toBe('nes');
        expect(matchConsoleFromCollectionName('Game Boy Advance')).toBe('gba');
        expect(matchConsoleFromCollectionName('GBA')).toBe('gba');
        expect(matchConsoleFromCollectionName('Game Boy Color')).toBe('gbc');
        expect(matchConsoleFromCollectionName('GBC')).toBe('gbc');
        expect(matchConsoleFromCollectionName('Game Boy')).toBe('gb');
        expect(matchConsoleFromCollectionName('Nintendo DS')).toBe('ds');
        expect(matchConsoleFromCollectionName('Nintendo 3DS')).toBe('3ds');
        expect(matchConsoleFromCollectionName('Wii')).toBe('wii');
        expect(matchConsoleFromCollectionName('Wii U')).toBe('wiiu');
    });

    it('matches Microsoft Xbox consoles', () => {
        expect(matchConsoleFromCollectionName('Xbox 360')).toBe('x360');
        expect(matchConsoleFromCollectionName('X360')).toBe('x360');
        expect(matchConsoleFromCollectionName('Original Xbox')).toBe('xbox');
    });

    it('matches Sega and other retro platforms', () => {
        expect(matchConsoleFromCollectionName('Sega Genesis')).toBe('genesis');
        expect(matchConsoleFromCollectionName('Mega Drive')).toBe('md');
        expect(matchConsoleFromCollectionName('Sega 32X')).toBe('32x');
        expect(matchConsoleFromCollectionName('Genesis 32X')).toBe('32x');
        expect(matchConsoleFromCollectionName('Dreamcast')).toBe('dc');
        expect(matchConsoleFromCollectionName('MSX')).toBe('msx');
        expect(matchConsoleFromCollectionName('EmuDeck')).toBe('emu');
        expect(matchConsoleFromCollectionName('Retro Games')).toBe('emu');
    });

    it('returns null for generic collections', () => {
        expect(matchConsoleFromCollectionName('RPGs')).toBeNull();
        expect(matchConsoleFromCollectionName('Indie Games')).toBeNull();
        expect(matchConsoleFromCollectionName('Backlog')).toBeNull();
    });
});

describe('enhancedCollection: resolveCollectionIcon', () => {
    it('returns null when console icons are disabled', () => {
        const result = resolveCollectionIcon({ id: 'col1', name: 'PS2' }, 0, false);
        expect(result).toBeNull();
    });

    it('auto-detects console icon when enabled', () => {
        const result = resolveCollectionIcon({ id: 'col1', name: 'PlayStation 2' }, 0, true);
        expect(result).not.toBeNull();
        expect(result?.source).toBe('auto-detect');
        expect(result?.iconUrl).toContain('ps2.png');
    });

    it('auto-detects Nintendo Switch collection icon', () => {
        const result = resolveCollectionIcon({ id: 'col2', name: 'Nintendo Switch' }, 1, true);
        expect(result).not.toBeNull();
        expect(result?.source).toBe('auto-detect');
        expect(result?.iconUrl).toContain('switch.png');
    });
});

describe('enhancedCollection: resolveCollectionArt', () => {
    const baseSettings: Settings = { ...DEFAULTS };

    it('defaults to fan mode with auto-detected icon', () => {
        const art = resolveCollectionArt({ id: 'col1', name: 'GameCube', count: 10 }, baseSettings);
        expect(art.mode).toBe('fan');
        expect(art.fit).toBe('cover');
        expect(art.iconKey).toBe('gc');
        expect(art.iconUrl).toContain('gc.png');
    });

    it('returns custom art mode when custom image URL is provided in settings', () => {
        const customSettings: Settings = {
            ...baseSettings,
            collectionCustomArt: {
                col1: {
                    url: 'https://example.com/gc_banner.jpg',
                    fit: 'contain',
                },
            },
        };
        const art = resolveCollectionArt({ id: 'col1', name: 'GameCube', count: 10 }, customSettings);
        expect(art.mode).toBe('custom');
        expect(art.customUrl).toBe('https://example.com/gc_banner.jpg');
        expect(art.fit).toBe('contain');
    });

    it('respects global collection display mode when set to icon', () => {
        const iconSettings: Settings = {
            ...baseSettings,
            collectionArtMode: 'icon',
        };
        const art = resolveCollectionArt({ id: 'col2', name: 'Super Nintendo', count: 5 }, iconSettings);
        expect(art.mode).toBe('icon');
        expect(art.iconKey).toBe('snes');
        expect(art.iconUrl).toContain('snes.png');
    });

    it('defaults empty collection with console icon to icon mode', () => {
        const art = resolveCollectionArt({ id: 'col3', name: 'PlayStation 1', count: 0 }, baseSettings);
        expect(art.mode).toBe('icon');
        expect(art.iconKey).toBe('ps1');
        expect(art.iconUrl).toContain('ps1.webp');
    });

    it('respects global collectionArtFit for icons (contain, fill, center)', () => {
        const containSettings: Settings = { ...baseSettings, collectionArtMode: 'icon', collectionArtFit: 'contain' };
        expect(resolveCollectionArt({ id: 'c1', name: 'N64', count: 5 }, containSettings).fit).toBe('contain');

        const fillSettings: Settings = { ...baseSettings, collectionArtMode: 'icon', collectionArtFit: 'fill' };
        expect(resolveCollectionArt({ id: 'c2', name: 'NES', count: 5 }, fillSettings).fit).toBe('fill');

        const centerSettings: Settings = { ...baseSettings, collectionArtMode: 'icon', collectionArtFit: 'center' };
        expect(resolveCollectionArt({ id: 'c3', name: 'GameCube', count: 5 }, centerSettings).fit).toBe('center');
    });

    it('resolves Sega 32X, Dreamcast, and Mega Drive collections with center fit', () => {
        const customSettings: Settings = {
            ...baseSettings,
            collectionCustomArt: {
                col32x: { mode: 'icon', fit: 'center', hasCustomFit: true },
            },
        };
        const art32x = resolveCollectionArt({ id: 'col32x', name: 'Sega 32X', count: 4 }, customSettings);
        expect(art32x.mode).toBe('icon');
        expect(art32x.fit).toBe('center');
        expect(art32x.iconKey).toBe('32x');
        expect(art32x.iconUrl).toContain('32x.png');

        const artDc = resolveCollectionArt({ id: 'coldc', name: 'Dreamcast', count: 12 }, baseSettings);
        expect(artDc.iconKey).toBe('dc');
        expect(artDc.iconUrl).toContain('dc.png');

        const artMd = resolveCollectionArt({ id: 'colmd', name: 'Mega Drive', count: 8 }, baseSettings);
        expect(artMd.iconKey).toBe('md');
        expect(artMd.iconUrl).toContain('md.png');
    });

    it('uses settings.collectionArtFit for existing entries without hasCustomFit: true', () => {
        const staleSettings: Settings = {
            ...baseSettings,
            collectionArtFit: 'contain',
            collectionCustomArt: {
                'N64': { mode: 'icon', fit: 'cover' }, // stale entry without hasCustomFit
            },
        };
        const art = resolveCollectionArt({ id: 'n64-id', name: 'N64', count: 10 }, staleSettings);
        expect(art.fit).toBe('contain');
    });
});

describe('enhancedCollection: image resolution & file browsing', () => {
    it('caches and retrieves image data URIs', async () => {
        const { getCachedImageUri, setCachedImageUri, resolveImageUri } = await import('../../src/library/enhancedCollection');
        expect(getCachedImageUri('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
        expect(getCachedImageUri('https://example.com/art.jpg')).toBe('https://example.com/art.jpg');

        setCachedImageUri('/home/deck/art.png', 'data:image/png;base64,deckart');
        expect(getCachedImageUri('/home/deck/art.png')).toBe('data:image/png;base64,deckart');

        // resolveImageUri immediately returns cached URI
        const resolved = await resolveImageUri('/home/deck/art.png');
        expect(resolved).toBe('data:image/png;base64,deckart');
    });

    it('returns web URLs and data URIs directly without backend roundtrip', async () => {
        const { resolveImageUri } = await import('../../src/library/enhancedCollection');
        expect(await resolveImageUri('https://example.com/banner.jpg')).toBe('https://example.com/banner.jpg');
        expect(await resolveImageUri('http://example.com/banner.jpg')).toBe('http://example.com/banner.jpg');
        expect(await resolveImageUri('data:image/webp;base64,xyz')).toBe('data:image/webp;base64,xyz');
    });

    it('browseLocalCollectionImage calls openFilePicker and returns chosen path', async () => {
        const { browseLocalCollectionImage } = await import('../../src/library/enhancedCollection');
        const { openFilePicker } = await import('@decky/api');
        vi.mocked(openFilePicker).mockResolvedValueOnce({
            path: '/home/deck/Pictures/Collections/ps2.png',
            realpath: '/home/deck/Pictures/Collections/ps2.png',
        });

        const chosen = await browseLocalCollectionImage();
        expect(chosen).toBe('/home/deck/Pictures/Collections/ps2.png');
        expect(openFilePicker).toHaveBeenCalledWith(
            0,
            '/home/deck/Pictures',
            true,
            true, // includeFolders: true
            undefined,
            expect.any(Array),
            false,
            false
        );
    });

    it('browseLocalCollectionImage respects custom starting directory', async () => {
        const { browseLocalCollectionImage } = await import('../../src/library/enhancedCollection');
        const { openFilePicker } = await import('@decky/api');
        vi.mocked(openFilePicker).mockResolvedValueOnce({
            path: '/run/media/sdcard/roms/banner.png',
            realpath: '/run/media/sdcard/roms/banner.png',
        });

        const chosen = await browseLocalCollectionImage('/run/media/sdcard');
        expect(chosen).toBe('/run/media/sdcard/roms/banner.png');
        expect(openFilePicker).toHaveBeenCalledWith(
            0,
            '/run/media/sdcard',
            true,
            true,
            undefined,
            expect.any(Array),
            false,
            false
        );
    });

    it('fetchStorageLocations returns storage entries', async () => {
        const { fetchStorageLocations } = await import('../../src/library/enhancedCollection');
        const locations = await fetchStorageLocations();
        expect(Array.isArray(locations)).toBe(true);
        expect(locations.some((l) => l.path.includes('Pictures'))).toBe(true);
    });
});

