import { describe, expect, it } from 'vitest';
import { capsuleBlur, cardStepFromDrag, greyedOut, isDragGesture, isPointerActivation, wheelStep } from '../../src/home/RecentsRow';

describe('capsuleBlur', () => {
    it('only the selected card and its neighbours draw the blurred base (a narrow card\'s portrait covers it)', () => {
        expect([0, 1, 2, 3, 4, 5].map((i) => capsuleBlur(i, 2))).toEqual([false, true, true, true, false, false]);
        expect([0, 1, 2].map((i) => capsuleBlur(i, 0))).toEqual([true, true, false]);
    });
    it('on the Library card (selected = count) only the last game keeps it', () => {
        expect([0, 1, 2].map((i) => capsuleBlur(i, 3))).toEqual([false, false, true]);
    });
});

describe('mouse & touch gesture helpers (RecentsRow)', () => {
    describe('cardStepFromDrag', () => {
        const stepWidth = 168;
        it('returns 0 for small movements below the threshold', () => {
            expect(cardStepFromDrag(0, stepWidth)).toBe(0);
            expect(cardStepFromDrag(15, stepWidth)).toBe(0);
            expect(cardStepFromDrag(-20, stepWidth)).toBe(0);
        });
        it('returns +1 step for left swipe above threshold (negative drag offset moves to next card)', () => {
            expect(cardStepFromDrag(-50, stepWidth)).toBe(1);
            expect(cardStepFromDrag(-100, stepWidth)).toBe(1);
        });
        it('returns -1 step for right swipe above threshold (positive drag offset moves to prev card)', () => {
            expect(cardStepFromDrag(50, stepWidth)).toBe(-1);
            expect(cardStepFromDrag(100, stepWidth)).toBe(-1);
        });
        it('returns multiple steps for larger multi-card drag sweeps', () => {
            expect(cardStepFromDrag(-260, stepWidth)).toBe(2);
            expect(cardStepFromDrag(260, stepWidth)).toBe(-2);
        });
        it('safely handles non-finite or invalid stepWidth', () => {
            expect(cardStepFromDrag(50, 0)).toBe(0);
            expect(cardStepFromDrag(NaN, stepWidth)).toBe(0);
        });
    });

    describe('isDragGesture', () => {
        it('rejects movements under the 8px threshold', () => {
            expect(isDragGesture(5, 2)).toBe(false);
            expect(isDragGesture(-6, 0)).toBe(false);
        });
        it('accepts horizontal-dominant movements above threshold', () => {
            expect(isDragGesture(12, 3)).toBe(true);
            expect(isDragGesture(-20, 5)).toBe(true);
        });
        it('rejects vertical-dominant movements', () => {
            expect(isDragGesture(10, 15)).toBe(false);
            expect(isDragGesture(-5, -25)).toBe(false);
        });
    });

    describe('wheelStep', () => {
        it('returns 0 for sub-threshold noise', () => {
            expect(wheelStep(5)).toBe(0);
            expect(wheelStep(-10)).toBe(0);
            expect(wheelStep(0)).toBe(0);
        });
        it('returns 1 for downward/forward wheel scroll', () => {
            expect(wheelStep(20)).toBe(1);
            expect(wheelStep(100)).toBe(1);
        });
        it('returns -1 for upward/backward wheel scroll', () => {
            expect(wheelStep(-20)).toBe(-1);
            expect(wheelStep(-100)).toBe(-1);
        });
        it('safely handles NaN', () => {
            expect(wheelStep(NaN)).toBe(0);
        });
    });

    describe('isPointerActivation', () => {
        it('returns false for undefined or Gamepad button events', () => {
            expect(isPointerActivation(undefined)).toBe(false);
            expect(isPointerActivation(null)).toBe(false);
            expect(isPointerActivation({ detail: { button: 0 } })).toBe(false);
        });
        it('returns true for mouse and pointer click events', () => {
            expect(isPointerActivation({ type: 'click' })).toBe(true);
            expect(isPointerActivation({ pointerType: 'mouse' })).toBe(true);
            expect(isPointerActivation({ pointerType: 'touch' })).toBe(true);
            expect(isPointerActivation({ clientX: 100, clientY: 250 })).toBe(true);
        });
    });
});

describe('greyedOut', () => {
    it('greys a game not installed here, never an installed one or a non-Steam shortcut', () => {
        expect(greyedOut({ installed: false })).toBe(true);
        expect(greyedOut({ installed: true })).toBe(false);
        expect(greyedOut({ installed: false, shortcut: true })).toBe(false);
    });
});
