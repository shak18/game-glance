import { Component, ReactElement, ReactNode } from 'react';
import { LOG_PREFIX } from '../constants';
import { useSettings } from '../data/settings';
import { homeMode } from './mode';
import { SpotlightHome } from './SpotlightHome';

let logged = false;

// On any throw inside Spotlight Home, render Steam's original Home instead and log the reason once.
interface HomeErrorBoundaryProps {
    fallback: ReactElement;
    children: ReactNode;
}

interface HomeErrorBoundaryState {
    failed: boolean;
}

// Function constructor pattern compatible with both `new HomeErrorBoundary(props)`
// and non-`new` invocations `HomeErrorBoundary(props)` from foreign routers/bundles.
function HomeErrorBoundary(this: any, props: HomeErrorBoundaryProps) {
    if (!(this instanceof HomeErrorBoundary)) {
        return new (HomeErrorBoundary as any)(props);
    }
    Component.call(this, props);
    (this as any).state = { failed: false };
}

Object.setPrototypeOf(HomeErrorBoundary.prototype, Component.prototype);
Object.setPrototypeOf(HomeErrorBoundary, Component);
(HomeErrorBoundary.prototype as any).isReactComponent = {};

(HomeErrorBoundary as any).getDerivedStateFromError = () => {
    return { failed: true };
};

(HomeErrorBoundary.prototype as any).componentDidCatch = (error: unknown) => {
    if (logged) return;
    logged = true;
    console.error(`${LOG_PREFIX} Spotlight Home render failed; showing Steam's Home`, error);
};

(HomeErrorBoundary.prototype as any).render = function (this: any) {
    return this.state?.failed ? this.props.fallback : this.props.children;
};

const SafeHomeErrorBoundary = HomeErrorBoundary as unknown as new (
    props: HomeErrorBoundaryProps
) => Component<HomeErrorBoundaryProps, HomeErrorBoundaryState>;

/**
 * Mounted by the Home route patch in place of what Steam's Home renders; `children` is Steam's own Home tree.
 * Reads the setting live, so toggling in Quick Access swaps Home without a restart.
 */
export function HomeGate({ children: fallback }: { children: ReactElement }) {
    const settings = useSettings();
    if (!homeMode(settings).home) return fallback;
    return (
        <SafeHomeErrorBoundary fallback={fallback}>
            <SpotlightHome />
        </SafeHomeErrorBoundary>
    );
}
