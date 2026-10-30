import { fetchNoCors } from '@decky/api';
import { HeroicRef, parseHeroicLaunch } from '../logic/heroic';
import { htmlToText } from '../logic/text';
import { attempt } from './attempt';
import { Cache, cache as defaultCache, TTL } from './cache';

export interface GameInfo {
    appId: number;
    name: string;
    sortAs?: string;
    isShortcut: boolean;
    playedMinutes: number;
    achievements: { achieved: number; total: number } | null;
    heroic: HeroicRef | null; // set when Heroic Games Launcher added this shortcut
}

const SHORTCUT_APP_TYPE = 1073741824;
const FIRST_SHORTCUT_APP_ID = 0x80000000;

type AnyRecord = Record<string, unknown> | undefined | null;

/**
 * Minutes played: the larger of the app overview's (`minutes_playtime_forever`, Steam's servers' count) and the app
 * details' (`nPlaytimeForever`). A non-Steam shortcut's play time is only ever local (localconfig.vdf's Playtime under its
 * signed app id), which Steam loads into its details; its overview's stays 0 (#52: EmulationStationDE on the Deck read 0
 * here and 21 on Steam's own page). Junk counts as 0. Pure.
 */
export function playedMinutesOf(overviewMinutes: unknown, detailsMinutes: unknown): number {
    const minutes = (v: unknown) => {
        const n = Number(v ?? 0);
        return Number.isFinite(n) && n > 0 ? n : 0;
    };
    return Math.max(minutes(overviewMinutes), minutes(detailsMinutes));
}

export function readGameInfo(overview: unknown, details: unknown): GameInfo {
    const o = overview as AnyRecord;
    const d = details as AnyRecord;
    const appId = Number(o?.appid ?? 0) || 0;
    const isShortcut = o?.app_type === SHORTCUT_APP_TYPE || appId >= FIRST_SHORTCUT_APP_ID;
    const a = d?.achievements as AnyRecord;
    const total = Number(a?.nTotal ?? 0);
    const achievements = !isShortcut && Number.isFinite(total) && total > 0
        ? { achieved: Number(a?.nAchieved ?? 0) || 0, total }
        : null;

    const rawSortAs =
        (typeof o?.sort_as === 'string' && o.sort_as) ||
        (typeof (o as any)?.sortAs === 'string' && (o as any).sortAs) ||
        (typeof (o as any)?.m_strSortAs === 'string' && (o as any).m_strSortAs) ||
        (typeof (o as any)?.strSortAs === 'string' && (o as any).strSortAs) ||
        (typeof (d as any)?.sort_as === 'string' && (d as any).sort_as) ||
        (typeof (d as any)?.sortAs === 'string' && (d as any).sortAs) ||
        (typeof (d as any)?.m_strSortAs === 'string' && (d as any).m_strSortAs) ||
        (typeof (d as any)?.strSortAs === 'string' && (d as any).strSortAs) ||
        undefined;
    const sortAs = rawSortAs ? rawSortAs.trim() : undefined;

    const info: GameInfo = {
        appId,
        name: typeof o?.display_name === 'string' ? o.display_name : '',
        isShortcut,
        playedMinutes: playedMinutesOf(
            o?.minutes_playtime_forever ?? (o as any)?.m_iPlaytimeForever ?? (o as any)?.nPlaytimeForever,
            d?.nPlaytimeForever ?? (d as AnyRecord)?.m_iPlaytimeForever ?? (d as AnyRecord)?.minutes_playtime_forever
        ),
        achievements,
        heroic: isShortcut ? parseHeroicLaunch(d?.strShortcutLaunchOptions as string | undefined) : null,
    };
    if (sortAs && sortAs.length > 0) {
        info.sortAs = sortAs;
    }
    return info;
}

export function parseStoreDescription(json: unknown, appId: number): string | null {
    const entry = (json as Record<string, AnyRecord> | null)?.[String(appId)];
    if (!entry || entry.success !== true) return null;
    const raw = (entry.data as AnyRecord)?.short_description;
    if (typeof raw !== 'string') return null;
    const text = htmlToText(raw);
    return text.length > 0 ? text : null;
}

interface DescriptionDeps {
    cache: Cache;
    fetcher: (url: string) => Promise<{ status: number; json(): Promise<unknown> }>;
}

const defaultDeps: DescriptionDeps = { cache: defaultCache, fetcher: (url) => fetchNoCors(url) };

export async function getDescription(appId: number, lang: string, deps: DescriptionDeps = defaultDeps): Promise<string | null> {
    const key = `desc:${appId}:${lang}`;
    const cached = await attempt('cache read', () => deps.cache.get<{ text: string | null }>(key), null);
    if (cached) return cached.text;
    try {
        const response = await deps.fetcher(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=${encodeURIComponent(lang)}`);
        if (response.status !== 200) return null;
        const text = parseStoreDescription(await response.json(), appId);
        await attempt('cache write', () => deps.cache.put(key, { text }, TTL.description), undefined);
        return text;
    } catch {
        return null;
    }
}

let languagePromise: Promise<string> | null = null;
let resolvedLanguage: string | undefined;

export function getSteamLanguage(): Promise<string> {
    if (!languagePromise) {
        languagePromise = (async () => {
            let lang = 'english';
            try {
                const steamClient = (globalThis as { SteamClient?: { Settings?: { GetCurrentLanguage?: () => Promise<string> } } }).SteamClient;
                const value = await steamClient?.Settings?.GetCurrentLanguage?.();
                if (typeof value === 'string' && value.length > 0) lang = value;
            } catch {
                // keep english
            }
            resolvedLanguage = lang;
            return lang;
        })();
    }
    return languagePromise;
}

/** The Steam language once `getSteamLanguage()` has resolved (started at plugin load), else undefined. */
export function peekSteamLanguage(): string | undefined {
    return resolvedLanguage;
}
