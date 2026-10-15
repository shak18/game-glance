import { HltbResult } from '../data/hltb';
import { HLTB_COLUMNS, HLTB_TITLE, hltbFoundView } from '../logic/hltbCardView';
import { tr } from '../i18n/steamText';

interface Props {
    result: HltbResult | undefined;
    playedMinutes: number;
    locale: string;
    /** The restyled page (Spotlight Home on): the bar and caption follow the main story only. */
    restyle?: boolean;
}

export function HltbCard({ result, playedMinutes, locale, restyle = false }: Props) {
    const header = <div className="gg-label">{HLTB_TITLE}</div>;

    if (result === undefined) {
        return (
            <div className="gg-card gg-hltb">
                {header}
                <div className="gg-stats">
                    {HLTB_COLUMNS.map((c) => (
                        <div key={c.tier} data-stat={c.key}>
                            <div className="gg-label">{c.label}</div>
                            <div className="gg-value"><span className="gg-skeleton" /></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (result.status === 'notFound') {
        return (
            <div className="gg-card gg-hltb">
                {header}
                <div className="gg-muted">
                    {result.overrideId !== undefined ? `#${result.overrideId} · ${tr('noMatches')}` : tr('noMatches')}
                </div>
                <div className="gg-caption">
                    {result.overrideId !== undefined
                        ? 'Check or remove the override in Quick Access → Game Glance'
                        : 'Set the right game in Quick Access → Game Glance'}
                </div>
            </div>
        );
    }
    if (result.status === 'unavailable') {
        return (
            <div className="gg-card gg-hltb">
                {header}
                <div className="gg-muted">{tr('unavailable')}</div>
            </div>
        );
    }

    const view = hltbFoundView(result.times, playedMinutes, locale, restyle);
    return (
        <div className="gg-card gg-hltb">
            {header}
            <div className="gg-stats">
                {view.columns.map((c) => (
                    <div key={c.tier} className={c.goal ? 'gg-goal' : undefined} data-stat={c.key}>
                        <div className="gg-label">{c.label}</div>
                        <div className="gg-value">{c.value}</div>
                    </div>
                ))}
            </div>
            {view.bar !== null && <div className="gg-bar"><div style={{ width: `${view.bar}%` }} /></div>}
            {view.caption !== null && <div className="gg-caption">{view.caption}</div>}
        </div>
    );
}
