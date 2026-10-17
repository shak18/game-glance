import { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent, useRef, useState } from 'react';
import { hoverKey, wheelPx, wheelStep, WheelState } from './mouse';

/**
 * The card under a mouse (home/mouse.hoverKey): the `data-hover` key of the element under the cursor, or null (a finger,
 * a button held for a drag, the cursor gone). The row's pointer handlers call these alongside its drag's.
 */
export function useHover(): { hovered: string | null; onPointerMove(event: ReactPointerEvent): void; clear(): void } {
    const [hovered, setHovered] = useState<string | null>(null);
    const set = (key: string | null) => setHovered((prev) => (prev === key ? prev : key));
    const onPointerMove = (event: ReactPointerEvent) => {
        const card = (event.target as Element | null)?.closest?.('[data-hover]') ?? null;
        set(hoverKey(event.pointerType, event.buttons, card?.getAttribute('data-hover') ?? null));
    };
    return { hovered, onPointerMove, clear: () => set(null) };
}

/** A wheel handler that calls `onStep` once per card's worth of scrolling (home/mouse.wheelStep): +1 on, -1 back. */
export function useWheelStep(onStep: (steps: -1 | 1) => void): (event: ReactWheelEvent) => void {
    const state = useRef<WheelState>({ acc: 0, t: -Infinity });
    const latest = useRef(onStep);
    latest.current = onStep;
    return (event) => {
        const { steps, state: next } = wheelStep(state.current, wheelPx(event.deltaX, event.deltaY, event.deltaMode), event.timeStamp);
        state.current = next;
        if (steps !== 0) latest.current(steps);
    };
}
