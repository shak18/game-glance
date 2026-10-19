import { RoutePatch, routerHook } from '@decky/api';
import { afterPatch } from '@decky/ui';
import { LOG_PREFIX } from '../constants';
import { settings } from '../data/settings';
import { LibraryGate } from '../library/LibraryGate';

const LIBRARY_ROUTES = ['/library/games', '/library/all', '/library'];
const KEY = 'glance-library-spotlight';
const MEMO = Symbol.for('react.memo');

/* eslint-disable @typescript-eslint/no-explicit-any */
// One patched copy of each Steam Library memo type: the same type object every render,
// so React never remounts the Library unexpectedly (same pattern as Home memo patching).
const patchedLibraryMemos = new WeakMap<object, any>();

function patchedLibraryMemo(memoType: any): any {
    const cached = patchedLibraryMemos.get(memoType);
    if (cached) return cached;
    const copy = { ...memoType };
    afterPatch(copy, 'type', (_: unknown[], nativeTree: any) => {
        if (!settings.get().enabled || !settings.get().spotlightLibrary) return nativeTree;
        return <LibraryGate key={KEY} fallback={nativeTree} />;
    });
    patchedLibraryMemos.set(memoType, copy);
    return copy;
}

function isMemoElement(element: any): boolean {
    try {
        const type = element?.type;
        return !!type && type.$$typeof === MEMO && typeof type.type === 'function';
    } catch {
        return false;
    }
}

// Steam's Library route structure: routeProps.children (outer) -> ret1 (container) -> ret2 (memo component).
// Plugins like TabMaster hook into routeProps.children.type and ret1.type expecting Steam's native components.
// We must NEVER replace routeProps.children or ret1 directly with our own component: we hook via afterPatch
// so other plugins see Steam's native elements, tabs, and hooks untouched.
const libraryRoutePatch: RoutePatch = (routeProps: any) => {
    try {
        if (!routeProps || typeof routeProps !== 'object' || !routeProps.children) {
            return routeProps;
        }

        // If routeProps.children itself is a memo element
        if (isMemoElement(routeProps.children)) {
            return {
                ...routeProps,
                children: {
                    ...routeProps.children,
                    type: patchedLibraryMemo(routeProps.children.type),
                },
            };
        }

        if (typeof routeProps.children.type === 'function' || typeof routeProps.children.type === 'object') {
            afterPatch(routeProps.children, 'type', (_: unknown[], ret1: any) => {
                try {
                    if (!ret1 || typeof ret1 !== 'object') return ret1;

                    if (isMemoElement(ret1)) {
                        return { ...ret1, type: patchedLibraryMemo(ret1.type) };
                    }

                    if (typeof ret1.type === 'function' || typeof ret1.type === 'object') {
                        afterPatch(ret1, 'type', (_2: unknown[], ret2: any) => {
                            try {
                                if (!ret2 || typeof ret2 !== 'object') return ret2;

                                if (isMemoElement(ret2)) {
                                    return { ...ret2, type: patchedLibraryMemo(ret2.type) };
                                }

                                if (typeof ret2.type === 'function') {
                                    afterPatch(ret2, 'type', (_3: unknown[], nativeTree: any) => {
                                        if (!settings.get().enabled || !settings.get().spotlightLibrary) return nativeTree;
                                        return <LibraryGate key={KEY} fallback={nativeTree} />;
                                    });
                                    return ret2;
                                }

                                return ret2;
                            } catch (err) {
                                console.warn(`${LOG_PREFIX} inner library patch failed`, err);
                                return ret2;
                            }
                        });
                    }

                    return ret1;
                } catch (err) {
                    console.warn(`${LOG_PREFIX} outer library patch failed`, err);
                    return ret1;
                }
            });

            return routeProps;
        }

        return {
            ...routeProps,
            children: <LibraryGate key={KEY} fallback={routeProps.children} />,
        };
    } catch (error) {
        console.warn(`${LOG_PREFIX} Library route patch failed; leaving Steam's Library unchanged`, error);
        return routeProps;
    }
};

export function patchLibraryPage(): () => void {
    const handles = new Map<string, unknown>();
    let active = false;
    let stopped = false;
    let unsubscribe: (() => void) | null = null;

    const addPatches = () => {
        if (active) return;
        for (const route of LIBRARY_ROUTES) {
            try {
                const handle = routerHook.addPatch(route, libraryRoutePatch);
                handles.set(route, handle);
            } catch (error) {
                console.warn(`${LOG_PREFIX} could not patch library route ${route}`, error);
            }
        }
        active = true;
    };

    const removePatches = () => {
        if (!active) return;
        for (const [route, handle] of handles.entries()) {
            try {
                routerHook.removePatch(route, handle as RoutePatch);
            } catch (error) {
                console.warn(`${LOG_PREFIX} could not remove patch for library route ${route}`, error);
            }
        }
        handles.clear();
        active = false;
    };

    const sync = () => {
        if (stopped) return;
        const on = settings.get().enabled && settings.get().spotlightLibrary;
        if (on && !active) {
            addPatches();
        } else if (!on && active) {
            removePatches();
        }
    };

    try {
        unsubscribe = settings.subscribe(sync);
        sync();
    } catch (error) {
        console.warn(`${LOG_PREFIX} Library route patch manager init failed`, error);
    }

    return () => {
        stopped = true;
        try {
            unsubscribe?.();
        } catch {
            // ignore
        }
        removePatches();
    };
}
