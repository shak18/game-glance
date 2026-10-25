import { CSSProperties, ReactElement, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
    avatarView,
    BatteryView,
    ConnectionKind,
    formatClock,
    msToNextMinute,
    PersonaDot,
    personaDot,
    prefers24Hour,
    readSelfPersona,
    SelfPersona,
    statusPlacement,
    statusScale,
} from './statusItems';
import { COVER_CSS, useHideSteamBar } from './useHideSteamBar';
import { startStatus, statusState, subscribeStatus } from './statusStore';
import { findTopBar, focusInTopBar } from './topBar';
import { menuOpen, steamMenuStore } from './steamMenu';
import { useSettings } from '../data/settings';
import { libraryCanvas } from './libraryScale';

const STATUS_Z = 5000;
const MENU_POLL_MS = 250;
const PERSONA_POLL_MS = 2000;

function hours24(): boolean {
    let localeHour12: boolean | undefined;
    try {
        localeHour12 = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12;
    } catch {
        localeHour12 = undefined;
    }
    return prefers24Hour(globalThis, localeHour12);
}

function useClock(): string {
    const [text, setText] = useState(() => formatClock(new Date(), hours24()));
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const tick = () => {
            const now = new Date();
            setText(formatClock(now, hours24()));
            timer = setTimeout(tick, msToNextMinute(now));
        };
        timer = setTimeout(tick, msToNextMinute(new Date()));
        return () => clearTimeout(timer);
    }, []);
    return text;
}

function WifiIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" style={{ width: 17, height: 17 }}>
            <path d="M2.5 9a14 14 0 0 1 19 0" />
            <path d="M5.5 12.5a9.5 9.5 0 0 1 13 0" />
            <path d="M8.7 16a5 5 0 0 1 6.6 0" />
            <circle cx="12" cy="19.3" r="1.2" fill="currentColor" stroke="none" />
        </svg>
    );
}

function OfflineIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" style={{ width: 17, height: 17 }}>
            <path d="M2.5 9a14 14 0 0 1 19 0" />
            <path d="M5.5 12.5a9.5 9.5 0 0 1 13 0" />
            <path d="M8.7 16a5 5 0 0 1 6.6 0" />
            <circle cx="12" cy="19.3" r="1.2" fill="currentColor" stroke="none" />
            <path d="M3 3l18 18" strokeWidth={2.2} />
        </svg>
    );
}

function WiredIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true" style={{ width: 17, height: 17 }}>
            <rect x="4" y="5" width="16" height="12" rx="2" />
            <path d="M9 17v3h6v-3M8 9v3M12 9v3M16 9v3" />
        </svg>
    );
}

const CONNECTION: Record<ConnectionKind, { icon: () => ReactElement; label: string }> = {
    wifi: { icon: WifiIcon, label: 'Connected' },
    wired: { icon: WiredIcon, label: 'Wired' },
    offline: { icon: OfflineIcon, label: 'Offline' },
};

function BatteryIcon({ battery }: { battery: BatteryView }) {
    const fill = Math.round(15 * battery.percent) / 100;
    return (
        <svg viewBox="0 0 24 18" fill="none" aria-hidden="true" style={{ width: 20, height: 15 }}>
            <rect x="1" y="3" width="19" height="12" rx="3" stroke="currentColor" strokeWidth={1.6} />
            <rect x="21" y="7" width="2" height="4" rx="1" fill="currentColor" />
            <rect x="3" y="5" width={fill} height="8" rx="1.5" fill="currentColor" />
            {battery.charging && (
                <path
                    d="M12.6 3.6L7.6 9.8h3.2l-1.6 4.6 5.2-6.4h-3.2l1.4-4.4z"
                    fill="#0b0d10"
                    stroke="currentColor"
                    strokeWidth={0.9}
                    strokeLinejoin="round"
                />
            )}
        </svg>
    );
}

function useSelfPersona(): SelfPersona | null {
    const [self, setSelf] = useState(() => readSelfPersona(globalThis));
    useEffect(() => {
        const timer = setInterval(() => {
            const next = readSelfPersona(globalThis);
            setSelf((old) =>
                (old && next && old.state === next.state && old.inGame === next.inGame && old.avatarHash === next.avatarHash) || old === next
                    ? old
                    : next
            );
        }, PERSONA_POLL_MS);
        return () => clearInterval(timer);
    }, []);
    return self;
}

