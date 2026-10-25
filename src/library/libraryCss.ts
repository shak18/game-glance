/**
 * A size from the design handoff, in its px, scaled exactly like Spotlight Home (home/scale.ts) and Game View (styles/themeCss.ts):
 * The canvas's 1440px width fills a 16:9 screen, its 1280px one a 16:10 screen (aspect ratio <= 1.7).
 * Pure.
 */
export const d = (px: number) => `calc(${px} * var(--sgl-d))`;

/**
 * Inspector panel font scaling experiment (+20%).
 * To revert to default scale, change this constant to 1.0.
 */
export const INSPECTOR_FONT_SCALE = 1.2;
export const di = (px: number) => `calc(${px} * var(--sgl-insp-scale, ${INSPECTOR_FONT_SCALE}) * var(--sgl-d))`;

export const LIBRARY_CSS = `
:root {
    --sgl-d: calc(100vw / 1440);
}
@media (max-aspect-ratio: 17/10) {
    :root {
        --sgl-d: calc(100vw / 1280);
    }
}
.sgl-root {
    --sgl-d: calc(100vw / 1440);
}
@media (max-aspect-ratio: 17/10) {
    .sgl-root {
        --sgl-d: calc(100vw / 1280);
    }
}

.sgl-root,
.sgl-root *,
.sgl-root *::before,
.sgl-root *::after {
    box-sizing: border-box !important;
    -webkit-text-size-adjust: 100% !important;
    text-size-adjust: 100% !important;
}

.sgl-root {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    box-sizing: border-box !important;
    padding-top: var(--sgl-top-inset, ${d(40)}) !important;
    padding-bottom: var(--sgl-bottom-inset, ${d(48)}) !important;
    overflow: hidden !important;
    overflow: clip !important;
    display: flex !important;
    flex-direction: column !important;
    background: #06090e !important;
    color: #f0f6fc !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    font-size: ${d(14)} !important;
    line-height: normal !important;
    letter-spacing: normal !important;
    text-transform: none !important;
    user-select: none !important;
    z-index: 1 !important;
}

/* Frozen copy in bridge should never re-animate or transition */
.gh-bridge,
.gh-bridge *,
.gh-bridge *::before,
.gh-bridge *::after,
.sgl-root.gh-bridge,
.sgl-root.gh-bridge *,
.sgl-root.gh-bridge .sgl-header,
.sgl-root.gh-bridge .sgl-inspector,
.sgl-root.gh-bridge .sgl-grid-panel,
.sgl-root.gh-bridge .sgl-bg-container,
.sgl-root.gh-bridge .sgl-bg-layer,
.sgl-root.sgl-leaving.gh-bridge,
.sgl-root.sgl-leaving.gh-bridge * {
    animation: none !important;
    transition: none !important;
}

/* Exit animations: stylishly zoom/slide out of screen when leaving to Home or Game Detail */
.sgl-root.sgl-leaving,
.sgl-root[data-sgl-leaving="true"],
.sgl-root[data-gh-leaving] {
    pointer-events: none !important;
}

.sgl-root.sgl-leaving:not(.gh-bridge) .sgl-header,
.sgl-root[data-sgl-leaving="true"]:not(.gh-bridge) .sgl-header,
.sgl-root[data-gh-leaving]:not(.gh-bridge) .sgl-header {
    animation: sglHeaderExit 200ms cubic-bezier(.25, 0, 0, 1) forwards !important;
    will-change: transform, opacity;
}

.sgl-root.sgl-leaving:not(.gh-bridge) .sgl-inspector,
.sgl-root[data-sgl-leaving="true"]:not(.gh-bridge) .sgl-inspector,
.sgl-root[data-gh-leaving]:not(.gh-bridge) .sgl-inspector {
    animation: sglInspectorExit 200ms cubic-bezier(.25, 0, 0, 1) forwards !important;
    will-change: transform, opacity;
}

.sgl-root.sgl-leaving:not(.gh-bridge) .sgl-grid-panel,
.sgl-root[data-sgl-leaving="true"]:not(.gh-bridge) .sgl-grid-panel,
.sgl-root[data-gh-leaving]:not(.gh-bridge) .sgl-grid-panel {
    animation: sglGridExit 200ms cubic-bezier(.25, 0, 0, 1) forwards !important;
    will-change: transform, opacity;
}


/* Entrance animations: stylishly zoom/slide in from outside the viewport on enter or back */
.sgl-root:not(.gh-bridge):not(.sgl-leaving):not([data-sgl-leaving="true"]):not([data-gh-leaving]) .sgl-header {
    animation: sglHeaderEnter 280ms cubic-bezier(.16, 1, 0.3, 1) both;
    will-change: transform, opacity;
}

.sgl-root:not(.gh-bridge):not(.sgl-leaving):not([data-sgl-leaving="true"]):not([data-gh-leaving]) .sgl-inspector {
    animation: sglInspectorEnter 300ms cubic-bezier(.16, 1, 0.3, 1) both;
    will-change: transform, opacity;
}

.sgl-root:not(.gh-bridge):not(.sgl-leaving):not([data-sgl-leaving="true"]):not([data-gh-leaving]) .sgl-grid-panel {
    animation: sglGridEnter 320ms cubic-bezier(.16, 1, 0.3, 1) both;
    will-change: transform, opacity;
}

.sgl-root:not(.gh-bridge):not(.sgl-leaving):not([data-sgl-leaving="true"]):not([data-gh-leaving]) .sgl-bg-container {
    animation: sglBgEnter 340ms ease-out both;
    will-change: opacity;
}

/* Cascading entrance for elements inside inspector (from left) */
.sgl-root:not(.gh-bridge):not(.sgl-leaving):not([data-sgl-leaving="true"]):not([data-gh-leaving]) .sgl-poster-wrapper,
.sgl-root:not(.gh-bridge):not(.sgl-leaving):not([data-sgl-leaving="true"]):not([data-gh-leaving]) .sgl-inspector-col-fan {
    animation: sglChildLeftEnter 260ms 40ms cubic-bezier(.16, 1, 0.3, 1) both;
    will-change: transform, opacity;
}

.sgl-root:not(.gh-bridge):not(.sgl-leaving):not([data-sgl-leaving="true"]):not([data-gh-leaving]) .sgl-title-box,
.sgl-root:not(.gh-bridge):not(.sgl-leaving):not([data-sgl-leaving="true"]):not([data-gh-leaving]) .sgl-meta-row,
.sgl-root:not(.gh-bridge):not(.sgl-leaving):not([data-sgl-leaving="true"]):not([data-gh-leaving]) .sgl-stats-grid,
.sgl-root:not(.gh-bridge):not(.sgl-leaving):not([data-sgl-leaving="true"]):not([data-gh-leaving]) .sgl-inspector-actions {
    animation: sglChildLeftEnter 260ms 80ms cubic-bezier(.16, 1, 0.3, 1) both;
    will-change: transform, opacity;
}

/* Cascading entrance for grid inside right panel (from right) */
.sgl-root:not(.gh-bridge):not(.sgl-leaving):not([data-sgl-leaving="true"]):not([data-gh-leaving]) .sgl-grid {
    animation: sglChildRightEnter 280ms 40ms cubic-bezier(.16, 1, 0.3, 1) both;
    will-change: transform, opacity;
}

/* Directional Entrance Keyframes */
@keyframes sglHeaderEnter {
    0% {
        opacity: 0;
        transform: translateY(-24px) scale(0.99);
    }
    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes sglInspectorEnter {
    0% {
        opacity: 0;
        transform: translateX(-32px) scale(0.985);
    }
    100% {
        opacity: 1;
        transform: translateX(0) scale(1);
    }
}

@keyframes sglGridEnter {
    0% {
        opacity: 0;
        transform: translateX(36px) scale(0.985);
    }
    100% {
        opacity: 1;
        transform: translateX(0) scale(1);
    }
}

@keyframes sglChildLeftEnter {
    0% {
        opacity: 0;
        transform: translateX(-14px);
    }
    100% {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes sglChildRightEnter {
    0% {
        opacity: 0;
        transform: translateX(18px);
    }
    100% {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes sglBgEnter {
    0% {
        opacity: 0;
    }
    100% {
        opacity: 1;
    }
}

/* Directional Exit Keyframes */
@keyframes sglHeaderExit {
    0% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
    100% {
        opacity: 0;
        transform: translateY(-24px) scale(0.99);
    }
}

@keyframes sglInspectorExit {
    0% {
        opacity: 1;
        transform: translateX(0) scale(1);
    }
    100% {
        opacity: 0;
        transform: translateX(-32px) scale(0.985);
    }
}

@keyframes sglGridExit {
    0% {
        opacity: 1;
        transform: translateX(0) scale(1);
    }
    100% {
        opacity: 0;
        transform: translateX(36px) scale(0.985);
    }
}

@keyframes sglBgExit {
    0% {
        opacity: 1;
    }
    100% {
        opacity: 0;
    }
}

/* Ambient Blurred Background - pinned to exact viewport coordinates to match GameView hero positioning */
.sgl-bg-container {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    pointer-events: none !important;
    overflow: hidden !important;
    z-index: 0 !important;
}

@keyframes gh-hero-ambient {
    0% { transform: scale(1.02) translate3d(0, 0, 0); }
    50% { transform: scale(1.06) translate3d(1.2%, -0.8%, 0); }
    100% { transform: scale(1.03) translate3d(-0.8%, 0.5%, 0); }
}

.sgl-bg-layer {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background-size: cover !important;
    background-position: center 30% !important;
    background-repeat: no-repeat !important;
    filter: brightness(0.36) saturate(1.18);
    transform-origin: 50% 30% !important;
    transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: opacity;
}


.sgl-bg-vignette {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    pointer-events: none !important;
    background: radial-gradient(circle at 65% 50%, rgba(6, 9, 14, 0.20) 0%, rgba(6, 9, 14, 0.68) 75%, #06090e 100%);
}

/* Top Header / Categories Ribbon */
.sgl-header {
    height: ${d(40)} !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: 0 ${d(16)} !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    background: rgba(10, 14, 22, 0.6) !important;
    backdrop-filter: blur(20px) !important;
    z-index: 20 !important;
    flex-shrink: 0 !important;
}

.sgl-root.sgl-has-status-bar .sgl-header {
    padding-right: ${d(220)} !important;
}

.sgl-brand {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    font-size: ${d(12)} !important;
    font-weight: 700 !important;
    letter-spacing: 0.06em !important;
    color: #ffffff !important;
}

.sgl-brand-icon {
    color: var(--accent, #58a6ff);
}

.sgl-tabs-container {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    min-width: 0 !important;
    flex: 1 !important;
    justify-content: center !important;
    max-width: ${d(860)} !important;
    overflow: hidden !important;
}

.sgl-bumper-badge {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: ${d(8.5)} !important;
    line-height: 1 !important;
    font-weight: 800 !important;
    height: ${d(17)} !important;
    min-width: ${d(22)} !important;
    max-height: ${d(17)} !important;
    padding: 0 ${d(4.5)} !important;
    box-sizing: border-box !important;
    vertical-align: middle !important;
    border-radius: ${d(4)} !important;
    background: rgba(255, 255, 255, 0.1) !important;
    color: rgba(255, 255, 255, 0.7) !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    letter-spacing: 0.4px !important;
    margin: 0 !important;
    flex-shrink: 0 !important;
}

.sgl-tabs {
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
    position: relative !important;
    overflow-x: auto !important;
    scrollbar-width: none !important;
    scroll-behavior: smooth !important;
    padding: 2px 4px 4px !important;
    max-width: 100% !important;
    touch-action: pan-x !important;
    -webkit-overflow-scrolling: touch !important;
}

.sgl-tabs::-webkit-scrollbar {
    display: none;
}

.sgl-tabs.sgl-tabs-dragging {
    cursor: grabbing;
    user-select: none;
    scroll-behavior: auto;
}

.sgl-tabs.sgl-tabs-dragging .sgl-tab {
    cursor: grabbing;
}

.sgl-tab {
    position: relative !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
    padding: ${d(4)} ${d(4)} ${d(6)} !important;
    font-size: ${d(11)} !important;
    line-height: 1 !important;
    font-weight: 700 !important;
    letter-spacing: 0.05em !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    gap: 5px !important;
    border: none !important;
    background: transparent !important;
    color: rgba(255, 255, 255, 0.6) !important;
    transition: color 0.2s ease !important;
    outline: none !important;
    text-transform: uppercase !important;
    height: auto !important;
    min-height: 0 !important;
    box-sizing: border-box !important;
    margin: 0 !important;
}

.sgl-tab-label {
    font-size: ${d(11)} !important;
    line-height: 1 !important;
    font-weight: 700 !important;
    letter-spacing: 0.05em !important;
    text-transform: uppercase !important;
    white-space: nowrap !important;
}

.sgl-tab:hover {
    color: #ffffff;
    background: transparent;
}

.sgl-tab.active {
    color: #ffffff;
    background: transparent;
    border: none;
    box-shadow: none;
}

.sgl-tab.focused,
.sgl-tab:focus-visible {
    color: #ffffff;
    border: none;
    box-shadow: none;
    background: transparent;
}

.sgl-tab-line {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    border-radius: 2px;
    background: var(--accent, #58a6ff);
    opacity: 0;
    box-shadow: none;
    transition: opacity 0.25s ease, box-shadow 0.25s ease, background 0.35s ease;
    pointer-events: none;
}

.sgl-tab.active .sgl-tab-line {
    opacity: 0.65;
}

.sgl-tab.focused .sgl-tab-line,
.sgl-tab:focus-visible .sgl-tab-line {
    opacity: 1;
    box-shadow: 0 0 14px 2px var(--accent, #58a6ff);
}

.sgl-tab-count {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: ${d(9.5)} !important;
    line-height: 1 !important;
    font-weight: 600 !important;
    letter-spacing: 0.04em !important;
    height: ${d(15)} !important;
    min-height: ${d(15)} !important;
    max-height: ${d(15)} !important;
    padding: 0 ${d(5)} !important;
    box-sizing: border-box !important;
    border-radius: ${d(8)} !important;
    background: rgba(255, 255, 255, 0.08) !important;
    color: rgba(255, 255, 255, 0.65) !important;
    margin: 0 0 0 ${d(4)} !important;
    vertical-align: middle !important;
    transition: all 0.2s ease !important;
}

.sgl-tab.active .sgl-tab-count,
.sgl-tab.focused .sgl-tab-count {
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
}

/* Sub-collection Breadcrumb in Header */
.sgl-breadcrumb {
    display: flex;
    align-items: center;
    gap: 10px;
}

.sgl-btn-back-col {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 8px;
    font-size: ${d(11.5)} !important;
    line-height: 1 !important;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #ffffff;
    cursor: pointer;
    transition: all 0.15s ease;
    outline: none;
    white-space: nowrap;
    user-select: none;
    -webkit-user-select: none;
    flex-shrink: 0;
}

.sgl-btn-back-col:hover,
.sgl-btn-back-col.focused {
    background: rgba(255, 255, 255, 0.16);
    border-color: var(--accent, #58a6ff);
    box-shadow: 0 0 10px var(--accent-glow, rgba(88, 166, 255, 0.35));
}

.sgl-btn-back-col .sgl-btn-badge {
    background: rgba(255, 255, 255, 0.16);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.sgl-breadcrumb-title {
    font-size: ${d(13)} !important;
    line-height: 1 !important;
    font-weight: 800;
    letter-spacing: 0.8px;
    color: var(--accent, #58a6ff);
}


.sgl-header-right {
    display: flex !important;
    align-items: center !important;
    gap: ${d(12)} !important;
    flex-shrink: 0 !important;
}

.sgl-sort-btn {
    display: inline-flex !important;
    align-items: center !important;
    gap: ${d(5)} !important;
    padding: ${d(4)} ${d(9)} !important;
    border-radius: ${d(14)} !important;
    background: rgba(255, 255, 255, 0.06) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    color: rgba(255, 255, 255, 0.8) !important;
    font-size: ${d(11)} !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
    user-select: none !important;
    outline: none !important;
}

.sgl-sort-btn:hover,
.sgl-sort-btn:focus,
.sgl-sort-btn.focused {
    background: rgba(255, 255, 255, 0.14) !important;
    border-color: var(--accent, #58a6ff) !important;
    color: #fff !important;
    box-shadow: 0 0 10px var(--accent-glow, rgba(88, 166, 255, 0.35)) !important;
}

.sgl-sort-icon {
    font-size: ${d(11.5)} !important;
    line-height: 1 !important;
}

.sgl-sort-text {
    text-transform: uppercase !important;
    letter-spacing: 0.6px !important;
    font-size: ${d(10.5)} !important;
}

.sgl-header-info {
    font-size: ${d(11.5)} !important;
    line-height: 1 !important;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 0.8px;
}

/* Main Split View */
.sgl-body {
    flex: 1;
    display: flex;
    min-height: 0;
    position: relative;
    z-index: 10;
}

/* Left Panel: Inspector */
.sgl-inspector {
    --sgl-insp-scale: ${INSPECTOR_FONT_SCALE};
    width: ${d(275)} !important;
    min-width: ${d(250)} !important;
    max-width: ${d(285)} !important;
    flex-shrink: 0 !important;
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    padding: ${d(14)} !important;
    gap: 6px !important;
    overflow-y: hidden !important;
    scrollbar-width: none !important;
    border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
    background: linear-gradient(90deg, rgba(7, 10, 16, 0.54) 0%, rgba(7, 10, 16, 0.32) 100%) !important;
    backdrop-filter: blur(20px) !important;
    box-sizing: border-box !important;
}

.sgl-inspector::-webkit-scrollbar {
    display: none !important;
}

.sgl-poster-wrapper {
    flex: 0 0 auto !important;
    flex-shrink: 0 !important;
    flex-grow: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    aspect-ratio: 2 / 3 !important;
    height: auto !important;
    max-height: clamp(${d(250)}, 44vh, ${d(380)}) !important;
    align-self: center !important;
    border-radius: 10px !important;
    overflow: hidden !important;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.75) !important;
    border: 1px solid rgba(255, 255, 255, 0.14) !important;
    position: relative !important;
    background: #11141c !important;
}

.sgl-poster-wrapper.sgl-poster-square {
    width: 100% !important;
    max-width: 100% !important;
    aspect-ratio: 1 / 1 !important;
    height: auto !important;
    max-height: ${d(260)} !important;
}

.sgl-poster-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: opacity 0.2s ease;
}

.sgl-poster-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #0d1117;
}

.sgl-poster-fallback-bg {
    position: absolute;
    inset: -20px;
    width: calc(100% + 40px);
    height: calc(100% + 40px);
    object-fit: cover;
    filter: blur(16px) brightness(0.42) saturate(1.2);
    transform: scale(1.15);
    z-index: 1;
}

.sgl-poster-fallback-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, rgba(13, 17, 23, 0.2) 0%, rgba(13, 17, 23, 0.8) 100%);
    z-index: 2;
}

.sgl-poster-fallback-content {
    position: relative;
    z-index: 3;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
}

.sgl-poster-fallback-logo {
    max-width: 85%;
    max-height: 55%;
    object-fit: contain;
    filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.9));
}

.sgl-poster-fallback-banner {
    width: 90%;
    border-radius: 6px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.15);
    object-fit: cover;
    aspect-ratio: 16 / 9;
}

.sgl-poster-fallback-title {
    font-size: ${di(13)} !important;
    font-weight: 800 !important;
    line-height: 1.35 !important;
    text-align: center !important;
    color: #ffffff !important;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9) !important;
    padding: 10px !important;
}

.sgl-title-box {
    min-height: ${d(24)} !important;
    max-height: ${d(38)} !important;
    display: flex !important;
    align-items: center !important;
    flex-shrink: 0 !important;
}

.sgl-title-text {
    font-size: ${di(15)} !important;
    font-weight: 700 !important;
    line-height: 1.2 !important;
    color: #ffffff !important;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8) !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
    max-height: 2.4em !important;
}

.sgl-meta-row {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    flex-wrap: wrap !important;
    flex-shrink: 0 !important;
}

.sgl-source-pill {
    font-size: ${di(9)} !important;
    line-height: 1 !important;
    font-weight: 700 !important;
    padding: 2px 6px !important;
    border-radius: 10px !important;
    background: rgba(255, 255, 255, 0.1) !important;
    color: rgba(255, 255, 255, 0.85) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
}

.sgl-status-pill {
    font-size: ${di(9)} !important;
    line-height: 1 !important;
    font-weight: 700 !important;
    padding: 2px 6px !important;
    border-radius: 10px !important;
    background: rgba(46, 160, 67, 0.2) !important;
    color: #3fb950 !important;
    border: 1px solid rgba(46, 160, 67, 0.35) !important;
}

/* Stats / Chips Grid */
.sgl-stats-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 4px !important;
    flex-shrink: 0 !important;
}

.sgl-stat-card {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 6px !important;
    padding: 3px 6px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 1px !important;
}

.sgl-stat-label {
    font-size: ${di(8)} !important;
    line-height: 1.15 !important;
    font-weight: 600 !important;
    color: rgba(255, 255, 255, 0.5) !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
}

.sgl-stat-value {
    font-size: ${di(11)} !important;
    line-height: 1.15 !important;
    font-weight: 700 !important;
    color: #ffffff !important;
}

.sgl-stat-bar {
    height: 2px !important;
    border-radius: 2px !important;
    background: rgba(255, 255, 255, 0.12) !important;
    margin-top: 2px !important;
    overflow: hidden !important;
}

.sgl-stat-fill {
    height: 100% !important;
    border-radius: 2px !important;
    background: var(--accent, #58a6ff) !important;
}

/* Description */
.sgl-description {
    font-size: ${di(10)} !important;
    line-height: 1.35 !important;
    color: rgba(255, 255, 255, 0.7) !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 6 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    max-height: 8.5em !important;
    flex-shrink: 0 !important;
}

/* Action Buttons */
.sgl-actions {
    display: flex !important;
    gap: 6px !important;
    margin-top: auto !important;
    padding-top: 4px !important;
    flex-shrink: 0 !important;
}

.sgl-btn-details {
    flex: 1 !important;
    padding: 4px 10px !important;
    border-radius: 999px !important;
    font-size: ${di(11)} !important;
    line-height: 1 !important;
    height: ${d(34)} !important;
    min-height: ${d(34)} !important;
    max-height: ${d(34)} !important;
    font-weight: 700 !important;
    background: var(--accent, #58a6ff) !important;
    color: #0b0d10 !important;
    border: 1px solid var(--accent, #58a6ff) !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35) !important;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.35s ease !important;
    outline: none !important;
}

.sgl-btn-details .sgl-btn-text,
.sgl-btn-play .sgl-btn-text,
.sgl-btn-text {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    vertical-align: middle !important;
    font-size: ${di(11)} !important;
    line-height: 1 !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    padding: 0 !important;
    margin: 0 !important;
    box-sizing: border-box !important;
}

.sgl-btn-details:hover,
.sgl-btn-details:focus-visible {
    transform: translateY(-2px) scale(1.02) !important;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9), 0 12px 30px -6px var(--accent, #58a6ff) !important;
}

.sgl-btn-play {
    flex: 1 !important;
    padding: 4px 10px !important;
    border-radius: 999px !important;
    font-size: ${di(11)} !important;
    line-height: 1 !important;
    height: ${d(34)} !important;
    min-height: ${d(34)} !important;
    max-height: ${d(34)} !important;
    font-weight: 700 !important;
    background: rgba(12, 16, 22, 0.45) !important;
    border: 1px solid rgba(255, 255, 255, 0.18) !important;
    backdrop-filter: blur(12px) !important;
    color: #ffffff !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease !important;
    outline: none !important;
}

.sgl-btn-play:hover,
.sgl-btn-play:focus-visible {
    background: rgba(255, 255, 255, 0.15) !important;
    border-color: rgba(255, 255, 255, 0.35) !important;
    transform: translateY(-2px) scale(1.02) !important;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 8px 24px rgba(0, 0, 0, 0.5) !important;
}

.sgl-btn-badge {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: ${d(16)} !important;
    height: ${d(16)} !important;
    min-width: ${d(16)} !important;
    max-width: ${d(16)} !important;
    min-height: ${d(16)} !important;
    max-height: ${d(16)} !important;
    border-radius: 50% !important;
    aspect-ratio: 1 / 1 !important;
    font-size: ${di(8.5)} !important;
    line-height: 1 !important;
    font-weight: 800 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
    vertical-align: middle !important;
    letter-spacing: 0 !important;
    margin: 0 !important;
    flex-shrink: 0 !important;
}

.sgl-btn-details .sgl-btn-badge {
    background: rgba(0, 0, 0, 0.22) !important;
    color: #0b0d10 !important;
    border: 1px solid rgba(0, 0, 0, 0.12) !important;
}

.sgl-btn-play .sgl-btn-badge {
    background: rgba(255, 255, 255, 0.14) !important;
    color: #ffffff !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
}

/* Right Panel: Game Grid */
.sgl-grid-panel {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 22px 28px 28px 24px;
    min-width: 0;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.16) transparent;
    box-sizing: border-box;
    touch-action: pan-y;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
}

.sgl-grid-panel.sgl-dragging {
    cursor: grabbing;
    user-select: none;
}

.sgl-grid-panel::-webkit-scrollbar {
    width: 6px;
}

.sgl-grid-panel::-webkit-scrollbar-track {
    background: transparent;
}

.sgl-grid-panel::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.16);
    border-radius: 4px;
    transition: background 0.2s ease;
}

.sgl-grid-panel:hover::-webkit-scrollbar-thumb,
.sgl-grid-panel.sgl-scrolling::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.32);
}

.sgl-grid-panel::-webkit-scrollbar-thumb:hover {
    background: var(--accent, #58a6ff);
}

.sgl-grid {
    display: grid;
    grid-template-columns: repeat(var(--sgl-columns, 3), 1fr);
    gap: 14px;
    align-content: start;
    padding-bottom: 24px;
}

/* Horizontal Banner Card */
.sgl-card {
    aspect-ratio: 460 / 215;
    border-radius: 10px;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    background: #11151f;
    border: none;
    box-shadow: 0 6px 20px -8px rgba(0, 0, 0, 0.6);
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform;
    contain: paint;
    outline: none;
}

.sgl-card::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    transition: box-shadow 0.22s ease;
}

.sgl-card:hover {
    transform: translateY(-2px) scale(1.015);
}

.sgl-card:hover::after {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
}

.sgl-card.focused,
.sgl-card:focus-visible {
    transform: translateY(-4px) scale(1.035);
    z-index: 5;
    box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.85), 0 16px 40px -10px var(--accent, #58a6ff);
}

.sgl-card.focused::after,
.sgl-card:focus-visible::after {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

.sgl-card-bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    background: var(--accent, #58a6ff);
    opacity: 0;
    box-shadow: 0 0 8px var(--accent, #58a6ff);
    transition: opacity 0.2s ease, background 0.3s ease;
    pointer-events: none;
    z-index: 3;
}

.sgl-card.focused .sgl-card-bar,
.sgl-card-collection.focused .sgl-card-bar {
    opacity: 1;
}

.sgl-card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
}

.sgl-card-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    background: #0f141d;
    overflow: hidden;
}

.sgl-card-fallback-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 1;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
}

.sgl-card-fallback-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(10, 14, 22, 0.25) 0%, rgba(10, 14, 22, 0.75) 100%);
    z-index: 2;
}

.sgl-card-fallback-logo {
    position: relative;
    z-index: 3;
    max-width: 80%;
    max-height: 60%;
    object-fit: contain;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.9));
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
}

.sgl-card-fallback-title {
    position: relative !important;
    z-index: 3 !important;
    font-size: ${d(12.5)} !important;
    font-weight: 700 !important;
    line-height: 1.3 !important;
    color: #ffffff !important;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9) !important;
    text-align: center !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
    padding: 0 8px !important;
    max-height: 2.6em !important;
}

/* Uninstalled Games Muted / Grayscale Style - High Performance Compositor-Only */
.sgl-card.sgl-card-uninstalled {
    opacity: 0.55;
    transition: opacity 0.15s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.sgl-card.sgl-card-uninstalled .sgl-card-img,
.sgl-card.sgl-card-uninstalled .sgl-card-fallback-bg {
    filter: grayscale(1);
}

.sgl-card.sgl-card-uninstalled .sgl-card-fallback-logo {
    opacity: 0.85;
}

.sgl-card.sgl-card-uninstalled .sgl-card-fallback-title {
    color: rgba(200, 210, 225, 0.7);
}

.sgl-card.sgl-card-uninstalled:hover {
    opacity: 0.85;
}

.sgl-card.sgl-card-uninstalled.focused,
.sgl-card.sgl-card-uninstalled:focus-visible {
    opacity: 1;
    box-shadow: 0 0 0 1.5px rgba(200, 208, 220, 0.85), 0 16px 36px -10px rgba(100, 110, 125, 0.5) !important;
}

.sgl-card-running-badge {
    position: absolute;
    top: 7px;
    right: 7px;
    background: rgba(46, 160, 67, 0.85);
    color: #ffffff;
    font-size: ${d(9.5)};
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 8px;
    letter-spacing: 0.5px;
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    gap: 4px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.sgl-running-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #ffffff;
    animation: sglPulse 1.5s infinite;
}

@keyframes sglPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
}

/* Steam Deck-Style Collection Card with Multi-Cover Fan Collage */
.sgl-card-collection {
    aspect-ratio: 1 / 1;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    background: radial-gradient(circle at 50% 25%, rgba(28, 38, 56, 0.85) 0%, rgba(10, 14, 22, 0.95) 100%);
    border: none;
    box-shadow: 0 6px 20px -8px rgba(0, 0, 0, 0.6);
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform;
    outline: none;
    display: flex;
    flex-direction: column;
    contain: paint;
}

.sgl-card-collection::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    transition: box-shadow 0.22s ease;
}

.sgl-card-collection:hover {
    transform: translateY(-2px) scale(1.015);
}

.sgl-card-collection:hover::after {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
}

.sgl-card-collection.focused,
.sgl-card-collection:focus-visible {
    transform: translateY(-4px) scale(1.035);
    z-index: 5;
    box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.85), 0 16px 40px -10px var(--accent, #58a6ff);
}

.sgl-card-collection.focused::after,
.sgl-card-collection:focus-visible::after {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

.sgl-col-fan-area {
    flex: 1;
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding-top: 6px;
}

.sgl-col-fan-card {
    position: absolute;
    width: ${d(52)};
    height: ${d(78)};
    border-radius: 5px;
    overflow: hidden;
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: #161b22;
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.sgl-col-fan-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
}

.sgl-col-card-far-left {
    transform: translateX(${d(-52)}) translateY(${d(8)}) rotate(-14deg) scale(0.82);
    z-index: 1;
}

.sgl-col-card-left {
    transform: translateX(${d(-26)}) translateY(${d(3)}) rotate(-7deg) scale(0.91);
    z-index: 2;
}

.sgl-col-card-right {
    transform: translateX(${d(26)}) translateY(${d(3)}) rotate(7deg) scale(0.91);
    z-index: 2;
}

.sgl-col-card-far-right {
    transform: translateX(${d(52)}) translateY(${d(8)}) rotate(14deg) scale(0.82);
    z-index: 1;
}

.sgl-col-card-center {
    transform: translateX(0) translateY(-2px) rotate(0deg) scale(1);
    z-index: 3;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.85);
    border-color: rgba(255, 255, 255, 0.3);
}

.sgl-card-collection.focused .sgl-col-card-center {
    transform: translateX(0) translateY(-8px) rotate(0deg) scale(1.06);
}

.sgl-col-footer {
    display: flex !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    justify-content: center !important;
    gap: 2px !important;
    padding: 4px 6px !important;
    background: rgba(10, 14, 22, 0.88) !important;
    backdrop-filter: blur(14px) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
    z-index: 4 !important;
    box-sizing: border-box !important;
    width: 100% !important;
}

.sgl-col-footer-header {
    display: flex !important;
    align-items: center !important;
    gap: 4px !important;
    width: 100% !important;
    min-width: 0 !important;
}

.sgl-col-icon-img {
    width: ${d(13)} !important;
    height: ${d(13)} !important;
    object-fit: contain !important;
    flex-shrink: 0 !important;
    display: block !important;
}

.sgl-insp-col-icon {
    width: ${d(28)} !important;
    height: ${d(28)} !important;
    object-fit: contain !important;
    flex-shrink: 0 !important;
    margin-bottom: 6px !important;
    display: block !important;
}

.sgl-col-custom-art-area {
    flex: 1 1 0 !important;
    position: relative !important;
    width: 100% !important;
    min-height: 0 !important;
    overflow: hidden !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: rgba(0, 0, 0, 0.4) !important;
}

.sgl-col-custom-img {
    display: block !important;
    transition: transform 0.3s ease !important;
}

.sgl-col-custom-img.sgl-fit-cover {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
}

.sgl-col-custom-img.sgl-fit-contain {
    width: 90% !important;
    height: 90% !important;
    max-width: 90% !important;
    max-height: 90% !important;
    object-fit: contain !important;
}

.sgl-col-custom-img.sgl-fit-fill {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    object-fit: fill !important;
}

.sgl-col-custom-img.sgl-fit-center {
    width: 70% !important;
    height: 70% !important;
    max-width: 70% !important;
    max-height: 70% !important;
    object-fit: contain !important;
}

.sgl-col-custom-art-area.sgl-fit-center {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}

.sgl-card-collection.focused .sgl-col-custom-img {
    transform: scale(1.04) !important;
}

.sgl-col-icon-art-area {
    flex: 1 1 0 !important;
    position: relative !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    overflow: hidden !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-sizing: border-box !important;
    padding: 0 !important;
}

.sgl-col-icon-art-area.sgl-fit-center {
    padding: 8px !important;
}

.sgl-col-icon-art-area.sgl-fit-contain {
    padding: 4px !important;
}

.sgl-col-icon-art-area.sgl-fit-cover,
.sgl-col-icon-art-area.sgl-fit-fill {
    padding: 0 !important;
}

.sgl-col-icon-large {
    display: block !important;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.6)) !important;
    transition: transform 0.25s ease !important;
}

.sgl-col-icon-large.sgl-fit-center {
    width: 58% !important;
    height: 48% !important;
    max-width: 58% !important;
    max-height: 48% !important;
    object-fit: contain !important;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.6)) !important;
}

.sgl-col-icon-large.sgl-fit-contain {
    width: 90% !important;
    height: 85% !important;
    max-width: 90% !important;
    max-height: 85% !important;
    object-fit: contain !important;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.7)) !important;
}

.sgl-col-icon-large.sgl-fit-cover {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    object-fit: cover !important;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.7)) !important;
}

.sgl-col-icon-large.sgl-fit-fill {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    object-fit: fill !important;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.6)) !important;
}

.sgl-card-collection.focused .sgl-col-icon-large {
    transform: scale(1.08) !important;
}

.sgl-inspector-col-custom-preview {
    width: 100% !important;
    height: ${d(125)} !important;
    border-radius: 8px !important;
    overflow: hidden !important;
    background: rgba(0, 0, 0, 0.45) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    margin-bottom: 10px !important;
    position: relative !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}

.sgl-col-edit-box {
    margin-top: 8px !important;
    padding: 8px !important;
    border-radius: 8px !important;
    background: rgba(18, 24, 34, 0.95) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 4px !important;
    box-sizing: border-box !important;
}

.sgl-edit-label {
    font-size: ${d(9.5)} !important;
    font-weight: 600 !important;
    color: rgba(255, 255, 255, 0.75) !important;
    letter-spacing: 0.2px !important;
}

.sgl-edit-btn-group {
    display: flex !important;
    gap: 4px !important;
}

.sgl-edit-pill-btn {
    flex: 1 !important;
    padding: 3px 6px !important;
    font-size: ${d(9)} !important;
    font-weight: 600 !important;
    border-radius: 4px !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    background: rgba(255, 255, 255, 0.05) !important;
    color: rgba(255, 255, 255, 0.8) !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
}

.sgl-edit-pill-btn.active {
    background: var(--accent, #58a6ff) !important;
    color: #ffffff !important;
    border-color: var(--accent, #58a6ff) !important;
}

.sgl-edit-input {
    width: 100% !important;
    padding: 4px 6px !important;
    font-size: ${d(9)} !important;
    border-radius: 4px !important;
    background: rgba(0, 0, 0, 0.4) !important;
    border: 1px solid rgba(255, 255, 255, 0.18) !important;
    color: #ffffff !important;
    box-sizing: border-box !important;
    outline: none !important;
}

.sgl-edit-input:focus {
    border-color: var(--accent, #58a6ff) !important;
}

.sgl-edit-select {
    width: 100% !important;
    padding: 4px 6px !important;
    font-size: ${d(9)} !important;
    border-radius: 4px !important;
    background: #141a24 !important;
    border: 1px solid rgba(255, 255, 255, 0.18) !important;
    color: #ffffff !important;
    box-sizing: border-box !important;
    outline: none !important;
}

.sgl-col-footer-title {
    font-size: ${d(10)} !important;
    font-weight: 700 !important;
    color: #ffffff !important;
    letter-spacing: 0.1px !important;
    display: block !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    word-break: normal !important;
    overflow-wrap: normal !important;
    line-height: 1.15 !important;
    max-height: 1.25em !important;
    width: 100% !important;
}

.sgl-col-footer-badge {
    font-size: ${d(7.5)} !important;
    line-height: 1 !important;
    font-weight: 700 !important;
    padding: 1px 4px !important;
    border-radius: 4px !important;
    background: rgba(255, 255, 255, 0.12) !important;
    color: rgba(255, 255, 255, 0.85) !important;
    white-space: nowrap !important;
    letter-spacing: 0.4px !important;
    align-self: flex-start !important;
    margin-left: 0 !important;
}

/* Inspector 5-Card Fan for Collections */
.sgl-inspector-col-fan {
    width: 100% !important;
    max-width: ${d(200)} !important;
    height: ${d(100)} !important;
    position: relative !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    align-self: center !important;
    margin-bottom: 4px !important;
    flex-shrink: 0 !important;
}

.sgl-insp-col-card {
    position: absolute !important;
    width: ${d(48)} !important;
    height: ${d(72)} !important;
    border-radius: 5px !important;
    overflow: hidden !important;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.75) !important;
    border: 1px solid rgba(255, 255, 255, 0.16) !important;
    background: #11141c !important;
    transition: transform 0.25s ease !important;
}

.sgl-insp-col-card img {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    display: block !important;
}

.sgl-insp-col-card-far-left {
    transform: translateX(${d(-50)}) translateY(${d(7)}) rotate(-14deg) scale(0.82) !important;
    z-index: 1 !important;
}

.sgl-insp-col-card-left {
    transform: translateX(${d(-25)}) translateY(${d(2)}) rotate(-7deg) scale(0.91) !important;
    z-index: 2 !important;
}

.sgl-insp-col-card-right {
    transform: translateX(${d(25)}) translateY(${d(2)}) rotate(7deg) scale(0.91) !important;
    z-index: 2 !important;
}

.sgl-insp-col-card-far-right {
    transform: translateX(${d(50)}) translateY(${d(7)}) rotate(14deg) scale(0.82) !important;
    z-index: 1 !important;
}

.sgl-insp-col-card-center {
    transform: translateX(0) translateY(-2px) rotate(0deg) scale(1) !important;
    z-index: 3 !important;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.85) !important;
    border-color: rgba(255, 255, 255, 0.3) !important;
}

/* Empty state */
.sgl-empty {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: rgba(255, 255, 255, 0.4);
    font-size: ${d(15)};
    font-weight: 600;
    gap: 8px;
}

/* ==========================================================================
   Responsive / Handheld Rules (Steam Deck 1280x800, ROG Ally 720p/800p, etc.)
   ========================================================================== */
@media (max-width: 1366px), (max-height: 850px) {
    /* Header ribbon: compact 44px to save vertical space for library items */
    .sgl-header {
        height: ${d(44)} !important;
        padding: 0 16px !important;
    }

    .sgl-brand,
    .sgl-brand span,
    .sgl-brand .sgl-brand-text {
        font-size: ${d(12)} !important;
        line-height: 1 !important;
        gap: 6px !important;
    }

    .sgl-tabs-container {
        gap: 6px !important;
    }

    .sgl-tabs {
        gap: 12px !important;
        padding: 2px 4px !important;
    }

    .sgl-tab,
    .sgl-tab span,
    .sgl-tab-label {
        font-size: ${d(11)} !important;
        line-height: 1 !important;
        padding: 4px 2px 6px !important;
        gap: 5px !important;
        height: auto !important;
        min-height: 0 !important;
        letter-spacing: 0.05em !important;
    }

    .sgl-tab-count {
        font-size: ${d(9)} !important;
        line-height: 1 !important;
        padding: 1px 4.5px !important;
    }

    .sgl-bumper-badge {
        font-size: ${d(8.5)} !important;
        line-height: 1 !important;
        padding: 1.5px 5px !important;
    }

    .sgl-breadcrumb-title {
        font-size: ${d(11)} !important;
        line-height: 1 !important;
    }

    .sgl-btn-back-col,
    .sgl-btn-back-col span {
        font-size: ${d(10)} !important;
        line-height: 1 !important;
    }

    .sgl-header-info {
        font-size: ${d(10)} !important;
        line-height: 1 !important;
    }

    /* Left Panel: Inspector compact 275px width with clamped poster */
    .sgl-inspector {
        width: ${d(275)} !important;
        min-width: ${d(250)} !important;
        max-width: ${d(285)} !important;
        padding: ${d(14)} !important;
        gap: 6px !important;
        overflow-y: hidden !important;
        will-change: transform, opacity !important;
    }

    .sgl-poster-wrapper {
        flex: 0 0 auto !important;
        flex-grow: 0 !important;
        flex-shrink: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        aspect-ratio: 2 / 3 !important;
        height: auto !important;
        max-height: clamp(${d(250)}, 44vh, ${d(380)}) !important;
        align-self: center !important;
        border-radius: 10px !important;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.75) !important;
    }

    .sgl-poster-wrapper.sgl-poster-square {
        width: 100% !important;
        max-width: 100% !important;
        aspect-ratio: 1 / 1 !important;
        height: auto !important;
        max-height: ${d(260)} !important;
    }

    .sgl-title-box {
        min-height: ${d(24)} !important;
        max-height: ${d(38)} !important;
        flex-shrink: 0 !important;
    }

    .sgl-title-text {
        font-size: ${d(15)} !important;
        line-height: 1.2 !important;
        max-height: 2.4em !important;
        overflow: hidden !important;
    }

    .sgl-meta-row {
        gap: 6px !important;
        flex-shrink: 0 !important;
    }

    .sgl-source-pill,
    .sgl-status-pill {
        font-size: ${d(9)} !important;
        line-height: 1 !important;
        padding: 2px 6px !important;
    }

    .sgl-stats-grid {
        gap: 4px !important;
        flex-shrink: 0 !important;
    }

    .sgl-stat-card {
        padding: 3px 6px !important;
        gap: 1px !important;
        border-radius: 6px !important;
    }

    .sgl-stat-label {
        font-size: ${d(8)} !important;
        line-height: 1.15 !important;
    }

    .sgl-stat-value {
        font-size: ${d(11)} !important;
        line-height: 1.15 !important;
    }

    .sgl-stat-bar {
        height: 2px !important;
        margin-top: 2px !important;
    }

    .sgl-description {
        font-size: ${di(10)} !important;
        line-height: 1.35 !important;
        -webkit-line-clamp: 6 !important;
        max-height: 8.5em !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        flex-shrink: 0 !important;
    }

    .sgl-actions {
        gap: 6px !important;
        padding-top: 4px !important;
        flex-shrink: 0 !important;
    }

    .sgl-btn-details,
    .sgl-btn-play {
        padding: 4px 10px !important;
        height: ${d(34)} !important;
        min-height: ${d(34)} !important;
        max-height: ${d(34)} !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }

    .sgl-btn-details .sgl-btn-text,
    .sgl-btn-play .sgl-btn-text {
        font-size: ${d(11)} !important;
        line-height: 1 !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        padding: 0 !important;
        margin: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        vertical-align: middle !important;
    }

    .sgl-btn-badge {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: ${d(16)} !important;
        height: ${d(16)} !important;
        min-width: ${d(16)} !important;
        max-width: ${d(16)} !important;
        min-height: ${d(16)} !important;
        max-height: ${d(16)} !important;
        border-radius: 50% !important;
        aspect-ratio: 1 / 1 !important;
        font-size: ${d(8.5)} !important;
        line-height: 1 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        margin: 0 !important;
    }

    /* Inspector Collection Fan */
    .sgl-inspector-col-fan {
        max-width: ${d(200)} !important;
        height: ${d(100)} !important;
        margin-bottom: 4px !important;
        flex-shrink: 0 !important;
    }

    .sgl-insp-col-card {
        width: ${d(48)} !important;
        height: ${d(72)} !important;
        border-radius: 5px !important;
    }

    .sgl-insp-col-card-far-left {
        transform: translateX(${d(-50)}) translateY(${d(7)}) rotate(-14deg) scale(0.82) !important;
    }

    .sgl-insp-col-card-left {
        transform: translateX(${d(-25)}) translateY(${d(2)}) rotate(-7deg) scale(0.91) !important;
    }

    .sgl-insp-col-card-right {
        transform: translateX(${d(25)}) translateY(${d(2)}) rotate(7deg) scale(0.91) !important;
    }

    .sgl-insp-col-card-far-right {
        transform: translateX(${d(50)}) translateY(${d(7)}) rotate(14deg) scale(0.82) !important;
    }

    /* Right Panel: Game Grid */
    .sgl-grid-panel {
        padding: 14px 18px 20px 16px !important;
    }

    .sgl-grid {
        gap: 10px !important;
        padding-bottom: 16px !important;
    }

    /* Cards in Grid */
    .sgl-card-fallback-title {
        font-size: ${d(11)} !important;
        line-height: 1.3 !important;
        max-height: 2.6em !important;
    }

    .sgl-card-running-badge,
    .sgl-card-running-badge span,
    .sgl-card-running-badge .sgl-card-running-text {
        font-size: ${d(8.5)} !important;
        line-height: 1 !important;
    }

    .sgl-card-collection {
        aspect-ratio: 1 / 1 !important;
        height: auto !important;
        contain: paint !important;
    }

    .sgl-col-fan-stage {
        height: ${d(90)} !important;
    }

    .sgl-col-fan-card {
        width: ${d(54)} !important;
        height: ${d(81)} !important;
    }

    .sgl-col-card-far-left {
        transform: translateX(${d(-44)}) translateY(${d(6)}) rotate(-14deg) scale(0.82) !important;
    }

    .sgl-col-card-left {
        transform: translateX(${d(-22)}) translateY(${d(2)}) rotate(-7deg) scale(0.91) !important;
    }

    .sgl-col-card-right {
        transform: translateX(${d(22)}) translateY(${d(2)}) rotate(7deg) scale(0.91) !important;
    }

    .sgl-col-card-far-right {
        transform: translateX(${d(44)}) translateY(${d(6)}) rotate(14deg) scale(0.82) !important;
    }

    .sgl-col-footer {
        padding: 4px 6px !important;
        gap: 2px !important;
    }

    .sgl-col-footer-title {
        font-size: ${d(10)} !important;
        line-height: 1.15 !important;
        max-height: 1.25em !important;
        word-break: normal !important;
        overflow-wrap: normal !important;
        white-space: nowrap !important;
        text-overflow: ellipsis !important;
    }

    .sgl-col-footer-badge {
        font-size: ${d(7.5)} !important;
        line-height: 1 !important;
        padding: 1px 4px !important;
        border-radius: 4px !important;
    }
}

/* Explicit compact modifier (e.g. Playground Handheld mode toggle) */
.sgl-root.sgl-compact .sgl-header {
    height: ${d(44)} !important;
    padding: 0 16px !important;
}
.sgl-root.sgl-compact .sgl-brand,
.sgl-root.sgl-compact .sgl-brand span,
.sgl-root.sgl-compact .sgl-brand .sgl-brand-text {
    font-size: ${d(12)} !important;
    line-height: 1 !important;
    gap: 6px !important;
}
.sgl-root.sgl-compact .sgl-tabs-container {
    gap: 6px !important;
}
.sgl-root.sgl-compact .sgl-tabs {
    gap: 12px !important;
    padding: 2px 4px !important;
}
.sgl-root.sgl-compact .sgl-tab,
.sgl-root.sgl-compact .sgl-tab span,
.sgl-root.sgl-compact .sgl-tab-label {
    font-size: ${d(11)} !important;
    line-height: 1 !important;
    padding: 4px 2px 6px !important;
    gap: 5px !important;
    height: auto !important;
    min-height: 0 !important;
    letter-spacing: 0.05em !important;
}
.sgl-root.sgl-compact .sgl-tab-count {
    font-size: ${d(9)} !important;
    line-height: 1 !important;
    padding: 1px 4.5px !important;
}
.sgl-root.sgl-compact .sgl-bumper-badge {
    font-size: ${d(8.5)} !important;
    line-height: 1 !important;
    padding: 1.5px 5px !important;
}
.sgl-root.sgl-compact .sgl-header-info {
    font-size: ${d(10)} !important;
    line-height: 1 !important;
}
.sgl-root.sgl-compact .sgl-inspector {
    width: ${d(275)} !important;
    min-width: ${d(250)} !important;
    max-width: ${d(285)} !important;
    padding: ${d(14)} !important;
    gap: 6px !important;
    overflow-y: hidden !important;
    will-change: transform, opacity !important;
}
.sgl-root.sgl-compact .sgl-poster-wrapper {
    flex: 0 0 auto !important;
    flex-grow: 0 !important;
    flex-shrink: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    aspect-ratio: 2 / 3 !important;
    height: auto !important;
    max-height: clamp(${d(220)}, 40vh, ${d(330)}) !important;
    align-self: center !important;
    border-radius: 10px !important;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.75) !important;
}
.sgl-root.sgl-compact .sgl-poster-wrapper.sgl-poster-square {
    width: 100% !important;
    max-width: 100% !important;
    aspect-ratio: 1 / 1 !important;
    height: auto !important;
    max-height: ${d(240)} !important;
}
.sgl-root.sgl-compact .sgl-title-box {
    min-height: ${d(24)} !important;
    max-height: ${d(38)} !important;
    flex-shrink: 0 !important;
}
.sgl-root.sgl-compact .sgl-title-text {
    font-size: ${d(15)} !important;
    line-height: 1.2 !important;
    max-height: 2.4em !important;
    overflow: hidden !important;
}
.sgl-root.sgl-compact .sgl-meta-row {
    gap: 6px !important;
    flex-shrink: 0 !important;
}
.sgl-root.sgl-compact .sgl-source-pill,
.sgl-root.sgl-compact .sgl-status-pill {
    font-size: ${d(9)} !important;
    line-height: 1 !important;
    padding: 2px 6px !important;
}
.sgl-root.sgl-compact .sgl-stats-grid {
    gap: 4px !important;
    flex-shrink: 0 !important;
}
.sgl-root.sgl-compact .sgl-stat-card {
    padding: 3px 6px !important;
    gap: 1px !important;
    border-radius: 6px !important;
}
.sgl-root.sgl-compact .sgl-stat-label {
    font-size: ${d(8)} !important;
    line-height: 1.15 !important;
}
.sgl-root.sgl-compact .sgl-stat-value {
    font-size: ${d(11)} !important;
    line-height: 1.15 !important;
}
.sgl-root.sgl-compact .sgl-stat-bar {
    height: 2px !important;
    margin-top: 2px !important;
}
.sgl-root.sgl-compact .sgl-description {
    font-size: ${di(10)} !important;
    line-height: 1.35 !important;
    -webkit-line-clamp: 6 !important;
    max-height: 8.5em !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    flex-shrink: 0 !important;
}
.sgl-root.sgl-compact .sgl-actions {
    gap: 6px !important;
    padding-top: 4px !important;
    flex-shrink: 0 !important;
}
.sgl-root.sgl-compact .sgl-btn-details,
.sgl-root.sgl-compact .sgl-btn-play {
    padding: 4px 10px !important;
    height: ${d(34)} !important;
    min-height: ${d(34)} !important;
    max-height: ${d(34)} !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}
.sgl-root.sgl-compact .sgl-btn-details .sgl-btn-text,
.sgl-root.sgl-compact .sgl-btn-play .sgl-btn-text {
    font-size: ${d(11)} !important;
    line-height: 1 !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    padding: 0 !important;
    margin: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    vertical-align: middle !important;
}
.sgl-root.sgl-compact .sgl-btn-badge {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: ${d(16)} !important;
    height: ${d(16)} !important;
    min-width: ${d(16)} !important;
    max-width: ${d(16)} !important;
    min-height: ${d(16)} !important;
    max-height: ${d(16)} !important;
    border-radius: 50% !important;
    aspect-ratio: 1 / 1 !important;
    font-size: ${d(8.5)} !important;
    line-height: 1 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
    margin: 0 !important;
}
.sgl-root.sgl-compact .sgl-inspector-col-fan {
    max-width: ${d(200)} !important;
    height: ${d(100)} !important;
    margin-bottom: 4px !important;
    flex-shrink: 0 !important;
}
.sgl-root.sgl-compact .sgl-insp-col-card {
    width: ${d(48)} !important;
    height: ${d(72)} !important;
    border-radius: 5px !important;
}
.sgl-root.sgl-compact .sgl-insp-col-card-far-left {
    transform: translateX(${d(-50)}) translateY(${d(7)}) rotate(-14deg) scale(0.82) !important;
}
.sgl-root.sgl-compact .sgl-insp-col-card-left {
    transform: translateX(${d(-25)}) translateY(${d(2)}) rotate(-7deg) scale(0.91) !important;
}
.sgl-root.sgl-compact .sgl-insp-col-card-right {
    transform: translateX(${d(25)}) translateY(${d(2)}) rotate(7deg) scale(0.91) !important;
}
.sgl-root.sgl-compact .sgl-insp-col-card-far-right {
    transform: translateX(${d(50)}) translateY(${d(7)}) rotate(14deg) scale(0.82) !important;
}
.sgl-root.sgl-compact .sgl-grid-panel {
    padding: 14px 18px 20px 16px !important;
}
.sgl-root.sgl-compact .sgl-grid {
    gap: 10px !important;
    padding-bottom: 16px !important;
}
.sgl-root.sgl-compact .sgl-card-fallback-title {
    font-size: ${d(11)} !important;
    line-height: 1.3 !important;
    max-height: 2.6em !important;
}
.sgl-root.sgl-compact .sgl-card-running-badge,
.sgl-root.sgl-compact .sgl-card-running-badge span,
.sgl-root.sgl-compact .sgl-card-running-badge .sgl-card-running-text {
    font-size: ${d(8.5)} !important;
    line-height: 1 !important;
}
.sgl-root.sgl-compact .sgl-card-collection {
    aspect-ratio: 1 / 1 !important;
    height: auto !important;
    contain: paint !important;
}
.sgl-root.sgl-compact .sgl-col-fan-stage {
    height: ${d(90)} !important;
}
.sgl-root.sgl-compact .sgl-col-fan-card {
    width: ${d(54)} !important;
    height: ${d(81)} !important;
}
.sgl-root.sgl-compact .sgl-col-card-far-left {
    transform: translateX(${d(-44)}) translateY(${d(6)}) rotate(-14deg) scale(0.82) !important;
}
.sgl-root.sgl-compact .sgl-col-card-left {
    transform: translateX(${d(-22)}) translateY(${d(2)}) rotate(-7deg) scale(0.91) !important;
}
.sgl-root.sgl-compact .sgl-col-card-right {
    transform: translateX(${d(22)}) translateY(${d(2)}) rotate(7deg) scale(0.91) !important;
}
.sgl-root.sgl-compact .sgl-col-card-far-right {
    transform: translateX(${d(44)}) translateY(${d(6)}) rotate(14deg) scale(0.82) !important;
}
.sgl-root.sgl-compact .sgl-col-footer {
    padding: 4px 6px !important;
    gap: 2px !important;
}
.sgl-root.sgl-compact .sgl-col-footer-title {
    font-size: ${d(10)} !important;
    line-height: 1.15 !important;
    max-height: 1.25em !important;
    word-break: normal !important;
    overflow-wrap: normal !important;
    white-space: nowrap !important;
    text-overflow: ellipsis !important;
}
.sgl-root.sgl-compact .sgl-col-footer-badge {
    font-size: ${d(7.5)} !important;
    line-height: 1 !important;
    padding: 1px 4px !important;
    border-radius: 4px !important;
}

/* Ultra-compact / 720p height optimization (e.g. 1280x720 or on-screen keyboard open) */
@media (max-height: 720px) {
    .sgl-inspector {
        gap: 5px !important;
        padding: ${d(10)} !important;
    }
    .sgl-poster-wrapper {
        width: 100% !important;
        max-width: 100% !important;
        aspect-ratio: 2 / 3 !important;
        height: auto !important;
        max-height: clamp(${d(205)}, 36vh, ${d(300)}) !important;
    }
    .sgl-poster-wrapper.sgl-poster-square {
        width: 100% !important;
        max-width: 100% !important;
        aspect-ratio: 1 / 1 !important;
        height: auto !important;
        max-height: ${d(220)} !important;
    }
    .sgl-title-box {
        min-height: ${d(22)} !important;
        max-height: ${d(36)} !important;
    }
    .sgl-title-text {
        font-size: ${d(14)} !important;
        line-height: 1.2 !important;
    }
    .sgl-stats-grid {
        gap: 3px !important;
    }
    .sgl-stat-card {
        padding: 3px 5px !important;
    }
}

/* ==========================================================================
   Master Typography & Steam UI Scale Immunity:
   High-specificity isolation ensuring Steam Deck / Big Picture settings
   cannot distort navbar, inspector, cards, or poster dimensions.
   ========================================================================== */
:root .sgl-root,
html body .sgl-root,
.Focusable.sgl-root,
html body.LargeText .sgl-root,
html.LargeText .sgl-root,
body.LargeText .sgl-root,
.LargeText .sgl-root,
.sgl-root.sgl-root {
    font-size: ${d(14)} !important;
    line-height: normal !important;
    -webkit-text-size-adjust: 100% !important;
    text-size-adjust: 100% !important;
}

:root .sgl-root *,
html body .sgl-root *,
.Focusable.sgl-root *,
html body.LargeText .sgl-root *,
html.LargeText .sgl-root *,
body.LargeText .sgl-root *,
.LargeText .sgl-root *,
.sgl-root.sgl-root * {
    -webkit-text-size-adjust: 100% !important;
    text-size-adjust: 100% !important;
}

/* Category Ribbon (Top Nav) */
:root .sgl-root .sgl-header,
html body .sgl-root .sgl-header,
.Focusable.sgl-root .sgl-header,
body.LargeText .sgl-root .sgl-header,
.LargeText .sgl-root .sgl-header,
.sgl-root .sgl-header {
    height: ${d(40)} !important;
    min-height: ${d(40)} !important;
    max-height: ${d(40)} !important;
    padding: 0 ${d(16)} !important;
    box-sizing: border-box !important;
}

:root .sgl-root .sgl-brand,
:root .sgl-root .sgl-brand span,
:root .sgl-root .sgl-brand .sgl-brand-text,
html body .sgl-root .sgl-brand,
html body .sgl-root .sgl-brand span,
html body .sgl-root .sgl-brand .sgl-brand-text,
.Focusable.sgl-root .sgl-brand,
.Focusable.sgl-root .sgl-brand span,
.Focusable.sgl-root .sgl-brand .sgl-brand-text,
body.LargeText .sgl-root .sgl-brand,
body.LargeText .sgl-root .sgl-brand span,
body.LargeText .sgl-root .sgl-brand .sgl-brand-text,
.LargeText .sgl-root .sgl-brand,
.LargeText .sgl-root .sgl-brand span,
.sgl-root .sgl-brand,
.sgl-root .sgl-brand span,
.sgl-root .sgl-brand .sgl-brand-text {
    font-size: ${d(12)} !important;
    line-height: 1 !important;
}

:root .sgl-root .sgl-bumper-badge,
html body .sgl-root .sgl-bumper-badge,
.Focusable.sgl-root .sgl-bumper-badge,
body.LargeText .sgl-root .sgl-bumper-badge,
.LargeText .sgl-root .sgl-bumper-badge,
.sgl-root .sgl-bumper-badge {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: ${d(8.5)} !important;
    line-height: 1 !important;
    height: ${d(17)} !important;
    min-width: ${d(22)} !important;
    max-height: ${d(17)} !important;
    padding: 0 ${d(4.5)} !important;
    box-sizing: border-box !important;
}

:root .sgl-root .sgl-tab,
:root .sgl-root .sgl-tab .sgl-tab-label,
html body .sgl-root .sgl-tab,
html body .sgl-root .sgl-tab .sgl-tab-label,
.Focusable.sgl-root .sgl-tab,
.Focusable.sgl-root .sgl-tab .sgl-tab-label,
body.LargeText .sgl-root .sgl-tab,
body.LargeText .sgl-root .sgl-tab .sgl-tab-label,
.LargeText .sgl-root .sgl-tab,
.LargeText .sgl-root .sgl-tab .sgl-tab-label,
.sgl-root .sgl-tab,
.sgl-root .sgl-tab .sgl-tab-label {
    font-size: ${d(11)} !important;
    line-height: 1 !important;
    height: auto !important;
    min-height: 0 !important;
    letter-spacing: 0.05em !important;
    padding: ${d(4)} ${d(4)} ${d(6)} !important;
    margin: 0 !important;
    box-sizing: border-box !important;
}

:root .sgl-root .sgl-tab-count,
html body .sgl-root .sgl-tab-count,
.Focusable.sgl-root .sgl-tab-count,
body.LargeText .sgl-root .sgl-tab-count,
.LargeText .sgl-root .sgl-tab-count,
.sgl-root .sgl-tab-count {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: ${d(9.5)} !important;
    line-height: 1 !important;
    height: ${d(15)} !important;
    min-height: ${d(15)} !important;
    max-height: ${d(15)} !important;
    padding: 0 ${d(5)} !important;
    box-sizing: border-box !important;
    border-radius: ${d(8)} !important;
    margin: 0 0 0 ${d(4)} !important;
}

:root .sgl-root .sgl-breadcrumb-title,
html body .sgl-root .sgl-breadcrumb-title,
.Focusable.sgl-root .sgl-breadcrumb-title,
body.LargeText .sgl-root .sgl-breadcrumb-title,
.LargeText .sgl-root .sgl-breadcrumb-title,
.sgl-root .sgl-breadcrumb-title {
    font-size: ${d(11.5)} !important;
    line-height: 1 !important;
}

:root .sgl-root .sgl-btn-back-col,
:root .sgl-root .sgl-btn-back-col span,
html body .sgl-root .sgl-btn-back-col,
html body .sgl-root .sgl-btn-back-col span,
.Focusable.sgl-root .sgl-btn-back-col,
.Focusable.sgl-root .sgl-btn-back-col span,
body.LargeText .sgl-root .sgl-btn-back-col,
body.LargeText .sgl-root .sgl-btn-back-col span,
.LargeText .sgl-root .sgl-btn-back-col,
.LargeText .sgl-root .sgl-btn-back-col span,
.sgl-root .sgl-btn-back-col,
.sgl-root .sgl-btn-back-col span {
    font-size: ${d(11.5)} !important;
    line-height: 1 !important;
}

:root .sgl-root .sgl-header-info,
html body .sgl-root .sgl-header-info,
.Focusable.sgl-root .sgl-header-info,
body.LargeText .sgl-root .sgl-header-info,
.LargeText .sgl-root .sgl-header-info,
.sgl-root .sgl-header-info {
    font-size: ${d(11)} !important;
    line-height: 1 !important;
}

/* Left Inspector Panel */
:root .sgl-root .sgl-inspector,
html body .sgl-root .sgl-inspector,
.Focusable.sgl-root .sgl-inspector,
body.LargeText .sgl-root .sgl-inspector,
.LargeText .sgl-root .sgl-inspector,
.sgl-root .sgl-inspector {
    width: ${d(275)} !important;
    min-width: ${d(250)} !important;
    max-width: ${d(285)} !important;
    flex: 0 0 ${d(275)} !important;
    padding: ${d(14)} !important;
}

:root .sgl-root .sgl-poster-wrapper,
html body .sgl-root .sgl-poster-wrapper,
.Focusable.sgl-root .sgl-poster-wrapper,
body.LargeText .sgl-root .sgl-poster-wrapper,
.LargeText .sgl-root .sgl-poster-wrapper,
.sgl-root .sgl-poster-wrapper {
    width: 100% !important;
    max-width: 100% !important;
    aspect-ratio: 2 / 3 !important;
    height: auto !important;
    max-height: clamp(${d(250)}, 44vh, ${d(380)}) !important;
    margin: 0 auto !important;
}

:root .sgl-root .sgl-poster-wrapper.sgl-poster-square,
html body .sgl-root .sgl-poster-wrapper.sgl-poster-square,
.Focusable.sgl-root .sgl-poster-wrapper.sgl-poster-square,
body.LargeText .sgl-root .sgl-poster-wrapper.sgl-poster-square,
.LargeText .sgl-root .sgl-poster-wrapper.sgl-poster-square,
.sgl-root .sgl-poster-wrapper.sgl-poster-square {
    width: 100% !important;
    max-width: 100% !important;
    aspect-ratio: 1 / 1 !important;
    height: auto !important;
    max-height: ${d(260)} !important;
    margin: 0 auto !important;
}

:root .sgl-root .sgl-title-box,
html body .sgl-root .sgl-title-box,
.Focusable.sgl-root .sgl-title-box,
body.LargeText .sgl-root .sgl-title-box,
.LargeText .sgl-root .sgl-title-box,
.sgl-root .sgl-title-box {
    min-height: ${d(24)} !important;
    max-height: ${d(40)} !important;
}

:root .sgl-root .sgl-title-text,
html body .sgl-root .sgl-title-text,
.Focusable.sgl-root .sgl-title-text,
body.LargeText .sgl-root .sgl-title-text,
.LargeText .sgl-root .sgl-title-text,
.sgl-root .sgl-title-text {
    font-size: ${di(15)} !important;
    line-height: 1.2 !important;
    max-height: 2.4em !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
}

:root .sgl-root .sgl-source-pill,
:root .sgl-root .sgl-status-pill,
html body .sgl-root .sgl-source-pill,
html body .sgl-root .sgl-status-pill,
.Focusable.sgl-root .sgl-source-pill,
.Focusable.sgl-root .sgl-status-pill,
body.LargeText .sgl-root .sgl-source-pill,
body.LargeText .sgl-root .sgl-status-pill,
.LargeText .sgl-root .sgl-source-pill,
.LargeText .sgl-root .sgl-status-pill,
.sgl-root .sgl-source-pill,
.sgl-root .sgl-status-pill {
    display: inline-flex !important;
    align-items: center !important;
    height: ${d(18)} !important;
    font-size: ${di(8.5)} !important;
    line-height: 1 !important;
    padding: 0 ${d(6)} !important;
    border-radius: ${d(999)} !important;
    flex-shrink: 0 !important;
}

:root .sgl-root .sgl-stat-card,
html body .sgl-root .sgl-stat-card,
.Focusable.sgl-root .sgl-stat-card,
body.LargeText .sgl-root .sgl-stat-card,
.LargeText .sgl-root .sgl-stat-card,
.sgl-root .sgl-stat-card {
    padding: 3px 6px !important;
    gap: 1px !important;
    border-radius: 6px !important;
}

:root .sgl-root .sgl-stat-card span,
:root .sgl-root .sgl-stat-card div,
:root .sgl-root .sgl-stat-label,
html body .sgl-root .sgl-stat-label,
.Focusable.sgl-root .sgl-stat-label,
body.LargeText .sgl-root .sgl-stat-label,
.LargeText .sgl-root .sgl-stat-label,
.sgl-root .sgl-stat-label {
    font-size: ${di(8)} !important;
    line-height: 1.15 !important;
    letter-spacing: 0.5px !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    margin: 0 !important;
    padding: 0 !important;
}

:root .sgl-root .sgl-stat-value,
html body .sgl-root .sgl-stat-value,
.Focusable.sgl-root .sgl-stat-value,
body.LargeText .sgl-root .sgl-stat-value,
.LargeText .sgl-root .sgl-stat-value,
.sgl-root .sgl-stat-value {
    font-size: ${di(11)} !important;
    line-height: 1.15 !important;
    font-weight: 700 !important;
    margin: 0 !important;
    padding: 0 !important;
}

:root .sgl-root .sgl-description,
html body .sgl-root .sgl-description,
.Focusable.sgl-root .sgl-description,
body.LargeText .sgl-root .sgl-description,
.LargeText .sgl-root .sgl-description,
.sgl-root .sgl-description {
    font-size: ${di(10)} !important;
    line-height: 1.35 !important;
    max-height: 8.5em !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 6 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    flex-shrink: 0 !important;
}

:root .sgl-root .sgl-actions,
html body .sgl-root .sgl-actions,
.Focusable.sgl-root .sgl-actions,
body.LargeText .sgl-root .sgl-actions,
.LargeText .sgl-root .sgl-actions,
.sgl-root .sgl-actions {
    gap: 6px !important;
    margin-top: auto !important;
    padding-top: 4px !important;
    flex-shrink: 0 !important;
}

:root .sgl-root .sgl-btn-play,
html body .sgl-root .sgl-btn-play,
.Focusable.sgl-root .sgl-btn-play,
body.LargeText .sgl-root .sgl-btn-play,
.LargeText .sgl-root .sgl-btn-play,
.sgl-root .sgl-btn-play,
:root .sgl-root .sgl-btn-details,
html body .sgl-root .sgl-btn-details,
.Focusable.sgl-root .sgl-btn-details,
body.LargeText .sgl-root .sgl-btn-details,
.LargeText .sgl-root .sgl-btn-details,
.sgl-root .sgl-btn-details {
    height: ${d(34)} !important;
    min-height: ${d(34)} !important;
    max-height: ${d(34)} !important;
    padding: 0 ${d(10)} !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    box-sizing: border-box !important;
}

:root .sgl-root .sgl-btn-text,
html body .sgl-root .sgl-btn-text,
.Focusable.sgl-root .sgl-btn-text,
body.LargeText .sgl-root .sgl-btn-text,
.LargeText .sgl-root .sgl-btn-text,
.sgl-root .sgl-btn-text,
.sgl-btn-details .sgl-btn-text,
.sgl-btn-play .sgl-btn-text {
    font-size: ${di(11)} !important;
    line-height: 1 !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    padding: 0 !important;
    margin: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    vertical-align: middle !important;
    box-sizing: border-box !important;
}

:root .sgl-root .sgl-btn-badge,
html body .sgl-root .sgl-btn-badge,
.Focusable.sgl-root .sgl-btn-badge,
body.LargeText .sgl-root .sgl-btn-badge,
.LargeText .sgl-root .sgl-btn-badge,
.sgl-root .sgl-btn-badge,
.sgl-btn-details .sgl-btn-badge,
.sgl-btn-play .sgl-btn-badge,
.sgl-btn-back-col .sgl-btn-badge {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: ${d(16)} !important;
    height: ${d(16)} !important;
    min-width: ${d(16)} !important;
    max-width: ${d(16)} !important;
    min-height: ${d(16)} !important;
    max-height: ${d(16)} !important;
    border-radius: 50% !important;
    aspect-ratio: 1 / 1 !important;
    font-size: ${di(8.5)} !important;
    line-height: 1 !important;
    font-weight: 800 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
    vertical-align: middle !important;
    letter-spacing: 0 !important;
    margin: 0 !important;
    flex-shrink: 0 !important;
}

/* Right Grid (Cards) */
:root .sgl-root .sgl-card-fallback-title,
html body .sgl-root .sgl-card-fallback-title,
.Focusable.sgl-root .sgl-card-fallback-title,
body.LargeText .sgl-root .sgl-card-fallback-title,
.LargeText .sgl-root .sgl-card-fallback-title,
.sgl-root .sgl-card-fallback-title {
    font-size: ${d(11)} !important;
    line-height: 1.3 !important;
    max-height: 2.6em !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
}

:root .sgl-root .sgl-card-running-badge,
:root .sgl-root .sgl-card-running-badge span,
:root .sgl-root .sgl-card-running-badge .sgl-card-running-text,
html body .sgl-root .sgl-card-running-badge,
html body .sgl-root .sgl-card-running-badge span,
html body .sgl-root .sgl-card-running-badge .sgl-card-running-text,
.Focusable.sgl-root .sgl-card-running-badge,
.Focusable.sgl-root .sgl-card-running-badge span,
.Focusable.sgl-root .sgl-card-running-badge .sgl-card-running-text,
body.LargeText .sgl-root .sgl-card-running-badge,
body.LargeText .sgl-root .sgl-card-running-badge span,
body.LargeText .sgl-root .sgl-card-running-badge .sgl-card-running-text,
.LargeText .sgl-root .sgl-card-running-badge,
.LargeText .sgl-root .sgl-card-running-badge span,
.LargeText .sgl-root .sgl-card-running-badge .sgl-card-running-text,
.sgl-root .sgl-card-running-badge,
.sgl-root .sgl-card-running-badge span,
.sgl-root .sgl-card-running-badge .sgl-card-running-text {
    font-size: ${d(8.5)} !important;
    line-height: 1 !important;
}

:root .sgl-root .sgl-col-footer,
html body .sgl-root .sgl-col-footer,
.Focusable.sgl-root .sgl-col-footer,
body.LargeText .sgl-root .sgl-col-footer,
.LargeText .sgl-root .sgl-col-footer,
.sgl-root .sgl-col-footer {
    padding: 4px 6px !important;
    gap: 2px !important;
}

:root .sgl-root .sgl-col-footer-title,
html body .sgl-root .sgl-col-footer-title,
.Focusable.sgl-root .sgl-col-footer-title,
body.LargeText .sgl-root .sgl-col-footer-title,
.LargeText .sgl-root .sgl-col-footer-title,
.sgl-root .sgl-col-footer-title {
    font-size: ${d(10)} !important;
    line-height: 1.15 !important;
    max-height: 1.25em !important;
    display: block !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    word-break: normal !important;
    overflow-wrap: normal !important;
}

:root .sgl-root .sgl-col-footer-badge,
html body .sgl-root .sgl-col-footer-badge,
.Focusable.sgl-root .sgl-col-footer-badge,
body.LargeText .sgl-root .sgl-col-footer-badge,
.LargeText .sgl-root .sgl-col-footer-badge,
.sgl-root .sgl-col-footer-badge,
.sgl-root span.sgl-col-footer-badge,
.sgl-root div.sgl-col-footer-badge {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: ${d(7.5)} !important;
    line-height: 1 !important;
    height: ${d(14)} !important;
    max-height: ${d(14)} !important;
    padding: 0 ${d(4.5)} !important;
    border-radius: ${d(4)} !important;
    box-sizing: border-box !important;
    margin: 0 !important;
}

/* Inspector 5-Card Fan for Collections in Immunity Block */
:root .sgl-root .sgl-inspector-col-fan,
html body .sgl-root .sgl-inspector-col-fan,
.Focusable.sgl-root .sgl-inspector-col-fan,
body.LargeText .sgl-root .sgl-inspector-col-fan,
.LargeText .sgl-root .sgl-inspector-col-fan,
.sgl-root .sgl-inspector-col-fan {
    max-width: ${d(200)} !important;
    height: ${d(100)} !important;
    margin-bottom: 4px !important;
    flex-shrink: 0 !important;
}

:root .sgl-root .sgl-insp-col-card,
html body .sgl-root .sgl-insp-col-card,
.Focusable.sgl-root .sgl-insp-col-card,
body.LargeText .sgl-root .sgl-insp-col-card,
.LargeText .sgl-root .sgl-insp-col-card,
.sgl-root .sgl-insp-col-card {
    width: ${d(48)} !important;
    height: ${d(72)} !important;
    border-radius: 5px !important;
}

/* Collection Art Customization Modal */
.sgl-modal-backdrop {
    position: fixed !important;
    inset: 0 !important;
    background: rgba(0, 0, 0, 0.75) !important;
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
    z-index: 1000 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: ${d(20)} !important;
    animation: sglModalFadeIn 0.18s ease-out both !important;
}

@keyframes sglModalFadeIn {
    from { opacity: 0; transform: scale(0.97); }
    to { opacity: 1; transform: scale(1); }
}

.sgl-modal-window {
    background: #0d1117 !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    border-radius: ${d(14)} !important;
    width: ${d(780)} !important;
    max-width: 92vw !important;
    max-height: 86vh !important;
    display: flex !important;
    flex-direction: column !important;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
    overflow: hidden !important;
    color: #f0f6fc !important;
}

.sgl-modal-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: ${d(14)} ${d(18)} !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    background: rgba(255, 255, 255, 0.02) !important;
}

.sgl-modal-title-row {
    display: flex !important;
    align-items: center !important;
    gap: ${d(8)} !important;
}

.sgl-modal-title {
    margin: 0 !important;
    font-size: ${d(15)} !important;
    font-weight: 700 !important;
    color: #f0f6fc !important;
}

.sgl-modal-subtitle {
    font-size: ${d(13)} !important;
    color: rgba(255, 255, 255, 0.6) !important;
}

.sgl-modal-close-btn {
    background: none !important;
    border: none !important;
    color: rgba(255, 255, 255, 0.5) !important;
    cursor: pointer !important;
    padding: ${d(4)} !important;
    border-radius: ${d(4)} !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}
.sgl-modal-close-btn:hover {
    color: #fff !important;
}

.sgl-modal-body {
    display: flex !important;
    gap: ${d(20)} !important;
    padding: ${d(18)} !important;
    overflow-y: auto !important;
    flex: 1 !important;
}

.sgl-modal-preview-pane {
    flex: 0 0 ${d(240)} !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    gap: ${d(8)} !important;
}

.sgl-modal-preview-label {
    font-size: ${d(11)} !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    color: rgba(255, 255, 255, 0.45) !important;
}

.sgl-modal-card-preview {
    width: ${d(170)} !important;
    height: ${d(170)} !important;
    aspect-ratio: 1 / 1 !important;
    border-radius: ${d(10)} !important;
    overflow: hidden !important;
    pointer-events: none !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6) !important;
    margin: 0 !important;
}

.sgl-modal-controls-pane {
    flex: 1 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: ${d(12)} !important;
    min-width: 0 !important;
}

.sgl-modal-section {
    display: flex !important;
    flex-direction: column !important;
    gap: ${d(6)} !important;
}

.sgl-modal-section-title {
    font-size: ${d(12)} !important;
    font-weight: 600 !important;
    color: rgba(255, 255, 255, 0.85) !important;
}

.sgl-modal-btn-row {
    display: flex !important;
    gap: ${d(6)} !important;
    flex-wrap: wrap !important;
}

.sgl-modal-mode-pill {
    padding: ${d(6)} ${d(12)} !important;
    border-radius: ${d(8)} !important;
    font-size: ${d(11.5)} !important;
    font-weight: 600 !important;
    background: rgba(255, 255, 255, 0.06) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    color: rgba(255, 255, 255, 0.8) !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
}

.sgl-modal-mode-pill.active {
    background: var(--accent, #58a6ff) !important;
    border-color: var(--accent, #58a6ff) !important;
    color: #fff !important;
}

.sgl-modal-mode-pill:focus,
.sgl-modal-mode-pill.focused,
.sgl-modal-mode-pill.gpfocus,
.sgl-modal-mode-pill.gp-focus {
    outline: 2px solid #fff !important;
    outline-offset: 1px !important;
}

.sgl-modal-browse-btn {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: ${d(8)} !important;
    padding: ${d(8)} ${d(14)} !important;
    border-radius: ${d(8)} !important;
    background: rgba(88, 166, 255, 0.12) !important;
    border: 1px solid rgba(88, 166, 255, 0.3) !important;
    color: #58a6ff !important;
    font-weight: 600 !important;
    font-size: ${d(12)} !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
}

.sgl-modal-browse-btn:focus,
.sgl-modal-browse-btn.focused,
.sgl-modal-browse-btn.gpfocus,
.sgl-modal-browse-btn.gp-focus {
    background: rgba(88, 166, 255, 0.28) !important;
    border-color: #58a6ff !important;
    outline: 2px solid #58a6ff !important;
}

.sgl-modal-stepper {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    background: rgba(22, 27, 34, 0.95) !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    border-radius: ${d(8)} !important;
    padding: ${d(6)} ${d(10)} !important;
    transition: all 0.15s ease !important;
    cursor: pointer !important;
    width: 100% !important;
    box-sizing: border-box !important;
}

.sgl-modal-stepper.focused {
    border-color: var(--accent, #58a6ff) !important;
    outline: 2px solid var(--accent, #58a6ff) !important;
    outline-offset: 1px !important;
    box-shadow: 0 0 12px var(--accent-glow, rgba(88, 166, 255, 0.4)) !important;
    background: rgba(30, 38, 50, 0.98) !important;
}

.sgl-modal-stepper-btn {
    background: rgba(255, 255, 255, 0.08) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: rgba(255, 255, 255, 0.8) !important;
    border-radius: ${d(4)} !important;
    width: ${d(26)} !important;
    height: ${d(26)} !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: ${d(12)} !important;
    cursor: pointer !important;
    user-select: none !important;
}

.sgl-modal-stepper-btn:hover {
    background: rgba(255, 255, 255, 0.2) !important;
    color: #fff !important;
}

.sgl-modal-stepper-content {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    gap: ${d(2)} !important;
    flex: 1 !important;
    padding: 0 ${d(8)} !important;
}

.sgl-modal-stepper-title {
    font-size: ${d(12.5)} !important;
    font-weight: 700 !important;
    color: #f0f6fc !important;
}

.sgl-modal-stepper-sub {
    font-size: ${d(10.5)} !important;
    color: rgba(255, 255, 255, 0.5) !important;
    text-align: center !important;
}

.sgl-modal-info-card {
    background: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: ${d(8)} !important;
    padding: ${d(12)} ${d(14)} !important;
    font-size: ${d(11.5)} !important;
    color: rgba(255, 255, 255, 0.65) !important;
    line-height: 1.4 !important;
}

.sgl-modal-select-hint {
    font-size: ${d(10.5)} !important;
    color: rgba(255, 255, 255, 0.45) !important;
    margin-top: ${d(2)} !important;
}

.sgl-modal-url-input-container {
    width: 100% !important;
}

.sgl-modal-url-input {
    width: 100% !important;
    background: rgba(0, 0, 0, 0.4) !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    border-radius: ${d(6)} !important;
    padding: ${d(6)} ${d(10)} !important;
    color: #f0f6fc !important;
    font-size: ${d(11)} !important;
    font-family: inherit !important;
    outline: none !important;
    box-sizing: border-box !important;
    transition: all 0.15s ease !important;
}

.sgl-modal-url-input:focus {
    border-color: #58a6ff !important;
    background: rgba(0, 0, 0, 0.6) !important;
    box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.25) !important;
}

.sgl-modal-filepath-text {
    font-size: ${d(11)} !important;
    color: rgba(255, 255, 255, 0.6) !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    font-family: monospace !important;
    padding: ${d(4)} ${d(8)} !important;
    background: rgba(0, 0, 0, 0.35) !important;
    border-radius: ${d(6)} !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.sgl-modal-filepath-prefix {
    color: #58a6ff !important;
    font-weight: 600 !important;
}

.sgl-modal-filepath-hint {
    font-size: ${d(10.5)} !important;
    color: rgba(255, 255, 255, 0.4) !important;
    line-height: 1.3 !important;
}

.sgl-modal-console-auto-btn {
    padding: ${d(6)} ${d(10)} !important;
    border-radius: ${d(6)} !important;
    font-size: ${d(11)} !important;
    font-weight: 600 !important;
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: rgba(255, 255, 255, 0.7) !important;
    cursor: pointer !important;
    text-align: left !important;
    width: fit-content !important;
}

.sgl-modal-console-auto-btn.active {
    border-color: #3fb950 !important;
    color: #3fb950 !important;
    background: rgba(63, 185, 80, 0.15) !important;
}

.sgl-modal-console-auto-btn:focus,
.sgl-modal-console-auto-btn.focused,
.sgl-modal-console-auto-btn.gpfocus,
.sgl-modal-console-auto-btn.gp-focus {
    outline: 2px solid #fff !important;
}

.sgl-modal-console-header-row {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: ${d(8)} !important;
    flex-wrap: wrap !important;
}

.sgl-modal-console-selected-badge {
    font-size: ${d(11)} !important;
    color: rgba(255, 255, 255, 0.6) !important;
    background: rgba(255, 255, 255, 0.04) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: ${d(6)} !important;
    padding: ${d(4)} ${d(8)} !important;
}

.sgl-modal-console-selected-badge strong {
    color: var(--accent, #58a6ff) !important;
}

.sgl-modal-console-grid {
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important;
    gap: ${d(5)} !important;
    max-height: ${d(170)} !important;
    overflow-y: auto !important;
    padding: ${d(3)} !important;
    border-radius: ${d(8)} !important;
    background: rgba(0, 0, 0, 0.25) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    scroll-behavior: smooth !important;
}

.sgl-modal-console-grid::-webkit-scrollbar {
    width: ${d(6)} !important;
}

.sgl-modal-console-grid::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.04) !important;
    border-radius: ${d(4)} !important;
}

.sgl-modal-console-grid::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.25) !important;
    border-radius: ${d(4)} !important;
}

.sgl-modal-console-grid::-webkit-scrollbar-thumb:hover {
    background: var(--accent, #58a6ff) !important;
}

.sgl-modal-console-item {
    display: flex !important;
    align-items: center !important;
    gap: ${d(6)} !important;
    padding: ${d(5)} ${d(6)} !important;
    border-radius: ${d(6)} !important;
    background: rgba(255, 255, 255, 0.04) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    cursor: pointer !important;
    transition: all 0.12s ease !important;
    min-width: 0 !important;
}

.sgl-modal-console-item.active {
    background: rgba(88, 166, 255, 0.18) !important;
    border-color: var(--accent, #58a6ff) !important;
    color: #fff !important;
}

.sgl-modal-console-item:focus,
.sgl-modal-console-item.focused,
.sgl-modal-console-item.gpfocus,
.sgl-modal-console-item.gp-focus {
    outline: 2px solid var(--accent, #58a6ff) !important;
    outline-offset: 1px !important;
    border-color: var(--accent, #58a6ff) !important;
    box-shadow: 0 0 10px var(--accent-glow, rgba(88, 166, 255, 0.4)) !important;
    background: rgba(88, 166, 255, 0.22) !important;
}

.sgl-modal-console-thumb {
    width: ${d(18)} !important;
    height: ${d(18)} !important;
    object-fit: contain !important;
    flex-shrink: 0 !important;
}

.sgl-modal-console-thumb-fallback {
    width: ${d(18)} !important;
    height: ${d(18)} !important;
    border-radius: ${d(4)} !important;
    background: rgba(255, 255, 255, 0.1) !important;
    flex-shrink: 0 !important;
}

.sgl-modal-console-name {
    font-size: ${d(10.5)} !important;
    font-weight: 500 !important;
    color: inherit !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

.sgl-modal-footer {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: ${d(8)} !important;
    padding: ${d(12)} ${d(18)} !important;
    border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
    background: rgba(0, 0, 0, 0.25) !important;
}

.sgl-modal-action-btn {
    display: inline-flex !important;
    align-items: center !important;
    gap: ${d(8)} !important;
    padding: ${d(7)} ${d(14)} !important;
    border-radius: ${d(8)} !important;
    font-size: ${d(11.5)} !important;
    font-weight: 700 !important;
    cursor: pointer !important;
    border: 1px solid transparent !important;
    transition: all 0.15s ease !important;
}

.sgl-modal-action-btn:focus,
.sgl-modal-action-btn.focused,
.sgl-modal-action-btn.gpfocus,
.sgl-modal-action-btn.gp-focus {
    outline: 2px solid #fff !important;
    outline-offset: 1px !important;
}

.sgl-modal-btn-save {
    background: #238636 !important;
    color: #fff !important;
    border-color: #2ea043 !important;
}
.sgl-modal-btn-save:hover,
.sgl-modal-btn-save:focus {
    background: #2ea043 !important;
}

.sgl-modal-btn-reset {
    background: rgba(248, 81, 73, 0.15) !important;
    color: #f85149 !important;
    border-color: rgba(248, 81, 73, 0.3) !important;
}
.sgl-modal-btn-reset:hover,
.sgl-modal-btn-reset:focus {
    background: rgba(248, 81, 73, 0.28) !important;
}

.sgl-modal-btn-cancel {
    background: rgba(255, 255, 255, 0.06) !important;
    color: rgba(255, 255, 255, 0.7) !important;
    border-color: rgba(255, 255, 255, 0.12) !important;
}
.sgl-modal-btn-cancel:hover,
.sgl-modal-btn-cancel:focus {
    background: rgba(255, 255, 255, 0.15) !important;
    color: #fff !important;
}
`;
