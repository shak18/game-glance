import { describe, expect, it } from 'vitest';
import { buildCategories, isGameOrShortcutApp, isToolOrServerName, rawAppToItem } from '../../src/library/libraryData';

describe('libraryData: buildCategories', () => {
    it('creates standard categories for mock games', () => {
        const mock = [
            {
                appId: 100,
                name: 'Zelda',
                isShortcut: false,
                installed: true,
                running: false,
                playedMinutes: 4000,
                achievements: null,
                heroic: null,
                source: 'Steam',
            },
            {
                appId: 200,
                name: 'Chrono Trigger',
                isShortcut: true,
                installed: true,
                running: false,
                playedMinutes: 1200,
                achievements: null,
                heroic: null,
                source: 'GOG',
            },
        ];
        const categories = buildCategories(mock);
        expect(categories.length).toBeGreaterThanOrEqual(5);
        expect(categories.map((c) => c.name)).toEqual(
            expect.arrayContaining(['INSTALLED', 'GREAT ON DECK', 'ALL GAMES', 'FAVORITES', 'COLLECTIONS', 'NON-STEAM'])
        );
        const nonSteam = categories.find((c) => c.id === 'non-steam');
        expect(nonSteam?.count).toBe(1);
        expect(nonSteam?.games[0].name).toBe('Chrono Trigger');
    });

    it('correctly maps rawApp to library item', () => {
        const raw = {
            appid: 42,
            display_name: 'Super Game',
            installed: true,
            minutes_playtime_forever: 120,
            rt_last_time_played: 1600000000,
        };
        const item = rawAppToItem(raw, true);
        expect(item.appId).toBe(42);
        expect(item.name).toBe('Super Game');
        expect(item.running).toBe(true);
        expect(item.playedMinutes).toBe(120);
        expect(item.source).toBe('Steam');
        expect(item.isSoundtrack).toBe(false);
    });

    it('correctly identifies soundtrack apps (app_type === 8)', () => {
        const ostRaw = {
            appid: 1091500,
            display_name: 'Super Soundtrack',
            app_type: 8,
            installed: true,
            minutes_playtime_forever: 60,
        };
        const item = rawAppToItem(ostRaw, false);
        expect(item.isSoundtrack).toBe(true);
        expect(item.source).toBe('Soundtrack');
        expect(item.achievements).toBeNull();
    });

    it('creates SOUNDTRACKS category when soundtrack games exist in mock list and separates them from regular games', () => {
        const mock = [
            {
                appId: 100,
                name: 'Game 1',
                isShortcut: false,
                isSoundtrack: false,
                installed: true,
                running: false,
                playedMinutes: 100,
                achievements: null,
                heroic: null,
                source: 'Steam',
            },
            {
                appId: 200,
                name: 'Soundtrack 1',
                isShortcut: false,
                isSoundtrack: true,
                installed: true,
                running: false,
                playedMinutes: 50,
                achievements: null,
                heroic: null,
                source: 'Soundtrack',
            },
        ];
        const categories = buildCategories(mock);
        const installedCat = categories.find((c) => c.id === 'installed');
        expect(installedCat?.count).toBe(1);
        expect(installedCat?.games[0].name).toBe('Game 1');

        const soundtrackCat = categories.find((c) => c.id === 'soundtracks');
        expect(soundtrackCat).toBeDefined();
        expect(soundtrackCat?.count).toBe(1);
        expect(soundtrackCat?.games[0].name).toBe('Soundtrack 1');
    });

    it('identifies tools, SDKs, and dedicated servers with isToolOrServerName', () => {
        expect(isToolOrServerName('Age of Chivalry Dedicated Server')).toBe(true);
        expect(isToolOrServerName('Alien Swarm SDK')).toBe(true);
        expect(isToolOrServerName('Aliens vs. Predator Dedicated Server')).toBe(true);
        expect(isToolOrServerName('Team Fortress 2 Authoring Tools')).toBe(true);
        expect(isToolOrServerName('Skyrim Creation Kit')).toBe(true);
        expect(isToolOrServerName('Steamworks Common Redists')).toBe(true);
        expect(isToolOrServerName('Left 4 Dead 2 Dedicated Server')).toBe(true);
        expect(isToolOrServerName('Servidor dedicado de Counter-Strike')).toBe(true);
        expect(isToolOrServerName('Half-Life 2')).toBe(false);
        expect(isToolOrServerName('Cyberpunk 2077')).toBe(false);
        expect(isToolOrServerName('Hades')).toBe(false);
    });

    it('identifies game vs non-game apps with isGameOrShortcutApp', () => {
        expect(isGameOrShortcutApp({ appid: 1, app_type: 4, display_name: 'Tool' })).toBe(false);
        expect(isGameOrShortcutApp({ appid: 2, app_type: 8, display_name: 'OST' })).toBe(false);
        expect(isGameOrShortcutApp({ appid: 3, app_type: 1, display_name: 'Game' })).toBe(true);
        expect(isGameOrShortcutApp({ appid: 4, app_type: 1073741824, display_name: 'Shortcut' })).toBe(true);
        expect(isGameOrShortcutApp({ appid: 5, app_type: 64, display_name: 'Demo' })).toBe(true);
        expect(isGameOrShortcutApp({ appid: 6, display_name: 'Alien Swarm SDK' })).toBe(false);
    });

    it('filters out dedicated servers and SDKs from all regular categories in mock games', () => {
        const mock = [
            {
                appId: 10,
                name: 'Portal 2',
                isShortcut: false,
                isSoundtrack: false,
                installed: true,
                running: false,
                playedMinutes: 500,
                achievements: null,
                heroic: null,
                source: 'Steam',
            },
            {
                appId: 20,
                name: 'Age of Chivalry Dedicated Server',
                isShortcut: false,
                isSoundtrack: false,
                installed: true,
                running: false,
                playedMinutes: 0,
                achievements: null,
                heroic: null,
                source: 'Steam',
            },
            {
                appId: 30,
                name: 'Alien Swarm SDK',
                isShortcut: false,
                isSoundtrack: false,
                installed: true,
                running: false,
                playedMinutes: 0,
                achievements: null,
                heroic: null,
                source: 'Steam',
            },
        ];
        const categories = buildCategories(mock);
        const allCat = categories.find((c) => c.id === 'all');
        expect(allCat?.count).toBe(1);
        expect(allCat?.games.map((g) => g.name)).toEqual(['Portal 2']);

        const installedCat = categories.find((c) => c.id === 'installed');
        expect(installedCat?.count).toBe(1);
        expect(installedCat?.games.map((g) => g.name)).toEqual(['Portal 2']);
    });
});
