import { beforeEach, describe, expect, it } from 'vitest';
import { accentMemo, ArtKeyedMemo, knownAccent } from '../../src/home/accentMemo';

describe('the accent memo (one for Home and the game page)', () => {
    beforeEach(() => accentMemo.clear());

    it("the page's first frame has the colour Home already knew (it showed Steam's default green until its own lookup answered)", () => {
        accentMemo.set(894020, '#bb8850');
        expect(knownAccent(undefined, 894020)).toBe('#bb8850');
    });

    it('a colour the page looked up itself wins; an unknown game has none yet', () => {
        accentMemo.set(1, '#111111');
        expect(knownAccent('#222222', 1)).toBe('#222222');
        expect(knownAccent(undefined, 2)).toBeUndefined();
    });
});

describe('a colour remembered for art changed since (#32)', () => {
    it('is forgotten once the art version changes, and a colour set after that is kept', () => {
        let version = 1;
        const memo = new ArtKeyedMemo(() => version);
        memo.set(7, '#df7744');
        expect(memo.get(7)).toBe('#df7744');
        expect(memo.has(7)).toBe(true);
        version = 2;
        expect(memo.has(7)).toBe(false);
        expect(memo.get(7)).toBeUndefined();
        memo.set(7, '#0040c0');
        expect(memo.get(7)).toBe('#0040c0');
    });

    it('a game whose art never changes keeps its colour', () => {
        const memo = new ArtKeyedMemo(() => 0);
        memo.set(8, '#123456');
        expect(memo.get(8)).toBe('#123456');
    });
});
