import { LOG_PREFIX } from '../constants';
import { PhraseKey, tr } from '../i18n/steamText';
import type { CloudState, UnifideckCloudLook } from '../home/cloud';
import { PlaytimeDeps, unifideckKeyFor, UnifideckKey } from './unifideckPlaytime';

/**
 * A Unifideck game's cloud-save state for Home's cloud button, derived as Unifideck's own cloud button derives it
 * (read 2026-10-07 from its CloudSaveButton): `get_cloud_save_status(store, gameId)` says whether a sync is running,
 * whether the save folder was found, whether the store has cloud support, and the local and cloud save times. Steam's
 * own Cloud status is empty for these shortcuts. The button is read only on Home: A does nothing (its manual
 * download / upload window is Unifideck's).
 */
export interface UnifideckCloudStatus {
    supported?: unknown;
    in_progress?: unknown;
    cloud_supported?: unknown;
    save_path_resolved?: unknown;
    has_local_saves?: unknown;
    has_cloud_saves?: unknown;
    local_snapshot?: { timestamp?: unknown } | null;
    remote_snapshot?: { timestamp?: unknown } | null;
}

/** "Cloud saves: {status}" in Steam's words (the states map onto Steam's own cloud status words). */
const cloudLabel = (status: PhraseKey): string => `${tr('cloudSaves')}: ${tr(status)}`;

/** Unifideck treats local and cloud as in sync within this many seconds (the store keeps whole seconds). */
export const TS_SYNC_TOLERANCE_S = 2;

const ts = (s: { timestamp?: unknown } | null | undefined): number => (typeof s?.timestamp === 'number' && Number.isFinite(s.timestamp) ? s.timestamp : 0);

/**
 * The button's state, with Unifideck's own look (`unifideck`: its icon, ring, dimming and breathing, as its CloudSaveButton
 * draws them), or null when Unifideck's own button would not show (a store without cloud saves). Pure.
 */
export function unifideckCloudState(status: UnifideckCloudStatus | null | undefined): CloudState | null {
    if (!status || status.supported !== true) return null;
    const base = { status: 0, action: 'none' as const };
    const look = (icon: UnifideckCloudLook['icon'], ring: string | null = null, extra: Partial<UnifideckCloudLook> = {}): UnifideckCloudLook => ({ icon, ring, dim: false, breathe: false, ...extra });
    if (status.in_progress === true) return { ...base, tone: 'busy', icon: { save: true }, label: tr('cloudSyncing'), unifideck: look('sync', RING.blue) };
    // A game without cloud support: Unifideck keeps its button, dimmed (and inert).
    if (status.cloud_supported === false) return { ...base, tone: 'off', icon: {}, label: cloudLabel('cloudUnknown'), unifideck: look('cloud', null, { dim: true }) };
    if (status.save_path_resolved !== true) return { ...base, tone: 'bad', icon: { error: true }, label: cloudLabel('cloudSyncFailed'), unifideck: look('cloud', RING.yellow) };
    const hasLocal = status.has_local_saves === true;
    const hasCloud = status.has_cloud_saves === true || !!status.remote_snapshot;
    const apart = hasCloud && hasLocal && ts(status.local_snapshot) > 0 && ts(status.remote_snapshot) > 0 && Math.abs(ts(status.local_snapshot) - ts(status.remote_snapshot)) > TS_SYNC_TOLERANCE_S;
    const outOfSync = { ...base, tone: 'busy' as const, icon: { save: true as const }, label: cloudLabel('cloudOutOfSync'), unifideck: look('download', null, { breathe: true }) };
    if ((hasCloud && !hasLocal) || apart) return outOfSync;
    if (!hasCloud && hasLocal) return outOfSync;
    if (hasCloud && hasLocal) return { ...base, tone: 'ok', icon: { uploaded: true }, label: cloudLabel('cloudSynced'), unifideck: look('insync', RING.green) };
    return { ...base, tone: 'off', icon: {}, label: cloudLabel('cloudUnknown'), unifideck: look('cloud') };
}

/** Unifideck's inset ring colours for its cloud button's states. */
const RING = { blue: 'rgba(26, 159, 255, 0.55)', yellow: 'rgba(244, 180, 0, 0.55)', green: 'rgba(34, 197, 94, 0.55)' } as const;

/** The usable status of Unifideck's reply; null for a failure or garbage. */
export function parseCloudStatus(response: unknown): UnifideckCloudStatus | null {
    try {
        const r = response as { success?: unknown; data?: unknown } | null;
        if (!r || r.success !== true || !r.data || typeof r.data !== 'object') return null;
        return r.data as UnifideckCloudStatus;
    } catch {
        return null;
    }
}

interface DeckyBackendLike {
    call(route: string, ...args: unknown[]): Promise<unknown>;
}
const deckyBackend = (): DeckyBackendLike | undefined => (globalThis as { DeckyBackend?: DeckyBackendLike }).DeckyBackend;

// The status can take a while on Unifideck's side (it asks the store), so it is cached and asked once at a time.
const TTL_MS = 10_000;
const cache = new Map<number, { at: number; value: Promise<CloudState | null> }>();
/** Each game's last answer, as it came (null: none), for a look without waiting (peekUnifideckCloud). */
const known = new Map<number, CloudState | null>();
let logged = false;

/** Forget everything (tests). */
export function resetUnifideckCloud(): void {
    cache.clear();
    known.clear();
    logged = false;
}

/** A game's last answer at once (Home's cloud button on a switch, before the next answer comes); undefined: none yet. */
export function peekUnifideckCloud(appId: number): CloudState | null | undefined {
    return known.get(appId);
}

/** The cloud button state for a Unifideck shortcut app id; null when it is not a Unifideck game, has no cloud saves, or nothing answers. Cached 10 s. */
export async function unifideckCloudForApp(
    appId: number,
    deps: PlaytimeDeps & { key?: (appId: number) => Promise<UnifideckKey | null> } = {},
): Promise<CloudState | null> {
    try {
        const key = await unifideckKeyFor(appId, deps.key);
        if (!key) {
            known.set(appId, null);
            return null;
        }
        const now = (deps.now ?? Date.now)();
        const hit = cache.get(appId);
        if (hit && now - hit.at < TTL_MS) {
            const cloud = await hit.value;
            known.set(appId, cloud);
            return cloud;
        }
        const backend = 'backend' in deps ? deps.backend : deckyBackend();
        const value = (async () => {
            try {
                if (!backend?.call) return null;
                return unifideckCloudState(parseCloudStatus(await backend.call('loader/call_plugin_method', 'Unifideck', 'get_cloud_save_status', key.store, key.id)));
            } catch (error) {
                if (!logged) {
                    logged = true;
                    console.warn(`${LOG_PREFIX} Unifideck cloud saves unavailable`, error);
                }
                return null;
            }
        })();
        cache.set(appId, { at: now, value });
        const cloud = await value;
        known.set(appId, cloud);
        return cloud;
    } catch {
        return null;
    }
}

/**
 * Whether a Unifideck game's page gets our cloud circle: Unifideck draws its own cloud-save button only for an installed
 * game (read 2026-10-11: its not-installed row has the controller and settings buttons only), while Home shows the cloud
 * state either way. `installed`: Unifideck's own record (undefined/null until it answers). Pure.
 */
export function pageCloudNeeded(installed: boolean | null | undefined, cloud: CloudState | null): boolean {
    return installed === false && cloud !== null;
}
