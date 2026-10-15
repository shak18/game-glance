import { beforeEach, describe, expect, it, vi } from 'vitest';

const backend = vi.hoisted(() => ({ logHomeError: vi.fn(async (_entry: string) => undefined) }));
vi.mock('@decky/api', () => ({ callable: () => backend.logHomeError }));

import { RouteGuard } from '../../src/home/RouteGuard';

const fallback = { type: 'steam-home' } as never;
const child = { type: 'spotlight-home' } as never;

function guard(children = child) {
    const instance = new RouteGuard({ fallback, children });
    return instance;
}

describe('RouteGuard (the whole Home route)', () => {
    beforeEach(() => backend.logHomeError.mockClear());

    it('shows its children while nothing has failed', () => {
        expect(guard().render()).toBe(child);
    });

    it("on an error shows Steam's Home (the fallback) instead", () => {
        const failed = RouteGuard.getDerivedStateFromError(new Error('boom'));
        expect(failed).toEqual({ failed: true });
        const instance = guard();
        instance.state = failed;
        expect(instance.render()).toBe(fallback);
    });

    it('writes the error to the backend log, with the component stack', () => {
        const instance = guard();
        instance.componentDidCatch(new Error('Minified React error #130'), { componentStack: '\n    at RouterHook\n    at Home' } as never);
        expect(backend.logHomeError).toHaveBeenCalledTimes(1);
        const [entry] = backend.logHomeError.mock.calls[0];
        expect(entry).toContain('Home recovered from an error: Error: Minified React error #130');
        expect(entry).toContain('    at RouterHook');
    });
});
