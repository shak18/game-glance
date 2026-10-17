import { describe, expect, it } from 'vitest';
import { CARD_SCALE_DOCKED, recentsGeometry } from '../../src/home/recentsLayout';
import { axisLock, BOUNCE_MS, cardTap, dragSteps, dragTarget, edgeBounce, FLICK_MIN, flickWraps, glide, GLIDE_MS, releaseVelocity, rubberBand, Sample, sheetSwipe, dragView } from '../../src/home/rowDrag';

describe('rowDrag', () => {
    it('axisLock waits for the slop, then picks the larger axis (a tie goes to the row)', () => {
        expect(axisLock(3, 4)).toBeNull();
        expect(axisLock(12, 3)).toBe('x');
        expect(axisLock(-2, -15)).toBe('y');
        expect(axisLock(10, 10)).toBe('x');
    });
    it('dragSteps rounds to the nearest card, a finger moving left stepping to the next one', () => {
        expect(dragSteps(-170, 168)).toBe(1);
        expect(dragSteps(250, 168)).toBe(-1);
        expect(dragSteps(-90, 168)).toBe(1);
        expect(dragSteps(-80, 168)).toBe(0);
        expect(dragSteps(0, 168)).toBe(0);
        // The docked card pitch: the same cases, scaled.
        const step = recentsGeometry(CARD_SCALE_DOCKED).step;
        const k = step / 168;
        expect(dragSteps(-170 * k, step)).toBe(1);
        expect(dragSteps(250 * k, step)).toBe(-1);
        expect(dragSteps(-90 * k, step)).toBe(1);
        expect(dragSteps(-80 * k, step)).toBe(0);
    });
    it('dragTarget clamps to the games and the Library card, never wrapping, and reports the overscroll', () => {
        expect(dragTarget(2, 3, 10)).toEqual({ index: 5, overscroll: 0 });
        expect(dragTarget(1, -4, 10)).toEqual({ index: 0, overscroll: -3 });
        expect(dragTarget(9, 3, 10)).toEqual({ index: 10, overscroll: 2 });
        // No games (the Library card only) and one game.
        expect(dragTarget(0, 2, 0)).toEqual({ index: 0, overscroll: 2 });
        expect(dragTarget(0, -1, 1)).toEqual({ index: 0, overscroll: -1 });
    });
    it('releaseVelocity fits the last 100 ms of samples, even unevenly spaced', () => {
        const line = (ts: number[]): Sample[] => ts.map((t) => ({ t, x: 500 - 2 * t }));
        expect(releaseVelocity(line([0, 16, 32, 48, 64]))).toBeCloseTo(-2, 6);
        expect(releaseVelocity(line([0, 5, 27, 31, 70, 74]))).toBeCloseTo(-2, 6);
        // Older samples (a slow start) don't count: only the last 100 ms.
        const slowThenFast: Sample[] = [{ t: 0, x: 900 }, { t: 100, x: 899 }, { t: 200, x: 898 }, ...line([300, 320, 340, 360, 380])];
        expect(releaseVelocity(slowThenFast)).toBeCloseTo(-2, 6);
        expect(releaseVelocity([{ t: 10, x: 3 }])).toBe(0);
        expect(releaseVelocity([])).toBe(0);
    });
    it('glide carries a flick on at the release speed, slowing down smoothly, and goes a good way further than a step', () => {
        // Too slow to flick: nothing.
        expect(glide(FLICK_MIN * 0.6, 0)).toEqual({ dx: 0, done: true });
        // At release it starts where the finger left off and keeps the speed.
        expect(glide(2, 0)).toEqual({ dx: 0, done: false });
        // Exponential slow-down with a 400 ms time constant: the distance tends to speed x 400.
        expect(GLIDE_MS).toBe(400);
        expect(glide(-2, 200).dx).toBeCloseTo(-2 * 400 * (1 - Math.exp(-0.5)), 6);
        expect(glide(-2, 200).done).toBe(false);
        const end = glide(2, 3000);
        expect(end.done).toBe(true);
        expect(end.dx).toBeGreaterThan(780);
        expect(end.dx).toBeLessThanOrEqual(800);
        // A 2 px/ms flick runs on more than four handheld cards (the old stepped flick: two).
        expect(end.dx / 168).toBeGreaterThan(4);
        // It only moves forward, ever slower.
        const a = glide(2, 100).dx;
        const b = glide(2, 200).dx;
        const c = glide(2, 300).dx;
        expect(b - a).toBeGreaterThan(c - b);
    });
    it('rubberBand grows ever more slowly and never reaches its limit', () => {
        expect(rubberBand(0, 40)).toBe(0);
        expect(rubberBand(40, 40)).toBeCloseTo(20, 6);
        expect(rubberBand(1e9, 40)).toBeLessThan(40);
        expect(rubberBand(-40, 40)).toBeCloseTo(-20, 6);
    });
    it('dragView gives the card under the finger and only the leftover as the row\'s offset (no spring back on release)', () => {
        // Within the row: the nearest card, and the part of a card still under the finger.
        expect(dragView(-170, 2, 10, 168)).toEqual({ index: 3, offset: -2 });
        expect(dragView(90, 2, 10, 168)).toEqual({ index: 1, offset: -78 });
        expect(dragView(0, 2, 10, 168)).toEqual({ index: 2, offset: 0 });
        // Past the last card (the Library card) or the first game, the leftover is rubber-banded, never more than half a card.
        const end = dragView(-400, 9, 10, 168);
        expect(end.index).toBe(10);
        expect(end.offset).toBeLessThan(0);
        expect(end.offset).toBeGreaterThan(-84);
        expect(end.offset).toBeCloseTo(-rubberBand(232, 84), 6);
        const start = dragView(300, 0, 10, 168);
        expect(start.index).toBe(0);
        expect(start.offset).toBeCloseTo(rubberBand(300, 84), 6);
        // A leftover pulling back from the end is not banded.
        expect(dragView(-140, 9, 10, 168)).toEqual({ index: 10, offset: 28 });
    });
    it('sheetSwipe raises the sheet on a long enough swipe up, lowers it on one down, and ignores sideways or short ones', () => {
        expect(sheetSwipe(4, -70, false)).toBe('raise');
        expect(sheetSwipe(4, -50, false)).toBeNull();
        expect(sheetSwipe(-3, 65, true)).toBe('lower');
        // Already where the swipe would take it: nothing.
        expect(sheetSwipe(0, -80, true)).toBeNull();
        expect(sheetSwipe(0, 80, false)).toBeNull();
        // A sideways drag (the row's) that also moved down a lot is not a sheet swipe.
        expect(sheetSwipe(-200, 70, true)).toBeNull();
    });
    it('cardTap opens the selected card (or the selected Library card) and selects any other', () => {
        expect(cardTap(3, 3)).toBe('open');
        expect(cardTap(2, 3)).toBe('select');
        expect(cardTap(10, 10)).toBe('open');
    });
    it('flickWraps sends a flick on outward from the last card (the Library card) back to the first game', () => {
        // At the end, flicking on (finger moving left, a negative speed): wrap.
        expect(flickWraps(10, 10, -2)).toBe(true);
        expect(flickWraps(10, 10, -FLICK_MIN)).toBe(true);
        // Too slow to flick, flicking back, or not at the end: no wrap.
        expect(flickWraps(10, 10, -FLICK_MIN * 0.6)).toBe(false);
        expect(flickWraps(10, 10, 2)).toBe(false);
        expect(flickWraps(9, 10, -2)).toBe(false);
        // The first card: no wrap backwards (only the end wraps).
        expect(flickWraps(0, 10, 2)).toBe(false);
        // Nothing to wrap to (the Library card only).
        expect(flickWraps(0, 0, -2)).toBe(false);
    });
    it('edgeBounce carries a flick that runs into an end past it a little and springs back to rest', () => {
        // Into the first card (a positive speed): the row runs on past it, outward (positive), and comes back.
        const limit = 84;
        expect(edgeBounce(0, 1.5, 0, limit)).toEqual({ offset: 0, done: false });
        const peak = Math.max(...Array.from({ length: 60 }, (_, i) => edgeBounce(0, 1.5, i * 10, limit).offset));
        expect(peak).toBeGreaterThan(15);
        expect(peak).toBeLessThan(limit);
        // It is quick: handed back just past its peak, within 80 ms, so the card widens right after the bounce.
        expect(edgeBounce(0, 1.5, 80, limit).done).toBe(true);
        expect(edgeBounce(0, 1.5, 30, limit).done).toBe(false);
        // It has come back by the end, and is done.
        const end = edgeBounce(0, 1.5, BOUNCE_MS * 8, limit);
        expect(end.done).toBe(true);
        expect(Math.abs(end.offset)).toBeLessThan(0.5);
        // From short of the card (the index already on it, the row still on its way): it continues smoothly from there.
        expect(edgeBounce(-60, 1.5, 0, limit).offset).toBe(-60);
        expect(edgeBounce(-60, 1.5, 20, limit).offset).toBeGreaterThan(-60);
        // Into the end (a negative speed): the same, the other way; and a very fast flick never passes the limit.
        expect(edgeBounce(0, -1.5, BOUNCE_MS, limit).offset).toBeLessThan(0);
        expect(Math.min(...Array.from({ length: 60 }, (_, i) => edgeBounce(0, -50, i * 10, limit).offset))).toBeGreaterThan(-limit);
    });
});
