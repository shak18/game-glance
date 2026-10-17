import { describe, expect, it, vi } from 'vitest';

vi.mock('@decky/ui', () => ({ Navigation: { Navigate: vi.fn() }, Router: {} }));

import { noteLoad, remountHomeAfterReload, REMOUNT_DELAY_MS, RemountDeps } from '../../src/home/reloadRemount';

function fakeDeps(path: string | undefined) {
    const timers: Array<{ fn: () => void; ms: number; done: boolean }> = [];
    const navigated: string[] = [];
    const deps: RemountDeps = {
        path: () => path,
        navigate: (p) => navigated.push(p),
        setTimeout: (fn, ms) => timers.push({ fn, ms, done: false }) - 1,
        clearTimeout: (h) => {
            timers[h as number].done = true;
        },
    };
    const runAll = () => {
        for (let i = 0; i < timers.length; i++) if (!timers[i].done) {
            timers[i].done = true;
            timers[i].fn();
        }
    };
    return { deps, timers, navigated, runAll };
}

describe('noteLoad', () => {
    it('the first load of a session is not a reload; later ones are', () => {
        const store: Record<string, unknown> = {};
        expect(noteLoad(store)).toBe(false);
        expect(noteLoad(store)).toBe(true);
        expect(noteLoad(store)).toBe(true);
    });
});

describe('remountHomeAfterReload', () => {
    it('a first load does nothing', () => {
        const f = fakeDeps('/library/home');
        remountHomeAfterReload(false, f.deps);
        expect(f.timers).toHaveLength(0);
    });
    it('after a reload with Home on screen, opens the library, then Home again', () => {
        const f = fakeDeps('/library/home');
        remountHomeAfterReload(true, f.deps);
        expect(f.timers[0].ms).toBe(REMOUNT_DELAY_MS);
        f.runAll();
        expect(f.navigated).toEqual(['/library', '/library/home']);
    });
    it('somewhere else (a game page, the library): leaves it there', () => {
        const f = fakeDeps('/library/app/123');
        remountHomeAfterReload(true, f.deps);
        f.runAll();
        expect(f.navigated).toEqual([]);
    });
    it('an unload before it runs cancels it', () => {
        const f = fakeDeps('/library/home');
        const cancel = remountHomeAfterReload(true, f.deps);
        cancel();
        f.runAll();
        expect(f.navigated).toEqual([]);
    });
    it('a navigation that throws is caught', () => {
        const f = fakeDeps('/library/home');
        f.deps.navigate = () => {
            throw new Error('x');
        };
        remountHomeAfterReload(true, f.deps);
        expect(() => f.runAll()).not.toThrow();
    });
});
