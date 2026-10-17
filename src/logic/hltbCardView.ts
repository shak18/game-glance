import { tr } from '../i18n/steamText';
import { formatHours, minutesToHours } from './format';
import { beyondCaption, computeProgress, HltbTimes, mainStoryProgress, Tier, towardCaption } from './progress';

/**
 * What the HowLongToBeat card shows for a game it found: the three columns, the bar and the caption. Shared by the page's
 * card (components/HltbCard) and Spotlight Home's open transition, which draws the same card before the page arrives,
 * so the two cannot drift apart. Pure.
 */

/** The card's title. */
export const HLTB_TITLE = 'HowLongToBeat';

/** A column's key (data-stat): Main is `hltb`, as Home's chip and the Clean look's stat. */
export type HltbColumnKey = 'hltb' | 'mainExtras' | 'completionist';

export const HLTB_COLUMNS: Array<{ tier: Tier; key: HltbColumnKey; label: string }> = [
    { tier: 'main', key: 'hltb', label: 'Main' },
    { tier: 'mainExtras', key: 'mainExtras', label: '+ Extras' },
    { tier: 'completionist', key: 'completionist', label: '100%' },
];

export interface HltbColumn { tier: Tier; key: HltbColumnKey; label: string; value: string; goal: boolean }
export interface HltbFoundView {
    columns: HltbColumn[];
    /** The bar's fill in percent, or null when the card has no bar. */
    bar: number | null;
    caption: string | null;
}

/** `restyle`: the restyled page, where the bar and caption follow the main story only and no column is the goal. */
export function hltbFoundView(times: HltbTimes, playedMinutes: number, locale: string, restyle: boolean): HltbFoundView {
    const played = minutesToHours(playedMinutes);
    const progress = restyle ? mainStoryProgress(played, times) : computeProgress(played, times);
    const goalTier = !restyle && progress.kind === 'toward' ? progress.tier : null;
    const columns = HLTB_COLUMNS.map((c) => {
        const hours = times[c.tier];
        return { ...c, value: hours === null ? '—' : formatHours(hours, locale), goal: c.tier === goalTier };
    });
    switch (progress.kind) {
        case 'toward':
            return { columns, bar: progress.percent, caption: towardCaption(played, progress.goalHours, progress.tier, locale) };
        case 'beyond':
            return { columns, bar: 100, caption: beyondCaption(progress.lastTier) };
        case 'complete':
            return { columns, bar: 100, caption: 'Main story complete' };
        case 'notPlayed':
            return { columns, bar: null, caption: 'Not played yet' };
        default:
            return { columns, bar: null, caption: null };
    }
}

/** The no-match card's two lines (the page's card and Home's copy as it opens): no matches, and where to fix it. Pure. */
export function hltbNotFoundView(overrideId?: number): { muted: string; caption: string } {
    return overrideId !== undefined
        ? { muted: `#${overrideId} · ${tr('noMatches')}`, caption: 'Check or remove the override in Quick Access → Game Glance' }
        : { muted: tr('noMatches'), caption: 'Set the right game in Quick Access → Game Glance' };
}
