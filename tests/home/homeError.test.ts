import { describe, expect, it } from 'vitest';
import { homeErrorEntry, HOME_ERROR_STACK_LINES } from '../../src/home/homeError';

describe('homeErrorEntry (what Home logs when it recovers from an error)', () => {
    const at = new Date('2026-10-12T09:41:00Z');

    it('has the time, the error message and the component stack', () => {
        const entry = homeErrorEntry(new Error('Minified React error #130'), '    at Home\n    at RouterHook', at);
        expect(entry).toBe('2026-10-12T09:41:00.000Z Home recovered from an error: Error: Minified React error #130\n    at Home\n    at RouterHook');
    });

    it('keeps only the first lines of a long component stack, and a long message', () => {
        const stack = Array.from({ length: 80 }, (_, i) => `    at frame${i}`).join('\n');
        const entry = homeErrorEntry(new Error('x'.repeat(2000)), stack, at);
        const lines = entry.split('\n');
        expect(lines.length).toBe(1 + HOME_ERROR_STACK_LINES);
        expect(lines[HOME_ERROR_STACK_LINES]).toBe('    at frame' + (HOME_ERROR_STACK_LINES - 1));
        expect(entry.length).toBeLessThan(2400);
    });

    it('takes a thrown value that is not an Error, and no stack', () => {
        expect(homeErrorEntry('boom', undefined, at)).toBe('2026-10-12T09:41:00.000Z Home recovered from an error: boom');
        expect(homeErrorEntry(null, null, at)).toBe('2026-10-12T09:41:00.000Z Home recovered from an error: null');
    });
});
