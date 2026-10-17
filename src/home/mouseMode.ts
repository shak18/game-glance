/**
 * Mouse mode: while a mouse is the input, the Big Picture document's root carries MOUSE_ATTR, and Home's and the game
 * page's hover looks (homeCss, themeCss: plain :hover) apply only under it. Plain CSS reaches Steam's own buttons on the
 * page, which take no handlers of ours; the attribute keeps a tap's sticky :hover (Chromium leaves one where a finger
 * lifted) and an idle cursor resting on a button while the controller is in use from lighting anything.
 */

/** On the document's root while a mouse is the input. */
export const MOUSE_ATTR = 'data-gg-mouse';

/**
 * Before a focus look of a button: off in mouse mode, as focus outlines are for a mouse elsewhere (Steam puts its focus
 * back on a clicked button when its page closes, which then looked pressed). Inside :where(), so it adds no weight and
 * the look keeps losing to whatever it lost to before (the open transition's states).
 */
export const NOT_MOUSE = `:where(html:not([${MOUSE_ATTR}]))`;

/** The hover ring of everything clickable (the game cards' since phase 2): 2 units of `two`, white at .45. */
export function hoverRing(two: string): string {
    return `0 0 0 ${two} rgba(255,255,255,.45)`;
}

/** What mouseModeAfter reads of an input event. */
export interface ModeInput {
    type: string;
    pointerType?: string;
    buttons?: number;
}

/**
 * Whether mouse mode is on after `input`, from `on`. Pure. Only a mouse moving with no button held starts it (Michael:
 * people move a mouse to see it is live before they drag or click); a mouse's press or drag leaves it as it was. A
 * controller button ends it (Steam sends one as its own vgp_onbuttondown event, never as a key: probed on the Ally), a
 * keyboard's key too, and so does a finger or a pen (no pen hover for now: a pen's
 * tap leaves Chromium's sticky :hover as a finger's does).
 */
export function mouseModeAfter(on: boolean, input: ModeInput): boolean {
    if (input.type === 'keydown' || input.type === 'vgp_onbuttondown') return false;
    if (input.pointerType !== 'mouse') return input.pointerType ? false : on;
    return input.type === 'pointermove' && input.buttons === 0 ? true : on;
}

/** What installMouseMode uses of a document (the tests pass a fake). */
export interface MouseModeDoc {
    documentElement: { setAttribute(name: string, value: string): void; removeAttribute(name: string): void } | null;
    addEventListener(type: string, fn: (e: Event) => void, options?: AddEventListenerOptions): void;
    removeEventListener(type: string, fn: (e: Event) => void, options?: AddEventListenerOptions): void;
}

const EVENTS = ['pointermove', 'pointerdown', 'keydown', 'vgp_onbuttondown'] as const;
const OPTIONS: AddEventListenerOptions = { capture: true, passive: true };
const installed = new WeakMap<MouseModeDoc, { users: number; stop(): void }>();

/**
 * Keeps MOUSE_ATTR on `doc`'s root in step with the input, once per document however many ask (Home and the game page
 * share Steam's Big Picture document); returns the release, and the last release takes the listeners and the mark away.
 */
export function installMouseMode(doc: MouseModeDoc): () => void {
    let entry = installed.get(doc);
    if (!entry) {
        let on = false;
        const listen = (e: Event) => {
            const next = mouseModeAfter(on, e as unknown as ModeInput);
            if (next === on) return;
            on = next;
            if (on) doc.documentElement?.setAttribute(MOUSE_ATTR, '');
            else doc.documentElement?.removeAttribute(MOUSE_ATTR);
        };
        for (const type of EVENTS) doc.addEventListener(type, listen, OPTIONS);
        entry = {
            users: 0,
            stop: () => {
                for (const type of EVENTS) doc.removeEventListener(type, listen, OPTIONS);
                doc.documentElement?.removeAttribute(MOUSE_ATTR);
            },
        };
        installed.set(doc, entry);
    }
    entry.users++;
    let released = false;
    return () => {
        if (released) return;
        released = true;
        const e = installed.get(doc);
        if (!e || --e.users > 0) return;
        e.stop();
        installed.delete(doc);
    };
}
