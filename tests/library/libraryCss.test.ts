import { describe, expect, it } from 'vitest';
import { d, LIBRARY_CSS } from '../../src/library/libraryCss';

describe('libraryCss: Handheld and responsive layout rules with proportional font & panel scaling', () => {
    it('defines base scale unit matching Spotlight Home and Game View formulas', () => {
        expect(LIBRARY_CSS).toContain('--sgl-d: calc(100vw / 1440);');
        expect(LIBRARY_CSS).toContain('@media (max-aspect-ratio: 17/10) {');
        expect(LIBRARY_CSS).toContain('--sgl-d: calc(100vw / 1280);');
        expect(d(275)).toBe('calc(275 * var(--sgl-d))');
    });

    it('contains base sgl-poster-wrapper styling with dynamically clamped height to prevent panel overflow', () => {
        expect(LIBRARY_CSS).toContain('.sgl-poster-wrapper');
        expect(LIBRARY_CSS).toContain('aspect-ratio: 2 / 3 !important;');
        expect(LIBRARY_CSS).toContain('width: 100% !important;');
    });

    it('contains responsive media query for handheld screens (Steam Deck <=1366px / <=850px)', () => {
        expect(LIBRARY_CSS).toContain('@media (max-width: 1366px), (max-height: 850px)');
    });

    it('defines clamped poster dimensions for handheld displays', () => {
        expect(LIBRARY_CSS).toContain('aspect-ratio: 2 / 3');
        expect(LIBRARY_CSS).toContain('aspect-ratio: 1 / 1'); // square soundtrack cover
    });

    it('defines dynamically scaled inspector width matching Home View proportions (never exceeding 21.5% screen)', () => {
        expect(LIBRARY_CSS).toContain('.sgl-inspector');
        expect(LIBRARY_CSS).toContain('width: calc(275 * var(--sgl-d)) !important;');
        expect(LIBRARY_CSS).toContain('min-width: calc(250 * var(--sgl-d)) !important;');
        expect(LIBRARY_CSS).toContain('max-width: calc(285 * var(--sgl-d)) !important;');
    });

    it('defines compact dynamically scaled header ribbon for handhelds', () => {
        expect(LIBRARY_CSS).toContain('height: calc(40 * var(--sgl-d)) !important;');
    });

    it('provides explicit .sgl-compact modifier rules for device mode toggle', () => {
        expect(LIBRARY_CSS).toContain('.sgl-root.sgl-compact .sgl-poster-wrapper');
        expect(LIBRARY_CSS).toContain('.sgl-root.sgl-compact .sgl-inspector');
    });

    it('defines ultra-compact rules for <=720px height viewports', () => {
        expect(LIBRARY_CSS).toContain('@media (max-height: 720px)');
    });

    it('sets scaled top padding inset to optimize screen real estate', () => {
        expect(LIBRARY_CSS).toContain('padding-top: var(--sgl-top-inset, calc(40 * var(--sgl-d))) !important;');
    });

    it('includes font-size and text-size-adjust locking to protect against Steam Large Text mode distortion', () => {
        expect(LIBRARY_CSS).toContain('-webkit-text-size-adjust: 100% !important;');
        expect(LIBRARY_CSS).toContain('font-size: calc(14 * var(--sgl-d)) !important;');
        expect(LIBRARY_CSS).toContain('html.LargeText .sgl-root');
        expect(LIBRARY_CSS).toContain('body.LargeText .sgl-root');
        expect(LIBRARY_CSS).toContain(':root .sgl-root');
        expect(LIBRARY_CSS).toContain('html body .sgl-root');
        expect(LIBRARY_CSS).toContain('.Focusable.sgl-root');
    });

    it('locks navbar, inspector, description, action buttons, and card typography with dynamically scaled rules', () => {
        expect(LIBRARY_CSS).toContain('.sgl-tab-label');
        expect(LIBRARY_CSS).toContain('font-size: calc(11 * var(--sgl-d)) !important;');
        expect(LIBRARY_CSS).toContain('.sgl-brand');
        expect(LIBRARY_CSS).toContain('font-size: calc(12 * var(--sgl-d)) !important;');
        expect(LIBRARY_CSS).toContain('.sgl-title-text');
        expect(LIBRARY_CSS).toContain('font-size: calc(15 * var(--sgl-d)) !important;');
        expect(LIBRARY_CSS).toContain('.sgl-description');
        expect(LIBRARY_CSS).toContain('font-size: calc(10 * var(--sgl-d)) !important;');
        expect(LIBRARY_CSS).toContain('.sgl-btn-details');
        expect(LIBRARY_CSS).toContain('.sgl-btn-play');
        expect(LIBRARY_CSS).toContain('.sgl-card-fallback-title');
        expect(LIBRARY_CSS).toContain('.sgl-col-footer-title');
        expect(LIBRARY_CSS).toContain('.sgl-btn-badge');
        expect(LIBRARY_CSS).toContain('border-radius: 50% !important;');
    });

    it('enforces clamped poster dimensions across base, handheld, and compact viewports', () => {
        expect(LIBRARY_CSS).toContain('max-width: 100% !important;');
        expect(LIBRARY_CSS).toContain('width: 100% !important;');
        expect(LIBRARY_CSS).toContain('aspect-ratio: 2 / 3 !important;');
    });

    it('includes fast compositor-optimized grayscale and dimmed styling for uninstalled games', () => {
        expect(LIBRARY_CSS).toContain('.sgl-card.sgl-card-uninstalled');
        expect(LIBRARY_CSS).toContain('filter: grayscale(1);');
        expect(LIBRARY_CSS).toContain('opacity: 0.55;');
    });

    it('pins background container and layer to inset 0 and center 30% to match GameView hero framing exactly', () => {
        expect(LIBRARY_CSS).toContain('.sgl-bg-container');
        expect(LIBRARY_CSS).toContain('inset: 0 !important;');
        expect(LIBRARY_CSS).toContain('.sgl-bg-layer');
        expect(LIBRARY_CSS).toContain('background-position: center 30% !important;');
        expect(LIBRARY_CSS).toContain('background-repeat: no-repeat !important;');
    });
});

