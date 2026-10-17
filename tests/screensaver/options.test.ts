import { describe, expect, it } from 'vitest';
import { readScreensaverOptions, SCREENSAVER_DEFAULTS } from '../../src/screensaver/options';

describe('screensaver options', () => {
    it('defaults: on, with the logo, the status bar and the stats', () => {
        expect(readScreensaverOptions(undefined)).toEqual({ enabled: true, logo: true, statusBar: true, stats: true });
    });
    it('reads stored booleans and drops anything else (the old Clean, Fill and HowLongToBeat switches too)', () => {
        expect(readScreensaverOptions({ logo: false, stats: 'yes', clean: true, fill: true, hltb: false })).toEqual({ ...SCREENSAVER_DEFAULTS, logo: false });
    });
    it('every overlay off: only the art', () => {
        expect(readScreensaverOptions({ logo: false, statusBar: false, stats: false })).toEqual({ enabled: true, logo: false, statusBar: false, stats: false });
    });
});
