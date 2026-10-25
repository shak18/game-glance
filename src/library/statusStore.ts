import { LOG_PREFIX } from '../constants';
import {
    BatteryView,
    connectionKind,
    ConnectionKind,
    NetworkDevices,
    readBattery,
    readConnectivity,
    readNetworkDevices,
} from './statusItems';

type Registration = { unregister?(): void } | undefined;
type SystemApi = {
    RegisterForBatteryStateChanges?(cb: (state: unknown) => void): Registration;
    Network?: {
        RegisterForConnectivityTestChanges?(cb: (change: unknown) => void): Registration;
        RegisterForDeviceChanges?(cb: (data: unknown) => void): Registration;
    };
};
const api = () => (globalThis as unknown as { SteamClient?: { System?: SystemApi } }).SteamClient?.System;

export interface StatusState {
    battery: BatteryView | null;
    connection: ConnectionKind | null;
}

let battery: BatteryView | null = null;
let online: boolean | null = null;
let devices: NetworkDevices | null = null;
let state: StatusState = { battery: null, connection: null };
let registrations: Registration[] | null = null;
const listeners = new Set<() => void>();

function guard<T>(what: string, fn: () => T): T | undefined {
    try {
        return fn();
    } catch (error) {
        console.warn(`${LOG_PREFIX} status bar: ${what} failed`, error);
        return undefined;
    }
}

const sameBattery = (a: BatteryView | null, b: BatteryView | null) =>
    a === b || (a !== null && b !== null && a.percent === b.percent && a.charging === b.charging && a.low === b.low);

function refresh() {
    const next: StatusState = { battery, connection: connectionKind(online, devices) };
    if (sameBattery(next.battery, state.battery) && next.connection === state.connection) return;
    state = next;
    listeners.forEach((fn) => guard('a listener', fn));
}

export function startStatus() {
    if (registrations) return;
    const system = api();
    registrations = [
        guard('battery subscription', () =>
            system?.RegisterForBatteryStateChanges?.((raw) => {
                battery = guard('battery state', () => readBattery(raw)) ?? null;
                refresh();
            })
        ),
        guard('connectivity subscription', () =>
            system?.Network?.RegisterForConnectivityTestChanges?.((raw) => {
                const next = guard('connectivity', () => readConnectivity(raw));
                if (next !== null && next !== undefined) online = next;
                refresh();
            })
        ),
        guard('device subscription', () =>
            system?.Network?.RegisterForDeviceChanges?.((raw) => {
                devices = guard('network devices', () => readNetworkDevices(raw)) ?? devices;
                refresh();
            })
        ),
    ];
}

export function stopStatus() {
    for (const r of registrations ?? []) guard('unsubscribe', () => r?.unregister?.());
    registrations = null;
    battery = null;
    online = null;
    devices = null;
    state = { battery: null, connection: null };
}

export const statusState = (): StatusState => state;

export function subscribeStatus(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
