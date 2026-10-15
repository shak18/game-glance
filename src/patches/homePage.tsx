import { RoutePatch, routerHook } from '@decky/api';
import { afterPatch } from '@decky/ui';
import { LOG_PREFIX } from '../constants';
import { settings } from '../data/settings';
import { HOME_ROUTE, isKnownHomeShape, isMemoHome, isPatchableHomeType } from '../home/guard';
import { HomeGate } from '../home/HomeGate';
import { RouteGuard } from '../home/RouteGuard';
import { cancelOpen } from '../home/homeNav';
import { homeMode } from '../home/mode';
import { createHomePatchManager } from './homePatchManager';

const KEY = 'game-glance-home';
const warned = new Set<string>();

// Each kind of problem is logged once: Decky re-runs the patch on every router render.
const warnOnce = (message: string, error?: unknown) => {
    if (warned.has(message)) return;
    warned.add(message);
    console.warn(`${LOG_PREFIX} ${message}; leaving Steam's Home unchanged`, ...(error === undefined ? [] : [error]));
};

/* eslint-disable @typescript-eslint/no-explicit-any */
// One patched copy of each Steam Home memo type: the same type object every render, so React never remounts Home.
const patchedMemos = new WeakMap<object, any>();

function patchedMemo(memoType: any): any {
    const cached = patchedMemos.get(memoType);
    if (cached) return cached;
    const copy = { ...memoType };
    afterPatch(copy, 'type', (_: unknown[], nativeTree: any) => (
        <RouteGuard key={KEY} fallback={nativeTree}>
            <HomeGate>{nativeTree}</HomeGate>
        </RouteGuard>
    ));
    patchedMemos.set(memoType, copy);
    return copy;
}

// Steam's Home stays in place and Spotlight Home replaces only what it renders (issue #18). Other plugins patch this
// route too: SteamGridDB calls the route child's type as a plain function and wraps the memo element it returns, so
// every type we hand on must be a function or Steam's memo shape, never a class. Steam's own memo is never changed:
// we render a patched copy. Decky re-runs this on every router render (rare: only when a plugin adds or removes a
// route or patch, measured on device); an unknown shape leaves the route exactly as Steam built it.
const homeRoutePatch: RoutePatch = (routeProps: any) => {
    try {
        if (!isKnownHomeShape(routeProps) || !isPatchableHomeType(routeProps.children.type)) {
            warnOnce("Home route shape changed");
            return routeProps;
        }
        afterPatch(routeProps.children, 'type', (_: unknown[], element: any) => {
            try {
                if (!isMemoHome(element)) {
                    warnOnce("Steam's Home element changed");
                    return element;
                }
                return { ...element, type: patchedMemo(element.type) };
            } catch (error) {
                warnOnce('Home route patch failed', error);
                return element;
            }
        });
        return routeProps;
    } catch (error) {
        warnOnce('Home route patch failed', error);
        return routeProps;
    }
};

// The route patch exists only while Spotlight Home is on: with the toggle off Steam's Home is not
// patched at all. Never throws, so a failure here cannot stop the plugin (or the game page) loading.
export function patchHomePage(): () => void {
    try {
        const manager = createHomePatchManager({
            isOn: () => homeMode(settings.get()).home,
            subscribe: (listener) => settings.subscribe(listener),
            add: () => routerHook.addPatch(HOME_ROUTE, homeRoutePatch),
            remove: (handle) => routerHook.removePatch(HOME_ROUTE, handle as RoutePatch),
        });
        manager.start();
        return () => {
            try {
                cancelOpen(); // an open transition running at unload leaves no overlay behind
            } catch (error) {
                console.warn(`${LOG_PREFIX} Home: cancelling the open transition at unload failed`, error);
            }
            try {
                manager.stop();
            } catch (error) {
                console.warn(`${LOG_PREFIX} Home route unpatch failed`, error);
            }
        };
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home route patch failed; leaving Steam's Home unchanged`, error);
        return () => undefined;
    }
}
