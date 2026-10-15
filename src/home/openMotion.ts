import { PAGE_LAYOUT, pillFocusScale } from '../styles/themeCss';
import { HOME_PILL, TITLE_BLOCK } from './homeCss';
import type { Box, PageLook, PageTargets, StatKey } from './openTargets';

/**
 * The open transition's morph as data: from Spotlight Home's measured boxes and the page's targets (openTargets), the
 * transform of every moving element, as CSS custom properties set on `.gh-root` (homeCss reads them while
 * `data-gh-opening` is set). Transforms are in Home's canvas px (`.gh-canvas` is scaled by `canvasScale`) with
 * `transform-origin: 0 0`, and only translate and scale, so the morph never lays anything out.
 *
 * Shells (Michael's choice on the device, 2026-10-09): one glass panel per page card (Spotlight: the info and
 * HowLongToBeat cards; Clean: the panel), drawn at the card itself and scaled down onto the chips that merge into it,
 * so it ends unscaled, exactly the card's size. A card no chip merges into fades in where it is. Pure.
 */

export interface HomeRects {
    /** `.gh-root` on screen: the extras layer (not scaled) is placed in its px. Absent: at the window's origin. */
    root?: Box;
    /** `.gh-canvas` on screen (its origin; Home's canvas px start there). */
    canvas: Box;
    titleSlot: Box;
    /** The title is text (not a logo): it grows from Home's type size to the page's (a logo is the same size on both). */
    titleText?: boolean;
    eyebrow: Box;
    play: Box;
    circles: Box[];
    /** Index in `circles` of the info button (the page has none: it fades), or null. */
    infoCircle: number | null;
    store: Box | null;
    chips: Array<{ key: string; shell: Box; label: Box; value: Box; bar: Box | null }>;
}
export interface MotionVar { name: string; value: string }

/** Home's chip type sizes in canvas px (homeCss: .gh-chip-label, .gh-chip-value). */
export const HOME_CHIP_FONTS = { label: 10, value: 20 } as const;
/** Line heights: Home's chip labels 1.2; the page's labels 1.5 (values are 1.2 on both). */
const HOME_LABEL_LINE = 1.2;
const PAGE_LABEL_LINE = 1.5;

const px = (n: number) => `${Math.round(n * 100) / 100}px`;
const k = (n: number) => `${Math.round(n * 10000) / 10000}`;
const translate = (x: number, y: number) => `translate(${px(x)}, ${px(y)})`;
/** Maps box `from` onto box `to` (origin 0 0), in canvas px. */
const mapBox = (from: Box, to: Box, s: number, uniform = false) =>
    `${translate((to.x - from.x) / s, (to.y - from.y) / s)} scale(${uniform ? k(to.w / from.w) : `${k(to.w / from.w)}, ${k(to.h / from.h)}`})`;

const union = (boxes: Box[]): Box => {
    const x = Math.min(...boxes.map((b) => b.x));
    const y = Math.min(...boxes.map((b) => b.y));
    return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
};

const isStat = (key: string, page: PageTargets): key is StatKey => Object.prototype.hasOwnProperty.call(page.stats, key);

