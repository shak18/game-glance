import { describe, expect, it, vi } from 'vitest';
import { applyOpening, extrasFlags, extrasParts, measureHome, missingStats, viewportSize, openVariant, pageStatsFromChips, readExtrasAsked } from '../../src/home/openHome';
import { BRIDGE_FADE_EASE, mountOpenBridge } from '../../src/home/openBridge';

describe('openVariant', () => {
    it('morphs only the selected game with its full hero art onto the restyled page', () => {
        expect(openVariant({ sameGame: true, heroMode: 'full', pageRestyled: true })).toBe('morph');
    });
    it('a game without full hero art fades (its art would not match the page header)', () => {
        expect(openVariant({ sameGame: true, heroMode: 'fallback', pageRestyled: true })).toBe('fade');
        expect(openVariant({ sameGame: true, heroMode: 'none', pageRestyled: true })).toBe('fade');
    });
    it('another game (a feed card) crossfades to its hero', () => {
        expect(openVariant({ sameGame: false, heroMode: 'full', pageRestyled: true })).toBe('heroFade');
        expect(openVariant({ sameGame: false, heroMode: 'none', pageRestyled: true })).toBe('heroFade');
    });
    it("Steam's own page (Game Glance page off) fades", () => {
        expect(openVariant({ sameGame: true, heroMode: 'full', pageRestyled: false })).toBe('fade');
    });
});

/** A minimal element: a box, attributes, and children found by selector. */
interface FakeEl {
    getBoundingClientRect(): { left: number; top: number; width: number; height: number };
    getAttribute(name: string): string | null;
    querySelector(sel: string): FakeEl | null;
    querySelectorAll(sel: string): FakeEl[];
}
function el(x: number, y: number, w: number, h: number, attrs: Record<string, string> = {}, one: Record<string, FakeEl> = {}, all: Record<string, FakeEl[]> = {}): FakeEl {
    return {
        getBoundingClientRect: () => ({ left: x, top: y, width: w, height: h }),
        getAttribute: (n) => attrs[n] ?? null,
        querySelector: (s) => one[s] ?? null,
        querySelectorAll: (s) => all[s] ?? [],
    };
}
function chip(key: string | null, x: number, bar: boolean) {
    return el(x, 360, 100, 70, key ? { 'data-chip': key } : {}, {
        '.gh-chip-label': el(x + 15, 373, 70, 12),
        '.gh-chip-value': el(x + 15, 390, 70, 25),
        ...(bar ? { '.gh-chip-bar': el(x + 15, 419, 70, 3) } : {}),
    });
}
function home(withPlay = true) {
    const circles = [el(300, 460, 56, 56, { 'data-action': 'controller' }), el(366, 460, 56, 56, { 'data-action': 'menu' }), el(435, 460, 56, 56, { 'data-action': 'info' })];
    return el(0, 0, 1500, 844, {}, {
        '.gh-canvas': el(0, 0, 1500, 843.75),
        '.gh-title-slot': el(25, 188, 645, 121),
        '.gh-eyebrow': el(25, 328, 645, 15),
        ...(withPlay ? { '.gh-actions .gh-btn[data-action="play"]': el(20, 459, 271, 58) } : {}),
        '.gh-source': el(1377, 472, 103, 33),
    }, {
        '.gh-actions .gh-btn-circle': circles,
        '.gh-chip': [chip('played', 25, false), chip('achievements', 144, true), chip(null, 288, true)],
    });
}

