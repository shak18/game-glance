import React, { useMemo } from 'react';
import { SpotlightLibrary } from '../src/library/SpotlightLibrary';
import { LibraryGameItem } from '../src/library/libraryData';
import { MOCK_GAMES } from './mockData';

interface Props {
    deviceMode?: 'handheld' | 'tv';
    customAccent?: string | null;
}

export function SpotlightLibraryPreview({ deviceMode = 'handheld', customAccent }: Props) {
    const mockLibraryGames: LibraryGameItem[] = useMemo(() => {
        const list: LibraryGameItem[] = MOCK_GAMES.map((g, idx) => ({
            appId: g.info.appId,
            name: g.info.name,
            isShortcut: g.info.isShortcut,
            isSoundtrack: false,
            gameId: g.info.isShortcut ? String(g.info.appId) : undefined,
            installed: true,
            running: idx === 0, // First game is simulated as currently running
            playedMinutes: g.info.playedMinutes,
            achievements: g.info.achievements,
            heroic: g.info.heroic,
            source: g.source,
            accent: customAccent ?? g.accent,
            lastPlayed: Date.now() - idx * 86400000 * 2,
            sizeOnDisk: 45000000000,
            capsuleUrl: `https://shared.steamstatic.com/store_item_assets/steam/apps/${g.info.appId}/library_600x900.jpg`,
            landscapeUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.info.appId}/header.jpg`,
            heroUrl: g.heroUrl,
            logoUrl: g.logoUrl,
            description: g.description,
        }));

        // Sample Soundtracks for testing soundtrack layout and tab
        list.push({
            appId: 1433140,
            name: 'Cyberpunk 2077: Original Soundtrack',
            isShortcut: false,
            isSoundtrack: true,
            installed: true,
            running: false,
            playedMinutes: 145,
            achievements: null,
            heroic: null,
            source: 'Soundtrack',
            accent: '#00e5ff',
            lastPlayed: Date.now() - 3600000 * 5,
            sizeOnDisk: 1200000000,
            capsuleUrl: 'https://shared.steamstatic.com/store_item_assets/steam/apps/1433140/capsule_616x353.jpg',
            landscapeUrl: 'https://shared.steamstatic.com/store_item_assets/steam/apps/1433140/header.jpg',
            heroUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/library_hero.jpg',
            description: 'The official Cyberpunk 2077 soundtrack featuring original music composed by Marcin Przybyłowicz, P.T. Adamczyk and Paul Leonard-Morgan.',
        });

        list.push({
            appId: 598640,
            name: 'Hollow Knight: Gods & Nightmares',
            isShortcut: false,
            isSoundtrack: true,
            installed: true,
            running: false,
            playedMinutes: 280,
            achievements: null,
            heroic: null,
            source: 'Soundtrack',
            accent: '#7f8c8d',
            lastPlayed: Date.now() - 86400000 * 3,
            sizeOnDisk: 950000000,
            capsuleUrl: 'https://shared.steamstatic.com/store_item_assets/steam/apps/598640/capsule_616x353.jpg',
            landscapeUrl: 'https://shared.steamstatic.com/store_item_assets/steam/apps/598640/header.jpg',
            heroUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/367520/library_hero.jpg',
            description: 'Composed by Christopher Larkin, this album features all of the new tracks composed for the expansive Hollow Knight content packs.',
        });

        // Sample Non-Steam shortcut with custom artwork
        list.push({
            appId: 2194827101,
            name: 'EmulationStation-DE',
            isShortcut: true,
            isSoundtrack: false,
            gameId: '14392819482910492812',
            installed: true,
            running: false,
            playedMinutes: 840,
            achievements: null,
            heroic: null,
            source: 'Non-Steam',
            accent: '#f39c12',
            lastPlayed: Date.now() - 86400000 * 1,
            sizeOnDisk: 500000000,
            capsuleUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/library_600x900.jpg',
            landscapeUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/header.jpg',
            heroUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/library_hero.jpg',
            description: 'Frontend for browsing and launching games from your multi-platform game collection.',
        });

        return list;
    }, [customAccent]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', '--sgl-top-inset': '0px', '--sgl-bottom-inset': '0px' } as React.CSSProperties}>
            <SpotlightLibrary mockGames={mockLibraryGames} compact={deviceMode === 'handheld'} />
        </div>
    );

}
