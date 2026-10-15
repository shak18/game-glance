import { afterEach, describe, expect, it, vi } from 'vitest';

// Steam's login-state module (offline mode) is not there in tests: online.
vi.mock('@decky/ui', () => ({ findModule: () => undefined }));
import { noteDetails, resetDetailsMemo } from '../../src/home/detailsMemo';
import { readCloud } from '../../src/home/steamCloud';

type G = Record<string, unknown>;
const g = globalThis as unknown as G;
const saved = { appStore: g.appStore, appDetailsStore: g.appDetailsStore };
const on = (status: number) => ({ bCloudEnabledForApp: true, bCloudEnabledForAccount: true, bHasAnyLocalContent: true, eCloudStatus: status });

function steam(store: Record<number, unknown>, shortcut = false) {
    g.appStore = { GetAppOverviewByAppID: () => ({ BIsModOrShortcut: () => shortcut }) };
    g.appDetailsStore = { GetAppDetails: (id: number) => store[id] ?? null };
}

describe('readCloud', () => {
    afterEach(() => {
        g.appStore = saved.appStore;
        g.appDetailsStore = saved.appDetailsStore;
        resetDetailsMemo();
    });
    it("reads the remembered details when Steam's store has none for the game (most recents, probed on the Ally)", () => {
        steam({});
        noteDetails(286690, on(3));
        expect(readCloud(286690)?.tone).toBe('ok');
    });
    it("Steam's store wins when it holds the game", () => {
        steam({ 286690: on(6) });
        noteDetails(286690, on(3));
        expect(readCloud(286690)?.tone).toBe('busy');
    });
    it('nothing known, or a shortcut: no cloud', () => {
        steam({});
        expect(readCloud(286690)).toBeNull();
        steam({}, true);
        noteDetails(286690, on(3));
        expect(readCloud(286690)).toBeNull();
    });
});
