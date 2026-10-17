import { describe, expect, it } from 'vitest';
import { hoverKey, rowWheelTarget, WHEEL_IDLE_MS, WHEEL_STEP, wheelPx, wheelStep, WheelState } from '../../src/home/mouse';

describe('mouse', () => {
    it('wheelPx reads the stronger axis, in px, whatever the delta mode', () => {
        expect(wheelPx(0, 53, 0)).toBe(53);
        expect(wheelPx(0, -100, 0)).toBe(-100);
        // Shift + wheel, or a trackpad sideways: the horizontal delta (right = on).
        expect(wheelPx(30, 4, 0)).toBe(30);
        // Lines and pages: always at least a step.
        expect(wheelPx(0, 3, 1)).toBeGreaterThanOrEqual(WHEEL_STEP);
        expect(wheelPx(0, -1, 2)).toBeLessThanOrEqual(-WHEEL_STEP);
        expect(wheelPx(0, 0, 0)).toBe(0);
    });
    it('wheelStep moves one card per notch, whatever a notch is worth (53 or 100 px), down for the next card', () => {
        const rest: WheelState = { acc: 0, t: 0 };
        expect(wheelStep(rest, 53, 1000).steps).toBe(1);
        expect(wheelStep(rest, 100, 1000).steps).toBe(1);
        expect(wheelStep(rest, 240, 1000).steps).toBe(1);
        expect(wheelStep(rest, -53, 1000).steps).toBe(-1);
        expect(wheelStep(rest, 0, 1000).steps).toBe(0);
    });
    it('wheelStep adds up a smooth scroll (a trackpad) to a step, one card at a time', () => {
        let s: WheelState = { acc: 0, t: 0 };
        const out: number[] = [];
        for (let i = 0; i < 10; i++) {
            const r = wheelStep(s, 9, 1000 + i * 16);
            out.push(r.steps);
            s = r.state;
        }
        // 90 px of small deltas: two cards, each once its 40 px are in.
        expect(out.filter((x) => x === 1).length).toBe(2);
        expect(out.every((x) => x === 0 || x === 1)).toBe(true);
    });
    it('wheelStep forgets a part-step after a pause or a change of direction', () => {
        const part = wheelStep({ acc: 0, t: 0 }, 30, 1000).state;
        expect(wheelStep(part, 15, 1000 + 50).steps).toBe(1);
        expect(wheelStep(part, 15, 1000 + WHEEL_IDLE_MS + 1).steps).toBe(0);
        expect(wheelStep(part, -15, 1000 + 50).steps).toBe(0);
    });
    it('rowWheelTarget steps from the selection and stops at the ends (the wheel never wraps)', () => {
        expect(rowWheelTarget(3, 1, 10)).toBe(4);
        expect(rowWheelTarget(3, -1, 10)).toBe(2);
        expect(rowWheelTarget(10, 1, 10)).toBe(10);
        expect(rowWheelTarget(0, -1, 10)).toBe(0);
        expect(rowWheelTarget(4, 0, 10)).toBe(4);
    });
    it('hoverKey: only a mouse with no button held hovers (a finger or a drag never does)', () => {
        expect(hoverKey('mouse', 0, 'g3')).toBe('g3');
        expect(hoverKey('mouse', 1, 'g3')).toBeNull();
        expect(hoverKey('touch', 0, 'g3')).toBeNull();
        expect(hoverKey('pen', 0, 'g3')).toBeNull();
        expect(hoverKey('mouse', 0, null)).toBeNull();
    });
});
