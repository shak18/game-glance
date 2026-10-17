import { Navigation } from '@decky/ui';
import { describe, expect, it, vi } from 'vitest';
import { GAME_INFO_TAB, hltbUrl, openGameInfoTab, openHltbPage } from '../../src/components/cardActions';
import type { HltbResult } from '../../src/data/hltb';

const found = { status: 'found', gameId: 68151, times: {} } as unknown as HltbResult;

describe('cardActions', () => {
    it('hltbUrl is the game\'s HowLongToBeat page when matched, and nothing otherwise', () => {
        expect(hltbUrl(found)).toBe('https://howlongtobeat.com/game/68151');
        expect(hltbUrl({ status: 'notFound' } as HltbResult)).toBeNull();
        expect(hltbUrl({ status: 'unavailable' } as HltbResult)).toBeNull();
        expect(hltbUrl(undefined)).toBeNull();
    });
    it('openHltbPage opens the page in Steam\'s browser only for a match', () => {
        const open = vi.mocked(Navigation.NavigateToExternalWeb);
        open.mockClear();
        expect(openHltbPage(found)).toBe(true);
        expect(open).toHaveBeenCalledWith('https://howlongtobeat.com/game/68151');
        expect(openHltbPage(undefined)).toBe(false);
        expect(open).toHaveBeenCalledTimes(1);
    });
    it('openGameInfoTab selects Steam\'s Game Info tab (by its language-independent id) and brings it into view', () => {
        const tab = { click: vi.fn(), scrollIntoView: vi.fn(), focus: vi.fn(), classList: { contains: () => true }, ownerDocument: {} as { activeElement?: unknown } };
        tab.ownerDocument.activeElement = tab;
        const doc = { querySelector: vi.fn((sel: string) => (sel === GAME_INFO_TAB ? tab : null)) };
        expect(openGameInfoTab(doc as unknown as Pick<Document, 'querySelector'>)).toBe(true);
        expect(tab.click).toHaveBeenCalledTimes(1);
        expect(tab.scrollIntoView).toHaveBeenCalledTimes(1);
        expect(tab.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
        expect(GAME_INFO_TAB).toBe('[role="tab"][id$="GameInfo"]');
    });
    it('openGameInfoTab does nothing without the tab', () => {
        expect(openGameInfoTab({ querySelector: () => null } as unknown as Pick<Document, 'querySelector'>)).toBe(false);
    });
});