describe('measureHome', () => {
    it("reads Home's boxes: circles in order with the info button's index, chips by data-chip", () => {
        const r = measureHome(home() as unknown as Element);
        expect(r).not.toBeNull();
        expect(r!.play).toEqual({ x: 20, y: 459, w: 271, h: 58 });
        expect(r!.circles).toHaveLength(3);
        expect(r!.infoCircle).toBe(2);
        expect(r!.chips.map((c) => c.key)).toEqual(['played', 'achievements', '']);
        expect(r!.chips[0].bar).toBeNull();
        expect(r!.chips[1].bar).toEqual({ x: 159, y: 419, w: 70, h: 3 });
        expect(r!.canvas.w).toBe(1500);
        // The extras layer is placed in the root's px.
        expect(r!.root).toEqual({ x: 0, y: 0, w: 1500, h: 844 });
    });
    it('knows a text title from a logo (a text title grows to the page size, a logo does not)', () => {
        const withText = home();
        const q = withText.querySelector;
        withText.querySelector = (sel: string) => (sel === '.gh-title-slot .gh-title' ? el(25, 250, 300, 58) : q(sel));
        expect(measureHome(withText as unknown as Element)!.titleText).toBe(true);
        expect(measureHome(home() as unknown as Element)!.titleText).toBe(false);
    });
    it('is null when something required is missing (no Play pill: the Library card)', () => {
        expect(measureHome(home(false) as unknown as Element)).toBeNull();
        expect(measureHome(null)).toBeNull();
    });
});

/** A root that records what applyOpening does, with a frame callback we run by hand. */
function fakeRoot() {
    const props = new Map<string, string>();
    const attrs = new Map<string, string>();
    const frames: Array<() => void> = [];
    const root = {
        style: { setProperty: (n: string, v: string) => props.set(n, v), removeProperty: (n: string) => props.delete(n) },
        setAttribute: (n: string, v: string) => attrs.set(n, v),
        removeAttribute: (n: string) => attrs.delete(n),
        ownerDocument: { defaultView: { requestAnimationFrame: (cb: () => void) => frames.push(cb) } },
    };
    return { root: root as unknown as HTMLElement, props, attrs, frames };
}

describe('applyOpening', () => {
    it('sets the variables and the start frame, then the motion on the next frame', () => {
        const f = fakeRoot();
        applyOpening(f.root, 'morph', [{ name: '--gho-title', value: 'translate(1px, 2px)' }, { name: '--gho-shell-count', value: '2' }], null);
        expect(f.props.get('--gho-title')).toBe('translate(1px, 2px)');
        expect(f.attrs.get('data-gh-opening')).toBe('morph');
        expect(f.attrs.get('data-gh-phase')).toBe('from');
        expect(f.attrs.get('data-gh-shells')).toBe('2');
        f.frames.splice(0).forEach((cb) => cb());
        expect(f.attrs.get('data-gh-phase')).toBe('to');
    });
    it("a feed card's game: its hero art as a variable", () => {
        const f = fakeRoot();
        applyOpening(f.root, 'heroFade', [], 'https://steamloopback.host/assets/10/library_hero.jpg');
        expect(f.props.get('--gho-hero')).toBe('url("https://steamloopback.host/assets/10/library_hero.jpg")');
    });
    it("marks the parts Home draws as it turns into the page (data-gh-extras), none when it has none", () => {
        const f = fakeRoot();
        applyOpening(f.root, 'morph', [], null, 'desc hltb');
        expect(f.attrs.get('data-gh-extras')).toBe('desc hltb');
        const g = fakeRoot();
        applyOpening(g.root, 'morph', [], null, '');
        expect(g.attrs.has('data-gh-extras')).toBe(false);
    });
    it('undo (cancel before the hand-over) removes every trace, and a pending frame then does nothing', () => {
        const f = fakeRoot();
        const undo = applyOpening(f.root, 'morph', [{ name: '--gho-title', value: 'translate(1px, 2px)' }], 'x', 'desc');
        undo();
        f.frames.splice(0).forEach((cb) => cb());
        expect(f.props.size).toBe(0);
        expect(f.attrs.size).toBe(0);
    });
});

describe('viewportSize', () => {
    it("the window's exact size (the page lays out from 100vw / 100vh, fractional at a 2.32 pixel ratio), not innerWidth's rounding", () => {
        expect(viewportSize({ innerWidth: 828, innerHeight: 466, visualViewport: { width: 828.0172, height: 466.3793 } })).toEqual({ width: 828.0172, height: 466.3793 });
        expect(viewportSize({ innerWidth: 828, innerHeight: 466 })).toEqual({ width: 828, height: 466 });
        expect(viewportSize({ innerWidth: 828, innerHeight: 466, visualViewport: { width: 0, height: 0 } })).toEqual({ width: 828, height: 466 });
    });
});

