import { describe, expect, it } from 'vitest';
import { formatHours } from '../../src/logic/format';
import { HLTB_COLUMNS, hltbFoundView } from '../../src/logic/hltbCardView';
import { beyondCaption, HltbTimes, towardCaption } from '../../src/logic/progress';

const W3: HltbTimes = { main: 51.7, mainExtras: 103.8, completionist: 175.3 };
const h = (hours: number) => formatHours(hours, 'en-US');

describe('hltbFoundView', () => {
    it('three columns in page order, keyed as the page and Home name them (Main is "hltb")', () => {
        expect(HLTB_COLUMNS.map((c) => [c.key, c.label])).toEqual([['hltb', 'Main'], ['mainExtras', '+ Extras'], ['completionist', '100%']]);
        const v = hltbFoundView(W3, 40.1 * 60, 'en-US', true);
        expect(v.columns.map((c) => [c.key, c.label, c.value])).toEqual([
            ['hltb', 'Main', h(51.7)],
            ['mainExtras', '+ Extras', h(103.8)],
            ['completionist', '100%', h(175.3)],
        ]);
    });

    it('a missing time reads "—"', () => {
        const v = hltbFoundView({ main: 10, mainExtras: null, completionist: null }, 60, 'en-US', true);
        expect(v.columns.map((c) => c.value)).toEqual([h(10), '—', '—']);
    });

    it('restyled: the bar and caption follow the main story, and no column is the goal', () => {
        const v = hltbFoundView(W3, 40.1 * 60, 'en-US', true);
        expect(v.bar).toBe(77);
        expect(v.caption).toBe(towardCaption(40.1, 51.7, 'main', 'en-US'));
        expect(v.columns.some((c) => c.goal)).toBe(false);
    });

    it('restyled, past the main story: a full bar and "Main story complete"', () => {
        const v = hltbFoundView(W3, 60 * 60, 'en-US', true);
        expect(v.bar).toBe(100);
        expect(v.caption).toBe('Main story complete');
    });

    it('not played: no bar, "Not played yet"', () => {
        const v = hltbFoundView(W3, 0, 'en-US', true);
        expect(v.bar).toBeNull();
        expect(v.caption).toBe('Not played yet');
    });

    it('not restyled: the goal column is the tier being worked toward', () => {
        const v = hltbFoundView(W3, 68.4 * 60, 'en-US', false);
        expect(v.columns.map((c) => c.goal)).toEqual([false, true, false]);
        expect(v.bar).toBe(65);
        expect(v.caption).toBe(towardCaption(68.4, 103.8, 'mainExtras', 'en-US'));
    });

    it('not restyled, beyond the last tier: a full bar and the beyond caption', () => {
        const v = hltbFoundView(W3, 200 * 60, 'en-US', false);
        expect(v.bar).toBe(100);
        expect(v.caption).toBe(beyondCaption('completionist'));
    });

    it('no times at all: no bar and no caption', () => {
        const v = hltbFoundView({ main: null, mainExtras: null, completionist: null }, 600, 'en-US', true);
        expect(v.bar).toBeNull();
        expect(v.caption).toBeNull();
    });
});
