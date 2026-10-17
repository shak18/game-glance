import { describe, expect, it } from 'vitest';
import { screensaverStats } from '../../src/screensaver/stats';

const times = { main: 10, mainExtras: 15, completionist: 30 };
const hours = (h: number) => h * 60;

describe('screensaverStats', () => {
    it('play time first, always', () => {
        expect(screensaverStats(null, hours(5), null, 'en')).toEqual([{ key: 'played', label: 'Played', value: '5 h' }]);
    });
    it('shows only the tier being worked toward, with the progress toward it', () => {
        expect(screensaverStats(times, hours(5), null, 'en')[1]).toEqual({ key: 'hltb', label: 'HLTB main', value: '10 h', progress: 0.5 });
        expect(screensaverStats(times, hours(12), null, 'en')[1]).toMatchObject({ label: 'HLTB + Extras', value: '15 h', progress: 0.8 });
        expect(screensaverStats(times, hours(20), null, 'en')[1]).toMatchObject({ label: 'HLTB 100%', value: '30 h' });
    });
    it('past every tier: the last one, full', () => {
        expect(screensaverStats(times, hours(40), null, 'en')[1]).toMatchObject({ label: 'HLTB 100%', progress: 1 });
    });
    it('not played yet: the main story, empty', () => {
        expect(screensaverStats(times, 0, null, 'en')[1]).toMatchObject({ label: 'HLTB main', progress: 0 });
    });
    it('a missing tier is skipped', () => {
        expect(screensaverStats({ main: null, mainExtras: 15, completionist: 30 }, hours(2), null, 'en')[1]).toMatchObject({ label: 'HLTB + Extras' });
    });
    it('achievements after the time, as a count without a bar', () => {
        expect(screensaverStats(times, hours(5), { achieved: 12, total: 40 }, 'en')[2]).toEqual({ key: 'achievements', label: 'Achievements', value: '12 / 40' });
    });
    it('leaves out what is unknown: no times, no achievements, a game without any', () => {
        const keys = (stats: { key: string }[]) => stats.map((s) => s.key);
        expect(keys(screensaverStats(null, hours(5), { achieved: 0, total: 0 }, 'en'))).toEqual(['played']);
        expect(keys(screensaverStats({ main: null, mainExtras: null, completionist: null }, hours(5), null, 'en'))).toEqual(['played']);
        expect(keys(screensaverStats(null, 0, { achieved: 3, total: 10 }, 'en'))).toEqual(['played', 'achievements']);
    });
});
