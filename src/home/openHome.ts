import type { HomeRects, MotionVar } from './openMotion';
import type { Box, ExtraColumn, ExtrasAsked, Measure, PageLook, PageStat, StatKey } from './openTargets';
import type { HltbResult } from '../data/hltb';
import { tr } from '../i18n/steamText';

/**
 * Spotlight Home's side of the open transition: which variant runs (openVariant), Home's boxes (measureHome), the
 * opening state on Home's root (applyOpening: CSS variables from openMotion plus data-gh-opening / data-gh-phase,
 * read by homeCss.openingRules), and the page's text widths for openTargets (canvasMeasure).
 */

/** morph: Home becomes the page; heroFade: another game's hero fades in over Home; fade: Home's UI fades on its hero. */
export type OpenVariant = 'morph' | 'heroFade' | 'fade';

/**
 * Morph only the selected game, with its full hero art (fallback or missing art would not match the page's header),
 * onto the restyled page. Another game (a feed card) gets its hero faded in; anything else just fades. Pure.
 */
export function openVariant(o: { sameGame: boolean; heroMode: 'full' | 'fallback' | 'none'; pageRestyled: boolean }): OpenVariant {
    if (!o.pageRestyled) return 'fade';
    if (!o.sameGame) return 'heroFade';
    return o.heroMode === 'full' ? 'morph' : 'fade';
}

const boxOf = (el: Element | null | undefined): Box | null => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
};

/**
 * The window's exact size in CSS px: the page lays out from 100vw / 100vh, which are fractional at the Ally's pixel
 * ratio (466.38, where innerHeight says 466), so the targets must be too. innerWidth / innerHeight without a viewport.
 */
export function viewportSize(win: { innerWidth: number; innerHeight: number; visualViewport?: { width: number; height: number } | null }): { width: number; height: number } {
    const v = win.visualViewport;
    return v && v.width > 0 && v.height > 0 ? { width: v.width, height: v.height } : { width: win.innerWidth, height: win.innerHeight };
}

/** The page's stat columns (Play time, Achievements, HowLongToBeat Main) Home showed no chip for, by Home's chip keys. Pure. */
export function missingStats(chipKeys: string[], drawn = ''): string[] {
    const extras = drawn.split(/\s+/);
    return ['played', 'achievements', 'hltb'].filter((key) => !chipKeys.includes(key) && !extras.includes(key));
}

/** Home's boxes for openMotion (CSS px), or null when anything required is missing (no game selected, nothing laid out). */
export function measureHome(root: Element | null): HomeRects | null {
    try {
        if (!root) return null;
        const canvas = boxOf(root.querySelector('.gh-canvas'));
        const titleSlot = boxOf(root.querySelector('.gh-title-slot'));
        const eyebrow = boxOf(root.querySelector('.gh-eyebrow'));
        const play = boxOf(root.querySelector('.gh-actions .gh-btn[data-action="play"]'));
        if (!canvas || !titleSlot || !eyebrow || !play) return null;
        const circleEls = [...root.querySelectorAll('.gh-actions .gh-btn-circle')];
        const info = circleEls.findIndex((c) => c.getAttribute('data-action') === 'info');
        const chips = [...root.querySelectorAll('.gh-chip')].map((chip) => ({
            key: chip.getAttribute('data-chip') ?? '',
            shell: boxOf(chip)!,
            label: boxOf(chip.querySelector('.gh-chip-label'))!,
            value: boxOf(chip.querySelector('.gh-chip-value'))!,
            bar: boxOf(chip.querySelector('.gh-chip-bar')),
        })).filter((c) => c.label && c.value);
        return {
            root: boxOf(root) ?? undefined,
            canvas,
            titleSlot,
            titleText: root.querySelector('.gh-title-slot .gh-title') !== null,
            eyebrow,
            play,
            circles: circleEls.map((c) => boxOf(c)!),
            infoCircle: info >= 0 ? info : null,
            store: boxOf(root.querySelector('.gh-source')),
            chips,
        };
    } catch {
        return null;
    }
}

