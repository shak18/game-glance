import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearOpen, markOpen, onOpenReady, OPEN_INTENT_MS, openPending, openUnderway, reportOpenReady } from '../../src/data/openIntent';

describe('openIntent', () => {
    afterEach(clearOpen);

    it('is pending for its game only, within OPEN_INTENT_MS', () => {
        markOpen(10, { look: 'clean', mode: 'parts' }, 0);
        expect(openPending(10, 2999)).toEqual({ look: 'clean', mode: 'parts' });
        expect(OPEN_INTENT_MS).toBe(3000);
        expect(openPending(10, 3000)).toBeNull();
        expect(openPending(11, 5)).toBeNull();
    });

    it('ready reaches listeners once and clears', () => {
        const heard = vi.fn();
        const stop = onOpenReady(heard);
        markOpen(10, { look: 'spotlight', mode: 'all' });
        reportOpenReady(10);
        reportOpenReady(10);
        expect(heard).toHaveBeenCalledTimes(1);
        expect(heard).toHaveBeenCalledWith(10);
        expect(openPending(10)).toBeNull();
        stop();
    });

    it('a listener that throws does not stop the others; an unsubscribed one hears nothing', () => {
        const after = vi.fn();
        const gone = vi.fn();
        const stops = [onOpenReady(() => { throw new Error('boom'); }), onOpenReady(after), onOpenReady(gone)];
        stops[2]();
        markOpen(5, { look: 'steam', mode: 'all' });
        expect(() => reportOpenReady(5)).not.toThrow();
        expect(after).toHaveBeenCalledWith(5);
        expect(gone).not.toHaveBeenCalled();
        stops.forEach((s) => s());
    });

    it('invalid ids are ignored, and ready for another game changes nothing', () => {
        markOpen(0, { look: 'clean', mode: 'parts' });
        expect(openPending(0)).toBeNull();
        const heard = vi.fn();
        const stop = onOpenReady(heard);
        markOpen(3, { look: 'clean', mode: 'parts' }, Date.now());
        reportOpenReady(4);
        expect(heard).not.toHaveBeenCalled();
        expect(openPending(3)).not.toBeNull();
        stop();
    });
});

describe('openIntent while an open is under way', () => {
    afterEach(clearOpen);
    it("carries Home's eyebrow so the page shows the same words", () => {
        markOpen(9, { look: 'clean', mode: 'parts', eyebrow: 'Favorites · Last played · Today' }, 0);
        expect(openPending(9, 10)?.eyebrow).toBe('Favorites · Last played · Today');
    });
    it('openUnderway: any open within OPEN_INTENT_MS (Home must not uncover Steam\'s bar as it leaves)', () => {
        expect(openUnderway(0)).toBe(false);
        markOpen(9, { look: 'clean', mode: 'parts' }, 0);
        expect(openUnderway(100)).toBe(true);
        expect(openUnderway(OPEN_INTENT_MS)).toBe(false);
    });
});
