import { formatAchievements, formatHours, minutesToHours } from '../logic/format';
import { computeProgress, HltbTimes, Tier } from '../logic/progress';
import { tr } from '../i18n/steamText';

/** One stat of the screensaver's card: a label, its value and how far along (0..1) for its bar. */
export interface ScreensaverStat {
    key: 'played' | 'hltb' | 'achievements';
    label: string;
    value: string;
    progress?: number;
}

const TIER_LABEL: Record<Tier, string> = { main: 'HLTB main', mainExtras: 'HLTB + Extras', completionist: 'HLTB 100%' };
const ORDER: Tier[] = ['main', 'mainExtras', 'completionist'];

/**
 * The screensaver's stats card: your play time; the one HowLongToBeat time you are working toward (the first tier your play time has not
 * reached; main story before you play; the last tier, full, once past them all), with your progress toward it (the card's
 * only bar); then your achievements. Each is left out when unknown (no times cached, a game without achievements). Pure.
 */
export function screensaverStats(times: HltbTimes | null, playedMinutes: number, achievements: { achieved: number; total: number } | null, locale: string): ScreensaverStat[] {
    const played = minutesToHours(Number.isFinite(playedMinutes) ? Math.max(0, playedMinutes) : 0);
    const stats: ScreensaverStat[] = [{ key: 'played', label: tr('played'), value: formatHours(played, locale) }];
    if (times) {
        const progress = computeProgress(played, times);
        const tier = progress.kind === 'toward' ? progress.tier
            : progress.kind === 'beyond' ? progress.lastTier
                : progress.kind === 'notPlayed' ? ORDER.find((t) => (times[t] ?? 0) > 0) ?? null
                    : null;
        const goal = tier ? times[tier] : null;
        if (tier && goal !== null && goal > 0) {
            stats.push({ key: 'hltb', label: TIER_LABEL[tier], value: formatHours(goal, locale), progress: Math.min(1, played / goal) });
        }
    }
    if (achievements && achievements.total > 0) {
        stats.push({ key: 'achievements', label: tr('achievements'), value: formatAchievements(achievements) });
    }
    return stats;
}
