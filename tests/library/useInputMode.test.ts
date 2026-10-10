import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ensureGlobalInputListeners,
    getActionGlyph,
    getBumperGlyphs,
    getInputMode,
    reportGamepadInput,
    reportKeyboardInput,
    resetInputMode,
} from '../../src/library/useInputMode';

describe('useInputMode', () => {
    beforeEach(() => {
        resetInputMode('gamepad');
        ensureGlobalInputListeners();
    });

    afterEach(() => {
        resetInputMode('gamepad');
    });

    it('defaults to gamepad input mode', () => {
        expect(getInputMode()).toBe('gamepad');
    });

    it('switches to keyboard mode when reportKeyboardInput is called', () => {
        reportKeyboardInput();
        expect(getInputMode()).toBe('keyboard');
    });

    it('switches back to gamepad mode when reportGamepadInput is called', () => {
        reportKeyboardInput();
        expect(getInputMode()).toBe('keyboard');
        reportGamepadInput();
        expect(getInputMode()).toBe('gamepad');
    });

    it('returns bumper glyphs based on input mode', () => {
        expect(getBumperGlyphs('gamepad')).toEqual({ left: 'L1', right: 'R1' });
        expect(getBumperGlyphs('gamepad', true)).toEqual({ left: 'LB', right: 'RB' });
        expect(getBumperGlyphs('keyboard')).toEqual({ left: 'Q', right: 'E' });
    });

    it('returns action glyphs based on input mode', () => {
        expect(getActionGlyph('select', 'gamepad')).toBe('A');
        expect(getActionGlyph('play', 'gamepad')).toBe('Y');
        expect(getActionGlyph('back', 'gamepad')).toBe('B');
        expect(getActionGlyph('menu', 'gamepad')).toBe('☰');

        expect(getActionGlyph('select', 'keyboard')).toBe('Enter');
        expect(getActionGlyph('play', 'keyboard')).toBe('Y');
        expect(getActionGlyph('back', 'keyboard')).toBe('Esc');
        expect(getActionGlyph('menu', 'keyboard')).toBe('M');
    });

    it('responds to keydown and vg-buttondown events', () => {
        resetInputMode('gamepad', true);
        const handlers: Record<string, () => void> = {};
        const mockTarget = {
            addEventListener: (event: string, handler: () => void) => {
                handlers[event] = handler;
            },
        };
        ensureGlobalInputListeners(mockTarget);

        handlers['keydown']?.();
        expect(getInputMode()).toBe('keyboard');

        handlers['vg-buttondown']?.();
        expect(getInputMode()).toBe('gamepad');

        handlers['gamepadbuttondown']?.();
        expect(getInputMode()).toBe('gamepad');
    });
});
