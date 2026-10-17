/**
 * Home's focus looks follow DOM focus as well as the controller's. Steam's Focusable adds its focusClassName only while
 * the controller is the input: after a tap, a click or the wheel it drops it (and its own gpfocus), though DOM focus stays
 * where it was, so the selected card, a button or a feed card lost its ring and glow. Each rule that names a focus class
 * gets a twin for the focusable under DOM focus, and "not focused" excludes DOM focus too. Pure.
 */

/** Each focusClassName on Home, and the class of the Focusable that carries it. */
export const FOCUS_CLASSES: Record<string, string> = {
    'gh-focus': 'gh-btn',
    'gh-recents-focus': 'gh-recents',
    'gh-tab-focus': 'gh-tab',
    'gh-card-focus': 'gh-card',
};

const word = (cls: string) => `\\.${cls.replace(/-/g, '\\-')}(?![\\w-])`;
/** Characters that end a compound selector (combinators, list commas, a pseudo-class's parentheses). */
const BOUNDARY = /[\s>+~,()]/;

/** The selector list split on its top-level commas (a comma inside :has() or :is() stays). */
function splitList(selector: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < selector.length; i++) {
        const c = selector[i];
        if (c === '(') depth++;
        else if (c === ')') depth--;
        else if (c === ',' && depth === 0) {
            parts.push(selector.slice(start, i).trim());
            start = i + 1;
        }
    }
    parts.push(selector.slice(start).trim());
    return parts;
}

/** The compound selector around position [from, to) of `s`. */
function compoundAt(s: string, from: number, to: number): string {
    let a = from;
    while (a > 0 && !BOUNDARY.test(s[a - 1])) a--;
    let b = to;
    while (b < s.length && !BOUNDARY.test(s[b])) b++;
    return s.slice(a, b);
}

/** `selector` with DOM focus standing in for Home's focus classes (FOCUS_CLASSES); unchanged without one. */
export function withDomFocus(selector: string): string {
    let out = selector;
    // Not focused: not under DOM focus either (the :not() is on the focusable's own compound).
    for (const cls of Object.keys(FOCUS_CLASSES)) out = out.replace(new RegExp(`:not\\(${word(cls)}\\)`, 'g'), (m) => `${m}:not(:focus)`);
    const twins: string[] = [];
    for (const part of splitList(out)) {
        let twin = part;
        let changed = false;
        for (const [cls, owner] of Object.entries(FOCUS_CLASSES)) {
            twin = twin.replace(new RegExp(`(?<!:not\\()${word(cls)}`, 'g'), (m, at: number, whole: string) => {
                changed = true;
                const own = new RegExp(word(owner)).test(compoundAt(whole, at, at + m.length));
                return own ? ':focus' : `.${owner}:focus`;
            });
        }
        if (changed) twins.push(twin);
    }
    return twins.length > 0 ? `${out}, ${twins.join(', ')}` : out;
}
