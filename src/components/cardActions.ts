import { Navigation } from '@decky/ui';
import { LOG_PREFIX } from '../constants';
import type { HltbResult } from '../data/hltb';
import { focusElement } from '../home/homeNav';

/**
 * What the game page's cards do when used (#24): a tap today; the controller (the cards made selectable, A) later
 * calls the same functions.
 */

/** Steam's Game Info tab on the game page: its id ends in GameInfo whatever the language (probed on the Deck). */
export const GAME_INFO_TAB = '[role="tab"][id$="GameInfo"]';

/** The game's HowLongToBeat page when it is matched; null otherwise. */
export function hltbUrl(result: HltbResult | undefined): string | null {
    return result?.status === 'found' ? `https://howlongtobeat.com/game/${result.gameId}` : null;
}

/** The info card: Steam's Game Info tab, selected and brought into view, with the controller's focus on it. */
export function openGameInfoTab(doc: Pick<Document, 'querySelector'>): boolean {
    try {
        const tab = doc.querySelector<HTMLElement>(GAME_INFO_TAB);
        if (!tab) return false;
        tab.click();
        focusElement(tab, 'the Game Info tab');
        tab.scrollIntoView({ block: 'start', behavior: 'smooth' });
        return true;
    } catch (error) {
        console.warn(`${LOG_PREFIX} game page: could not open the Game Info tab`, error);
        return false;
    }
}

/** The HowLongToBeat card: the game's page on howlongtobeat.com, in Steam's browser. */
export function openHltbPage(result: HltbResult | undefined): boolean {
    const url = hltbUrl(result);
    if (!url) return false;
    try {
        Navigation.NavigateToExternalWeb(url);
        return true;
    } catch (error) {
        console.warn(`${LOG_PREFIX} game page: could not open HowLongToBeat`, error);
        return false;
    }
}
