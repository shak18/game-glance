/**
 * Whether one of Steam's side menus (main menu or Quick Access) is open.
 */

interface MenuStoreLike {
    IsAnySideMenuVisible?(): unknown;
}

export function menuOpen(store: MenuStoreLike | undefined, windowHasFocus: boolean): boolean {
    try {
        if (typeof store?.IsAnySideMenuVisible === 'function') return store.IsAnySideMenuVisible() === true;
    } catch {
        // fall through to focus
    }
    return !windowHasFocus;
}

export function steamMenuStore(): MenuStoreLike | undefined {
    try {
        const ui = (
            globalThis as {
                SteamUIStore?: {
                    WindowStore?: {
                        GamepadUIMainWindowInstance?: {
                            MenuStore?: MenuStoreLike;
                        };
                    };
                };
            }
        ).SteamUIStore;
        return ui?.WindowStore?.GamepadUIMainWindowInstance?.MenuStore;
    } catch {
        return undefined;
    }
}
