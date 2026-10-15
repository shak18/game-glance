import { describe, expect, it, vi } from 'vitest';
import { formatAchievements, formatHours, minutesToHours, steamLanguageToLocale } from '../../src/logic/format';

describe('formatHours', () => {
    it('uses one decimal with the locale separator', () => {
        expect(formatHours(51.7, 'nl-NL')).toBe('51,7 h');
        expect(formatHours(103.84, 'en-US')).toBe('103.8 h');
    });
    it('drops the decimal for whole numbers', () => {
        expect(formatHours(18, 'en-US')).toBe('18 h');
        expect(formatHours(17.96, 'en-US')).toBe('18 h');
    });
    it('handles tiny, zero and invalid values', () => {
        expect(formatHours(1 / 60, 'nl-NL')).toBe('< 0,1 h');
        expect(formatHours(0, 'en-US')).toBe('0 h');
        expect(formatHours(Number.NaN, 'en-US')).toBe('0 h');
        expect(formatHours(-3, 'en-US')).toBe('0 h');
    });
    it('groups large numbers', () => {
        expect(formatHours(1234.5, 'en-US')).toBe('1,234.5 h');
        expect(formatHours(1234.5, 'de-DE')).toBe('1.234,5 h');
    });
});

describe('minutesToHours', () => {
    it('converts and clamps', () => {
        expect(minutesToHours(90)).toBe(1.5);
        expect(minutesToHours(-5)).toBe(0);
        expect(minutesToHours(Number.NaN)).toBe(0);
    });
});

describe('steamLanguageToLocale', () => {
    it('maps Steam language names and falls back to en-US', () => {
        expect(steamLanguageToLocale('dutch')).toBe('nl-NL');
        expect(steamLanguageToLocale('English')).toBe('en-US');
        expect(steamLanguageToLocale('schinese')).toBe('zh-CN');
        expect(steamLanguageToLocale('klingon')).toBe('en-US');
    });
});

describe('formatAchievements', () => {
    it('one form everywhere (Home, the Clean panel and the Spotlight card), so the open transition never rewrites it', () => {
        expect(formatAchievements({ achieved: 4, total: 13 })).toBe('4 / 13');
    });
});

describe('formatHours reuses its number formatter', () => {
    it('builds one Intl.NumberFormat per locale and decimals, not one per call (Home formats on every L1/R1 step)', () => {
        const spy = vi.spyOn(Intl, 'NumberFormat');
        try {
            for (let i = 0; i < 5; i++) formatHours(12.5 + i, 'sv-SE');
            for (let i = 0; i < 5; i++) formatHours(12 + i, 'sv-SE');
            expect(spy.mock.calls.length).toBeLessThanOrEqual(2);
            expect(formatHours(12.5, 'sv-SE')).toBe('12,5 h');
        } finally {
            spy.mockRestore();
        }
    });
});
