import { browserStores, capsuleUrls, heroUrls, landscapeUrls } from './artwork';
import { displayInfo, loadArt } from './artShrink';
import { ArtBox, cardBox, createArtResolver } from './cardArt';
import { wideArt } from './homeView';
import { CARD_SCALE_HANDHELD, recentsGeometry } from './recentsLayout';

/**
 * The wide recents card's art, per game: the first of its files that loads, decoded (a smaller copy when far too big,
 * home/artShrink), remembered for the session. Shared by the card row (RecentsRow) and the warm-up (useWarmup), which
 * resolves it for every game in the row ahead, so the first time a card widens its art is already there.
 */

const resolver = createArtResolver((url, box) => loadArt(url, box ?? displayInfo()), 48);

function urls(read: () => string[]): string[] {
    try {
        return read();
    } catch {
        return [];
    }
}

/** A game's wide-card files in order (landscape art, then its hero, then its capsule), or null when it has none. */
export function wideCardList(appId: number): string[] | null {
    const cover = urls(() => capsuleUrls(appId, browserStores));
    return wideArt(urls(() => landscapeUrls(appId, browserStores)), urls(() => heroUrls(appId, browserStores)), cover);
}

/** The wide card's size in device px (handheld and docked cards are the same size). */
export function wideCardBox(): ArtBox {
    return cardBox(recentsGeometry(CARD_SCALE_HANDHELD), displayInfo().perCanvas);
}

/** The art known for `list` (a url, or null for none), or undefined when not looked up yet. */
export function knownCardArt(appId: number, list: string[]): string | null | undefined {
    return resolver.known(appId, list);
}

/** What a game's card last showed, whatever its files then (Steam lists another file once it loads the game's details). */
export function lastCardArt(appId: number): string | null | undefined {
    return resolver.last(appId);
}

export function resolveCardArt(appId: number, list: string[], box: ArtBox): Promise<string | null> {
    return resolver.resolve(appId, list, box);
}

/** Whether a game's wide-card art is resolved for its current files (the warm-up skips it). */
export function cardArtKnown(appId: number): boolean {
    const list = wideCardList(appId);
    return list === null || resolver.known(appId, list) !== undefined;
}

/** Resolves a game's wide-card art at the card's size, ahead of its first widening. Never rejects. */
export function warmCardArt(appId: number): Promise<unknown> {
    const list = wideCardList(appId);
    return list ? resolver.resolve(appId, list, wideCardBox()).catch(() => null) : Promise.resolve(null);
}
