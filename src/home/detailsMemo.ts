import type { CloudDetails } from './cloud';

/**
 * Library assets Steam sent through `SteamClient.Apps.RegisterForAppDetails`, kept for the session.
 *
 * Steam's `appDetailsStore` only holds the details of games it loaded itself (the first few recents, and any game whose
 * page was opened), so for later recents the hero art's hashed file name (`strHeroImage`) was unknown and Home showed
 * the blurred capsule (Reddit: "after the first 4 titles it is a zoomed in capsule image"). The registration's callback
 * does carry the details; they are remembered here and read when the store has none (artwork.browserStores).
 */
export interface LibraryAssets {
    strHeroImage?: string;
    strHeaderImage?: string;
    strLogoImage?: string;
}

/** At most this many games are remembered; the oldest go first. */
export const DETAILS_MEMO_MAX = 64;

const memo = new Map<number, LibraryAssets>();
const achievementMemo = new Map<number, { achieved: number; total: number }>();
const cloudMemo = new Map<number, CloudDetails>();
const spaceMemo = new Map<number, number>();
const playtimeMemo = new Map<number, number>();
type AchievementSink = (appId: number, counts: { achieved: number; total: number }) => void;
let sink: AchievementSink | null = null;

/** Where new or changed achievement counts go to be kept across restarts (Home wires it to the plugin cache); null stops it. */
export function setAchievementSink(next: AchievementSink | null) {
    sink = next;
}

/** Puts counts read from the persisted cache into the memo (no write back). A fresher value already known is kept. */
export function seedAchievements(appId: number, counts: unknown) {
    const c = counts as { achieved?: unknown; total?: unknown } | null | undefined;
    const total = Number(c?.total);
    if (!Number.isInteger(appId) || appId <= 0 || achievementMemo.has(appId) || !Number.isFinite(total) || total <= 0) return;
    achievementMemo.set(appId, { achieved: Number(c?.achieved) || 0, total });
}

/** Remembers `details.libraryAssets` for `appId`; anything without them is ignored. Never throws. */
export function noteDetails(appId: number, details: unknown) {
    try {
        if (!Number.isInteger(appId) || appId <= 0) return;
        noteAchievements(appId, details);
        noteCloud(appId, details);
        noteSpace(appId, details);
        notePlaytime(appId, details);
        const assets = (details as { libraryAssets?: unknown } | null | undefined)?.libraryAssets;
        if (!assets || typeof assets !== 'object') return;
        const { strHeroImage, strHeaderImage, strLogoImage } = assets as Record<string, unknown>;
        const kept: LibraryAssets = {};
        if (typeof strHeroImage === 'string') kept.strHeroImage = strHeroImage;
        if (typeof strHeaderImage === 'string') kept.strHeaderImage = strHeaderImage;
        if (typeof strLogoImage === 'string') kept.strLogoImage = strLogoImage;
        memo.delete(appId);
        memo.set(appId, kept);
        while (memo.size > DETAILS_MEMO_MAX) memo.delete(memo.keys().next().value as number);
    } catch {
        // keep what was there
    }
}

/** Remembers the achievement counts the callback carries (nTotal / nAchieved); Steam's store holds none for games it did not load itself. */
function noteAchievements(appId: number, details: unknown) {
    const a = (details as { achievements?: { nTotal?: unknown; nAchieved?: unknown } } | null | undefined)?.achievements;
    const total = Number(a?.nTotal);
    if (!Number.isFinite(total) || total <= 0) return;
    const next = { achieved: Number(a?.nAchieved) || 0, total };
    const before = achievementMemo.get(appId);
    achievementMemo.delete(appId);
    achievementMemo.set(appId, next);
    if (!before || before.achieved !== next.achieved || before.total !== next.total) {
        try {
            sink?.(appId, next);
        } catch {
            // persisting is best effort
        }
    }
    while (achievementMemo.size > DETAILS_MEMO_MAX) achievementMemo.delete(achievementMemo.keys().next().value as number);
}

/** The cloud fields the callback carries (not persisted: the state is live, and the focused game's registration keeps it current). */
function noteCloud(appId: number, details: unknown) {
    const d = details as Record<string, unknown> | null | undefined;
    if (typeof d?.bCloudEnabledForApp !== 'boolean') return;
    const { bCloudEnabledForApp, bCloudEnabledForAccount, bHasAnyLocalContent, eCloudStatus, nCloudProgressPercent } = d;
    cloudMemo.delete(appId);
    cloudMemo.set(appId, { bCloudEnabledForApp, bCloudEnabledForAccount, bHasAnyLocalContent, eCloudStatus, nCloudProgressPercent });
    while (cloudMemo.size > DETAILS_MEMO_MAX) cloudMemo.delete(cloudMemo.keys().next().value as number);
}

/** The remembered cloud fields for `appId` (Home's cloud button when Steam's store has none for the game), or undefined. */
export function memoCloud(appId: number): CloudDetails | undefined {
    return cloudMemo.get(appId);
}

/** The remembered achievement counts for `appId` (Home's Achievements chip when Steam's store has none), or undefined. */
export function memoAchievements(appId: number): { achieved: number; total: number } | undefined {
    return achievementMemo.get(appId);
}

/**
 * `game` with the remembered achievement counts when Steam's store has none for it (a game Steam did not load itself, or
 * a game page's first frame before Steam has loaded its details); Steam's own counts and shortcuts are left as they are.
 */
export function withKnownAchievements<T extends { appId: number; isShortcut: boolean; achievements: { achieved: number; total: number } | null }>(game: T): T {
    if (game.achievements || game.isShortcut) return game;
    const known = memoAchievements(game.appId);
    return known ? { ...game, achievements: known } : game;
}

/** The space Steam says a game needs to install (`lDiskSpaceRequiredBytes`, from the details callback), if it was noted. */
export function memoSpaceRequired(appId: number): number | undefined {
    return spaceMemo.get(appId);
}

/** Remembers the space a game needs; anything but a positive number is ignored. Bounded like the other memos. */
function noteSpace(appId: number, details: unknown) {
    const bytes = (details as { lDiskSpaceRequiredBytes?: unknown } | null | undefined)?.lDiskSpaceRequiredBytes;
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return;
    spaceMemo.delete(appId);
    spaceMemo.set(appId, bytes);
    while (spaceMemo.size > DETAILS_MEMO_MAX) spaceMemo.delete(spaceMemo.keys().next().value as number);
}

/** Steam's local play time (minutes) from the game's details, the only one a non-Steam shortcut has (#52), or undefined. */
export function memoPlaytime(appId: number): number | undefined {
    return playtimeMemo.get(appId);
}

/** Remembers a game's `nPlaytimeForever`; anything but a positive number is ignored. Bounded like the other memos. */
function notePlaytime(appId: number, details: unknown) {
    const minutes = (details as { nPlaytimeForever?: unknown } | null | undefined)?.nPlaytimeForever;
    if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return;
    playtimeMemo.delete(appId);
    playtimeMemo.set(appId, minutes);
    while (playtimeMemo.size > DETAILS_MEMO_MAX) playtimeMemo.delete(playtimeMemo.keys().next().value as number);
}

/** The remembered assets for `appId`, or undefined. */
export function memoDetails(appId: number): LibraryAssets | undefined {
    return memo.get(appId);
}

/** Forgets everything (tests). */
export function resetDetailsMemo() {
    sink = null;
    memo.clear();
    achievementMemo.clear();
    cloudMemo.clear();
    spaceMemo.clear();
    playtimeMemo.clear();
}
