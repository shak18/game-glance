import { describe, expect, it } from 'vitest';
import { LIBRARY_CSS } from '../../src/library/libraryCss';

describe('libraryCss: Handheld and responsive layout rules', () => {
    it('contains base sgl-poster-wrapper styling', () => {
        expect(LIBRARY_CSS).toContain('.sgl-poster-wrapper');
        expect(LIBRARY_CSS).toContain('max-width: 290px');
    });

    it('contains responsive media query for handheld screens (Steam Deck <=1366px / <=850px)', () => {
        expect(LIBRARY_CSS).toContain('@media (max-width: 1366px), (max-height: 850px)');
    });

    it('defines 200px poster max-width for handheld displays', () => {
        expect(LIBRARY_CSS).toContain('max-width: 200px');
        expect(LIBRARY_CSS).toContain('max-width: 180px'); // square soundtrack cover
    });

    it('defines 300px inspector width for handheld displays to free up grid space', () => {
        expect(LIBRARY_CSS).toContain('width: 300px');
    });

    it('defines compact 48px header ribbon for handhelds', () => {
        expect(LIBRARY_CSS).toContain('height: 48px');
    });

    it('provides explicit .sgl-compact modifier rules for device mode toggle', () => {
        expect(LIBRARY_CSS).toContain('.sgl-root.sgl-compact .sgl-poster-wrapper');
        expect(LIBRARY_CSS).toContain('.sgl-root.sgl-compact .sgl-inspector');
    });

    it('defines ultra-compact rules for <=720px height viewports', () => {
        expect(LIBRARY_CSS).toContain('@media (max-height: 720px)');
    });
});
