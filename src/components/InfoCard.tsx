import { GameInfo } from '../data/steam';
import { formatAchievements, formatHours, minutesToHours } from '../logic/format';
import { descriptionState } from '../logic/infoCard';
import type { SizeStat } from '../logic/sizeStat';
import { tr } from '../i18n/steamText';
import { CardShell } from './CardShell';

interface Props {
    game: GameInfo;
    locale: string;
    description: string | null | undefined;
    /** A Unifideck game's install or download size (its own row's is hidden); absent for other games. */
    size?: SizeStat | null;
    /** A tap on the card (#24, cardActions): the card responds and gives under the finger. */
    onPress?(card: HTMLElement): void;
}

export function InfoCard({ game, locale, description, size = null, onPress }: Props) {
    const desc = descriptionState(description);
    return (
        <CardShell className="gg-card" onPress={onPress}>
            <div className="gg-stats">
                <div data-stat="played">
                    <div className="gg-label">{tr('played')}</div>
                    <div className="gg-value">{formatHours(minutesToHours(game.playedMinutes), locale)}</div>
                </div>
                {/* Right after Played: Played stays first in every game (Home's open lands on it). */}
                {size && (
                    <div data-stat="size">
                        <div className="gg-label">{size.label}</div>
                        <div className="gg-value">{size.value}</div>
                    </div>
                )}
                {game.achievements && (
                    <div data-stat="achievements">
                        <div className="gg-label">{tr('achievements')}</div>
                        <div className="gg-value">{formatAchievements(game.achievements)}</div>
                    </div>
                )}
            </div>
            {desc.kind === 'loading' && <p className="gg-desc"><span className="gg-skeleton" /></p>}
            {desc.kind === 'text' && <p className="gg-desc">{desc.text}</p>}
        </CardShell>
    );
}
