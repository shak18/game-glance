export const HOME_ROUTE = '/library/home';

/**
 * True only when `routeProps` (what Decky's routerHook passes to a Home route patch) has the
 * shape verified on device: path '/library/home' and a single React element child with no props.
 * The Home route has no renderFunc (unlike the app page); Decky hands us Steam's Home element.
 * Pure and never throws, so a Steam update can only make the Home patch do nothing.
 */
export function isKnownHomeShape(routeProps: unknown): boolean {
    try {
        if (!routeProps || typeof routeProps !== 'object') return false;
        const { path, children } = routeProps as { path?: unknown; children?: unknown };
        if (path !== HOME_ROUTE) return false;
        if (!children || typeof children !== 'object') return false;
        const element = children as { $$typeof?: unknown; type?: unknown; props?: unknown };
        if (typeof element.$$typeof !== 'symbol') return false;
        const type = element.type;
        if (typeof type !== 'function' && (!type || typeof type !== 'object')) return false;
        const props = element.props;
        if (!props || typeof props !== 'object') return false;
        return Object.keys(props).length === 0;
    } catch {
        return false;
    }
}

const MEMO = Symbol.for('react.memo');

const isClass = (type: unknown) =>
    typeof type === 'function' && !!(type as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent;

/**
 * True for the Home route child's type when it can be called as a plain function: Decky's wrapper, or another
 * plugin's afterPatch wrapper. SteamGridDB calls this type directly, so it must never be a class (issue #18).
 */
export function isPatchableHomeType(type: unknown): boolean {
    try {
        return typeof type === 'function' && !isClass(type);
    } catch {
        return false;
    }
}

/**
 * True when `element` (what the route child returns) is Steam's Home: a memo around a function component, the shape
 * verified on device (SteamOS 3.8.28) and the one SteamGridDB's Home patch relies on. Pure and never throws.
 */
export function isMemoHome(element: unknown): boolean {
    try {
        const type = (element as { type?: { $$typeof?: unknown; type?: unknown } } | null)?.type;
        return !!type && type.$$typeof === MEMO && typeof type.type === 'function' && !isClass(type.type);
    } catch {
        return false;
    }
}
