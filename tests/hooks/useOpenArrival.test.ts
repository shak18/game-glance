import { describe, expect, it } from 'vitest';
import { arrivalHoldMs } from '../../src/hooks/useOpenArrival';
import { ARRIVE_BLUR_MS } from '../../src/styles/themeCss';
import { OPEN_TIMINGS } from '../../src/home/motion';

describe('arrivalHoldMs', () => {
    it("keeps the arriving stylesheet until the glass has grown its blur (dropping it mid-way cancels the blur's transition)", () => {
        expect(ARRIVE_BLUR_MS).toBe(600);
        expect(arrivalHoldMs()).toBe(Math.max(OPEN_TIMINGS.reveal, ARRIVE_BLUR_MS));
        expect(arrivalHoldMs()).toBeGreaterThanOrEqual(ARRIVE_BLUR_MS);
    });
});
