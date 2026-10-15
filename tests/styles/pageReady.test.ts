import { describe, expect, it } from 'vitest';
import { pageReady } from '../../src/styles/pageReady';

type Found = { complete?: boolean; naturalWidth?: number; getClientRects(): { length: number } };
const shown = (extra: Partial<Found> = {}): Found => ({ getClientRects: () => ({ length: 1 }), ...extra });
const hidden: Found = { getClientRects: () => ({ length: 0 }) };
const doc = (map: Record<string, Found | null>) => ({ querySelector: (s: string) => map[s] ?? null });
const sel = { headerImg: '.cap img:not([src*="_blur"])', titleblock: '.gg-titleblock', play: '.play' };

describe('pageReady', () => {
    it('is ready once the hero image has loaded and the title block and Play row are laid out', () => {
        expect(pageReady(doc({ [sel.headerImg]: shown({ complete: true, naturalWidth: 1920 }), '.gg-titleblock': shown(), '.play': shown() }), sel)).toBe(true);
    });
    it('is not ready while the hero image loads, or with nothing laid out', () => {
        expect(pageReady(doc({ [sel.headerImg]: shown({ complete: false, naturalWidth: 0 }), '.gg-titleblock': shown(), '.play': shown() }), sel)).toBe(false);
        expect(pageReady(doc({ [sel.headerImg]: shown({ complete: true, naturalWidth: 0 }), '.gg-titleblock': shown(), '.play': shown() }), sel)).toBe(false);
        expect(pageReady(doc({ [sel.headerImg]: shown({ complete: true, naturalWidth: 1920 }), '.gg-titleblock': hidden, '.play': shown() }), sel)).toBe(false);
        expect(pageReady(doc({}), sel)).toBe(false);
    });
    it('is never ready without a document or without the hero selector (an unknown Steam class)', () => {
        expect(pageReady(null, sel)).toBe(false);
        expect(pageReady(doc({ '.gg-titleblock': shown(), '.play': shown() }), { ...sel, headerImg: null })).toBe(false);
    });
});

describe('pageReady and what is on screen', () => {
    it('waits until the hero is actually shown (Steam reveals its wrapper on the load event, a frame after complete)', () => {
        const img = shown({ complete: true, naturalWidth: 1920 });
        const d = doc({ [sel.headerImg]: img, '.gg-titleblock': shown(), '.play': shown() });
        expect(pageReady(d, sel, () => false)).toBe(false);
        expect(pageReady(d, sel, (el) => el === img)).toBe(true);
    });
});

describe('pageReady and the focus on Play', () => {
    it("waits for Steam to focus the page's Play (Home's copy shows it focused; Steam focuses it as its exit animation ends)", () => {
        const withFocus = { ...sel, focus: '.play .gpfocus' };
        const base = { [sel.headerImg]: shown({ complete: true, naturalWidth: 1920 }), '.gg-titleblock': shown(), '.play': shown() };
        expect(pageReady(doc(base), withFocus, () => true)).toBe(false);
        expect(pageReady(doc({ ...base, '.play .gpfocus': shown() }), withFocus, () => true)).toBe(true);
    });
});

describe('pageReady and the parts Home drew', () => {
    it("waits for the page's description when Home drew one (Home's copy fades onto it at the hand-over)", () => {
        const withDesc = { ...sel, desc: '.gg-desc' };
        const base = { [sel.headerImg]: shown({ complete: true, naturalWidth: 1920 }), '.gg-titleblock': shown(), '.play': shown() };
        expect(pageReady(doc(base), withDesc, () => true)).toBe(false);
        expect(pageReady(doc({ ...base, '.gg-desc': hidden }), withDesc, () => true)).toBe(false);
        expect(pageReady(doc({ ...base, '.gg-desc': shown() }), withDesc, () => true)).toBe(true);
        expect(pageReady(doc(base), sel, () => true)).toBe(true);
    });
});
