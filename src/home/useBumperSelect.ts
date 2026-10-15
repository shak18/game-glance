import type { GamepadEvent } from '@decky/ui';
import { RefObject, useEffect, useRef } from 'react';
import { LOG_PREFIX } from '../constants';
import { bumperRepeatDelay, heldEvent, recentsButton, selectionForButton, stillHeld } from './focusZones';
import { gameStepSound, playNavSound } from './navSound';

export interface BumperHandlers {
    onButtonDown(evt: GamepadEvent): void;
    onButtonUp(evt: GamepadEvent): void;
    /** Stops a held button's repeat (focus left the row). */
    stop(): void;
}

interface HeldOptions {
    /** The selection a press (`isRepeat` false) or a repeat of `button` moves to from `at`; null: not this hook's button. */
    stepFor(at: number, button: number, count: number, isRepeat: boolean): number | null;
    /** The step's sound (navSound.gameStepSound). */
    sound: 'bumper' | 'dpad';
    /** Steam repeats the button while it is held (the d-pad and stick): its repeats keep the hold alive, silence ends it (focusZones.stillHeld). */
    steamRepeats: boolean;
    /** The hold is repeating (true from its first timed step) or over (false): home/fastCycle keeps the cards narrow meanwhile. */
    onRepeating?(on: boolean): void;
}

/**
 * A held button that steps through the recents items on Home's own timer: the first repeat after a pause, then a steady
 * rate (focusZones.bumperRepeatDelay), the same for L1/R1 and Left/Right. The repeat never wraps and ends at the first or
 * last item, on the button's release, when focus leaves `row`, when Steam stops repeating a button it repeats, or on
 * unmount, so it can never run on by itself. Each step plays Steam's sound for it (our handler takes the press before
 * Steam does, so Steam plays none). `selected`/`count`: the selection now (0..count, count = the Library card);
 * `select` applies a new one.
 */
export function useHeldSelect(row: RefObject<HTMLElement | null>, selected: number, count: number, select: (index: number) => void, options: HeldOptions): BumperHandlers {
    const state = useRef({ selected, count, select, options });
    state.current = { selected, count, select, options };
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const held = useRef<number | null>(null);
    const lastEvent = useRef(0);
    const repeating = useRef(false);
    const setRepeating = (on: boolean) => {
        if (repeating.current === on) return;
        repeating.current = on;
        try {
            state.current.options.onRepeating?.(on);
        } catch {
            // only a hint for the screen
        }
    };

    const stop = () => {
        setRepeating(false);
        held.current = null;
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = null;
    };
    useEffect(() => stop, []);

    const focusInRow = (): boolean => {
        try {
            const el = row.current;
            return !!el && el.contains(el.ownerDocument.activeElement);
        } catch {
            return false;
        }
    };

    const stepSound = (at: number, next: number) => {
        const sound = gameStepSound(at, next, state.current.options.sound);
        if (sound) playNavSound(sound);
    };

    const schedule = (button: number, repeats: number) => {
        timer.current = setTimeout(() => {
            timer.current = null;
            const { selected: at, count: n, select: apply, options: o } = state.current;
            if (held.current !== button || !focusInRow()) return stop();
            if (o.steamRepeats && !stillHeld(Date.now(), lastEvent.current)) return stop();
            const next = o.stepFor(at, button, n, true);
            if (next === null || next === at) return stop();
            try {
                // Before the step, so its render already knows it is a held repeat (React batches both).
                setRepeating(true);
                apply(next);
            } catch (error) {
                console.warn(`${LOG_PREFIX} Home: held step failed`, error);
                return stop();
            }
            stepSound(at, next);
            schedule(button, repeats + 1);
        }, bumperRepeatDelay(repeats));
    };

    const onButtonDown = (evt: GamepadEvent) => {
        try {
            const button = Number(evt?.detail?.button);
            const { selected: at, count: n, select: apply, options: o } = state.current;
            const next = o.stepFor(at, button, n, false);
            if (next === null) return;
            evt.preventDefault?.();
            evt.stopPropagation?.();
            const isRepeat = Boolean(evt?.detail?.is_repeat);
            if (o.steamRepeats) {
                lastEvent.current = Date.now();
                if (heldEvent(isRepeat, held.current === button) === 'alive') return;
            } else if (isRepeat) {
                return; // Steam does not repeat it; ours is the timer
            }
            stop();
            apply(next);
            stepSound(at, next);
            held.current = button;
            schedule(button, 0);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: selection failed`, error);
            stop();
        }
    };

    const onButtonUp = (evt: GamepadEvent) => {
        if (Number(evt?.detail?.button) === held.current) stop();
    };

    return { onButtonDown, onButtonUp, stop };
}

/** L1/R1 on the action row (bumper navigation, focusZones.selectionForButton): Steam does not repeat bumpers. */
export function useBumperSelect(row: RefObject<HTMLElement | null>, selected: number, count: number, select: (index: number) => void, onRepeating?: (on: boolean) => void): BumperHandlers {
    return useHeldSelect(row, selected, count, select, { stepFor: (at, button, n, isRepeat) => selectionForButton(at, button, n, isRepeat), sound: 'bumper', steamRepeats: false, onRepeating });
}

/** Left/Right (the d-pad and the left stick) on the game cards (focusZones.recentsButton), at a held bumper's pace. */
export function useDirectionSelect(row: RefObject<HTMLElement | null>, selected: number, count: number, select: (index: number) => void, onRepeating?: (on: boolean) => void): BumperHandlers {
    return useHeldSelect(row, selected, count, select, {
        stepFor: (at, button, n, isRepeat) => {
            const what = recentsButton(button, at, n, isRepeat);
            return what !== null && typeof what === 'object' ? what.select : null;
        },
        sound: 'dpad',
        steamRepeats: true,
        onRepeating,
    });
}
