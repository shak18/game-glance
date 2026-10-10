import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { BannerCard } from '../../src/library/LibraryGrid';
import { LibraryGameItem } from '../../src/library/libraryData';

describe('BannerCard Artwork Hierarchy & Zero-Flicker Architecture', () => {
    const baseGame: LibraryGameItem = {
        appId: 99999,
        name: 'Hades',
        isShortcut: true,
        installed: true,
        running: false,
        playedMinutes: 120,
        achievements: null,
        heroic: null,
        source: 'Non-Steam',
    };

    it('immediately renders solid title in fallback container on mount with zero broken image visibility', () => {
        const game: LibraryGameItem = {
            ...baseGame,
            name: 'No Artwork Game',
        };

        const html = renderToString(
            <BannerCard
                game={game}
                isFocused={false}
                onClick={() => {}}
                onDoubleClick={() => {}}
            />
        );

        // Fallback title must be immediately present
        expect(html).toContain('sgl-card-fallback-title');
        expect(html).toContain('No Artwork Game');

        // Any probing image must have opacity: 0 and z-index: -1 so it never flickers a broken box
        if (html.includes('sgl-card-img')) {
            expect(html).toContain('opacity:0');
            expect(html).toContain('z-index:-1');
        }
    });

    it('prefers Hero Background and Logo (Option 1) over Poster capsule', () => {
        const game: LibraryGameItem = {
            ...baseGame,
            heroUrl: 'https://example.com/hero.jpg',
            logoUrl: 'https://example.com/logo.png',
            capsuleUrl: 'https://example.com/poster.jpg',
        };

        const html = renderToString(
            <BannerCard
                game={game}
                isFocused={false}
                onClick={() => {}}
                onDoubleClick={() => {}}
            />
        );

        // Hero background candidate and Logo candidate are rendered in fallback container
        expect(html).toContain('sgl-card-fallback-bg');
        expect(html).toContain('sgl-card-fallback-logo');
        expect(html).toContain('https://example.com/hero.jpg');
        expect(html).toContain('https://example.com/logo.png');

        // Poster must NOT be rendered because Hero and Logo are available (Option 3 rule: poster only if no hero & no logo)
        expect(html).not.toContain('https://example.com/poster.jpg');
    });

    it('renders Logo only (Option 2) when logo is available but hero is absent', () => {
        const game: LibraryGameItem = {
            ...baseGame,
            logoUrl: 'https://example.com/logo.png',
            capsuleUrl: 'https://example.com/poster.jpg',
        };

        const html = renderToString(
            <BannerCard
                game={game}
                isFocused={false}
                onClick={() => {}}
                onDoubleClick={() => {}}
            />
        );

        expect(html).toContain('sgl-card-fallback-logo');
        expect(html).toContain('https://example.com/logo.png');

        // Poster must NOT be rendered because logo is available
        expect(html).not.toContain('https://example.com/poster.jpg');
    });

    it('allows Poster (Option 3) ONLY when neither hero nor logo is available', () => {
        const game: LibraryGameItem = {
            ...baseGame,
            capsuleUrl: 'https://example.com/poster.jpg',
        };

        const html = renderToString(
            <BannerCard
                game={game}
                isFocused={false}
                onClick={() => {}}
                onDoubleClick={() => {}}
            />
        );

        // Since no hero and no logo candidates exist, poster capsule is eligible
        expect(html).toContain('https://example.com/poster.jpg');
    });

    it('probes Long Banner (Primary) with opacity 0 so it never flickers while probing', () => {
        const game: LibraryGameItem = {
            ...baseGame,
            landscapeUrl: 'https://example.com/banner.jpg',
        };

        const html = renderToString(
            <BannerCard
                game={game}
                isFocused={false}
                onClick={() => {}}
                onDoubleClick={() => {}}
            />
        );

        // Banner is rendered with opacity: 0 and z-index: -1 on initial probe
        expect(html).toContain('https://example.com/banner.jpg');
        expect(html).toContain('opacity:0');
        expect(html).toContain('z-index:-1');

        // Solid fallback title is still present underneath while banner probes
        expect(html).toContain('sgl-card-fallback-title');
    });
});
