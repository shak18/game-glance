import { describe, expect, it } from 'vitest';
import {
    avatarView,
    connectionKind,
    formatClock,
    msToNextMinute,
    personaDot,
    prefers24Hour,
    protoFields,
    readBattery,
    readConnectivity,
    readNetworkDevices,
    readSelfPersona,
    statusPlacement,
    statusScale,
    toBytes,
    PERSONA_DOT_COLOURS,
} from '../../src/library/statusItems';

const varint = (n: number): number[] => {
    const bytes: number[] = [];
    let v = n;
    while (v > 0x7f) {
        bytes.push((v & 0x7f) | 0x80);
        v >>>= 7;
    }
    bytes.push(v);
    return bytes;
};

const field = (n: number, wire: number, data: number[]): number[] => [...varint((n << 3) | wire), ...data];
const varintField = (n: number, val: number) => field(n, 0, varint(val));
const bytesField = (n: number, bytes: number[]) => field(n, 2, [...varint(bytes.length), ...bytes]);

describe('statusItems: clock', () => {
    it('formats 24-hour clock with leading zeros', () => {
        const d = new Date(2026, 0, 1, 9, 5);
        expect(formatClock(d, true)).toBe('09:05');
        const afternoon = new Date(2026, 0, 1, 14, 30);
        expect(formatClock(afternoon, true)).toBe('14:30');
    });

    it('formats 12-hour clock with AM and PM', () => {
        const d = new Date(2026, 0, 1, 9, 5);
        expect(formatClock(d, false)).toBe('9:05 AM');
        const midnight = new Date(2026, 0, 1, 0, 15);
        expect(formatClock(midnight, false)).toBe('12:15 AM');
        const afternoon = new Date(2026, 0, 1, 14, 30);
        expect(formatClock(afternoon, false)).toBe('2:30 PM');
    });

    it('calculates msToNextMinute accurately', () => {
        const d = new Date(2026, 0, 1, 10, 0, 45, 500);
        expect(msToNextMinute(d)).toBe(14500);
    });

    it('prefers24Hour respects Steam setting store or locale', () => {
        expect(prefers24Hour({ settingsStore: { m_FriendSettings: { b24HourClock: true } } }, true)).toBe(true);
        expect(prefers24Hour({ settingsStore: { m_FriendSettings: { b24HourClock: false } } }, false)).toBe(false);
        expect(prefers24Hour({}, false)).toBe(true); // localeHour12 false -> 24h
        expect(prefers24Hour({}, true)).toBe(false); // localeHour12 true -> 12h
    });
});

describe('statusItems: battery', () => {
    it('reads battery percentage, charging and low status', () => {
        expect(readBattery({ bHasBattery: true, flLevel: 0.85, eBatteryState: 1, eACState: 1 })).toEqual({
            percent: 85,
            charging: false,
            low: false,
        });

        expect(readBattery({ bHasBattery: true, flLevel: 0.15, eBatteryState: 1, eACState: 1 })).toEqual({
            percent: 15,
            charging: false,
            low: true,
        });

        expect(readBattery({ bHasBattery: true, flLevel: 0.15, eBatteryState: 2, eACState: 2 })).toEqual({
            percent: 15,
            charging: true,
            low: false,
        });
    });

    it('returns null when device has no battery or invalid payload', () => {
        expect(readBattery({ bHasBattery: false })).toBeNull();
        expect(readBattery(null)).toBeNull();
        expect(readBattery({})).toBeNull();
    });
});

describe('statusItems: network & connectivity', () => {
    it('decodes protobuf fields and network devices', () => {
        const wiredDevice = bytesField(9, varintField(1, 1));
        const wifiDevice = bytesField(10, bytesField(1, varintField(4, 1)));
        const devicesMsg = bytesField(1, [...wiredDevice, ...wifiDevice]);
        const bytes = new Uint8Array(devicesMsg);

        const decoded = readNetworkDevices(bytes);
        expect(decoded).toEqual({ wifi: true, wired: true });
    });

    it('reads connectivity test results', () => {
        expect(readConnectivity({ eConnectivityTestResult: 1 })).toBe(true);
        expect(readConnectivity({ eConnectivityTestResult: 4 })).toBe(false);
        expect(readConnectivity({ eConnectivityTestResult: 0 })).toBeNull();
    });

    it('resolves connectionKind prioritizing wired over wifi and offline verdict', () => {
        expect(connectionKind(true, { wired: true, wifi: true })).toBe('wired');
        expect(connectionKind(true, { wired: false, wifi: true })).toBe('wifi');
        expect(connectionKind(false, { wired: true, wifi: true })).toBe('offline');
        expect(connectionKind(null, { wired: false, wifi: true })).toBe('wifi');
        expect(connectionKind(null, null)).toBeNull();
    });
});

describe('statusItems: persona and profile avatar', () => {
    const HASH = 'e4c5e2ab869df41657cb2108f0d01723d0ba7ba7';
    const mockStore = (state: number, inGame: boolean, avatarHash?: string) => ({
        friendStore: {
            m_FriendsUIFriendStore: {
                m_eUserPersonaState: state,
                self: {
                    persona: {
                        m_ePersonaState: state,
                        m_unGamePlayedAppID: inGame ? 730 : 0,
                        m_strAvatarHash: avatarHash,
                    },
                },
            },
        },
    });

    it('reads persona state and avatar hash', () => {
        const p = readSelfPersona(mockStore(1, true, HASH));
        expect(p).toEqual({ state: 1, inGame: true, avatarHash: HASH });
    });

    it('resolves persona dot based on inGame and online/away/off states', () => {
        expect(personaDot({ state: 1, inGame: false })).toBe('online');
        expect(personaDot({ state: 0, inGame: true })).toBe('online');
        expect(personaDot({ state: 3, inGame: false })).toBe('away');
        expect(personaDot({ state: 0, inGame: false })).toBe('off');
        expect(personaDot(null)).toBeNull();
    });

    it('resolves avatarView with ring color matching status dot', () => {
        const selfOnline = { state: 1, inGame: false, avatarHash: HASH };
        const selfAway = { state: 3, inGame: false, avatarHash: HASH };

        expect(avatarView(selfOnline, true)).toEqual({
            url: `https://avatars.steamstatic.com/${HASH}_medium.jpg`,
            ring: PERSONA_DOT_COLOURS.online,
        });

        expect(avatarView(selfAway, true)).toEqual({
            url: `https://avatars.steamstatic.com/${HASH}_medium.jpg`,
            ring: PERSONA_DOT_COLOURS.away,
        });

        expect(avatarView(selfOnline, false)).toBeNull();
        expect(avatarView({ state: 1, inGame: false, avatarHash: 'invalid' }, true)).toBeNull();
    });
});

describe('statusItems: placement and scale', () => {
    it('calculates statusPlacement and scale within finite boundaries', () => {
        const place = statusPlacement(1);
        expect(place.right).toBeGreaterThan(0);
        expect(place.centreY).toBeGreaterThan(0);
        expect(statusScale(1)).toBe(1);
        expect(statusScale(0.5)).toBe(2);
    });
});
