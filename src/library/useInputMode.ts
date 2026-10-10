import { useEffect, useState } from 'react';

export type InputMode = 'gamepad' | 'keyboard';

export interface BumperGlyphs {
    left: string;
    right: string;
}

export type ActionType = 'select' | 'play' | 'back' | 'menu';

let currentMode: InputMode = 'gamepad';
const listeners = new Set<(mode: InputMode) => void>();

function setMode(newMode: InputMode) {
    if (currentMode === newMode) return;
    currentMode = newMode;
    listeners.forEach((listener) => {
        try {
            listener(newMode);
        } catch {
            // ignore listener errors
        }
    });
}

/** Explicitly report that a gamepad button was pressed. */
export function reportGamepadInput() {
    setMode('gamepad');
}

/** Explicitly report that a keyboard key was pressed. */
export function reportKeyboardInput() {
    setMode('keyboard');
}

/** Returns the active input mode synchronously. */
export function getInputMode(): InputMode {
    return currentMode;
}

/** Resets input mode (useful for testing and reset states). */
export function resetInputMode(defaultMode: InputMode = 'gamepad', resetListeners = false) {
    currentMode = defaultMode;
    if (resetListeners) isGlobalListening = false;
    listeners.forEach((listener) => {
        try {
            listener(defaultMode);
        } catch {
            // ignore listener errors
        }
    });
}

let isGlobalListening = false;
export function ensureGlobalInputListeners(target: { addEventListener: (event: string, handler: any, opts?: any) => void } | undefined = typeof window !== 'undefined' ? window : undefined) {
    if (!target) return;
    if (isGlobalListening) return;
    isGlobalListening = true;

    // Listen to physical keyboard events
    target.addEventListener('keydown', () => {
        // Any physical keydown switches active UI cues to keyboard
        reportKeyboardInput();
    }, { passive: true });

    // Listen to Steam's Gamepad UI custom event for gamepad button presses
    target.addEventListener('vg-buttondown', () => {
        reportGamepadInput();
    }, { passive: true });

    // Standard HTML5 Gamepad API event
    target.addEventListener('gamepadbuttondown', () => {
        reportGamepadInput();
    }, { passive: true });
}

/** Reactive hook that subscribes to active input device changes. */
export function useInputMode(): InputMode {
    const [mode, setLocalMode] = useState<InputMode>(currentMode);

    useEffect(() => {
        ensureGlobalInputListeners();
        const handler = (newMode: InputMode) => setLocalMode(newMode);
        listeners.add(handler);
        return () => {
            listeners.delete(handler);
        };
    }, []);

    return mode;
}

/** Returns bumper label cues for tabs navigation based on active input mode. */
export function getBumperGlyphs(mode: InputMode, preferXbox = false): BumperGlyphs {
    if (mode === 'keyboard') {
        return { left: 'Q', right: 'E' };
    }
    return preferXbox ? { left: 'LB', right: 'RB' } : { left: 'L1', right: 'R1' };
}

/** Returns action button glyphs based on active input mode. */
export function getActionGlyph(action: ActionType, mode: InputMode): string {
    if (mode === 'keyboard') {
        switch (action) {
            case 'select':
                return 'Enter';
            case 'play':
                return 'Y';
            case 'back':
                return 'Esc';
            case 'menu':
                return 'M';
        }
    }
    switch (action) {
        case 'select':
            return 'A';
        case 'play':
            return 'Y';
        case 'back':
            return 'B';
        case 'menu':
            return '☰';
    }
}
