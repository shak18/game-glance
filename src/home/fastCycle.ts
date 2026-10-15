import { useEffect, useState } from 'react';
import { BUMPER_REPEAT_MS } from './focusZones';
import { SETTLE_WIDEN_MS } from './motion';

export { SETTLE_WIDEN_MS };

/**
 * Fast cycling (a quick run of L1/R1 or Left/Right through the games). The first step from rest is shown at once; a step
 * that follows the last one within FAST_CYCLE_MS starts a run, during which the screen holds what it showed (hero art,
 * accent, the wide card) and only the selection moves along the narrow cards. FAST_CYCLE_MS after the last step the run
 * ends: the selected card widens first, alone and quickly (SETTLE_WIDEN_MS), then the hero, accent and logo follow. Each shown game otherwise cost a restyle of the whole of Home (the accent) and its
 * images' decodes on every step (probed on the Ally: 20-60 ms a step, freezes of up to 600 ms).
 */

/** Longer than a held bumper's repeat (170 ms), so holding L1/R1 is one run; a run ends this long after its last step. */
export const FAST_CYCLE_MS = Math.max(200, BUMPER_REPEAT_MS + 30);

/** A held button let go (Home knows it was held: no guessing): the card widens this soon. */
export const RELEASE_WIDEN_MS = 80;

/** At rest; in a run (narrow cards, the screen holds); or the run's card widening (the screen still holds). */
export type CyclePhase = 'rest' | 'run' | 'widen';

export interface CycleState {
    /** The selection the screen shows. */
    shown: number;
    /** The selection itself (where the last step went). */
    at: number;
    /** When the selection last changed (ms). */
    last: number;
    phase: CyclePhase;
    /** The last step was a held button's repeat: the run ends when it is let go. */
    held: boolean;
}

export function startCycle(index: number, now: number): CycleState {
    return { shown: index, at: index, last: now, phase: 'rest', held: false };
}

/**
 * The state after the selection becomes `index` at `now`; the same state when it already is. `held`: the step is a held
 * button's repeat (useBumperSelect), always part of a run however long after the last step it came. Pure.
 */
export function stepCycle(state: CycleState, index: number, now: number, held = false): CycleState {
    if (index === state.at) return state;
    if (held || (state.phase !== 'widen' && now - state.last < FAST_CYCLE_MS)) return { shown: state.shown, at: index, last: now, phase: 'run', held };
    return { shown: index, at: index, last: now, phase: 'rest', held: false };
}

/**
 * How long until the next phase: a run of taps widens FAST_CYCLE_MS after its last step; a held run never while the
 * button is `holding`, and RELEASE_WIDEN_MS after it is let go; a widening card shows the game SETTLE_WIDEN_MS later.
 * null: nothing to wait for. Pure.
 */
export function widenDelay(state: CycleState, holding: boolean): number | null {
    if (state.phase === 'widen') return SETTLE_WIDEN_MS;
    if (state.phase !== 'run') return null;
    if (state.held) return holding ? null : RELEASE_WIDEN_MS;
    return FAST_CYCLE_MS;
}

/** A run's wait is over: the selected card widens, the screen still holds. Pure. */
export function widenCycle(state: CycleState): CycleState {
    return state.phase === 'run' ? { ...state, phase: 'widen' } : state;
}

/** The screen shows the selection (the card has widened, or something needs it now: opening the game). Pure. */
export function settleCycle(state: CycleState): CycleState {
    return state.phase !== 'rest' || state.shown !== state.at ? { ...state, shown: state.at, phase: 'rest' } : state;
}

/** What a phase means on screen: narrow cards (no wide card), and the screen holding the game it showed. */
export function cycleView(phase: CyclePhase): { narrow: boolean; holding: boolean } {
    return { narrow: phase === 'run', holding: phase !== 'rest' };
}

/**
 * `repeating`: a held button is repeating (useBumperSelect's onRepeating). The selection the screen shows for `index`, whether the cards are narrow and the screen holds, and `settle()` to end
 * a run at once (opening the selected game: the screen must show it). React glue for the functions above.
 */
export function useFastCycle(index: number, repeating = false): { shown: number; narrow: boolean; holding: boolean; settle(): void } {
    const [state, setState] = useState(() => startCycle(index, 0));
    const current = stepCycle(state, index, Date.now(), repeating);
    // Applied during render (React's "adjust state when a prop changes"): the step's first frame already holds or shows.
    if (current !== state) setState(current);
    const delay = widenDelay(state, repeating);
    useEffect(() => {
        if (delay === null) return undefined;
        const timer = setTimeout(() => setState(state.phase === 'run' ? widenCycle : settleCycle), delay);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.phase, state.last, delay]);
    return { shown: current.shown, ...cycleView(current.phase), settle: () => setState(settleCycle) };
}
