import { RefObject, useEffect, useState } from 'react';
import { clearOpen, OpenIntent, openPending, reportOpenReady } from '../data/openIntent';
import { pageReady } from '../styles/pageReady';
import { pageArrivalSelectors } from '../styles/theme';
import { ArrivalPhase, runArrival } from './openArrival';

export { arrivalHoldMs } from './openArrival';

/**
 * The game page's side of Spotlight Home's open transition (data/openIntent). Read on the page's first render, so its
 * very first frame is already in the arriving state: until the page is ready (styles/pageReady, checked every frame)
 * its new parts (or, mode 'all', the whole page but its art) stay hidden; then it tells Home (which lets its frozen
 * copy fade) and they fade in (hooks/openArrival). Null when there is no open to arrive from, once it is over, or when
 * the page has moved on to another game: the page is as always.
 */
export function useOpenArrival(ref: RefObject<HTMLElement | null>, appId: number): { intent: OpenIntent; revealed: boolean } | null {
    const [opened] = useState(() => ({ appId, intent: openPending(appId) }));
    const intent = opened.appId === appId ? opened.intent : null;
    const [phase, setPhase] = useState<ArrivalPhase>(() => (opened.intent && opened.intent.look !== 'steam' ? 'hidden' : 'done'));

    // Once per page: the arrival's own timers (a phase change must not cancel them, or the page never finishes arriving).
    useEffect(() => {
        if (phase !== 'hidden' || !opened.intent) return undefined;
        const win = ref.current?.ownerDocument?.defaultView ?? window;
        // Home drew the description as it opened: the page's must be there before Home's copy fades onto it.
        const sel = { ...pageArrivalSelectors(), desc: opened.intent.homeDesc ? '.gg-desc' : null };
        return runArrival({
            ready: () => pageReady(ref.current?.ownerDocument as unknown as Parameters<typeof pageReady>[0], sel),
            now: () => Date.now(),
            frame: (cb) => win.requestAnimationFrame(cb),
            cancelFrame: (id) => win.cancelAnimationFrame(id as number),
            setTimer: (cb, ms) => setTimeout(cb, ms),
            clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
            onReady: () => reportOpenReady(opened.appId),
            onPhase: (next) => {
                setPhase(next);
                if (next === 'done') clearOpen();
            },
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!intent || intent.look === 'steam' || phase === 'done') return null;
    return { intent, revealed: phase === 'revealing' };
}
