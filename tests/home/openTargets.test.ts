import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Box, ExtraColumn, Measure, pageTargets, PageLook, PageStat, StatKey } from '../../src/home/openTargets';

interface Fixture {
    screen: { width: number; height: number };
    rects: Record<string, Box>;
    texts: Record<string, string>;
}
const fixture = (name: string): Fixture => JSON.parse(readFileSync(resolve(__dirname, 'fixtures/openLayout', `${name}.json`), 'utf8'));

// The fixtures were captured before the page had data-stat: columns by order (device notes).
const COLUMNS: Record<PageLook, Array<[string, StatKey]>> = {
    spotlight: [['col0', 'played'], ['col1', 'achievements'], ['hltb', 'hltb']],
    clean: [['col0', 'played'], ['col1', 'achievements'], ['col2', 'hltb']],
};

function pageStats(look: PageLook, f: Fixture): PageStat[] {
    return COLUMNS[look].map(([col, key]) => ({
        key,
        label: f.texts[`stat:${col}:label`],
        value: f.texts[`stat:${col}:value`],
        bar: f.rects[`stat:${col}:bar`] !== undefined,
    }));
}

/** The HowLongToBeat card's other two columns (Spotlight), as the page drew them. */
const EXTRA_KEYS = ['mainExtras', 'completionist'] as const;
const extraColumns = (f: Fixture): ExtraColumn[] =>
    EXTRA_KEYS.map((key) => ({ key, label: f.texts[`stat:${key}:label`], value: f.texts[`stat:${key}:value`] }));

/** Text widths as the page drew them: a column's box is as wide as its widest text (or bar), so each text measures to its own natural width at most that. */
function measureFrom(look: PageLook, f: Fixture): Measure {
    return (text) => {
        for (const key of look === 'spotlight' ? EXTRA_KEYS : []) {
            if (f.texts[`stat:${key}:label`] === text || f.texts[`stat:${key}:value`] === text) return f.rects[`stat:${key}:label`].w;
        }
        for (const [col] of COLUMNS[look]) {
            const label = f.rects[`stat:${col}:label`];
            const bar = f.rects[`stat:${col}:bar`];
            if (f.texts[`stat:${col}:label`] === text || f.texts[`stat:${col}:value`] === text) return bar && Math.abs(bar.w - label.w) < 0.5 ? 0 : label.w;
        }
        throw new Error(`unexpected text ${text}`);
    };
}

const near = (actual: number, expected: number, what: string) => {
    expect(Math.abs(actual - expected), `${what}: ${actual} vs ${expected}`).toBeLessThanOrEqual(2);
};
const nearBox = (actual: Box | undefined, expected: Box, what: string) => {
    expect(actual, what).toBeDefined();
    near(actual!.x, expected.x, `${what}.x`);
    near(actual!.y, expected.y, `${what}.y`);
    near(actual!.w, expected.w, `${what}.w`);
    near(actual!.h, expected.h, `${what}.h`);
};

for (const look of ['spotlight', 'clean'] as const) {
    for (const size of ['1500x844', '828x466']) {
        it(`matches the measured ${look} page at ${size} within 2 px`, () => {
            const f = fixture(`${look}-${size}`);
            const r = f.rects;
            // The fixture's game had a bar (its caption: "7.3 h left in main story").
            const extras = { columns: extraColumns(f), bar: true };
            const t = pageTargets(look, f.screen, pageStats(look, f), measureFrom(look, f), { w: r.store.w, h: r.store.h }, extras);
            nearBox(t.play, r.play, 'play');
            for (let i = 0; i < 3; i++) nearBox(t.circles[i], r[`circle${i}`], `circle${i}`);
            near(t.store.x, r.store.x, 'store.x');
            near(t.store.y, r.store.y, 'store.y');
            // The title block grows upward: its eyebrow sits at the bottom, the title above it.
            near(t.eyebrowBottomLeft.x, r.eyebrow.x, 'eyebrow x');
            near(t.eyebrowBottomLeft.y, r.eyebrow.y + r.eyebrow.h, 'eyebrow bottom');
            near(t.titleBottomLeft.y, r.title.y + r.title.h, 'title bottom');
            if (look === 'spotlight') {
                nearBox(t.shells[0], r.card0, 'info card');
                nearBox(t.shells[1], r.card1, 'HLTB card');
                // What Home draws as it turns into the page: the description (three lines) and the HowLongToBeat card's rest.
                nearBox(t.extras?.desc, r.desc, 'description');
                nearBox(t.extras?.hltbTitle, r.hltbTitle, 'HowLongToBeat title');
                for (const key of EXTRA_KEYS) {
                    nearBox(t.extras?.columns[key]?.label, r[`stat:${key}:label`], `${key} label`);
                    nearBox(t.extras?.columns[key]?.value, r[`stat:${key}:value`], `${key} value`);
                }
                nearBox(t.extras?.caption, r.caption, 'caption');
            } else {
                expect(t.shells).toHaveLength(1);
                nearBox(t.shells[0], r.clean, 'Clean panel');
                expect(t.extras, 'the Clean look shows no description or HowLongToBeat card').toBeUndefined();
            }
            for (const [col, key] of COLUMNS[look]) {
                nearBox(t.stats[key]?.label, r[`stat:${col}:label`], `${key} label`);
                nearBox(t.stats[key]?.value, r[`stat:${col}:value`], `${key} value`);
                // Clean's progress bars are targets too (Home's chip bars move into them); the Spotlight cards' are not.
                const bar = r[`stat:${col}:bar`];
                if (look === 'clean' && bar) nearBox(t.stats[key]?.bar, bar, `${key} bar`);
                else expect(t.stats[key]?.bar, `${key} bar`).toBeUndefined();
            }
        });
    }
}

