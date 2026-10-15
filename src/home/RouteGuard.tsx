import { callable } from '@decky/api';
import { Component, ReactElement, ReactNode } from 'react';
import { LOG_PREFIX } from '../constants';
import { homeErrorEntry } from './homeError';

const logHomeError = callable<[entry: string], void>('log_home_error');

/**
 * Wraps what the Home route renders: Steam's Home tree (the fallback) and ours. An error that gets past Spotlight
 * Home's own boundary shows Steam's Home instead of a broken screen, and is written to the plugin's log folder, where
 * a bug report can pick it up. Stays on the fallback until Home is left and opened again. It sits inside Steam's Home
 * component, never as the route child: other plugins call that child as a function, and a class there crashed Home
 * (issue #18).
 */
export class RouteGuard extends Component<{ fallback: ReactElement; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
        console.error(`${LOG_PREFIX} Home recovered from an error; showing Steam's Home`, error);
        try {
            logHomeError(homeErrorEntry(error, info?.componentStack)).catch(() => undefined);
        } catch {
            // the log is only for a report: a failure to write it never changes the screen
        }
    }

    render() {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}
