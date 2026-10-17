import { describe, expect, it, vi } from 'vitest';

vi.mock('@decky/ui', () => ({ findModule: () => undefined, findModuleExport: () => undefined }));

import { screensaverSupported, screensaverWindowFrom } from '../../src/screensaver/steamScreensaver';

/** A container element with a fake React fiber chain; `views` are hook states, in components from the element up. */
function container(components: unknown[][]): Element {
    let parent: object | null = null;
    for (const states of [...components].reverse()) {
        let hook: object | null = null;
        for (const state of [...states].reverse()) hook = { memoizedState: state, next: hook };
        parent = { memoizedState: hook, return: parent };
    }
    return { __reactFiber$abc: parent } as unknown as Element;
}

describe('screensaverWindowFrom', () => {
    const win = { document: {} } as unknown as Window;
    it("finds the window of the view named Screensaver… up the tree", () => {
        const el = container([[1, 'x'], [null, { m_viewWindow: {} as Window, m_browserViewName: 'MainMenu_uid2' }], [0, { m_viewWindow: win, m_browserViewName: 'Screensaver_uid2' }]]);
        expect(screensaverWindowFrom(el)).toBe(win);
    });
    it('null without a matching view, a fiber or an element', () => {
        expect(screensaverWindowFrom(container([[1], [{ m_browserViewName: 'Screensaver_uid2' }]]))).toBeNull();
        expect(screensaverWindowFrom({} as Element)).toBeNull();
        expect(screensaverWindowFrom(null)).toBeNull();
    });
});

describe('screensaverSupported', () => {
    it("needs Steam's screensaver service and the slideshow's container class", () => {
        expect(screensaverSupported(true, { slideshow: 'a', container: 'b' })).toBe(true);
        expect(screensaverSupported(true, { slideshow: null, container: 'b' })).toBe(true);
    });
    it('an older Steam client (no service) or a renamed container: not supported', () => {
        expect(screensaverSupported(false, { slideshow: 'a', container: 'b' })).toBe(false);
        expect(screensaverSupported(true, { slideshow: 'a', container: null })).toBe(false);
    });
});
