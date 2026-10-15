import { describe, expect, it } from 'vitest';
import { FAST_CYCLE_MS, RELEASE_WIDEN_MS, SETTLE_WIDEN_MS, cycleView, settleCycle, startCycle, stepCycle, widenCycle, widenDelay } from '../../src/home/fastCycle';
import { BUMPER_REPEAT_MS } from '../../src/home/focusZones';

describe('timings', () => {
    it("a run outlasts a held bumper's repeat (holding L1/R1 is one run) and ends soon after the last step", () => {
        expect(FAST_CYCLE_MS).toBeGreaterThan(BUMPER_REPEAT_MS);
        expect(FAST_CYCLE_MS).toBeLessThanOrEqual(200);
    });
    it('the card widens quickly once a run ends', () => {
        expect(SETTLE_WIDEN_MS).toBeGreaterThanOrEqual(120);
        expect(SETTLE_WIDEN_MS).toBeLessThanOrEqual(180);
    });
});

describe('stepCycle', () => {
    it('a step from rest is shown at once', () => {
        expect(stepCycle(startCycle(0, 0), 1, 1000)).toEqual({ shown: 1, at: 1, last: 1000, phase: 'rest', held: false });
    });
    it('a step soon after the last one starts a run: the screen holds what it shows, only the selection moves', () => {
        let s = stepCycle(startCycle(0, 0), 1, 1000);
        s = stepCycle(s, 2, 1000 + FAST_CYCLE_MS - 1);
        expect(s).toMatchObject({ shown: 1, at: 2, phase: 'run' });
        s = stepCycle(s, 3, 1000 + 2 * FAST_CYCLE_MS - 2);
        expect(s).toMatchObject({ shown: 1, at: 3, phase: 'run', last: 1000 + 2 * FAST_CYCLE_MS - 2 });
    });
    it('a step after the screen has rested is shown at once again', () => {
        let s = stepCycle(startCycle(0, 0), 1, 1000);
        s = stepCycle(s, 2, 1000 + FAST_CYCLE_MS);
        expect(s).toEqual({ shown: 2, at: 2, last: 1000 + FAST_CYCLE_MS, phase: 'rest', held: false });
    });
    it('a step while the card widens is a step from rest', () => {
        let s = stepCycle(stepCycle(startCycle(0, 0), 1, 1000), 2, 1100);
        s = widenCycle(s);
        expect(stepCycle(s, 3, 1100 + FAST_CYCLE_MS + 50)).toEqual({ shown: 3, at: 3, last: 1100 + FAST_CYCLE_MS + 50, phase: 'rest', held: false });
    });
    it('the same selection again is no step, at rest or in a run: the very same state', () => {
        const rest = startCycle(4, 0);
        expect(stepCycle(rest, 4, 10)).toBe(rest);
        const run = stepCycle(stepCycle(startCycle(0, 0), 1, 1000), 2, 1050);
        expect(stepCycle(run, 2, 1100)).toBe(run);
    });
});

describe('the end of a run', () => {
    const run = () => stepCycle(stepCycle(startCycle(0, 0), 1, 1000), 5, 1100);
    it('first the selected card widens, alone: the screen still holds the game it showed', () => {
        expect(widenCycle(run())).toEqual({ shown: 1, at: 5, last: 1100, phase: 'widen', held: false });
    });
    it('then the screen shows the selection', () => {
        expect(settleCycle(widenCycle(run()))).toEqual({ shown: 5, at: 5, last: 1100, phase: 'rest', held: false });
    });
    it('settling straight from the run (opening the game) shows it at once', () => {
        expect(settleCycle(run())).toEqual({ shown: 5, at: 5, last: 1100, phase: 'rest', held: false });
    });
    it('outside a run nothing changes', () => {
        const s = startCycle(3, 0);
        expect(widenCycle(s)).toBe(s);
        expect(settleCycle(s)).toBe(s);
    });
});

describe('cycleView', () => {
    it('in a run the cards are narrow and the screen holds; widening: wide, still holding; at rest neither', () => {
        expect(cycleView('run')).toEqual({ narrow: true, holding: true });
        expect(cycleView('widen')).toEqual({ narrow: false, holding: true });
        expect(cycleView('rest')).toEqual({ narrow: false, holding: false });
    });
});

describe('a held button (no guessing)', () => {
    it("a held button's repeats are a run however far apart (its first repeat comes 400 ms after the press)", () => {
        const press = stepCycle(startCycle(0, 0), 1, 1000);
        expect(press.phase).toBe('rest');
        const repeat = stepCycle(press, 2, 1400, true);
        expect(repeat).toEqual({ shown: 1, at: 2, last: 1400, phase: 'run', held: true });
    });
    it('while held the card never widens; let go, it widens almost at once; a run of taps waits FAST_CYCLE_MS', () => {
        const held = stepCycle(stepCycle(startCycle(0, 0), 1, 1000), 2, 1400, true);
        expect(widenDelay(held, true)).toBeNull();
        expect(widenDelay(held, false)).toBe(RELEASE_WIDEN_MS);
        const taps = stepCycle(stepCycle(startCycle(0, 0), 1, 1000), 2, 1100);
        expect(widenDelay(taps, false)).toBe(FAST_CYCLE_MS);
    });
    it('taps after a hold are taps again', () => {
        const held = stepCycle(stepCycle(startCycle(0, 0), 1, 1000), 2, 1400, true);
        expect(stepCycle(held, 3, 1500).held).toBe(false);
    });
    it('only a run waits to widen; the widening card then waits SETTLE_WIDEN_MS', () => {
        expect(widenDelay(startCycle(0, 0), false)).toBeNull();
        const widening = widenCycle(stepCycle(stepCycle(startCycle(0, 0), 1, 1000), 2, 1100));
        expect(widenDelay(widening, false)).toBe(SETTLE_WIDEN_MS);
    });
    it('RELEASE_WIDEN_MS is quick', () => {
        expect(RELEASE_WIDEN_MS).toBeGreaterThan(0);
        expect(RELEASE_WIDEN_MS).toBeLessThanOrEqual(100);
    });
});
