/**
 * Whether the game page is ready to be seen after the open transition: Steam's hero image itself has loaded (not the
 * blurred placeholder Steam shows under it while loading: the selector excludes `_blur`), our title block and
 * Steam's Play row are laid out, and Steam has focused the Play row (an element with no boxes is display: none or detached). Never throws; false when the
 * document or the hero selector (an unknown Steam class) is missing, and the transition's cap then reveals the page.
 */

interface Found {
    complete?: boolean;
    naturalWidth?: number;
    getClientRects(): { length: number };
}
interface Doc {
    querySelector(selector: string): Found | null;
}
export interface ReadySelectors {
    /** The hero <img> in Steam's header (themeCss.arrivalSelectors); null when Steam's class is unknown. */
    headerImg: string | null;
    titleblock: string;
    play: string | null;
    /** Steam's focus on the page's Play row (Home's copy shows Play focused); unchecked when absent. */
    focus?: string | null;
    /** The page's description, when Home drew it as it opened (Home's copy fades onto it); unchecked when absent. */
    desc?: string | null;
}

/**
 * Whether `el` is actually drawn: neither it nor an ancestor is at opacity 0 (Steam reveals the hero's wrapper on the
 * image's load event, a frame after `complete`). True when the element cannot be inspected.
 */
export function shownOnScreen(el: unknown): boolean {
    try {
        const node = el as { ownerDocument?: { defaultView?: { getComputedStyle(e: unknown): { opacity: string } } }; parentElement?: unknown };
        const view = node.ownerDocument?.defaultView;
        if (!view) return true;
        for (let p: unknown = el; p; p = (p as { parentElement?: unknown }).parentElement) {
            if (Number(view.getComputedStyle(p).opacity) < 0.99) return false;
        }
        return true;
    } catch {
        return true;
    }
}

export function pageReady(doc: Doc | null | undefined, sel: ReadySelectors, shown: (el: Found) => boolean = shownOnScreen): boolean {
    if (!doc || !sel.headerImg) return false;
    try {
        const img = doc.querySelector(sel.headerImg);
        if (!img || img.complete !== true || !(Number(img.naturalWidth) > 0) || !shown(img)) return false;
        const laidOut = (selector: string | null) => {
            const el = selector ? doc.querySelector(selector) : null;
            return !!el && el.getClientRects().length > 0;
        };
        // Steam focuses Play only as its exit animation ends, after the art and layout are ready (probed on the Ally).
        const focused = !sel.focus || doc.querySelector(sel.focus) !== null;
        return laidOut(sel.titleblock) && laidOut(sel.play) && focused && (!sel.desc || laidOut(sel.desc));
    } catch {
        return false;
    }
}
