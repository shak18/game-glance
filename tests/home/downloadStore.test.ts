import { afterEach, describe, expect, it, vi } from 'vitest';
import { acquireDownloads, downloadFor, stopDownloads } from '../../src/home/downloadStore';

function fakeSteam() {
    const items = { unregister: vi.fn() };
    const overview = { unregister: vi.fn() };
    const downloads = {
        RegisterForDownloadItems: vi.fn(() => items),
        RegisterForDownloadOverview: vi.fn(() => overview),
    };
    (globalThis as unknown as { SteamClient: unknown }).SteamClient = { Downloads: downloads };
    return { downloads, items, overview };
}

afterEach(() => {
    stopDownloads();
    delete (globalThis as unknown as { SteamClient?: unknown }).SteamClient;
});

describe('download store lifecycle (ref counted)', () => {
    it('registers nothing until a subscriber acquires it', () => {
        const { downloads } = fakeSteam();
        expect(downloads.RegisterForDownloadItems).not.toHaveBeenCalled();
        expect(downloads.RegisterForDownloadOverview).not.toHaveBeenCalled();
        expect(downloadFor(1)).toBeNull();
    });
    it('the first subscriber registers both callbacks once, the last release unregisters both', () => {
        const { downloads, items, overview } = fakeSteam();
        const a = acquireDownloads();
        const b = acquireDownloads();
        expect(downloads.RegisterForDownloadItems).toHaveBeenCalledTimes(1);
        expect(downloads.RegisterForDownloadOverview).toHaveBeenCalledTimes(1);
        a();
        expect(items.unregister).not.toHaveBeenCalled();
        b();
        expect(items.unregister).toHaveBeenCalledTimes(1);
        expect(overview.unregister).toHaveBeenCalledTimes(1);
    });
    it('releasing twice does not steal another subscriber\'s reference', () => {
        const { items } = fakeSteam();
        const a = acquireDownloads();
        const b = acquireDownloads();
        a();
        a();
        expect(items.unregister).not.toHaveBeenCalled();
        b();
        expect(items.unregister).toHaveBeenCalledTimes(1);
    });
    it('starts again after a full stop', () => {
        const { downloads } = fakeSteam();
        acquireDownloads()();
        const again = acquireDownloads();
        expect(downloads.RegisterForDownloadItems).toHaveBeenCalledTimes(2);
        again();
    });
    it('the unload backstop unregisters at once and a late release is harmless', () => {
        const { items } = fakeSteam();
        const a = acquireDownloads();
        stopDownloads();
        expect(items.unregister).toHaveBeenCalledTimes(1);
        a();
        expect(items.unregister).toHaveBeenCalledTimes(1);
    });
    it('a missing Steam API does not throw', () => {
        expect(() => acquireDownloads()()).not.toThrow();
    });
});

describe('activeDownload (#8: the transfer the status bar shows)', () => {
    it('is the running transfer from the overview, and null once Steam is idle', async () => {
        let onOverview: (raw: unknown) => void = () => undefined;
        (globalThis as unknown as { SteamClient: unknown }).SteamClient = {
            Downloads: {
                RegisterForDownloadItems: vi.fn(() => ({ unregister: vi.fn() })),
                RegisterForDownloadOverview: vi.fn((cb: (raw: unknown) => void) => {
                    onOverview = cb;
                    return { unregister: vi.fn() };
                }),
            },
        };
        const { acquireDownloads: acquire, activeDownload } = await import('../../src/home/downloadStore');
        const release = acquire();
        expect(activeDownload()).toBeNull();
        onOverview({ update_appid: 42, update_state: 'Downloading', overall_percent_complete: 41.6, paused: false });
        expect(activeDownload()).toMatchObject({ appId: 42, kind: 'downloading', percent: 42 });
        onOverview({ update_appid: 0, update_state: 'None' });
        expect(activeDownload()).toBeNull();
        release();
    });
});