describe('pageTargets stats', () => {
    const screen = { width: 1500, height: 844 };
    const measure: Measure = (text) => text.length * 10;
    const store = { w: 100, h: 34 };
    const played: PageStat = { key: 'played', label: 'Play Time', value: '1 h' };
    const main: PageStat = { key: 'hltb', label: 'Main', value: '9 h' };
    const columns: ExtraColumn[] = [{ key: 'mainExtras', label: '+ Extras', value: '12 h' }, { key: 'completionist', label: '100%', value: '24 h' }];
    it('the HowLongToBeat columns follow Main in order, one gap apart; the bar sits between them and the caption', () => {
        const t = pageTargets('spotlight', screen, [played, main], measure, store, { columns, bar: true });
        const m = t.stats.hltb!.label;
        const e = t.extras!.columns.mainExtras!.label;
        const c = t.extras!.columns.completionist!.label;
        expect(e.x).toBeGreaterThan(m.x + m.w);
        expect(c.x - (e.x + e.w)).toBeCloseTo(e.x - (m.x + m.w), 6);
        expect(t.extras!.bar!.y).toBeGreaterThan(t.extras!.columns.mainExtras!.value.y);
        expect(t.extras!.caption.y).toBeGreaterThan(t.extras!.bar!.y + t.extras!.bar!.h);
    });
    it('without a bar (not played yet), the caption takes the bar\'s place', () => {
        const withBar = pageTargets('spotlight', screen, [played, main], measure, store, { columns, bar: true }).extras!;
        const noBar = pageTargets('spotlight', screen, [played, main], measure, store, { columns, bar: false }).extras!;
        expect(noBar.bar).toBeUndefined();
        expect(noBar.caption.y).toBeCloseTo(withBar.bar!.y, 6);
    });
    it('no extras asked for: none', () => {
        expect(pageTargets('spotlight', screen, [played, main], measure, store).extras).toBeUndefined();
    });
    it('a stat the page lacks has no target', () => {
        const t = pageTargets('spotlight', screen, [{ key: 'played', label: 'Play Time', value: '1 h' }, { key: 'hltb', label: 'Main', value: '9 h' }], measure, store);
        expect(t.stats.achievements).toBeUndefined();
        expect(t.stats.played).toBeDefined();
    });
    it('a Unifideck size column shifts the others right and widens the Clean panel by the column plus one gap', () => {
        const base: PageStat[] = [{ key: 'played', label: 'Play Time', value: '1 h' }, { key: 'hltb', label: 'HLTB main', value: '9 h', bar: true }];
        const withSize: PageStat[] = [{ key: 'size', label: 'Install size', value: '4.1 GB' }, ...base];
        const a = pageTargets('clean', screen, base, measure, store);
        const b = pageTargets('clean', screen, withSize, measure, store);
        expect(b.stats.played!.label.x).toBeGreaterThan(b.stats.size!.label.x);
        const d = 1500 / 1440;
        near(b.shells[0].w - a.shells[0].w, 'Install size'.length * 10 + 28 * d, 'panel growth');
        // Right-aligned: the panel's right edge stays put.
        near(b.shells[0].x + b.shells[0].w, a.shells[0].x + a.shells[0].w, 'panel right edge');
    });
});
