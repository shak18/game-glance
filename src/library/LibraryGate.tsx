import { Component, ReactElement, ReactNode } from 'react';
import { LOG_PREFIX } from '../constants';
import { useSettings } from '../data/settings';
import { SpotlightLibrary } from './SpotlightLibrary';

let logged = false;

interface LibraryErrorBoundaryProps {
    fallback: ReactElement;
    children: ReactNode;
}

interface LibraryErrorBoundaryState {
    failed: boolean;
}

export class LibraryGuard extends Component<LibraryErrorBoundaryProps, LibraryErrorBoundaryState> {
    state: LibraryErrorBoundaryState = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error: unknown) {
        if (logged) return;
        logged = true;
        console.error(`${LOG_PREFIX} Spotlight Library render failed; showing Steam's Library`, error);
    }

    render() {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}

export function LibraryGate({ fallback }: { fallback: ReactElement }) {
    const settings = useSettings();
    if (!settings.enabled || !settings.spotlightLibrary) return fallback;

    return (
        <LibraryGuard fallback={fallback}>
            <SpotlightLibrary fallbackTree={fallback} />
        </LibraryGuard>
    );
}
