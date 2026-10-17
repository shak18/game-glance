/**
 * The screensaver's slides on screen: the current one and, during a crossfade, the one leaving, drawn on top of it and
 * fading out (Steam's own slideshow does the same). Pure.
 */
export interface SlideStack<S extends { id: number }> {
    current: S | null;
    leaving: S | null;
}

export type SlidePhase = 'first' | 'entering' | 'leaving' | 'shown';

export const EMPTY_STACK: SlideStack<never> = { current: null, leaving: null };

/** A new slide arrives: the current one starts leaving (one still leaving from before is dropped). */
export function nextSlides<S extends { id: number }>(stack: SlideStack<S>, slide: S): SlideStack<S> {
    return { current: slide, leaving: stack.current };
}

/** The crossfade to `id` is over: the leaving slide goes. A later slide's crossfade is left alone. */
export function settledSlides<S extends { id: number }>(stack: SlideStack<S>, id: number): SlideStack<S> {
    return stack.current?.id === id && stack.leaving ? { ...stack, leaving: null } : stack;
}

/**
 * What to draw, bottom first: the current slide (`first` for the screensaver's first, fading in from black; `entering`
 * while one leaves over it; else `shown`), then the leaving one on top.
 */
export function slideLayers<S extends { id: number }>(stack: SlideStack<S>, firstId = 1): Array<{ slide: S; phase: SlidePhase }> {
    const layers: Array<{ slide: S; phase: SlidePhase }> = [];
    if (stack.current) layers.push({ slide: stack.current, phase: stack.leaving ? 'entering' : stack.current.id === firstId ? 'first' : 'shown' });
    if (stack.leaving) layers.push({ slide: stack.leaving, phase: 'leaving' });
    return layers;
}

/** How many of the next games are loaded at once when choosing the next slide, and how many ahead while one shows. */
export const PICK_AHEAD = 3;
export const PRELOAD_AHEAD = 2;

/** The next `count` indexes after `index` in a list of `length`, wrapping, without repeats or `index` itself (unless it is the only one). */
export function nextIndexes(index: number, length: number, count: number): number[] {
    const out: number[] = [];
    if (!(length > 0)) return out;
    for (let step = 1; step <= Math.min(count, Math.max(1, length - 1)); step++) out.push((((index + step) % length) + length) % length);
    return out;
}

/**
 * The first of `attempts` to settle with a value (in time, not in order), or null once all have given null or failed: a
 * game whose art is slow to load (not installed, so its files come from Steam's servers) no longer holds up the others.
 */
export function firstSettled<T>(attempts: Array<Promise<T | null>>): Promise<T | null> {
    if (attempts.length === 0) return Promise.resolve(null);
    return new Promise((resolve) => {
        let left = attempts.length;
        const miss = () => {
            if (--left === 0) resolve(null);
        };
        for (const attempt of attempts) attempt.then((value) => (value === null ? miss() : resolve(value)), miss);
    });
}
