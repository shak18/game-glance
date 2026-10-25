import { useEffect } from 'react';
import { findTopBar } from './topBar';

export const COVERED = 'data-gg-covered';
const QUICK_MS = 50;
const QUICK_TICKS = 60; // 3 s

/**
 * While our custom status bar is active, Steam's own top bar is made see-through
 * (opacity: 0, keeping gamepad focusability). When focus enters it or a menu opens,
 * `away` is set: Steam's bar shows and ours steps aside.
 */
export function useHideSteamBar(doc: Document | null, away: boolean): void {
    useEffect(() => {
        if (!doc) return undefined;
        const clear = () => doc.querySelectorAll(`[${COVERED}]`).forEach((el) => el.removeAttribute(COVERED));
        const update = () => {
            try {
                if (away) return clear();
                const bar = findTopBar(doc, doc.defaultView?.innerWidth ?? 0);
                doc.querySelectorAll(`[${COVERED}]`).forEach((el) => {
                    if (el !== bar) el.removeAttribute(COVERED);
                });
                if (bar && !bar.hasAttribute(COVERED)) bar.setAttribute(COVERED, '');
            } catch {
                // leave bar untouched
            }
        };
        update();
        let ticks = 0;
        let timer = setInterval(() => {
            update();
            if (++ticks === QUICK_TICKS) {
                clearInterval(timer);
                timer = setInterval(update, 1000);
            }
        }, QUICK_MS);
        return () => {
            clearInterval(timer);
            clear();
        };
    }, [doc, away]);
}

export const COVER_CSS = `[${COVERED}] { opacity: 0 !important; transition: none !important; }`;
