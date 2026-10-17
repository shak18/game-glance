import { Navigation, Router } from '@decky/ui';
import { LOG_PREFIX } from '../constants';
import { HOME_ROUTE } from './guard';

/**
 * After an update (Decky loading the plugin over itself), the Home on screen is still drawn by the copy Decky unloaded:
 * its status bar lost its battery and connection when that copy stopped them (seen on the Ally, 2026-10-16), and none of
 * the new code shows until Home is opened again. So a load that is not the session's first, with Home on screen, opens
 * Home again once the old copy has gone. The count lives on Steam's window, which outlives the plugin's copies.
 */
const LOADS = '__gameGlanceLoads';

/** Counts this load; true when the plugin was loaded before in this Steam session (an update or a reload). */
export function noteLoad(store: Record<string, unknown> = globalThis as unknown as Record<string, unknown>): boolean {
    const before = typeof store[LOADS] === 'number' ? (store[LOADS] as number) : 0;
    store[LOADS] = before + 1;
    return before > 0;
}

/** Long enough for Decky to unload the old copy and for the settings to load (measured: under a second on the Ally). */
export const REMOUNT_DELAY_MS = 1500;
/** Library in between, as long as it takes Steam to leave Home. */
const AWAY_MS = 120;

export interface RemountDeps {
    path(): string | undefined;
    navigate(path: string): void;
    setTimeout(fn: () => void, ms: number): unknown;
    clearTimeout(handle: unknown): void;
}

const defaultDeps: RemountDeps = {
    path: () => (Router?.WindowStore?.GamepadUIMainWindowInstance as { m_history?: { location?: { pathname?: string } } } | undefined)?.m_history?.location?.pathname,
    navigate: (path) => Navigation.Navigate(path),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** After a reload, opens Home again if it is on screen. Returns a cancel for unload. Never throws. */
export function remountHomeAfterReload(reloaded: boolean, deps: RemountDeps = defaultDeps): () => void {
    if (!reloaded) return () => undefined;
    let away: unknown = null;
    const first = deps.setTimeout(() => {
        try {
            if (deps.path() !== HOME_ROUTE) return;
            deps.navigate('/library');
            away = deps.setTimeout(() => {
                try {
                    deps.navigate(HOME_ROUTE);
                } catch (error) {
                    console.warn(`${LOG_PREFIX} Home: reopening after the update failed`, error);
                }
            }, AWAY_MS);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: reopening after the update failed`, error);
        }
    }, REMOUNT_DELAY_MS);
    return () => {
        deps.clearTimeout(first);
        if (away !== null) deps.clearTimeout(away);
    };
}