/**
 * Puts Home in its opening state: the variables, `data-gh-opening` = variant and the start frame (`data-gh-phase`
 * "from": the glass panels appear on the chips), then on the next frame the motion ("to"). `heroUrl`: the opened
 * game's hero for heroFade. Returns the undo (a cancel before the hand-over): every variable and attribute goes, and
 * the pending frame does nothing.
 */
export function applyOpening(root: HTMLElement, variant: OpenVariant, vars: MotionVar[], heroUrl: string | null, extras = ''): () => void {
    const names: string[] = [];
    const set = (name: string, value: string) => {
        root.style.setProperty(name, value);
        names.push(name);
    };
    for (const v of vars) set(v.name, v.value);
    if (heroUrl) set('--gho-hero', `url("${heroUrl.replace(/"/g, '%22')}")`);
    const shells = vars.find((v) => v.name === '--gho-shell-count')?.value;
    if (shells) root.setAttribute('data-gh-shells', shells);
    // The page's parts Home draws as it turns into it (extrasParts): homeCss shows only those.
    if (extras) root.setAttribute('data-gh-extras', extras);
    root.setAttribute('data-gh-opening', variant);
    root.setAttribute('data-gh-phase', 'from');
    let live = true;
    const start = () => {
        if (live) root.setAttribute('data-gh-phase', 'to');
    };
    const view = root.ownerDocument?.defaultView;
    if (view?.requestAnimationFrame) view.requestAnimationFrame(start);
    else start();
    return () => {
        live = false;
        for (const name of names) root.style.removeProperty(name);
        for (const attr of ['data-gh-opening', 'data-gh-phase', 'data-gh-shells', 'data-gh-extras']) root.removeAttribute(attr);
    };
}

/**
 * The page's text widths, measured with a 2D canvas in Home's document and font (the page uses Steam's font too):
 * labels in capitals with their 0.18em letter spacing, values bold. 0 when nothing can be measured (the layout then
 * uses its bars and other columns).
 */
export function canvasMeasure(root: Element): Measure {
    let ctx: CanvasRenderingContext2D | null = null;
    let family = 'sans-serif';
    try {
        const doc = root.ownerDocument;
        ctx = doc.createElement('canvas').getContext('2d');
        family = doc.defaultView?.getComputedStyle(root).fontFamily || family;
    } catch {
        ctx = null;
    }
    return (text, role, fontPx) => {
        if (!ctx) return 0;
        const label = role === 'label';
        ctx.font = `700 ${fontPx}px ${family}`;
        const shown = label ? text.toUpperCase() : text;
        return ctx.measureText(shown).width + (label ? shown.length * 0.18 * fontPx : 0);
    };
}

/** A chip as Home shows it (its key, texts, and whether it has a progress bar). */
export interface ChipText { key: string; label: string; value: string; bar: boolean }

/**
 * The page's stat columns, as Home can know them from its chips (the same Steam words and numbers): Spotlight calls
 * HowLongToBeat's column "Main"; Clean keeps Home's texts and bars. A new
 * game's Added chip stands for the page's Play time of 0 h. Only these three; a Unifideck size column is not known
 * here (its column then makes the page's others sit a little further right, which the hand-over's fade covers). Pure.
 */
/** `size`: a Unifideck game's size column as Home draws it (OpenExtras), right after Played as on the page. */
export function pageStatsFromChips(chips: ChipText[], look: PageLook, size?: { label: string; value: string } | null): PageStat[] {
    const byKey = new Map(chips.map((c) => [c.key, c]));
    const out: PageStat[] = [];
    const played = byKey.get('played');
    if (played) out.push({ key: 'played', label: played.label, value: played.value, bar: look === 'clean' && played.bar });
    else if (byKey.has('added')) out.push({ key: 'played', label: tr('played'), value: '0 h', bar: false });
    // The size item: a Unifideck game's (passed in), else Home's chip for a Steam game's Space Required (the same item).
    const sized = size ?? (byKey.has('size') ? { label: byKey.get('size')!.label, value: byKey.get('size')!.value } : null);
    if (sized) out.push({ key: 'size', label: sized.label, value: sized.value, bar: false });
    const add = (key: StatKey, label: string, value: string, bar: boolean) => out.push({ key, label, value, bar: look === 'clean' && bar });
    const ach = byKey.get('achievements');
    if (ach) add('achievements', ach.label, ach.value, ach.bar);
    const hltb = byKey.get('hltb');
    if (hltb) add('hltb', look === 'spotlight' ? 'Main' : hltb.label, hltb.value, hltb.bar);
    return out;
}