const DOT_LABEL: Record<PersonaDot, string> = {
    online: 'Online',
    away: 'Away',
    off: 'Offline',
};

function useViewport(win: Window | null): { width: number; height: number } {
    const read = () => ({ width: win?.innerWidth ?? 1280, height: win?.innerHeight ?? 800 });
    const [size, setSize] = useState(read);
    useEffect(() => {
        if (!win) return;
        const onResize = () => setSize({ width: win.innerWidth, height: win.innerHeight });
        onResize();
        win.addEventListener('resize', onResize);
        return () => win.removeEventListener('resize', onResize);
    }, [win]);
    return size;
}

function useFocusInTopBar(doc: Document | null): boolean {
    const [away, setAway] = useState(false);
    useEffect(() => {
        if (!doc) return;
        const update = () => setAway(focusInTopBar(findTopBar(doc, doc.defaultView?.innerWidth ?? 0), doc.activeElement));
        doc.addEventListener('focusin', update);
        const timer = setInterval(update, MENU_POLL_MS);
        return () => {
            doc.removeEventListener('focusin', update);
            clearInterval(timer);
        };
    }, [doc]);
    return away;
}

function useMenuOpen(doc: Document | null): boolean {
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (!doc) return undefined;
        const win = doc.defaultView;
        const update = () => setOpen(menuOpen(steamMenuStore(), doc.hasFocus()));
        update();
        win?.addEventListener('focus', update);
        win?.addEventListener('blur', update);
        const timer = setInterval(update, MENU_POLL_MS);
        return () => {
            win?.removeEventListener('focus', update);
            win?.removeEventListener('blur', update);
            clearInterval(timer);
        };
    }, [doc]);
    return open;
}

export const STATUS_BAR_CSS = `
.sgl-topbar-host {
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    height: 0 !important;
    pointer-events: none !important;
    z-index: 5000 !important;
    transform-origin: top right !important;
}

.sgl-topbar-status {
    position: absolute !important;
    right: var(--gh-status-right, 32px) !important;
    top: calc(var(--gh-status-cy, 20px) - 16px) !important;
    height: 32px !important;
    display: flex !important;
    align-items: center !important;
    gap: var(--gh-status-gap, 10px) !important;
    margin: 0 !important;
    padding: 0 !important;
    pointer-events: none !important;
    z-index: 1 !important;
    opacity: 1 !important;
    transition: opacity 150ms ease !important;
    transform: scale(var(--gh-status-k, 1)) !important;
    transform-origin: 100% 50% !important;
}

.sgl-topbar-status.sgl-topbar-away {
    opacity: 0 !important;
}

.sgl-topbar-pill {
    display: inline-flex !important;
    align-items: center !important;
    gap: 14px !important;
    margin: 0 !important;
    height: 32px !important;
    padding: 0 14px !important;
    border-radius: 999px !important;
    border: 1px solid rgba(255, 255, 255, 0.18) !important;
    background: rgba(12, 16, 22, 0.4) !important;
    backdrop-filter: blur(14px) !important;
    -webkit-backdrop-filter: blur(14px) !important;
    color: rgba(255, 255, 255, 0.9) !important;
    line-height: 1 !important;
    font-size: 15px !important;
    font-weight: 600 !important;
    white-space: nowrap !important;
    font-variant-numeric: tabular-nums !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
    box-sizing: border-box !important;
}

.sgl-topbar-item {
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 15px !important;
    font-weight: 600 !important;
    color: rgba(255, 255, 255, 0.9) !important;
    line-height: 1 !important;
}

.sgl-topbar-item svg {
    flex: 0 0 auto !important;
    height: 18px !important;
    width: auto !important;
    display: block !important;
}

.sgl-topbar-avatar-wrap {
    position: relative !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-shrink: 0 !important;
}

.sgl-topbar-avatar {
    flex: 0 0 auto !important;
    width: 32px !important;
    height: 32px !important;
    box-sizing: border-box !important;
    border: 2px solid var(--gh-avatar-ring, #57cbde) !important;
    border-radius: 50% !important;
    background-size: cover !important;
    background-position: center !important;
    box-shadow: 0 0 0 2px rgba(12, 16, 22, 0.55), 0 2px 6px rgba(0, 0, 0, 0.4) !important;
}

.sgl-topbar-dot {
    flex: 0 0 auto !important;
    width: 12px !important;
    height: 12px !important;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 50% !important;
    box-shadow: 0 0 0 2px rgba(12, 16, 22, 0.55), 0 1px 4px rgba(0, 0, 0, 0.4) !important;
    transition: background 150ms !important;
}

.sgl-topbar-dot-online {
    background: #4cff8f !important;
}

.sgl-topbar-dot-away {
    background: #4cb4ff !important;
}

.sgl-topbar-dot-off {
    background: rgba(196, 201, 209, 0.85) !important;
}

.sgl-topbar-low {
    color: #f85149 !important;
}

.sgl-topbar-offline svg {
    opacity: 0.6 !important;
}
`;

