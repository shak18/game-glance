/**
 * A mouse on Home: the wheel steps through a row one card at a time, like Left/Right, and the card under the cursor is
 * lit (hover). Wheel distances are px as the browser reports them (a notch is 53 px in Steam's Chromium on Linux, 100 on
 * some setups; a trackpad sends many small deltas). Pure.
 */

/** A wheel's movement that makes one step: less than any notch, so each notch is one card. */
export const WHEEL_STEP = 40;
/** A part-step left this long is forgotten: the next scroll starts afresh. */
export const WHEEL_IDLE_MS = 250;
/** Px per line and per page, for a wheel that reports lines or pages (deltaMode 1, 2). */
const LINE_PX = WHEEL_STEP;
const PAGE_PX = WHEEL_STEP * 10;

export interface WheelState {
    /** The part-step added up so far (signed px). */
    acc: number;
    /** When it last moved (ms). */
    t: number;
}

/** A wheel event's movement in px along its stronger axis (a sideways scroll counts: right = on, as down). */
export function wheelPx(deltaX: number, deltaY: number, deltaMode: number): number {
    const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    const px = deltaMode === 1 ? delta * LINE_PX : deltaMode === 2 ? delta * PAGE_PX : delta;
    return px === 0 ? 0 : px;
}

/**
 * A wheel movement of `px` at `now`: one step on (+1, the next card) or back (-1) once WHEEL_STEP px are in, or none.
 * A notch (however many px) is one step; small deltas add up. A pause or a change of direction drops the part-step, and
 * so does a step (a big notch never counts twice).
 */
export function wheelStep(state: WheelState, px: number, now: number): { steps: -1 | 0 | 1; state: WheelState } {
    if (px === 0) return { steps: 0, state };
    const fresh = now - state.t > WHEEL_IDLE_MS || Math.sign(state.acc) === -Math.sign(px);
    const acc = (fresh ? 0 : state.acc) + px;
    if (Math.abs(acc) >= WHEEL_STEP) return { steps: acc > 0 ? 1 : -1, state: { acc: 0, t: now } };
    return { steps: 0, state: { acc, t: now } };
}

/** The card a wheel step of `steps` selects from `index`, in 0..last: the wheel stops at the ends, never wrapping. */
export function rowWheelTarget(index: number, steps: number, last: number): number {
    return Math.min(Math.max(index + steps, 0), Math.max(last, 0));
}

/** The card a pointer lights: `key` (the card under it) for a mouse with no button held; null for a finger or a drag. */
export function hoverKey(pointerType: string, buttons: number, key: string | null): string | null {
    return pointerType === 'mouse' && buttons === 0 ? key : null;
}
