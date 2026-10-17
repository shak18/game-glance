import { describe, expect, it } from 'vitest';
import { hoverRing, installMouseMode, MOUSE_ATTR, mouseModeAfter, MouseModeDoc } from '../../src/home/mouseMode';

/** A document with just what installMouseMode uses: listeners and the root's attributes. */
function fakeDoc() {
    const listeners = new Map<string, Set<(e: unknown) => void>>();
    const attrs = new Map<string, string>();
    const doc: MouseModeDoc = {
        documentElement: {
            setAttribute: (n: string, v: string) => void attrs.set(n, v),
            removeAttribute: (n: string) => void attrs.delete(n),
        },
        addEventListener: (type: string, fn: (e: never) => void) => {
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type)!.add(fn as (e: unknown) => void);
        },
        removeEventListener: (type: string, fn: (e: never) => void) => void listeners.get(type)?.delete(fn as (e: unknown) => void),
    };
    const fire = (type: string, e: Record<string, unknown> = {}) => listeners.get(type)?.forEach((fn) => fn({ type, ...e }));
    const count = () => [...listeners.values()].reduce((n, s) => n + s.size, 0);
    return { doc, fire, on: () => attrs.has(MOUSE_ATTR), count };
}

describe('mouseModeAfter', () => {
    it('a mouse moving with no button held turns mouse mode on', () => {
        expect(mouseModeAfter(false, { type: 'pointermove', pointerType: 'mouse', buttons: 0 })).toBe(true);
    });
    it('a finger turns it off, moving or touching down', () => {
        expect(mouseModeAfter(true, { type: 'pointerdown', pointerType: 'touch', buttons: 1 })).toBe(false);
        expect(mouseModeAfter(true, { type: 'pointermove', pointerType: 'touch', buttons: 1 })).toBe(false);
    });
    it('a key or a controller button turns it off (Steam sends the controller as vgp_onbuttondown, never as keys)', () => {
        expect(mouseModeAfter(true, { type: 'keydown' })).toBe(false);
        expect(mouseModeAfter(true, { type: 'vgp_onbuttondown' })).toBe(false);
    });
    it('a mouse drag (a button held) leaves it as it was: no ring under a drag, and none lost', () => {
        expect(mouseModeAfter(false, { type: 'pointermove', pointerType: 'mouse', buttons: 1 })).toBe(false);
        expect(mouseModeAfter(true, { type: 'pointermove', pointerType: 'mouse', buttons: 1 })).toBe(true);
    });
    it('a mouse click keeps it on, and never starts it: only movement does', () => {
        expect(mouseModeAfter(true, { type: 'pointerdown', pointerType: 'mouse', buttons: 1 })).toBe(true);
        expect(mouseModeAfter(false, { type: 'pointerdown', pointerType: 'mouse', buttons: 1 })).toBe(false);
    });
    it('a pen counts as a finger (no pen hover for now)', () => {
        expect(mouseModeAfter(true, { type: 'pointermove', pointerType: 'pen', buttons: 0 })).toBe(false);
        expect(mouseModeAfter(false, { type: 'pointermove', pointerType: 'pen', buttons: 0 })).toBe(false);
    });
});

describe('installMouseMode', () => {
    it("marks the document's root while a mouse is in use, and clears it on a finger or a key", () => {
        const f = fakeDoc();
        installMouseMode(f.doc);
        expect(f.on()).toBe(false);
        f.fire('pointermove', { pointerType: 'mouse', buttons: 0 });
        expect(f.on()).toBe(true);
        f.fire('pointerdown', { pointerType: 'touch', buttons: 1 });
        expect(f.on()).toBe(false);
        f.fire('pointermove', { pointerType: 'mouse', buttons: 0 });
        f.fire('keydown');
        expect(f.on()).toBe(false);
        f.fire('pointermove', { pointerType: 'mouse', buttons: 0 });
        f.fire('vgp_onbuttondown', { detail: { button: 12 } });
        expect(f.on()).toBe(false);
    });
    it('installs once per document (Home and the page both ask) and goes when the last one lets go', () => {
        const f = fakeDoc();
        const a = installMouseMode(f.doc);
        const n = f.count();
        const b = installMouseMode(f.doc);
        expect(f.count()).toBe(n);
        a();
        f.fire('pointermove', { pointerType: 'mouse', buttons: 0 });
        expect(f.on()).toBe(true);
        b();
        expect(f.count()).toBe(0);
        // Nothing left marked once nobody uses it.
        expect(f.on()).toBe(false);
        // A second release is harmless.
        b();
        expect(f.count()).toBe(0);
    });
});

describe('hoverRing', () => {
    it("is the game cards' hover ring (2 units, white at .45), in the unit asked for", () => {
        expect(hoverRing('2px')).toBe('0 0 0 2px rgba(255,255,255,.45)');
        expect(hoverRing('calc(2 * var(--gg-d))')).toBe('0 0 0 calc(2 * var(--gg-d)) rgba(255,255,255,.45)');
    });
});
