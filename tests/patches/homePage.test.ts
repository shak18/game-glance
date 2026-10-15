import { RoutePatch, routerHook } from '@decky/api';
import { afterPatch } from '@decky/ui';
import { Component, createElement, memo, ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { settings } from '../../src/data/settings';
import { HomeGate } from '../../src/home/HomeGate';
import { RouteGuard } from '../../src/home/RouteGuard';
import { patchHomePage } from '../../src/patches/homePage';

afterEach(async () => {
    vi.restoreAllMocks();
    vi.mocked(routerHook.addPatch).mockReset();
    vi.mocked(routerHook.removePatch).mockReset();
    await settings.setSpotlightHome(false);
});

describe('patchHomePage', () => {
    it('does not patch the Home route while Spotlight Home is off', () => {
        const unpatch = patchHomePage();
        expect(routerHook.addPatch).not.toHaveBeenCalled();
        unpatch();
    });

    it('patches /library/home when turned on and removes it when turned off', async () => {
        const unpatch = patchHomePage();
        await settings.setSpotlightHome(true);
        expect(routerHook.addPatch).toHaveBeenCalledTimes(1);
        expect(vi.mocked(routerHook.addPatch).mock.calls[0][0]).toBe('/library/home');
        await settings.setSpotlightHome(false);
        expect(routerHook.removePatch).toHaveBeenCalledTimes(1);
        unpatch();
    });

    it('never throws and returns an unpatch function when addPatch throws', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.mocked(routerHook.addPatch).mockImplementation(() => {
            throw new Error('boom');
        });
        await settings.setSpotlightHome(true);
        let unpatch: (() => void) | undefined;
        expect(() => {
            unpatch = patchHomePage();
        }).not.toThrow();
        expect(typeof unpatch).toBe('function');
        expect(() => unpatch?.()).not.toThrow();
    });

    it('unpatch never throws when removing the route patch throws', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const unpatch = patchHomePage();
        await settings.setSpotlightHome(true);
        vi.mocked(routerHook.removePatch).mockImplementation(() => {
            throw new Error('boom');
        });
        expect(() => unpatch()).not.toThrow();
    });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
const MEMO = Symbol.for('react.memo');

// Steam's Home route child, as captured on device (SteamOS 3.8.28): <Memo(HomeImpl)/> with no props.
function steamHome() {
    const native = createElement('div', { id: 'steam-home' });
    const HomeImpl = vi.fn(() => native);
    const SteamMemo = memo(HomeImpl as () => ReactElement);
    return { native, HomeImpl, SteamMemo, child: createElement(SteamMemo) };
}

// What Decky's router-hook does on each router render (processList): the first patch gets the child with its type
// wrapped as (props) => createElement(original, props); each later patch gets the previous patch's children.
// The element is copied because React's development build freezes elements; Steam's production build does not, and
// SteamGridDB writes to it.
function deckyRender(child: ReactElement, patches: RoutePatch[]): any {
    let children: any = { ...child, type: (props: object) => ({ ...createElement(child.type as any, props) }) };
    for (const patch of patches) children = (patch({ path: '/library/home', children } as any) as any).children;
    return children;
}

// Renders the patched route the way React would, without React: call function types, then the memo's inner type.
function renderRoute(children: any): { element: any; output: any } {
    let element = children;
    while (typeof element?.type === 'function') element = element.type(element.props);
    return { element, output: element.type.type(element.props) };
}

// SteamGridDB 1.8.1's Home patch, reduced to the calls that crashed with Game Glance (issue #18).
function steamGridDbPatch(seen: any[]): RoutePatch {
    return (props: any) => {
        afterPatch(props.children, 'type', (_: unknown[], ret: any) => {
            ret.type = ret.type?.__DECKY_WRAPPED ? ret.type : { ...ret.type, __DECKY_WRAPPED: true }; // wrapReactType
            afterPatch(ret.type, 'type', (_2: unknown[], ret2: any) => {
                seen.push(ret2);
                return ret2;
            });
            return ret;
        });
        return props;
    };
}

async function gameGlancePatch(): Promise<RoutePatch> {
    patchHomePage();
    await settings.setSpotlightHome(true);
    return vi.mocked(routerHook.addPatch).mock.calls[0][1] as RoutePatch;
}

function expectGameGlanceTree(output: any, native: unknown) {
    expect(output.type).toBe(RouteGuard);
    expect(output.props.fallback).toBe(native);
    expect(output.props.children.type).toBe(HomeGate);
    expect(output.props.children.props.children).toBe(native);
}

describe('Home route patch', () => {
    it("replaces the output of Steam's Home, keeping Steam's tree as the fallback", async () => {
        const home = steamHome();
        const { element, output } = renderRoute(deckyRender(home.child, [await gameGlancePatch()]));
        expect(element.type.$$typeof).toBe(MEMO);
        expectGameGlanceTree(output, home.native);
        expect(home.HomeImpl).toHaveBeenCalled();
        expect(home.SteamMemo.type).toBe(home.HomeImpl); // Steam's own memo is never patched
    });

    it('works when SteamGridDB patches Home after Game Glance (the crash in issue #18)', async () => {
        const home = steamHome();
        const seen: any[] = [];
        const children = deckyRender(home.child, [await gameGlancePatch(), steamGridDbPatch(seen)]);
        let rendered: { output: any } | undefined;
        expect(() => {
            rendered = renderRoute(children);
        }).not.toThrow();
        expectGameGlanceTree(rendered!.output, home.native);
        expect(seen).toHaveLength(1);
        expect(seen[0].props.fallback).toBe(home.native); // SteamGridDB still finds Steam's tree under ours
    });

    it('works when SteamGridDB patches Home before Game Glance', async () => {
        const home = steamHome();
        const seen: any[] = [];
        const children = deckyRender(home.child, [steamGridDbPatch(seen), await gameGlancePatch()]);
        let rendered: { output: any } | undefined;
        expect(() => {
            rendered = renderRoute(children);
        }).not.toThrow();
        expect(seen).toEqual([home.native]);
        expectGameGlanceTree(rendered!.output, home.native);
    });

    it('keeps one patched memo type across route renders, so React does not remount Home', async () => {
        const home = steamHome();
        const patch = await gameGlancePatch();
        const first = renderRoute(deckyRender(home.child, [patch])).element;
        const second = renderRoute(deckyRender(home.child, [patch])).element;
        expect(first.type).toBe(second.type);
        expect(first.type).not.toBe(home.SteamMemo);
    });

    it("leaves Steam's Home unchanged and warns once when the route child is a class", async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        class ClassHome extends Component {
            render() {
                return null;
            }
        }
        const patch = await gameGlancePatch();
        const child = createElement(ClassHome);
        const props = { path: '/library/home', children: child };
        expect((patch(props as any) as any).children).toBe(child);
        expect(child.type).toBe(ClassHome);
        patch({ path: '/library/home', children: createElement(ClassHome) } as any);
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it("leaves Steam's Home unchanged and warns when its element is not a memo", async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const native = createElement('div');
        const PlainHome = () => native;
        const patch = await gameGlancePatch();
        const children = deckyRender(createElement(PlainHome), [patch]);
        let out: any = children;
        while (typeof out?.type === 'function') out = out.type(out.props);
        expect(out).toBe(native);
        expect(warn).toHaveBeenCalled();
    });
});
