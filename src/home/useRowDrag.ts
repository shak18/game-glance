import { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { Axis, axisLock, dragView, edgeBounce, flickWraps, glide, GLIDE_MS, releaseVelocity, Sample } from './rowDrag';

export interface RowDragOptions {
    /** The selected card, and the last one (the games row: the Library card). */
    index: number;
    count: number;
    /** The card pitch, logical px. */
    step: number;
    /** Screen px per logical px (Home's canvas, as drawn). */
    scale(): number;
    onSelect(next: number): void;
    /** A drag (and its flick) is a run, like a held stick: the hero holds until it ends (home/fastCycle). */
    onRun(running: boolean): void;
    /** False stops a flick between steps (a game opening, the row gone): no selection moves under the transition. */
    canStep?(): boolean;
    /** A flick on outward from the last card wraps to the first (the games row, as Right does there). */
    wraps?: boolean;
}

interface Gesture {
    id: number;
    x0: number;
    y0: number;
    axis: Axis | null;
    start: number;
    last: number;
    /** The card pitch when the drag began: a feed row's cards differ in width, and the step must not change mid-drag. */
    step: number;
    samples: Sample[];
}

type Handler = (event: ReactPointerEvent<HTMLElement>) => void;

/**
 * A row under a finger (rowDrag): a sideways drag steps the selection one card per `step` px; the row's `offset` is the
 * finger's movement beyond the selected card's place (rubber-banded past the ends), so the layout carries the row and a
 * release only settles that remainder. On release a flick glides on at the finger's speed, slowing down smoothly frame by
 * frame (rowDrag.glide) through the same view, and comes to rest on a card, or runs into the row's end, past it a little
 * and back (rowDrag.edgeBounce). With `wraps`, flicking on from the last card goes back to the first (rowDrag.flickWraps).
 * A sideways drag never ends in a click (a short quick slide can pass Chromium's tap slop): it is swallowed. A vertical
 * swipe is left to bubble up (SpotlightHome raises or lowers the feed sheet). One finger only (the primary pointer);
 * Steam taking the touch (pointercancel) ends the run.
 */
export function useRowDrag(options: RowDragOptions): {
    offset: number;
    dragging: boolean;
    handlers: { onPointerDown: Handler; onPointerMove: Handler; onPointerUp: Handler; onPointerCancel: Handler; onClickCapture(event: ReactMouseEvent): void };
} {
    const opts = useRef(options);
    opts.current = options;
    const [state, setState] = useState({ dragging: false, offset: 0 });
    const gesture = useRef<Gesture | null>(null);
    // The last gesture was a sideways drag: the click it may still produce is not a tap.
    const dragged = useRef(false);
    // A flick gliding on, frame by frame in Steam's window.
    const gliding = useRef<{ view: Window; id: number } | null>(null);
    const stopFlick = () => {
        const g = gliding.current;
        if (!g) return;
        g.view.cancelAnimationFrame(g.id);
        gliding.current = null;
        setState({ dragging: false, offset: 0 });
        opts.current.onRun(false);
    };
    useEffect(() => () => {
        const g = gliding.current;
        if (g) g.view.cancelAnimationFrame(g.id);
    }, []);
    const logical = (px: number) => px / (opts.current.scale() || 1);

    const onPointerDown: Handler = (event) => {
        if (!event.isPrimary) return;
        stopFlick();
        dragged.current = false;
        gesture.current = { id: event.pointerId, x0: event.clientX, y0: event.clientY, axis: null, start: opts.current.index, last: opts.current.index, step: opts.current.step, samples: [] };
    };
    const onPointerMove: Handler = (event) => {
        const g = gesture.current;
        if (!g || event.pointerId !== g.id) return;
        if (g.axis === null) {
            g.axis = axisLock(logical(event.clientX - g.x0), logical(event.clientY - g.y0));
            if (g.axis !== 'x') return;
            // The row follows from here: no jump by the slop.
            g.x0 = event.clientX;
            dragged.current = true;
            event.currentTarget.setPointerCapture?.(event.pointerId);
            opts.current.onRun(true);
        }
        if (g.axis !== 'x') return;
        const native = event.nativeEvent as PointerEvent;
        const points = native.getCoalescedEvents?.() ?? [];
        for (const p of points.length > 0 ? points : [native]) g.samples.push({ t: p.timeStamp, x: logical(p.clientX) });
        if (g.samples.length > 64) g.samples.splice(0, g.samples.length - 64);
        const view = dragView(logical(event.clientX - g.x0), g.start, opts.current.count, g.step);
        if (view.index !== g.last) {
            g.last = view.index;
            opts.current.onSelect(view.index);
        }
        setState({ dragging: true, offset: view.offset });
    };
    const onPointerUp: Handler = (event) => {
        const g = gesture.current;
        if (!g || event.pointerId !== g.id) return;
        gesture.current = null;
        if (g.axis !== 'x') return;
        const velocity = releaseVelocity(g.samples);
        const view = event.currentTarget.ownerDocument?.defaultView ?? window;
        if (opts.current.wraps && g.start === g.last && flickWraps(g.last, opts.current.count, velocity) && opts.current.canStep?.() !== false) {
            // Flicked on from the end: back to the first game, the row sliding there through its own transition.
            opts.current.onSelect(0);
            setState({ dragging: false, offset: 0 });
            opts.current.onRun(false);
            return;
        }
        if (glide(velocity, 0).done || typeof view.requestAnimationFrame !== 'function') {
            setState({ dragging: false, offset: 0 });
            opts.current.onRun(false);
            return;
        }
        // The flick carries the finger's movement on: the same view as the drag, from where the finger let go.
        const released = logical(event.clientX - g.x0);
        const t0 = view.performance.now();
        let at = g.last;
        // Run into the row's end: when, how fast, and how far off the end card.
        let bounce: { t: number; velocity: number; from: number } | null = null;
        const frame = (now: number) => {
            if (opts.current.canStep?.() === false) return stopFlick();
            if (bounce) {
                const b = edgeBounce(bounce.from, bounce.velocity, now - bounce.t, g.step * 0.5);
                if (b.done) return stopFlick();
                setState({ dragging: true, offset: b.offset });
                if (gliding.current) gliding.current.id = view.requestAnimationFrame(frame);
                return;
            }
            const { dx, done } = glide(velocity, now - t0);
            const { count } = opts.current;
            const shown = dragView(released + dx, g.start, count, g.step);
            if (shown.index !== at) {
                at = shown.index;
                opts.current.onSelect(at);
            }
            if (done) return stopFlick();
            // Run into the row's end (the rubber band is for a finger): on past it a little at the speed left, and back.
            const atEnd = (shown.index >= count && velocity < 0) || (shown.index <= 0 && velocity > 0);
            if (atEnd) bounce = { t: now, velocity: velocity * Math.exp(-(now - t0) / GLIDE_MS), from: shown.offset };
            setState({ dragging: true, offset: shown.offset });
            if (gliding.current) gliding.current.id = view.requestAnimationFrame(frame);
        };
        gliding.current = { view, id: view.requestAnimationFrame(frame) };
    };
    const onPointerCancel: Handler = (event) => {
        const g = gesture.current;
        if (!g || event.pointerId !== g.id) return;
        gesture.current = null;
        if (g.axis !== 'x') return;
        setState({ dragging: false, offset: 0 });
        opts.current.onRun(false);
    };
    const onClickCapture = (event: ReactMouseEvent) => {
        if (!dragged.current) return;
        dragged.current = false;
        event.stopPropagation();
        event.preventDefault();
    };
    return { offset: state.offset, dragging: state.dragging, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture } };
}
