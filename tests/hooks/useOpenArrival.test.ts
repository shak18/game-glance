import { describe, expect, it } from 'vitest';
import { arrivalHoldMs } from '../../src/hooks/useOpenArrival';
import { OPEN_TIMINGS } from '../../src/home/motion';

describe('arrivalHoldMs', () => {
    it("keeps the arriving stylesheet until the page's new parts have faded in (the glass arrives blurred, nothing to wait for)", () => {
        expect(arrivalHoldMs()).toBe(OPEN_TIMINGS.reveal);
    });
});
