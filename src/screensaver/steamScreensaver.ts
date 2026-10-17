import { findModule, findModuleExport } from '@decky/ui';
import { useEffect, useState } from 'react';
import { LOG_PREFIX } from '../constants';

/**
 * Steam's screensaver, as probed on the Ally (2026-10-16). The Game Slideshow is React from Steam's main UI, portaled into
 * its own window ("Screensaver_uid2", a browser view popup like Quick Access). Its state comes from Steam's Screensaver
 * service (GetActiveState, NotifyActiveStateChanged, ForceScreensaver). The window is held by the slideshow's popup view
 * object (`m_viewWindow`, `m_browserViewName` "Screensaver_uid…"), in the state of a component above the slideshow's
 * container (`ScreensaverContainer`) in Big Picture's window.
 */

interface ActiveStateMessage { Body(): { active(): boolean } }
interface ScreensaverService {
    GetActiveState(request: object): Promise<ActiveStateMessage>;
    RegisterForNotifyActiveStateChanged(callback: (message: ActiveStateMessage) => unknown): { unregister(): void } | undefined;
    ForceScreensaver(request: { enabled: boolean }): Promise<unknown>;
}

let service: ScreensaverService | null | undefined;

function screensaverService(): ScreensaverService | null {
    if (service !== undefined) return service;
    try {
        service = (findModuleExport((e: any) => e && typeof e.ForceScreensaver === 'function' && typeof e.GetActiveState === 'function'
            && typeof e.RegisterForNotifyActiveStateChanged === 'function') as ScreensaverService | undefined) ?? null;
    } catch {
        service = null;
    }
    if (!service) console.warn(`${LOG_PREFIX} screensaver: Steam's screensaver service not found`);
    return service;
}

/** Shows Steam's screensaver now (Steam's own Preview button); any input ends it. */
export function previewScreensaver(): void {
    screensaverService()?.ForceScreensaver({ enabled: true }).catch(() => undefined);
}

/** Whether Steam's screensaver is on, from Steam's own notification. False when the service is unknown. */
export function useScreensaverActive(): boolean {
    const [active, setActive] = useState(false);
    useEffect(() => {
        const svc = screensaverService();
        if (!svc) return undefined;
        let live = true;
        const read = (message: ActiveStateMessage) => {
            try {
                if (live) setActive(message.Body().active());
            } catch {
                // keep the last state
            }
        };
        const handle = svc.RegisterForNotifyActiveStateChanged((message) => {
            read(message);
            return 1; // Steam's notification handlers answer with a result code (OK)
        });
        svc.GetActiveState({}).then(read, () => undefined);
        return () => {
            live = false;
            handle?.unregister();
        };
    }, []);
    return active;
}

/** Steam's class names: the slideshow's (to hide it under ours) and the container the slideshow's window is found from. */
export interface SlideshowClasses { slideshow: string | null; container: string | null }

let classes: SlideshowClasses | undefined;

export function slideshowClasses(): SlideshowClasses {
    if (classes) return classes;
    const pick = (key: string, other: string): string | null => {
        try {
            const m = findModule((mod: any) => mod && typeof mod[key] === 'string' && typeof mod[other] === 'string');
            return typeof m?.[key] === 'string' ? m[key] : null;
        } catch {
            return null;
        }
    };
    classes = { slideshow: pick('ScreensaverGameBackgrounds', 'HeroLogo'), container: pick('ScreensaverContainer', 'NavRoot') };
    return classes;
}

/**
 * Whether Game Glance can draw the screensaver here: Steam's Screensaver service is there (it tells when the screensaver
 * turns on) and so is the slideshow's container class (the window is found from it). An older Steam client has neither;
 * a later one may rename them. Quick Access then shows a note instead of the switches. Pure.
 */
export function screensaverSupported(hasService: boolean, classes: SlideshowClasses): boolean {
    return hasService && classes.container !== null;
}

/** screensaverSupported for this Steam client (looked up once). */
export function screensaverAvailable(): boolean {
    return screensaverSupported(screensaverService() !== null, slideshowClasses());
}

interface Hook { memoizedState?: unknown; next?: Hook | null }
interface Fiber { memoizedState?: Hook | null; return?: Fiber | null }
interface ViewHolder { m_viewWindow?: Window; m_browserViewName?: string }

/** How far up from the container, and how many hooks into each component, the popup view is looked for. */
const FIBER_DEPTH = 30;
const HOOK_DEPTH = 30;

/**
 * The screensaver's window, from Steam's slideshow container `el` in Big Picture's window: the first state up its React
 * tree holding a window for a view named "Screensaver…". Null when not found.
 */
export function screensaverWindowFrom(el: Element | null): Window | null {
    if (!el) return null;
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber'));
    let fiber = key ? ((el as unknown as Record<string, Fiber>)[key] ?? null) : null;
    for (let depth = 0; fiber && depth < FIBER_DEPTH; depth++, fiber = fiber.return ?? null) {
        let hook = fiber.memoizedState ?? null;
        for (let i = 0; hook && i < HOOK_DEPTH; i++, hook = hook.next ?? null) {
            const value = hook.memoizedState as ViewHolder | null | undefined;
            if (value && typeof value === 'object' && value.m_viewWindow && /^Screensaver/.test(String(value.m_browserViewName))) {
                return value.m_viewWindow;
            }
        }
    }
    return null;
}

/** Looks for the window this often while the screensaver opens (Steam creates it a moment after it turns on). */
const FIND_MS = 200;
const FIND_TRIES = 25;

/** The screensaver's document while `active`, found from Big Picture's document `doc`; null otherwise or until found. */
export function useScreensaverDocument(doc: Document | null, active: boolean): Document | null {
    const [found, setFound] = useState<Document | null>(null);
    useEffect(() => {
        setFound(null);
        const container = slideshowClasses().container;
        if (!doc || !active || !container) return undefined;
        let tries = 0;
        const look = () => {
            try {
                const win = screensaverWindowFrom(doc.querySelector(`.${container}`));
                if (win?.document?.body) {
                    setFound(win.document);
                    return true;
                }
            } catch {
                // look again
            }
            return false;
        };
        if (look()) return undefined;
        const timer = setInterval(() => {
            if (look() || ++tries >= FIND_TRIES) clearInterval(timer);
        }, FIND_MS);
        return () => clearInterval(timer);
    }, [doc, active]);
    return found;
}
