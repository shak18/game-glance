import { describe, expect, it } from 'vitest';
import { holdCover } from '../../src/home/useHideSteamBar';

describe('holdCover', () => {
    it("the first to let go does not uncover Steam's bar while the other still holds it (Home unmounting after the open)", () => {
        const doc = {};
        const home = holdCover(doc);
        const page = holdCover(doc);
        expect(home()).toBe(false);
        expect(page()).toBe(true);
    });
    it('one document does not hold another, and letting go twice counts once', () => {
        const a = {};
        const b = {};
        const releaseA = holdCover(a);
        const releaseB = holdCover(b);
        expect(releaseB()).toBe(true);
        const again = holdCover(a);
        expect(releaseA()).toBe(false);
        expect(releaseA()).toBe(false);
        expect(again()).toBe(true);
    });
});