describe('missingStats', () => {
    it("the page's stat columns Home showed no chip for (they arrive instead of popping in at the hand-over)", () => {
        expect(missingStats(['added', 'achievements', 'hltb'])).toEqual(['played']);
        expect(missingStats(['played', 'achievements', 'hltb'])).toEqual([]);
        expect(missingStats(['played'])).toEqual(['achievements', 'hltb']);
        // A column Home drew in its extras layer is there at the hand-over: it does not arrive.
        expect(missingStats(['added', 'achievements', 'hltb'], 'desc played')).toEqual([]);
    });
});

describe('extrasParts', () => {
    const found = (main: number | null) => ({ status: 'found' as const, gameId: 1, times: { main, mainExtras: 12, completionist: 24 } });
    it('the description when Home has its text; the HowLongToBeat card when it found the game with a Main time', () => {
        expect(extrasParts('A ship in the dark.', found(9))).toBe('desc hltb');
        expect(extrasParts(null, found(9))).toBe('hltb');
        expect(extrasParts('  ', undefined)).toBe('');
        expect(extrasParts('Text', { status: 'notFound' })).toBe('desc');
    });
    it('no Main time: no card (the page\'s "—" there would have nothing of Home\'s under it)', () => {
        expect(extrasParts(null, found(null))).toBe('');
    });
    it("a new game's Play time (Home shows its Added chip instead): Home draws the page's column, so it is there at the hand-over", () => {
        expect(extrasParts(null, undefined, undefined, true)).toBe('played');
        expect(extrasParts('Text', undefined, 'Steam', true)).toBe('desc pills played');
        expect(extrasParts(null, undefined, undefined, false)).toBe('');
    });
    it("the page's own store pill (and family pill in it) when Home knows the store: drawn at the page's size, it hands over unchanged", () => {
        expect(extrasParts(null, undefined, 'Steam')).toBe('pills');
        expect(extrasParts('Text', found(9), 'GOG')).toBe('desc hltb pills');
        expect(extrasParts(null, undefined, '')).toBe('');
    });
});

describe('extrasFlags', () => {
    it("tells the page which of its parts Home drew (they show at once instead of arriving)", () => {
        expect(extrasFlags('desc hltb')).toEqual({ homeDesc: true, homeHltb: true });
        expect(extrasFlags('hltb')).toEqual({ homeHltb: true });
        expect(extrasFlags('')).toEqual({});
    });
});

describe('readExtrasAsked', () => {
    const text = (t: string) => ({ ...el(0, 0, 0, 0), textContent: t });
    const column = (label: string, value: string) => ({
        ...el(0, 0, 0, 0),
        querySelector: (sel: string) => (sel === '.gh-x-label' ? text(label) : sel === '.gh-x-value' ? text(value) : null),
    });
    it("reads the layer's HowLongToBeat columns after Main, and whether it has a bar", () => {
        const root = el(0, 0, 1500, 844, {}, { '.gh-open-extras .gh-x-bar': el(0, 0, 1, 1) }, {
            '.gh-open-extras .gh-x-stats > div': [column('Main', '9 h'), column('+ Extras', '12 h'), column('100%', '24 h')],
        });
        expect(readExtrasAsked(root as unknown as Element)).toEqual({
            columns: [{ key: 'mainExtras', label: '+ Extras', value: '12 h' }, { key: 'completionist', label: '100%', value: '24 h' }],
            bar: true,
        });
    });
    it('no card in the layer: no columns, no bar', () => {
        expect(readExtrasAsked(el(0, 0, 1500, 844) as unknown as Element)).toEqual({ columns: [], bar: false });
    });
});

