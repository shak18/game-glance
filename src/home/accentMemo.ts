import { browserStores, customArtVersion } from './artwork';

/**
 * A game's colour remembered with the version of the art it came from: once that art changes (SteamGridDB, #32) the
 * colour is forgotten, so it is sampled again. Otherwise a plain Map (the warm-up and the page use it as one).
 */
export class ArtKeyedMemo extends Map<number, string> {
    private readonly versions = new Map<number, number>();

    constructor(private readonly versionOf: (appId: number) => number) {
        super();
    }

    override get(appId: number): string | undefined {
        return this.fresh(appId) ? super.get(appId) : undefined;
    }

    override has(appId: number): boolean {
        return this.fresh(appId);
    }

    override set(appId: number, color: string): this {
        this.versions.set(appId, this.versionOf(appId));
        return super.set(appId, color);
    }

    override delete(appId: number): boolean {
        this.versions.delete(appId);
        return super.delete(appId);
    }

    override clear(): void {
        this.versions.clear();
        super.clear();
    }

    private fresh(appId: number): boolean {
        if (!super.has(appId)) return false;
        if (this.versions.get(appId) === this.versionOf(appId)) return true;
        this.delete(appId);
        return false;
    }
}

/**
 * Each game's accent colour once known this session, one memo for Spotlight Home (its warm-up and selections) and the
 * game page: the page's first frame then has the colour Home already showed (with its own memo it drew Steam's default
 * green on a game's first open until its lookup answered).
 */
export const accentMemo: Map<number, string> = new ArtKeyedMemo((appId) => customArtVersion(appId, browserStores));

/** The page's accent: the one it looked up itself once that answers, until then the one already known. */
export function knownAccent(loaded: string | undefined, appId: number): string | undefined {
    return loaded ?? accentMemo.get(appId);
}
