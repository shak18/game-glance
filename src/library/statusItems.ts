/**
 * Status bar helpers: clock formatting, battery reading, connectivity resolution,
 * and Steam persona avatar hashing for Spotlight Library.
 */

export const LOW_BATTERY = 0.2;
export const STATUS_FADE_MS = 150;

export interface BatteryView {
    percent: number;
    charging: boolean;
    low: boolean;
}

export type ConnectionKind = 'wifi' | 'wired' | 'offline';

export function formatClock(date: Date, hours24: boolean): string {
    const h = date.getHours();
    const mm = String(date.getMinutes()).padStart(2, '0');
    if (hours24) return `${String(h).padStart(2, '0')}:${mm}`;
    return `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
}

export function msToNextMinute(date: Date): number {
    return Math.max(1, 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds()));
}

function clockChoice(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (value === 0 || value === 1) return value === 1;
    return null;
}

type ClockGlobals = {
    settingsStore?: { m_FriendSettings?: { b24HourClock?: unknown } };
    friendStore?: { m_ChatStore?: { m_SettingsStore?: Record<string, unknown> } };
};

export function prefers24Hour(globals: unknown, localeHour12: boolean | undefined): boolean {
    try {
        const g = globals as ClockGlobals | null | undefined;
        const current = clockChoice(g?.settingsStore?.m_FriendSettings?.b24HourClock);
        if (current !== null) return current;
        const chat = g?.friendStore?.m_ChatStore?.m_SettingsStore;
        for (const key of ['m_FriendsSettings', 'FriendsSettings']) {
            const older = clockChoice((chat?.[key] as { b24HourClock?: unknown } | undefined)?.b24HourClock);
            if (older !== null) return older;
        }
    } catch {
        // fall through to locale default
    }
    return localeHour12 === false;
}

const AC_CONNECTED = [2, 3];
const BATTERY_CHARGING = 2;
const BATTERY_FULL = 3;

export function readBattery(raw: unknown): BatteryView | null {
    if (!raw || typeof raw !== 'object') return null;
    const b = raw as { bHasBattery?: unknown; eACState?: unknown; eBatteryState?: unknown; flLevel?: unknown };
    if (b.bHasBattery !== true) return null;
    if (typeof b.flLevel !== 'number' || !Number.isFinite(b.flLevel)) return null;
    const level = Math.min(1, Math.max(0, b.flLevel));
    const charging =
        b.eBatteryState === BATTERY_CHARGING ||
        (b.eBatteryState === BATTERY_FULL && AC_CONNECTED.includes(Number(b.eACState)));
    return { percent: Math.round(level * 100), charging, low: !charging && level < LOW_BATTERY };
}

export function toBytes(raw: unknown): Uint8Array | null {
    try {
        if (raw instanceof Uint8Array) return raw;
        if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
        if (ArrayBuffer.isView(raw)) return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
        if (typeof raw === 'string' && typeof atob === 'function') {
            return Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
        }
    } catch {
        // not valid bytes
    }
    return null;
}

export interface ProtoField {
    n: number;
    varint?: number;
    bytes?: Uint8Array;
}

export function protoFields(buf: Uint8Array): ProtoField[] {
    const fields: ProtoField[] = [];
    let i = 0;
    const varint = () => {
        let value = 0;
        let shift = 0;
        while (i < buf.length) {
            const byte = buf[i++];
            value |= (byte & 0x7f) << shift;
            shift += 7;
            if ((byte & 0x80) === 0) return value;
        }
        throw new Error('varint too long');
    };
    while (i < buf.length) {
        const key = varint();
        const n = Math.floor(key / 8);
        const wire = key % 8;
        if (wire === 0) fields.push({ n, varint: varint() });
        else if (wire === 2) {
            const len = varint();
            if (i + len > buf.length) throw new Error('truncated field');
            fields.push({ n, bytes: buf.subarray(i, i + len) });
            i += len;
        } else if (wire === 1) i += 8;
        else if (wire === 5) i += 4;
        else throw new Error(`unsupported wire type ${wire}`);
        if (i > buf.length) throw new Error('truncated fixed field');
    }
    return fields;
}

export interface NetworkDevices {
    wifi: boolean;
    wired: boolean;
}

export function readNetworkDevices(raw: unknown): NetworkDevices | null {
    const bytes = toBytes(raw);
    if (!bytes) return null;
    try {
        const result: NetworkDevices = { wifi: false, wired: false };
        for (const device of protoFields(bytes)) {
            if (device.n !== 1 || !device.bytes) continue;
            for (const part of protoFields(device.bytes)) {
                if (part.n === 9 && part.bytes) {
                    if (protoFields(part.bytes).some((f) => f.n === 1 && f.varint === 1)) result.wired = true;
                } else if (part.n === 10 && part.bytes) {
                    for (const ap of protoFields(part.bytes)) {
                        if (ap.n === 1 && ap.bytes && protoFields(ap.bytes).some((f) => f.n === 4 && f.varint === 1)) {
                            result.wifi = true;
                        }
                    }
                }
            }
        }
        return result;
    } catch {
        return null;
    }
}

const CONNECTED = 1;
const NOT_CONNECTED = [2, 3, 4, 5, 6];

export function readConnectivity(raw: unknown): boolean | null {
    if (!raw || typeof raw !== 'object') return null;
    const result = (raw as { eConnectivityTestResult?: unknown }).eConnectivityTestResult;
    if (result === CONNECTED) return true;
    if (typeof result === 'number' && NOT_CONNECTED.includes(result)) return false;
    return null;
}

export function connectionKind(online: boolean | null, devices: NetworkDevices | null): ConnectionKind | null {
    const deviceUp = devices && (devices.wired || devices.wifi) ? true : null;
    const up = online ?? deviceUp;
    if (up === null) return null;
    if (!up) return 'offline';
    if (devices?.wired) return 'wired';
    return 'wifi';
}

export type PersonaDot = 'online' | 'away' | 'off';

export const PERSONA_DOT_COLOURS: Record<PersonaDot, string> = {
    online: '#57cbde',
    away: '#57cbde',
    off: '#898989',
};

export const PERSONA_DOT = { size: 12, gap: 10 } as const;
export const STATUS_BAR = { right: 32, centreY: 32, gap: 10 } as const;
export const STATUS_LAYOUT = { pillFromRight: 52, centreFromTop: 20 } as const;

export interface StatusPlacement {
    right: number;
    centreY: number;
    gap: number;
}

export function statusScale(canvasScale: number): number {
    return Number.isFinite(canvasScale) && canvasScale > 0 && canvasScale < 1
        ? Math.round((1 / canvasScale) * 1000) / 1000
        : 1;
}

export function statusPlacement(canvasScale: number): StatusPlacement {
    if (!(canvasScale > 0) || !Number.isFinite(canvasScale)) return STATUS_BAR;
    const tenth = (n: number) => Math.round(n * 10) / 10;
    const e = canvasScale * statusScale(canvasScale);
    const centre = STATUS_LAYOUT.pillFromRight / 2;
    return {
        right: tenth((centre - (PERSONA_DOT.size / 2) * e) / canvasScale),
        centreY: tenth(STATUS_LAYOUT.centreFromTop / canvasScale),
        gap: tenth(centre / e - PERSONA_DOT.size / 2),
    };
}

export interface SelfPersona {
    state: number;
    inGame: boolean;
    avatarHash?: string;
}

export function isOnlineState(state: number): boolean {
    return state > 0;
}

export function isAwayState(state: number): boolean {
    return state === 3 || state === 4;
}

export function readSelfPersona(globals: unknown): SelfPersona | null {
    try {
        type Self = { persona?: Record<string, unknown> } | undefined;
        type Ui = { m_eUserPersonaState?: unknown; self?: Self; m_self?: Self; m_strAvatarHash?: string };
        const store = (globals as { friendStore?: Ui & { m_FriendsUIFriendStore?: Ui } })?.friendStore;
        const ui = store?.m_FriendsUIFriendStore;
        const persona = (ui?.self ?? ui?.m_self ?? store?.self ?? store?.m_self)?.persona;
        const chosen = ui?.m_eUserPersonaState ?? store?.m_eUserPersonaState;
        const state = typeof chosen === 'number' ? chosen : persona?.m_ePersonaState;
        if (typeof state !== 'number' || !Number.isFinite(state)) return null;
        const avatarHash =
            (persona?.m_strAvatarHash as string | undefined) ?? (ui?.m_strAvatarHash as string | undefined);
        return { state, inGame: Number(persona?.m_unGamePlayedAppID) > 0, avatarHash };
    } catch {
        return null;
    }
}

export function personaDot(self: SelfPersona | null): PersonaDot | null {
    if (!self) return null;
    if (self.inGame) return 'online';
    if (!isOnlineState(self.state)) return 'off';
    return isAwayState(self.state) ? 'away' : 'online';
}

export function avatarView(self: SelfPersona | null, enabled: boolean): { url: string; ring: string } | null {
    const dot = personaDot(self);
    const hash = self?.avatarHash;
    if (!enabled || !dot || !hash || !/^[0-9a-f]{40}$/.test(hash) || /^0+$/.test(hash)) return null;
    return { url: `https://avatars.steamstatic.com/${hash}_medium.jpg`, ring: PERSONA_DOT_COLOURS[dot] };
}