export function openMotion(home: HomeRects, page: PageTargets, look: PageLook, canvasScale: number): MotionVar[] {
    const s = canvasScale;
    // Home's canvas and the page share one scale rule (home/scale.ts, themeCss --gg-d), so the page's d unit is s.
    const d = s;
    const out: Record<string, string> = {};

    // From the top-left origin, scaled by k: the title's bottom ends at y + h * k, which must be the page's bottom.
    const tk = home.titleText ? PAGE_LAYOUT.titleBlock.title / TITLE_BLOCK.titleSize : 1;
    const titleMove = translate((page.titleBottomLeft.x - home.titleSlot.x) / s, (page.titleBottomLeft.y - (home.titleSlot.y + home.titleSlot.h * tk)) / s);
    out['--gho-title'] = tk === 1 ? titleMove : `${titleMove} scale(${k(tk)})`;
    out['--gho-eyebrow'] = translate((page.eyebrowBottomLeft.x - home.eyebrow.x) / s, (page.eyebrowBottomLeft.y - (home.eyebrow.y + home.eyebrow.h)) / s);

    // The page focuses its Play on arrival, and a focused Play grows about its centre (as Home's): the morph lands on it.
    // (A focused pill grows by what a circle grows: 4% taller, as much wider in px; themeCss.pillFocusScale.)
    const pf = pillFocusScale(PAGE_LAYOUT.playW, PAGE_LAYOUT.icon);
    const to: Box = { x: page.play.x - (page.play.w * (pf.x - 1)) / 2, y: page.play.y - (page.play.h * (pf.y - 1)) / 2, w: page.play.w * pf.x, h: page.play.h * pf.y };
    // The pill itself only moves (by its left edge and centre line); its background layer, inside it, grows to the page
    // pill's size about that centre line, so the label never stretches.
    out['--gho-play-bg'] = `${translate(0, (home.play.h - to.h) / 2 / s)} scale(${k(to.w / home.play.w)}, ${k(to.h / home.play.h)})`;
    // The page pill's exact box in the pill's own px (its round ends: the stretched layer's are oval), for the settle.
    out['--gho-play-sx'] = k(to.w / home.play.w);
    out['--gho-play-sy'] = k(to.h / home.play.h);
    out['--gho-play-dy'] = px((home.play.h - to.h) / 2 / s);
    out['--gho-play-fg'] = translate((to.x - home.play.x) / s, (to.y + to.h / 2 - (home.play.y + home.play.h / 2)) / s);
    // Inside it (origin: its left edge and centre line), the glyph and the label grow to the page's and move to its insets
    // (scaled with the focused pill).
    const pill = PAGE_LAYOUT.pill;
    // (Home's sit inside its 1 px border; the page's pill has none.)
    const homeInset = HOME_PILL.border + HOME_PILL.padX;
    out['--gho-play-icon'] = `${translate(pill.padX * pf.x - homeInset, 0)} scale(${k((pill.icon * pf.x) / HOME_PILL.icon)}, ${k((pill.icon * pf.y) / HOME_PILL.icon)})`;
    out['--gho-play-label'] = `${translate((pill.padX + pill.icon + pill.iconGap) * pf.x - (homeInset + HOME_PILL.icon + HOME_PILL.gap), 0)} scale(${k((pill.font * pf.x) / HOME_PILL.font)}, ${k((pill.font * pf.y) / HOME_PILL.font)})`;
    // A game on more than one device: Home's "Play from" segment, at the pill's right end (origin: its right edge and
    // centre line), moves with the pill's growth and grows onto the page's segment (its width, the page pill's height).
    out['--gho-play-arrow'] = `${translate((to.w - home.play.w) / s, 0)} scale(${k((PAGE_LAYOUT.playArrow.w * pf.x) / HOME_PILL.arrow)}, ${k(to.h / home.play.h)})`;
    let slot = 0;
    home.circles.forEach((circle, i) => {
        if (i === home.infoCircle) return;
        const to = page.circles[slot++];
        if (!to) return;
        out[`--gho-circle-${i}`] = mapBox(circle, to, s, true);
        // Its icon is already the page's size (homeCss): it shrinks as the circle grows, to stay that size.
        out[`--gho-circle-icon-${i}`] = `scale(${k(circle.w / to.w)})`;
    });
    if (home.store) out['--gho-store'] = translate((page.store.x - home.store.x) / s, (page.store.y - home.store.y) / s);

    const labelScale = PAGE_LAYOUT.stats.label / HOME_CHIP_FONTS.label;
    const valueScale = (look === 'clean' ? PAGE_LAYOUT.cleanInfo.value : PAGE_LAYOUT.stats.value) / HOME_CHIP_FONTS.value;
    // The page's labels have more leading: their glyphs sit this much lower in their box than Home's do in theirs.
    const labelLead = ((PAGE_LABEL_LINE - HOME_LABEL_LINE) / 2) * PAGE_LAYOUT.stats.label * d;
    const shellOf = (key: StatKey) => (look === 'spotlight' && key === 'hltb' ? 1 : 0);
    const sources: Box[][] = page.shells.map(() => []);
    home.chips.forEach((chip, i) => {
        if (!isStat(chip.key, page)) {
            out[`--gho-chip-${i}-o`] = '0';
            return;
        }
        const to = page.stats[chip.key]!;
        out[`--gho-chip-${i}-o`] = '1';
        // Spotlight's HowLongToBeat card names its column "Main" under its own title (it arrives with the card) and draws
        // the time in the accent: Home's "HLTB main" fades as it moves, and an accent copy of the time fades in.
        if (look === 'spotlight' && chip.key === 'hltb') {
            out[`--gho-chip-${i}-label-o`] = '0';
            out[`--gho-chip-${i}-accent`] = '1';
        }
        out[`--gho-chip-${i}-label`] = `${translate((to.label.x - chip.label.x) / s, (to.label.y + labelLead - chip.label.y) / s)} scale(${k(labelScale)})`;
        out[`--gho-chip-${i}-value`] = `${translate((to.value.x - chip.value.x) / s, (to.value.y - chip.value.y) / s)} scale(${k(valueScale)})`;
        // Clean: the chip's bar becomes the panel's (same track, fill and share), instead of one fading out and the other in.
        if (chip.bar && to.bar) {
            out[`--gho-chip-${i}-bar`] = mapBox(chip.bar, to.bar, s);
            out[`--gho-chip-${i}-bar-o`] = '1';
        }
        sources[shellOf(chip.key)]?.push(chip.shell);
    });

    page.shells.forEach((shell, i) => {
        out[`--gho-shell-${i}-x`] = k((shell.x - home.canvas.x) / s);
        out[`--gho-shell-${i}-y`] = k((shell.y - home.canvas.y) / s);
        out[`--gho-shell-${i}-w`] = k(shell.w / s);
        out[`--gho-shell-${i}-h`] = k(shell.h / s);
        const from = sources[i].length > 0 ? union(sources[i]) : null;
        out[`--gho-shell-${i}-from`] = from ? mapBox(shell, from, s) : `${translate(0, 0)} scale(1, 1)`;
        out[`--gho-shell-${i}-o0`] = from ? '1' : '0';
    });
    out['--gho-shell-count'] = String(page.shells.length);

    // The extras layer: the page's parts drawn at the page's size in the root's px (outside the scaled canvas), laid out
    // as the page lays them out, from the d unit: the store pill (by its right edge and top, both looks) and, Spotlight,
    // the description and the HowLongToBeat card's inside (by their top-left corners).
    const ox = home.root?.x ?? 0;
    const oy = home.root?.y ?? 0;
    out['--gho-x-d'] = k(d);
    out['--gho-x-pill-x'] = px(page.store.x + page.store.w - ox);
    out['--gho-x-pill-y'] = px(page.store.y - oy);
    // The Play time column (a new game's: Home shows its Added chip instead), by its top-left corner, in the look's value size.
    // A Unifideck game's size column (right after Played), likewise.
    const size = page.stats.size;
    if (size) {
        out['--gho-x-size-x'] = px(size.label.x - ox);
        out['--gho-x-size-y'] = px(size.label.y - oy);
        out['--gho-x-size-font'] = px((look === 'clean' ? PAGE_LAYOUT.cleanInfo.value : PAGE_LAYOUT.stats.value) * d);
    }
    const played = page.stats.played;
    if (played) {
        out['--gho-x-played-x'] = px(played.label.x - ox);
        out['--gho-x-played-y'] = px(played.label.y - oy);
        out['--gho-x-played-font'] = px((look === 'clean' ? PAGE_LAYOUT.cleanInfo.value : PAGE_LAYOUT.stats.value) * d);
    }
    if (page.extras) {
        const at = (name: string, b: Box) => {
            out[`--gho-x-${name}-x`] = px(b.x - ox);
            out[`--gho-x-${name}-y`] = px(b.y - oy);
            out[`--gho-x-${name}-w`] = px(b.w);
        };
        at('desc', page.extras.desc);
        at('hltb', page.extras.hltbTitle);
    }

    return Object.keys(out).sort().map((name) => ({ name, value: out[name] }));
}
