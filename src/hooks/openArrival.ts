import { OPEN_TIMINGS } from '../home/motion';
import { ARRIVE_BLUR_MS } from '../styles/themeCss';

/**
 * The game page's arrival after Spotlight Home's open transition, as a controller with its clocks injected (the hook
 * useOpenArrival runs it once per page, so a phase change can never cancel its timers). Until the page is ready
 * (checked every frame) it stays hidden; then it reports it, waits OPEN_TIMINGS.revealDelay, reveals, and is done once
 * the hold is over. A page not ready within OPEN_TIMINGS.readyCap is revealed anyway. Pure.
 */

export type ArrivalPhase = 'hidden' | 'revealing' | 'done';

/**
 * How long the page stays in its arriving state once revealed: until its new parts have faded in and its glass has
 * grown its blur (the stylesheet carries that transition; dropping it mid-way would cancel it, the blur jumping in).
 */
export function arrivalHoldMs(): number {
    return Math.max(OPEN_TIMINGS.reveal, ARRIVE_BLUR_MS);
}

export interface ArrivalDeps {
    ready(): boolean;
    now(): number;
    frame(cb: () => void): unknown;
    cancelFrame(id: unknown): void;
    setTimer(cb: () => void, ms: number): unknown;
    clearTimer(id: unknown): void;
    /** The page is ready (Home lets its copy fade). */
    onReady(): void;
    onPhase(phase: ArrivalPhase): void;
}

/** Starts the arrival; returns the stop (the page left): nothing more happens after it. */
export function runArrival(deps: ArrivalDeps): () => void {
    const started = deps.now();
    let alive = true;
    let frame: unknown = null;
    let timer: unknown = null;
    const later = (cb: () => void, ms: number) => {
        timer = deps.setTimer(() => alive && cb(), ms);
    };
    const reveal = () => {
        deps.onPhase('revealing');
        later(() => deps.onPhase('done'), arrivalHoldMs());
    };
    const check = () => {
        if (!alive) return;
        if (deps.ready()) {
            deps.onReady();
            later(reveal, OPEN_TIMINGS.revealDelay);
            return;
        }
        if (deps.now() - started >= OPEN_TIMINGS.readyCap) return reveal();
        frame = deps.frame(check);
    };
    check();
    return () => {
        alive = false;
        if (frame !== null) deps.cancelFrame(frame);
        if (timer !== null) deps.clearTimer(timer);
    };
}