describe('pageStatsFromChips', () => {
    const chips = [
        { key: 'played', label: 'Play Time', value: '1.9 h', bar: false },
        { key: 'achievements', label: 'Achievements', value: '0 / 49', bar: true },
        { key: 'hltb', label: 'HLTB main', value: '9.1 h', bar: true },
    ];
    it("Spotlight: the info card's stats, then HowLongToBeat's Main; achievements as everywhere ('0 / 49')", () => {
        expect(pageStatsFromChips(chips, 'spotlight')).toEqual([
            { key: 'played', label: 'Play Time', value: '1.9 h', bar: false },
            { key: 'achievements', label: 'Achievements', value: '0 / 49', bar: false },
            { key: 'hltb', label: 'Main', value: '9.1 h', bar: false },
        ]);
    });
    it('Clean: the same order with bars where Home had them', () => {
        expect(pageStatsFromChips(chips, 'clean').map((s) => [s.key, s.label, s.value, s.bar])).toEqual([
            ['played', 'Play Time', '1.9 h', false], ['achievements', 'Achievements', '0 / 49', true], ['hltb', 'HLTB main', '9.1 h', true],
        ]);
    });
    it("a new game's Added chip: the page still shows Play time (0 h), and nothing else of Home's is invented", () => {
        const stats = pageStatsFromChips([{ key: 'added', label: 'Added', value: 'Today', bar: false }, chips[2]], 'clean');
        expect(stats.map((s) => s.key)).toEqual(['played', 'hltb']);
        expect(stats[0].value).toBe('0 h');
    });
});

describe('mountOpenBridge', () => {
    function fakeDom() {
        const appended: Array<{ style: Record<string, string>; children: unknown[]; remove(): void }> = [];
        const make = () => {
            const node = {
                style: {} as Record<string, string>,
                children: [] as unknown[],
                className: '',
                attrs: {} as Record<string, string>,
                setAttribute(n: string, v: string) { node.attrs[n] = v; },
                appendChild(c: unknown) { node.children.push(c); },
                remove: vi.fn(),
            };
            return node;
        };
        const clone = { ...make(), classList: { add: vi.fn(), remove: vi.fn() } };
        const doc = { body: { appendChild: (c: never) => appended.push(c) }, createElement: () => make() };
        const root = {
            ownerDocument: doc,
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 1500, height: 844 }),
            cloneNode: vi.fn(() => clone),
        };
        return { root: root as unknown as HTMLElement, appended, clone };
    }
    it("puts a frozen copy of Home over Home's box, then fades and removes it", () => {
        const f = fakeDom();
        const bridge = mountOpenBridge(f.root);
        expect(f.appended).toHaveLength(1);
        const box = f.appended[0];
        expect(box.style).toMatchObject({ position: 'fixed', left: '0px', top: '0px', width: '1500px', height: '844px', pointerEvents: 'none' });
        expect(box.children).toEqual([f.clone]);
        expect(f.clone.classList.add).toHaveBeenCalledWith('gh-bridge');
        // Not Home's "just back" state (its UI fading in): in the copy that fade replayed from 0, blanking the title, Play
        // row and stats at the hand-over (opened within 1.5 s of B; recorded on the Ally).
        expect(f.clone.classList.remove).toHaveBeenCalledWith('gh-back');
        bridge.fadeOut(120);
        expect(box.style.opacity).toBe('0');
        expect(box.style.transition).toBe(`opacity 120ms ${BRIDGE_FADE_EASE}`);
        // Front-loaded (the page's new parts show through soon) and soft at the end.
        expect(BRIDGE_FADE_EASE).toBe('cubic-bezier(.2,.65,.3,1)');
        bridge.remove();
        expect(box.remove).toHaveBeenCalled();
    });
    it('fades in over live Home from transparent, so the copy cross-fades instead of replacing Home in one frame', () => {
        const f = fakeDom();
        const bridge = mountOpenBridge(f.root);
        const box = f.appended[0];
        const seen: string[] = [];
        let value = '';
        Object.defineProperty(box.style, 'opacity', { get: () => value, set: (v: string) => { seen.push(v); value = v; }, configurable: true });
        bridge.fadeIn(150);
        expect(seen).toEqual(['0', '1']);
        expect(box.style.transition).toBe('opacity 150ms ease-in-out');
    });
    it('leaves out the parts of Home that are gone by the hand-over (the game row, tabs and feed): half the layout work', () => {
        const f = fakeDom();
        const dropped = [{ remove: vi.fn() }, { remove: vi.fn() }];
        const asked: string[] = [];
        (f.clone as unknown as { querySelectorAll(sel: string): unknown[] }).querySelectorAll = (sel: string) => {
            asked.push(sel);
            return dropped;
        };
        mountOpenBridge(f.root, '', [], ['.gh-recents', '.gh-feed']);
        expect(asked).toEqual(['.gh-recents, .gh-feed']);
        for (const d of dropped) expect(d.remove).toHaveBeenCalled();
    });
    it("carries the given stylesheet while it is up (Steam's page-enter fade switched off)", () => {
        const f = fakeDom();
        mountOpenBridge(f.root, '.x { opacity: 1 }');
        const box = f.appended[0] as unknown as { children: Array<{ textContent?: string }> };
        expect(box.children.some((c) => c.textContent === '.x { opacity: 1 }')).toBe(true);
    });
    it('carries copies of the given extra layers (our status bar) above the copy of Home', () => {
        const f = fakeDom();
        const bar = { cloneNode: vi.fn(() => ({ id: 'bar-copy' })) };
        mountOpenBridge(f.root, '', [bar as unknown as Element]);
        const box = f.appended[0] as unknown as { children: unknown[] };
        expect(box.children[box.children.length - 1]).toEqual({ id: 'bar-copy' });
    });
    it('throws when Home has no usable box (the controller then opens the page without it)', () => {
        const f = fakeDom();
        (f.root as unknown as { getBoundingClientRect: () => unknown }).getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 });
        expect(() => mountOpenBridge(f.root)).toThrow();
    });
});

