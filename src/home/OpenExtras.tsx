import type { HltbResult } from '../data/hltb';
import { HLTB_TITLE, hltbFoundView } from '../logic/hltbCardView';
import { formatHours, minutesToHours } from '../logic/format';
import { tr } from '../i18n/steamText';
import { extrasParts } from './openHome';
import { FamilyPill, SourcePill } from '../components/SourcePill';

interface Props {
    description: string | null;
    hltb: HltbResult | undefined;
    playedMinutes: number;
    locale: string;
    /** The store's name (the store pill) and the family library pill's words, when known. */
    source?: string;
    family?: string | null;
    /** Home shows no Play time chip (a new game's Added chip): the page's Play time column is drawn here. */
    playedMissing?: boolean;
    /** A Unifideck game's size column (the page's, right after Played), when Home knows it. */
    size?: { label: string; value: string } | null;
}

/**
 * The page's parts Spotlight Home draws as it turns into the page's Spotlight look (the open transition): the description
 * and the HowLongToBeat card's title, columns, bar and caption, as the page's card shows them (logic/hltbCardView), and
 * the page's store pill (the family pill in it) at the page's own size.
 * Hidden until opening (homeCss.openingRules); openMotion places it; the page then shows the same at once (intent).
 */
export function OpenExtras({ description, hltb, playedMinutes, locale, source, family, playedMissing = false, size = null }: Props) {
    const parts = extrasParts(description, hltb, source, playedMissing, size !== null);
    const view = parts.includes('hltb') && hltb?.status === 'found' ? hltbFoundView(hltb.times, playedMinutes, locale, true) : null;
    return (
        <div className="gh-open-extras" data-parts={parts}>
            {parts.includes('desc') && <p className="gh-x-desc">{description}</p>}
            {view && (
                <div className="gh-x-hltb">
                    <div className="gh-x-label">{HLTB_TITLE}</div>
                    <div className="gh-x-stats">
                        {view.columns.map((c) => (
                            <div key={c.key}>
                                <div className="gh-x-label">{c.label}</div>
                                <div className="gh-x-value">{c.value}</div>
                            </div>
                        ))}
                    </div>
                    {view.bar !== null && <div className="gh-x-bar"><div style={{ width: `${view.bar}%` }} /></div>}
                    {view.caption !== null && <div className="gh-x-caption">{view.caption}</div>}
                </div>
            )}
            {playedMissing && (
                <div className="gh-x-played">
                    <div className="gh-x-label">{tr('played')}</div>
                    <div className="gh-x-value">{formatHours(minutesToHours(playedMinutes), locale)}</div>
                </div>
            )}
            {size && (
                <div className="gh-x-size">
                    <div className="gh-x-label">{size.label}</div>
                    <div className="gh-x-value">{size.value}</div>
                </div>
            )}
            {source && (
                <SourcePill label={source} className="gh-x-pill" iconClassName="gh-x-pill-icon">
                    {family && <FamilyPill label={family} className="gh-x-family" iconClassName="gh-x-family-icon" />}
                </SourcePill>
            )}
        </div>
    );
}
