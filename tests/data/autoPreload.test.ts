import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FIRST_RUN_MS, firstRunAfterStart, firstRunDelay, startAutoPreload, UPDATE_FIRST_RUN_MS } from '../../src/data/autoPreload';
import { memoryKv } from '../../src/data/kv';

describe('startAutoPreload', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('runs a minute after the plugin starts, then every 30 minutes', async () => {
        const run = vi.fn(async () => undefined);
        const stop = startAutoPreload({ run, isEnabled: () => true });
        await vi.advanceTimersByTimeAsync(59_000);
        expect(run).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1_000);
        expect(run).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(30 * 60_000);
        expect(run).toHaveBeenCalledTimes(2);
        stop();
    });
    it('skips runs while the setting is off, and resumes when it is turned back on', async () => {
        let enabled = false;
        const run = vi.fn(async () => undefined);
        const stop = startAutoPreload({ run, isEnabled: () => enabled });
        await vi.advanceTimersByTimeAsync(60_000);
        expect(run).not.toHaveBeenCalled();
        enabled = true;
        await vi.advanceTimersByTimeAsync(30 * 60_000);
        expect(run).toHaveBeenCalledTimes(1);
        stop();
    });
    it("skips a run while a game is running (#48: it went on mid-game), and runs at the next one after", async () => {
        let playing = true;
        const run = vi.fn(async () => undefined);
        const stop = startAutoPreload({ run, isEnabled: () => true, isGameRunning: () => playing });
        await vi.advanceTimersByTimeAsync(60_000);
        expect(run).not.toHaveBeenCalled();
        playing = false;
        await vi.advanceTimersByTimeAsync(30 * 60_000);
        expect(run).toHaveBeenCalledTimes(1);
        stop();
    });
    it('stops when the plugin unloads', async () => {
        const run = vi.fn(async () => undefined);
        startAutoPreload({ run, isEnabled: () => true })();
        await vi.advanceTimersByTimeAsync(2 * 60 * 60_000);
        expect(run).not.toHaveBeenCalled();
    });
    it('keeps its schedule when a run fails', async () => {
        const run = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
        const stop = startAutoPreload({ run, isEnabled: () => true });
        await vi.advanceTimersByTimeAsync(60_000 + 30 * 60_000);
        expect(run).toHaveBeenCalledTimes(2);
        stop();
    });
    it('after an update it runs sooner (the delay it is given), then every 30 minutes as before', async () => {
        const run = vi.fn(async () => undefined);
        const stop = startAutoPreload({ run, isEnabled: () => true, firstRunMs: async () => 15_000 });
        await vi.advanceTimersByTimeAsync(14_000);
        expect(run).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1_000);
        expect(run).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(30 * 60_000);
        expect(run).toHaveBeenCalledTimes(2);
        stop();
    });
});

describe('firstRunDelay', () => {
    it('soon after an update or a first install (memory is empty and the caches may lack what it added); a minute otherwise', () => {
        expect(UPDATE_FIRST_RUN_MS).toBe(15_000);
        expect(FIRST_RUN_MS).toBe(60_000);
        expect(firstRunDelay('3.1.0', '3.0.2')).toBe(UPDATE_FIRST_RUN_MS);
        expect(firstRunDelay('3.1.0', null)).toBe(UPDATE_FIRST_RUN_MS);
        expect(firstRunDelay('3.1.0', '3.1.0')).toBe(FIRST_RUN_MS);
        expect(firstRunDelay(null, '3.1.0')).toBe(FIRST_RUN_MS);
    });
});

describe('firstRunAfterStart', () => {
    it('compares the installed version with the last one seen, and remembers it, so only the first start after an update is early', async () => {
        const kv = memoryKv();
        expect(await firstRunAfterStart(kv, async () => '3.1.0')).toBe(UPDATE_FIRST_RUN_MS);
        expect(await firstRunAfterStart(kv, async () => '3.1.0')).toBe(FIRST_RUN_MS);
        expect(await firstRunAfterStart(kv, async () => '3.2.0')).toBe(UPDATE_FIRST_RUN_MS);
    });
    it('a version it cannot read, or a store that fails, keeps the usual minute', async () => {
        expect(await firstRunAfterStart(memoryKv(), async () => { throw new Error('no backend'); })).toBe(FIRST_RUN_MS);
        const broken = { ...memoryKv(), get: async () => { throw new Error('no store'); } };
        expect(await firstRunAfterStart(broken, async () => '3.1.0')).toBe(FIRST_RUN_MS);
    });
});
