import { findModule, findModuleExport } from '@decky/ui';
import type { ComponentType } from 'react';
import { memoLookup } from './moduleLookup';

/**
 * Steam's own icons for the game page's controller and gear buttons, so Home's circles draw exactly what the page does
 * (the open transition hands Home over to the page with nothing changing). The gear is the icon module's `Settings`
 * (next to `CloudSync`, steamCloud); the controller is a Big Picture icon whose export name is minified, so it is found
 * by its source (one walk over Steam's modules, about 75 ms on the Ally, once a session). Null when missing: Home keeps
 * its own icons.
 */

/** Longest source a match may have (the icon is about 1 kB; a long function that merely mentions the path is not it). */
const MAX_SOURCE = 4000;

/** Whether `src` is Steam's game-page controller icon: an SVGIcon_BigPicture drawing its path. Pure. */
export function isPageControllerIcon(src: string): boolean {
    return src.length < MAX_SOURCE && src.includes('SVGIcon_BigPicture') && src.includes('M213.771,68.659');
}

type Icon = ComponentType<Record<string, unknown>>;

export const steamControllerIcon = memoLookup<Icon>('controller icon', () =>
    findModuleExport((e: unknown) => typeof e === 'function' && isPageControllerIcon(Function.prototype.toString.call(e))) ?? null,
);

export const steamGearIcon = memoLookup<Icon>('gear icon', () =>
    findModule((m: any) => m && typeof m.CloudSync === 'function' && typeof m.Settings === 'function')?.Settings ?? null,
);

/** Whether `src` is Steam's dialog tick (the "Play from" menu's, before the selected device). Pure. */
export function isDialogCheck(src: string): boolean {
    return src.length < MAX_SOURCE && src.includes('SVGIcon_DialogCheck');
}

/** Whether `m` is Steam's Play-button class map with the "Play from" menu's classes (its tick column and label). Pure. */
export function isStreamMenuClasses(m: unknown): boolean {
    const map = m as Record<string, unknown> | null;
    return !!map && typeof map.PlayButtonContainer === 'string' && typeof map.StreamingContextMenuItem === 'string' && typeof map.CheckContainer === 'string' && typeof map.StreamingTargetLabel === 'string';
}

export const steamCheckIcon = memoLookup<Icon>('dialog tick', () =>
    findModuleExport((e: unknown) => typeof e === 'function' && isDialogCheck(Function.prototype.toString.call(e))) ?? null,
);

/** The "Play from" menu's classes, as Steam's own menu uses them: each item, its tick column and its label. */
export const steamStreamMenuClasses = memoLookup<{ StreamingContextMenuItem: string; CheckContainer: string; StreamingTargetLabel: string }>('"Play from" menu classes', () =>
    findModule((m: unknown) => isStreamMenuClasses(m)) ?? null,
);
