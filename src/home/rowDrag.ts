/**
 * Touch on Home's rows (the games row, the feed rows): the maths behind a drag. A tap is the browser's own click (a
 * finger that moves past Chromium's touch slop never makes one); a sideways drag steps the selection like a held stick,
 * one card per card pitch the finger moves (useRowDrag), and a vertical one raises or lowers the feed sheet. All
 * distances are logical px (Home's canvas), velocities logical px per ms. Pure.
 */
export type Axis = 'x' | 'y';

/** How far a finger moves before the drag picks an axis. */
export const DRAG_SLOP = 10;
/** A vertical swipe this long raises the feed sheet (up) or lowers it (down). */
export const SWIPE_SHEET = 60;
/** The slowest release that still flicks on. */
export const FLICK_MIN = 0.5;
/** A flick's slow-down: its speed falls by e every GLIDE_MS, so it runs on about speed x GLIDE_MS px in all. */
export const GLIDE_MS = 400;
/** Below this speed (px/ms) a glide has come to rest. */
const GLIDE_STOP = 0.05;
/**
 * A flick's bounce at a row's end: it peaks about this long after hitting the end and is handed back just past the peak
 * (1.5 x this), the row's own settle transition easing it home while the run ends and the card widens.
 */
export const BOUNCE_MS = 45;

/** The axis a drag moves along, once it has passed `slop`; null before. A tie goes to the row (x). */
export function axisLock(dx: number, dy: number, slop = DRAG_SLOP): Axis | null {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < slop) return null;
    return Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
}

/** Whole cards to move for a drag of `dx`, to the nearest card: a finger moving left (dx < 0) selects later cards. */
export function dragSteps(dx: number, step: number): number {
    if (step <= 0) return 0;
    const steps = Math.round(-dx / step);
    return steps === 0 ? 0 : steps; // never -0
}

/** The card `steps` from `start`, clamped to the games and the Library card (0..count); a drag never wraps. */
export function dragTarget(start: number, steps: number, count: number): { index: number; overscroll: number } {
    const wanted = start + steps;
    const index = Math.min(Math.max(wanted, 0), Math.max(count, 0));
    const overscroll = wanted - index;
    return { index, overscroll: overscroll === 0 ? 0 : overscroll };
}

export interface Sample {
    t: number;
    x: number;
}

/** The finger's speed at release: a least-squares slope over the samples of the last `windowMs`; 0 without two. */
export function releaseVelocity(samples: Sample[], windowMs = 100): number {
    if (samples.length < 2) return 0;
    const last = samples[samples.length - 1].t;
    const recent = samples.filter((s) => last - s.t <= windowMs);
    if (recent.length < 2) return 0;
    const n = recent.length;
    const mt = recent.reduce((sum, s) => sum + s.t, 0) / n;
    const mx = recent.reduce((sum, s) => sum + s.x, 0) / n;
    let num = 0;
    let den = 0;
    for (const s of recent) {
        num += (s.t - mt) * (s.x - mx);
        den += (s.t - mt) ** 2;
    }
    return den === 0 ? 0 : num / den;
}

/**
 * A flick `t` ms after release: how much further the row has moved (`dx`, the release speed's sign) as it slows down
 * smoothly, and whether it has come to rest. Too slow a release (below FLICK_MIN) doesn't glide at all.
 */
export function glide(velocity: number, t: number): { dx: number; done: boolean } {
    if (Math.abs(velocity) < FLICK_MIN) return { dx: 0, done: true };
    const fade = Math.exp(-Math.max(0, t) / GLIDE_MS);
    return { dx: velocity * GLIDE_MS * (1 - fade), done: Math.abs(velocity) * fade < GLIDE_STOP };
}

/** How far the row gives past its ends for an overscroll of `overscroll` px: ever slower, never reaching `limit`. */
export function rubberBand(overscroll: number, limit: number): number {
    if (overscroll === 0 || limit <= 0) return 0;
    return Math.sign(overscroll) * limit * (1 - 1 / (1 + Math.abs(overscroll) / limit));
}

/**
 * A drag of `dx` from card `start`: the card under the finger, and the row's offset from that card's own place, the part
 * of a card the finger has moved beyond it (rubber-banded past the first and last card). The layout puts the selected
 * card in place, the offset follows the finger from there, so a release only settles that remainder (in Steam's row
 * style, which only scrolls once the selection passes the middle, the cards don't spring back).
 */
export function dragView(dx: number, start: number, count: number, step: number): { index: number; offset: number } {
    const { index } = dragTarget(start, dragSteps(dx, step), count);
    const rest = dx + (index - start) * step;
    const outward = (index >= count && rest < 0) || (index <= 0 && rest > 0);
    const offset = outward ? rubberBand(rest, step * 0.5) : rest;
    return { index, offset: offset === 0 ? 0 : offset };
}

/**
 * A flick that runs into a row's end `t` ms ago, at `velocity`, with the row `from` px off the end card: it carries on
 * past the end a little (rubber-banded, never `limit`) and springs back towards it, the run held until it is `done`.
 */
export function edgeBounce(from: number, velocity: number, t: number, limit: number): { offset: number; done: boolean } {
    const time = Math.max(0, t);
    const raw = (from + velocity * time) * Math.exp(-time / BOUNCE_MS);
    const offset = Math.sign(raw) === Math.sign(velocity) ? rubberBand(raw, limit) : raw;
    return { offset: offset === 0 ? 0 : offset, done: time >= BOUNCE_MS * 1.5 };
}

/**
 * A flick from the last card (the Library card) on outward, past the end (finger moving left): the row wraps back to
 * the first game, as Right does there. Only the end wraps; a drag never does.
 */
export function flickWraps(index: number, count: number, velocity: number): boolean {
    return count > 0 && index >= count && velocity <= -FLICK_MIN;
}

/** A finished swipe of (dx, dy) on Home: a vertical one of SWIPE_SHEET or more raises the sheet (up) or lowers it (down). */
export function sheetSwipe(dx: number, dy: number, sheetUp: boolean): 'raise' | 'lower' | null {
    if (axisLock(dx, dy) !== 'y' || Math.abs(dy) < SWIPE_SHEET) return null;
    if (dy < 0) return sheetUp ? null : 'raise';
    return sheetUp ? 'lower' : null;
}

/** A tap on card `index` with `focused` selected: the selected card opens, any other is selected. */
export function cardTap(index: number, focused: number): 'select' | 'open' {
    return index === focused ? 'open' : 'select';
}
