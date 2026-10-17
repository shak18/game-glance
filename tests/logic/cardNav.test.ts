import { describe, expect, it } from 'vitest';
import { asElement, CARD_NAV, cardNavTarget, cardZoneOf, DPAD_DOWN, DPAD_UP, landingFor } from '../../src/logic/cardNav';

describe('cardNavTarget', () => {
    it("Down from the Play row reaches the cards, below it on screen (Steam's tree has them before it: Up did)", () => {
        expect(cardNavTarget('play', DPAD_DOWN, true)).toBe('cards');
    });
    it("from the cards: Up to the Play row, Down to the page's tabs (where Down from Play went)", () => {
        expect(cardNavTarget('cards', DPAD_UP, true)).toBe('play');
        expect(cardNavTarget('cards', DPAD_DOWN, true)).toBe('tabs');
    });
    it('Up from the tabs comes back to the cards', () => {
        expect(cardNavTarget('tabs', DPAD_UP, true)).toBe('cards');
    });
    it("everything else is Steam's own: other buttons, other places, or no card to go to", () => {
        expect(cardNavTarget('play', DPAD_UP, true)).toBeNull();
        expect(cardNavTarget('tabs', DPAD_DOWN, true)).toBeNull();
        expect(cardNavTarget('cards', 11, true)).toBeNull();
        expect(cardNavTarget('cards', 12, true)).toBeNull();
        expect(cardNavTarget(null, DPAD_DOWN, true)).toBeNull();
        expect(cardNavTarget('play', DPAD_DOWN, false)).toBeNull();
        expect(cardNavTarget('tabs', DPAD_UP, false)).toBeNull();
    });
});

describe('cardZoneOf', () => {
    const el = (matches: string[]) => ({ closest: (sel: string) => (sel.split(',').some((s) => matches.includes(s.trim())) ? {} : null) }) as unknown as Element;
    const sel = { play: '.play, .menu', tabs: '[role="tab"]' };
    it('a card, the Play row (any of its buttons) or the tabs; null elsewhere', () => {
        expect(cardZoneOf(el([`.${CARD_NAV}`]), sel)).toBe('cards');
        expect(cardZoneOf(el(['.menu']), sel)).toBe('play');
        expect(cardZoneOf(el(['[role="tab"]']), sel)).toBe('tabs');
        expect(cardZoneOf(el([]), sel)).toBeNull();
        expect(cardZoneOf(null, sel)).toBeNull();
        // Without Steam's classes there is no Play row to know.
        expect(cardZoneOf(el(['.menu']), { play: null, tabs: '[role="tab"]' })).toBeNull();
    });
});

describe('landingFor', () => {
    const live = (x: string) => !x.startsWith('gone');
    const first = (to: string) => `first-${to}`;
    it("Up from the cards returns to the Play row's button Down left from (Steam's row remembers it: Right went on from there)", () => {
        expect(landingFor('play', { row: 'controller', card: null }, first, live)).toBe('controller');
        expect(landingFor('play', { row: null, card: null }, first, live)).toBe('first-play');
        expect(landingFor('play', { row: 'gone-controller', card: null }, first, live)).toBe('first-play');
    });
    it('the cards: the one last selected, else the first; the tabs: always found afresh', () => {
        expect(landingFor('cards', { row: null, card: 'hltb' }, first, live)).toBe('hltb');
        expect(landingFor('cards', { row: null, card: 'gone-hltb' }, first, live)).toBe('first-cards');
        expect(landingFor('tabs', { row: 'controller', card: 'hltb' }, first, live)).toBe('first-tabs');
    });
});

describe('asElement', () => {
    it("takes an element from another window too (Steam's page is not Game Glance's window: instanceof failed there)", () => {
        const foreign = { nodeType: 1, focus: () => undefined, closest: () => null };
        expect(asElement(foreign)).toBe(foreign);
        expect(asElement(null)).toBeNull();
        expect(asElement({ nodeType: 3 })).toBeNull();
        expect(asElement('x')).toBeNull();
    });
});