/** The Unifideck size column Home drew in its extras layer (OpenExtras), or null. */
export function readExtrasSize(root: Element): { label: string; value: string } | null {
    const column = root.querySelector('.gh-open-extras .gh-x-size');
    const label = column?.querySelector('.gh-x-label')?.textContent?.trim() ?? '';
    const value = column?.querySelector('.gh-x-value')?.textContent?.trim() ?? '';
    return label && value ? { label, value } : null;
}

/** Home's chips as shown (data-chip, label, value, bar), for pageStatsFromChips. */
export function readChipTexts(root: Element): ChipText[] {
    return [...root.querySelectorAll('.gh-chip')].map((chip) => ({
        key: chip.getAttribute('data-chip') ?? '',
        label: chip.querySelector('.gh-chip-label')?.textContent?.trim() ?? '',
        value: chip.querySelector('.gh-chip-value')?.textContent?.trim() ?? '',
        bar: chip.querySelector('.gh-chip-bar') !== null,
    }));
}

/**
 * The page's parts Home can draw as it turns into the page's Spotlight look (SpotlightHome's .gh-open-extras), as
 * data-gh-extras words: `desc` when it has the description's text, `hltb` when HowLongToBeat found the game with a Main
 * time (without one the page writes "—" there, which Home's chip would not cover), `pills` when it knows the store (the
 * page's own store pill, and family pill, drawn at the page's size: Home's scaled one is a little narrower), `played` when
 * Home shows no Play time chip (a new game's Added chip): the page's Play time column, so it is there at the hand-over. Pure.
 */
export function extrasParts(description: string | null | undefined, hltb: HltbResult | undefined, source?: string | null, playedMissing = false, size = false): string {
    const parts: string[] = [];
    if (description && description.trim()) parts.push('desc');
    if (hltb?.status === 'found' && hltb.times.main !== null) parts.push('hltb');
    if (source) parts.push('pills');
    if (playedMissing) parts.push('played');
    if (size) parts.push('size');
    return parts.join(' ');
}

/** The open intent's flags for the parts Home drew (extrasParts words): the page shows those at once. */
export function extrasFlags(parts: string, chipKeys: string[] = []): { homeDesc?: true; homeHltb?: true; homeSize?: true } {
    const words = parts.split(/\s+/);
    // A size Home drew in its extras (Unifideck's), or as a chip (a Steam game's Space Required): the page's arrives at once.
    const sized = words.includes('size') || chipKeys.includes('size');
    return {
        ...(words.includes('desc') ? { homeDesc: true as const } : {}),
        ...(words.includes('hltb') ? { homeHltb: true as const } : {}),
        ...(sized ? { homeSize: true as const } : {}),
    };
}

/** What the extras layer holds, for openTargets: its HowLongToBeat columns after Main, and whether it has a bar. */
export function readExtrasAsked(root: Element): ExtrasAsked {
    const keys: ExtraColumn['key'][] = ['mainExtras', 'completionist'];
    const columns = [...root.querySelectorAll('.gh-open-extras .gh-x-stats > div')].slice(1, 3).map((column, i) => ({
        key: keys[i],
        label: column.querySelector('.gh-x-label')?.textContent?.trim() ?? '',
        value: column.querySelector('.gh-x-value')?.textContent?.trim() ?? '',
    }));
    return { columns, bar: root.querySelector('.gh-open-extras .gh-x-bar') !== null };
}
