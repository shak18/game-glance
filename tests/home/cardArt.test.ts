import { describe, expect, it, vi } from 'vitest';
import { cardBox, createArtResolver } from '../../src/home/cardArt';
import { CARD_SCALE_DOCKED, CARD_SCALE_HANDHELD, recentsGeometry } from '../../src/home/recentsLayout';

const loader = (ok: string[]) => vi.fn(async (url: string) => (ok.includes(url) ? url : null));

describe('createArtResolver', () => {
    it('ends on the first url that loads, in order', async () => {
        const r = createArtResolver(loader(['b', 'c']), 10);
        expect(await r.resolve(1, ['a', 'b', 'c'])).toBe('b');
    });
    it('remembers the answer: known at once afterwards, nothing loaded again', async () => {
        const load = loader(['a']);
        const r = createArtResolver(load, 10);
        expect(r.known(1, ['a'])).toBeUndefined();
        await r.resolve(1, ['a']);
        expect(r.known(1, ['a'])).toBe('a');
        await r.resolve(1, ['a']);
        expect(load).toHaveBeenCalledTimes(1);
    });
    it('none loads: null, remembered', async () => {
        const r = createArtResolver(loader([]), 10);
        expect(await r.resolve(1, ['a', 'b'])).toBeNull();
        expect(r.known(1, ['a', 'b'])).toBeNull();
    });
    it('a new url list for the game (Steam listed more art) is looked up again', async () => {
        const r = createArtResolver(loader(['x']), 10);
        await r.resolve(1, ['a']);
        expect(r.known(1, ['x', 'a'])).toBeUndefined();
        expect(await r.resolve(1, ['x', 'a'])).toBe('x');
    });
    it('what a game last ended on, whatever its list: drawn while a new list (Steam loaded the game\'s details) is looked up', async () => {
        const r = createArtResolver(loader(['a', 'x']), 10);
        expect(r.last(1)).toBeUndefined();
        await r.resolve(1, ['a']);
        expect(r.known(1, ['x', 'a'])).toBeUndefined();
        expect(r.last(1)).toBe('a');
        await r.resolve(1, ['x', 'a']);
        expect(r.last(1)).toBe('x');
    });
    it('two asking at once share one lookup', async () => {
        const load = loader(['a']);
        const r = createArtResolver(load, 10);
        const [p, q] = [r.resolve(1, ['a']), r.resolve(1, ['a'])];
        expect(await p).toBe('a');
        expect(await q).toBe('a');
        expect(load).toHaveBeenCalledTimes(1);
    });
    it('the loader may hand back another url to draw (a smaller copy)', async () => {
        const r = createArtResolver(async (url) => `small:${url}`, 10);
        expect(await r.resolve(1, ['a'])).toBe('small:a');
    });
    it('hands the box the art is drawn in to the loader', async () => {
        const load = vi.fn(async (url: string) => url);
        await createArtResolver(load, 10).resolve(1, ['a'], { width: 700, height: 330 });
        expect(load).toHaveBeenCalledWith('a', { width: 700, height: 330 });
    });
    it('keeps at most `max` games, dropping the oldest', async () => {
        const r = createArtResolver(loader(['a']), 2);
        await r.resolve(1, ['a']);
        await r.resolve(2, ['a']);
        await r.resolve(3, ['a']);
        expect(r.known(1, ['a'])).toBeUndefined();
        expect(r.known(3, ['a'])).toBe('a');
    });
    it('a loader that throws counts as not loading', async () => {
        const r = createArtResolver(async (url) => { if (url === 'a') throw new Error('x'); return url; }, 10);
        expect(await r.resolve(1, ['a', 'b'])).toBe('b');
    });
});

describe('cardBox', () => {
    it('the wide card in device px: its canvas size times device px per canvas px (the row and the warm-up load the same copy)', () => {
        const g = recentsGeometry(CARD_SCALE_HANDHELD);
        expect(cardBox(g, 4 / 3)).toEqual({ width: Math.round((g.wideW * 4) / 3), height: Math.round((g.capsuleH * 4) / 3) });
    });
    it('docked and handheld cards are the same size, so one warm-up serves both', () => {
        expect(cardBox(recentsGeometry(CARD_SCALE_DOCKED), 1)).toEqual(cardBox(recentsGeometry(CARD_SCALE_HANDHELD), 1));
    });
});
