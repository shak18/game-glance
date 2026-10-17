import { Focusable } from '@decky/ui';
import { ReactNode, useRef } from 'react';
import { CARD_NAV } from '../logic/cardNav';

/**
 * A game page card (#24): a plain block, or, with `onPress`, one that a tap, a click or the controller's A uses (the same
 * action: components/cardActions). The controller selects it (Steam's focus tree; hooks/useCardNav routes Up and Down to
 * it in the screen's order), and it gives under a finger (themeCss .gg-card-tap).
 */
export function CardShell({ className, onPress, children }: { className: string; onPress?(card: HTMLElement): void; children: ReactNode }) {
    const self = useRef<HTMLElement | null>(null);
    if (!onPress) return <div className={className}>{children}</div>;
    return (
        <Focusable
            ref={(el: HTMLDivElement | null) => {
                self.current = el;
            }}
            className={`${className} gg-card-tap ${CARD_NAV}`}
            focusClassName="gg-card-focus"
            noFocusRing
            onActivate={() => self.current && onPress(self.current)}
            onClick={(event: { currentTarget: HTMLElement }) => onPress(event.currentTarget)}
        >
            {children}
        </Focusable>
    );
}
