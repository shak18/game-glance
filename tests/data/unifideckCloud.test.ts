import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetUnifideckPlaytime } from '../../src/data/unifideckPlaytime';
import { pageCloudNeeded, parseCloudStatus, resetUnifideckCloud, unifideckCloudForApp, unifideckCloudState } from '../../src/data/unifideckCloud';

const base = { supported: true, in_progress: false, cloud_supported: null, save_path_resolved: true, has_local_saves: true, has_cloud_saves: true, local_snapshot: { timestamp: 1000 }, remote_snapshot: { timestamp: 1001 } };

describe('unifideckCloudState (Unifideck’s own button logic)', () => {
    it('local and cloud within 2 s: in sync, green', () => {
        expect(unifideckCloudState(base)).toMatchObject({ tone: 'ok', icon: { uploaded: true }, action: 'none', label: 'Cloud saves: synced' });
    });
    it('a save that differs by more than 2 s, a cloud-only save, or a local-only save: busy tone with the save icon', () => {
        expect(unifideckCloudState({ ...base, remote_snapshot: { timestamp: 1010 } })).toMatchObject({ tone: 'busy', icon: { save: true } });
        expect(unifideckCloudState({ ...base, has_local_saves: false })?.label).toBe('Cloud saves: out of sync');
        expect(unifideckCloudState({ ...base, has_cloud_saves: false, remote_snapshot: null })?.label).toBe('Cloud saves: out of sync');
    });
    it('syncing wins; an unresolved save folder is flagged; nothing saved yet is neutral', () => {
        expect(unifideckCloudState({ ...base, in_progress: true })?.label).toBe('Cloud saves: syncing');
        expect(unifideckCloudState({ ...base, save_path_resolved: false })).toMatchObject({ tone: 'bad', icon: { error: true } });
        expect(unifideckCloudState({ ...base, has_local_saves: false, has_cloud_saves: false, remote_snapshot: null })).toMatchObject({ tone: 'off', icon: {} });
    });
    it('no button for a store without cloud saves, or no status', () => {
        expect(unifideckCloudState({ ...base, supported: false })).toBeNull();
        expect(unifideckCloudState(null)).toBeNull();
    });
    it("a game without cloud support keeps its button, dimmed, as Unifideck's own (it showed none on Home)", () => {
        expect(unifideckCloudState({ ...base, cloud_supported: false })).toMatchObject({ tone: 'off', unifideck: { icon: 'cloud', ring: null, dim: true, breathe: false } });
    });
});

describe('parseCloudStatus / unifideckCloudForApp', () => {
    beforeEach(() => { resetUnifideckCloud(); resetUnifideckPlaytime(); });
    const key = async () => ({ store: 'gog', id: '1450711444' });
    it('takes the data of a successful reply only', () => {
        expect(parseCloudStatus({ success: true, data: base })).toBe(base);
        for (const bad of [{ success: false, data: base }, { success: true }, null, 'x']) expect(parseCloudStatus(bad)).toBeNull();
    });
    it('asks get_cloud_save_status with the store and id, once for concurrent calls', async () => {
        const b = { call: vi.fn(async () => ({ success: true, data: base })) };
        const deps = { backend: b, key, now: () => 1 };
        const [a, c] = await Promise.all([unifideckCloudForApp(5, deps), unifideckCloudForApp(5, deps)]);
        expect(a?.tone).toBe('ok');
        expect(c?.tone).toBe('ok');
        expect(b.call).toHaveBeenCalledTimes(1);
        expect(b.call).toHaveBeenCalledWith('loader/call_plugin_method', 'Unifideck', 'get_cloud_save_status', 'gog', '1450711444');
    });
    it('is null for a non-Unifideck shortcut and on errors', async () => {
        expect(await unifideckCloudForApp(6, { backend: { call: vi.fn() }, key: async () => null })).toBeNull();
        expect(await unifideckCloudForApp(7, { backend: { call: vi.fn(async () => { throw new Error('x'); }) }, key })).toBeNull();
    });
});

describe('pageCloudNeeded (our cloud circle on a Unifideck game page)', () => {
    const ok = { tone: 'ok' as const, status: 0, action: 'none' as const, icon: { uploaded: true }, label: 'Cloud saves: Up to date' };
    it("when Unifideck shows none of its own (it draws its button only for an installed game) and Home shows one", () => {
        expect(pageCloudNeeded(false, ok)).toBe(true);
    });
    it("not when Unifideck draws its own (installed), nor without a state, nor before the install state is known", () => {
        expect(pageCloudNeeded(true, ok)).toBe(false);
        expect(pageCloudNeeded(false, null)).toBe(false);
        expect(pageCloudNeeded(undefined, ok)).toBe(false);
        expect(pageCloudNeeded(null, ok)).toBe(false);
    });
});

describe("the Unifideck look (its own cloud button, read 2026-10-11): Home and the page draw it the same", () => {
    const look = (over: object) => unifideckCloudState({ ...base, ...over })?.unifideck;
    it('in sync: its in-sync cloud (a cloud with a check), a green ring', () => {
        expect(look({})).toEqual({ icon: 'insync', ring: 'rgba(34, 197, 94, 0.55)', dim: false, breathe: false });
    });
    it('syncing: the turning arrows, a blue ring (before anything else)', () => {
        expect(look({ in_progress: true, save_path_resolved: false })).toEqual({ icon: 'sync', ring: 'rgba(26, 159, 255, 0.55)', dim: false, breathe: false });
    });
    it('the save folder not found: the plain cloud, a yellow ring', () => {
        expect(look({ save_path_resolved: false })).toEqual({ icon: 'cloud', ring: 'rgba(244, 180, 0, 0.55)', dim: false, breathe: false });
    });
    it('out of sync (cloud only, local only, or apart): the download cloud, breathing green, no ring', () => {
        for (const over of [{ has_local_saves: false }, { has_cloud_saves: false, remote_snapshot: null }, { remote_snapshot: { timestamp: 1010 } }]) {
            expect(look(over)).toEqual({ icon: 'download', ring: null, dim: false, breathe: true });
        }
    });
    it('nothing saved yet: the plain cloud, no ring', () => {
        expect(look({ has_local_saves: false, has_cloud_saves: false, remote_snapshot: null })).toEqual({ icon: 'cloud', ring: null, dim: false, breathe: false });
    });
});
