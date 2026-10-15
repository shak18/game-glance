/**
 * Art resolved once per game and remembered for the session: the urls are tried in order and the first that loads (and
 * is decoded, by the loader) is drawn. The loader may hand back another url to draw (home/artShrink: a smaller copy of
 * an oversized file). Used by the wide recents card, which drew all its candidate files stacked as backgrounds: each step
 * loaded and decoded the landscape art and the game's full hero (3840 px) under it.
 */

/** The box art is drawn in (device px), handed to the loader. */
export interface ArtBox {
    width: number;
    height: number;
}

/** What a url loads as: the url to draw (itself, or a smaller copy), or null when it does not load. */
export type ArtLoader = (url: string, box?: ArtBox) => Promise<string | null>;

export interface ArtResolver {
    /** The art `id` ended on for this url list: a url, null for none, undefined when not looked up yet. */
    known(id: number, urls: string[]): string | null | undefined;
    resolve(id: number, urls: string[], box?: ArtBox): Promise<string | null>;
    /** What `id` last ended on, whatever its url list (undefined: never looked up): drawn while a new list is looked up. */
    last(id: number): string | null | undefined;
}

export function createArtResolver(load: ArtLoader, max: number): ArtResolver {
    const memo = new Map<number, { key: string; url: string | null }>();
    const inFlight = new Map<string, Promise<string | null>>();
    const keyOf = (urls: string[]) => urls.join('|');
    const remember = (id: number, key: string, url: string | null) => {
        memo.delete(id);
        memo.set(id, { key, url });
        while (memo.size > max) memo.delete(memo.keys().next().value as number);
    };
    const known = (id: number, urls: string[]) => {
        const entry = memo.get(id);
        return entry && entry.key === keyOf(urls) ? entry.url : undefined;
    };
    const lookup = async (urls: string[], box?: ArtBox) => {
        for (const url of urls) {
            try {
                const drawn = await load(url, box);
                if (drawn) return drawn;
            } catch {
                // the next one
            }
        }
        return null;
    };
    return {
        known,
        last: (id) => memo.get(id)?.url,
        resolve(id, urls, box) {
            const hit = known(id, urls);
            if (hit !== undefined) return Promise.resolve(hit);
            const key = keyOf(urls);
            const flight = `${id}|${key}`;
            const pending = inFlight.get(flight);
            if (pending) return pending;
            const run = lookup(urls, box).then((url) => {
                remember(id, key, url);
                return url;
            }).finally(() => inFlight.delete(flight));
            inFlight.set(flight, run);
            return run;
        },
    };
}

/** The wide card in device px (its canvas size times device px per canvas px): the size its art is loaded at. Pure. */
export function cardBox(geometry: { wideW: number; capsuleH: number }, perCanvas: number): ArtBox {
    return { width: Math.round(geometry.wideW * perCanvas), height: Math.round(geometry.capsuleH * perCanvas) };
}
