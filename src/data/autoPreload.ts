import { callable } from '@decky/api';
import { fetchAll } from './fetchAll';
import { backendKv, KvBackend } from './kv';
import { settings } from './settings';

export interface AutoPreloadDeps {
    run(): Promise<void>;
    isEnabled(): boolean;
    /** How long after the start the first run waits (firstRunAfterStart); FIRST_RUN_MS without it. */
    firstRunMs?(): Promise<number>;
}

/** Let Steam and the network settle after boot. */
export const FIRST_RUN_MS = 60_000;
/** After an update (or a first install) the first run comes sooner: memory is empty, and the caches may lack what it added. */
export const UPDATE_FIRST_RUN_MS = 15_000;
const EVERY_MS = 30 * 60_000;
const LAST_VERSION_KEY = 'meta:lastVersion';

/** The first run's delay: soon after an update or a first install (the version changed), a minute otherwise. Pure. */
export function firstRunDelay(current: string | null, lastSeen: string | null): number {
    return current !== null && current !== lastSeen ? UPDATE_FIRST_RUN_MS : FIRST_RUN_MS;
}

/** Compares the installed version with the last one seen and remembers it; the usual minute when either cannot be read. */
export async function firstRunAfterStart(kv: KvBackend, version: () => Promise<string | null>): Promise<number> {
    try {
        const current = await version();
        const seen = await kv.get(LAST_VERSION_KEY);
        const delay = firstRunDelay(typeof current === 'string' ? current : null, typeof seen === 'string' ? seen : null);
        if (typeof current === 'string' && current !== seen) await kv.set(LAST_VERSION_KEY, current);
        return delay;
    } catch {
        return FIRST_RUN_MS;
    }
}

/**
 * Pre-loads game data in the background: a minute after the plugin starts (15 s after an update), then every 30 minutes.
 * Cached games are skipped without going online, so a run only costs anything when a game is new (or its times are due
 * for a refresh). Returns a function that stops it.
 */
export function startAutoPreload(deps: AutoPreloadDeps = defaultDeps): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const tick = async () => {
        if (deps.isEnabled()) {
            try {
                await deps.run();
            } catch {
                // offline or Steam not ready: try again next time
            }
        }
        if (!stopped) timer = setTimeout(tick, EVERY_MS);
    };
    const first = deps.firstRunMs ? deps.firstRunMs().catch(() => FIRST_RUN_MS) : Promise.resolve(FIRST_RUN_MS);
    void first.then((ms) => {
        if (!stopped) timer = setTimeout(tick, ms);
    });
    return () => {
        stopped = true;
        clearTimeout(timer);
    };
}

const getVersion = callable<[], string | null>('get_version');

const defaultDeps: AutoPreloadDeps = {
    run: () => fetchAll.start({ quiet: true }),
    isEnabled: () => settings.get().autoPreload,
    firstRunMs: () => firstRunAfterStart(backendKv, () => getVersion()),
};
