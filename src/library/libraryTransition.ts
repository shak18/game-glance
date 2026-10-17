import { findClassModule } from '@decky/ui';

export interface OpenBridge {
    fadeIn(ms: number): void;
    fadeOut(ms: number): void;
    settle(): void;
    remove(): void;
}

export const BRIDGE_FADE_EASE = 'cubic-bezier(.2,.65,.3,1)';

export const OPEN_TIMINGS = {
    bridgeFade: 180,
    readyCap: 1500,
};

export const RETURN_TIMINGS = {
    fade: 200,
    hold: 1500,
} as const;

export function mountOpenBridge(
    root: HTMLElement,
    css = '',
    extras: Element[] = [],
    drop: string[] = [],
    settle?: (copy: HTMLElement) => void
): OpenBridge {
    const doc = root.ownerDocument;
    const parent = doc?.body;
    if (!doc || !parent) throw new Error('Root has no document');
    const r = root.getBoundingClientRect();
    if (![r.left, r.top, r.width, r.height].every(Number.isFinite) || r.width <= 0 || r.height <= 0) {
        throw new Error('Root has no usable size');
    }
    const box = doc.createElement('div');
    Object.assign(box.style, {
        position: 'fixed',
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        overflow: 'hidden',
        zIndex: '99999',
        pointerEvents: 'none',
        margin: '0',
        padding: '0',
    });
    box.setAttribute('aria-hidden', 'true');
    if (css) {
        const style = doc.createElement('style');
        style.textContent = css;
        box.appendChild(style);
    }
    const copy = root.cloneNode(true) as HTMLElement;
    copy.classList.add('sgl-bridge');
    copy.classList.remove('sgl-back');
    copy.classList.remove('sgl-leaving');
    copy.removeAttribute('data-sgl-leaving');
    if (drop.length > 0) {
        for (const el of [...copy.querySelectorAll(drop.join(', '))]) el.remove();
    }
    box.appendChild(copy);
    for (const extra of extras) box.appendChild(extra.cloneNode(true));
    parent.appendChild(box);
    let removed = false;
    return {
        fadeIn(ms: number) {
            box.style.transition = 'none';
            box.style.opacity = '0';
            void (box as HTMLElement).offsetWidth;
            box.style.transition = `opacity ${ms}ms ease-in-out`;
            box.style.opacity = '1';
        },
        fadeOut(ms: number) {
            box.style.transition = `opacity ${ms}ms ${BRIDGE_FADE_EASE}`;
            box.style.opacity = '0';
        },
        settle() {
            if (!removed) settle?.(copy);
        },
        remove() {
            if (removed) return;
            removed = true;
            box.remove();
        },
    };
}

export function steamEnterOffCss(): string {
    try {
        const transition = findClassModule((m) => Boolean(m.TopLevelTransition && m.Enter && m.EnterActive)) as
            | Record<string, string>
            | undefined;
        const top = transition?.TopLevelTransition;
        const enter = transition?.Enter;
        const enterActive = transition?.EnterActive;
        if (!top || !enter || !enterActive) return '';
        const exit = transition?.Exit;
        const exitActive = transition?.ExitActive;
        const exitRule =
            exit && exitActive ? `.${top}.${exit}, .${top}.${exitActive} { visibility: hidden !important; }` : '';
        return `.${top}.${enter}, .${top}.${enterActive} { opacity: 1 !important; transform: none !important; transition: none !important; }\n${exitRule}`;
    } catch {
        return '';
    }
}