export function LibraryStatusBar({ hidden = false }: { hidden?: boolean }) {
    const { libraryStatusBar, statusAvatar } = useSettings();
    const [doc, setDoc] = useState<Document | null>(null);

    const marker = useCallback((el: HTMLSpanElement | null) => {
        if (el) setDoc(el.ownerDocument);
    }, []);

    useEffect(() => {
        startStatus();
    }, []);

    const { battery, connection } = useSyncExternalStore(subscribeStatus, statusState, statusState);
    const clock = useClock();
    const self = useSelfPersona();
    const dot = personaDot(self);
    const avatar = avatarView(self, statusAvatar);

    const win = doc?.defaultView ?? null;
    const { width, height } = useViewport(win);
    const canvas = libraryCanvas(width, height);

    const focusInBar = useFocusInTopBar(doc);
    const menuShown = useMenuOpen(doc);
    const away = focusInBar || menuShown;

    useHideSteamBar(doc, away || !libraryStatusBar);

    if (!libraryStatusBar) return <span ref={marker} style={{ display: 'none' }} />;

    const place = statusPlacement(canvas.scale);
    const conn = connection ? CONNECTION[connection] : null;

    const style = {
        '--gh-status-right': `${place.right}px`,
        '--gh-status-cy': `${place.centreY}px`,
        '--gh-status-gap': `${place.gap}px`,
        '--gh-status-k': String(statusScale(canvas.scale)),
    } as CSSProperties;

    return (
        <>
            <span ref={marker} style={{ display: 'none' }} />
            {doc &&
                createPortal(
                    <div
                        className="sgl-topbar-host"
                        style={{
                            width: canvas.logicalWidth,
                            transform: `scale(${canvas.scale})`,
                            zIndex: STATUS_Z,
                            opacity: hidden ? 0 : 1,
                            transition: 'opacity 200ms',
                        }}
                    >
                        <style>{COVER_CSS}</style>
                        <style>{STATUS_BAR_CSS}</style>
                        <div
                            className={`sgl-topbar-status${away ? ' sgl-topbar-away' : ''}`}
                            aria-hidden={away}
                            style={style}
                        >
                            <div className="sgl-topbar-pill">
                                {conn && (
                                    <span className={`sgl-topbar-item sgl-topbar-${connection}`} aria-label={conn.label}>
                                        <conn.icon />
                                    </span>
                                )}
                                {battery && (
                                    <span
                                        className={`sgl-topbar-item${battery.low ? ' sgl-topbar-low' : ''}`}
                                        aria-label={`${battery.percent}%${battery.charging ? ', charging' : ''}`}
                                    >
                                        <BatteryIcon battery={battery} />
                                        {battery.percent}%
                                    </span>
                                )}
                                <span className="sgl-topbar-item">{clock}</span>
                            </div>
                            {avatar && dot ? (
                                <div className="sgl-topbar-avatar-wrap">
                                    <span
                                        className="sgl-topbar-avatar"
                                        role="img"
                                        aria-label={DOT_LABEL[dot]}
                                        style={
                                            {
                                                backgroundImage: `url(${avatar.url})`,
                                                '--gh-avatar-ring': avatar.ring,
                                            } as CSSProperties
                                        }
                                    />
                                    <span
                                        className={`sgl-topbar-dot sgl-topbar-dot-${dot}`}
                                        style={{
                                            position: 'absolute',
                                            bottom: -1,
                                            right: -1,
                                            width: 10,
                                            height: 10,
                                        }}
                                    />
                                </div>
                            ) : dot ? (
                                <span
                                    className={`sgl-topbar-dot sgl-topbar-dot-${dot}`}
                                    role="img"
                                    aria-label={DOT_LABEL[dot]}
                                />
                            ) : null}
                        </div>
                    </div>,
                    doc.body
                )}
        </>
    );
}
