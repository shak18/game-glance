/**
 * Helpers for detecting Steam's top bar and gamepad focus state.
 */

export function isTopBarRect(rect: { top: number; height: number; width: number }, viewportWidth: number): boolean {
    return rect.top <= 1 && rect.height > 0 && rect.height <= 48 && viewportWidth > 0 && rect.width >= viewportWidth * 0.9;
}

export function findTopBar(doc: Document, viewportWidth: number): Element | null {
    try {
        let el: Element | null = doc.querySelector('[class*="avatarHolder"]');
        while (el) {
            if (isTopBarRect(el.getBoundingClientRect(), viewportWidth)) return el;
            el = el.parentElement;
        }
    } catch {
        // not found
    }
    return null;
}

interface BarLike {
    contains(node: unknown): boolean;
    querySelector(selector: string): unknown;
}

export function focusInTopBar(bar: BarLike | null, active: unknown): boolean {
    if (!bar) return false;
    if (active && bar.contains(active)) return true;
    return !!bar.querySelector('.gpfocus');
}