describe('the Unifideck size in the open (Home draws it)', () => {
    const chips = [{ key: 'played', label: 'Play Time', value: '0 h', bar: false }, { key: 'hltb', label: 'HLTB Main', value: '12 h', bar: true }];
    it('the page stats put it right after Played, as the page does', () => {
        const size = { label: 'Space required', value: '1.6 GB' };
        expect(pageStatsFromChips(chips, 'spotlight', size).map((s) => s.key)).toEqual(['played', 'size', 'hltb']);
        expect(pageStatsFromChips(chips, 'clean', size)[1]).toEqual({ key: 'size', label: 'Space required', value: '1.6 GB', bar: false });
        expect(pageStatsFromChips(chips, 'clean').map((s) => s.key)).toEqual(['played', 'hltb']);
    });
    it("is one of the extras' parts when Home knows it", () => {
        expect(extrasParts(null, undefined, 'GOG', false, true)).toBe('pills size');
        expect(extrasParts(null, undefined, 'GOG', false, false)).toBe('pills');
    });
});

describe('extrasFlags for the size', () => {
    it('the page shows the size column at once when Home drew it', () => {
        expect(extrasFlags('pills size')).toEqual({ homeSize: true });
        expect(extrasFlags('desc hltb')).toEqual({ homeDesc: true, homeHltb: true });
    });
});

describe("a Steam game's Space Required chip (not installed): the page's size stat, handed over unchanged", () => {
    const home = [
        { key: 'played', label: 'Played', value: '0 h', bar: false },
        { key: 'size', label: 'Space Required', value: '659 MB', bar: false },
        { key: 'hltb', label: 'HLTB main', value: '5 h', bar: true },
    ];
    it('the page shows the same Space Required, right of Played, with no size passed in', () => {
        expect(pageStatsFromChips(home, 'spotlight').map((s) => [s.key, s.label, s.value])).toEqual([
            ['played', 'Played', '0 h'],
            ['size', 'Space Required', '659 MB'],
            ['hltb', 'Main', '5 h'],
        ]);
    });
    it('no size stat when Home shows none', () => {
        expect(pageStatsFromChips(home.filter((c) => c.key !== 'size'), 'spotlight').map((s) => s.key)).toEqual(['played', 'hltb']);
    });
});

describe("the page's size stat when Home's chip drew it (a Steam game's Space Required)", () => {
    it('Home showed the size chip: the page is told, so its size stat is not hidden while it arrives', () => {
        expect(extrasFlags('', ['played', 'size', 'hltb'])).toEqual({ homeSize: true });
        expect(extrasFlags('', ['played', 'hltb'])).toEqual({});
    });
});
