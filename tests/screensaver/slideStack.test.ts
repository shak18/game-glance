import { describe, expect, it } from 'vitest';
import { EMPTY_STACK, firstSettled, nextIndexes, nextSlides, settledSlides, slideLayers } from '../../src/screensaver/slideStack';

const s = (id: number) => ({ id });

describe('slide stack', () => {
    it('the first slide fades in from black, alone', () => {
        expect(slideLayers(nextSlides(EMPTY_STACK, s(1)))).toEqual([{ slide: s(1), phase: 'first' }]);
    });
    it('a new slide goes under the old one, which leaves on top', () => {
        const stack = nextSlides(nextSlides(EMPTY_STACK, s(1)), s(2));
        expect(slideLayers(stack)).toEqual([{ slide: s(2), phase: 'entering' }, { slide: s(1), phase: 'leaving' }]);
    });
    it('once settled only the new slide stays, shown', () => {
        const stack = settledSlides(nextSlides(nextSlides(EMPTY_STACK, s(1)), s(2)), 2);
        expect(slideLayers(stack)).toEqual([{ slide: s(2), phase: 'shown' }]);
    });
    it('never more than two slides; a late settle for an older slide changes nothing', () => {
        const stack = nextSlides(nextSlides(nextSlides(EMPTY_STACK, s(1)), s(2)), s(3));
        expect(slideLayers(stack).map((l) => l.slide.id)).toEqual([3, 2]);
        expect(settledSlides(stack, 2)).toBe(stack);
    });
});

describe('choosing the next slide', () => {
    it('nextIndexes wraps and never repeats in a short list', () => {
        expect(nextIndexes(-1, 5, 3)).toEqual([0, 1, 2]);
        expect(nextIndexes(3, 5, 3)).toEqual([4, 0, 1]);
        expect(nextIndexes(0, 2, 3)).toEqual([1]);
        expect(nextIndexes(0, 1, 3)).toEqual([0]);
        expect(nextIndexes(0, 0, 3)).toEqual([]);
    });
    it('firstSettled takes whichever is ready first, skipping misses', async () => {
        const later = (v: string | null, ms: number) => new Promise<string | null>((r) => setTimeout(() => r(v), ms));
        expect(await firstSettled([later('slow', 30), later('fast', 5)])).toBe('fast');
        expect(await firstSettled([later(null, 1), later('only', 10)])).toBe('only');
        expect(await firstSettled([later(null, 1), Promise.reject(new Error('x'))])).toBeNull();
        expect(await firstSettled([])).toBeNull();
    });
});
