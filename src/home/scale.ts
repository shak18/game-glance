export interface HomeCanvas {
    logicalWidth: number;
    logicalHeight: number;
    scale: number;
}

const WIDE = { logicalWidth: 1440, logicalHeight: 810 }; // 16:9 (ROG Ally 1920x1080 renders it x4/3)
const DECK = { logicalWidth: 1280, logicalHeight: 800 }; // 16:10 (Steam Deck renders it x1)
const WIDE_ASPECT = 1.7;

/**
 * The logical canvas Home is authored on, and the factor that scales it to the real screen: by the limiting side, so
 * the authored height always fits. A screen wider than 16:9 (21:9, 32:9) scales by its height and gets a wider canvas
 * (more side room) instead of a shorter one, which pushed the games row and tabs off-screen. 16:9, 16:10 and narrower
 * screens are limited by their width, as before. The game page's d unit follows the same rule (themeCss pageDUnit, --gg-d).
 * Sizes are CSS px of the Big Picture window. A zero, negative or non-finite size gives scale 1.
 */
export function homeCanvas(width: number, height: number): HomeCanvas {
    const valid = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
    if (!valid) return { ...DECK, scale: 1 };
    const canvas = width / height > WIDE_ASPECT ? WIDE : DECK;
    const byWidth = width / canvas.logicalWidth;
    const byHeight = height / canvas.logicalHeight;
    if (byWidth <= byHeight) return { ...canvas, scale: byWidth };
    return { logicalWidth: width / byHeight, logicalHeight: canvas.logicalHeight, scale: byHeight };
}

/**
 * The canvas's inline style: its logical size, scaled to the box. Hidden until the box has a real size (it never
 * flashes at the wrong scale); then it inherits, never an explicit 'visible', which would show Home through an
 * ancestor Steam hides (its page-leave animation, hidden during the open transition).
 */
export function canvasStyle(canvas: Pick<HomeCanvas, 'logicalWidth' | 'scale'>, logicalHeight: number, sized: boolean): { width: string; height: string; transform: string; visibility?: 'hidden' } {
    const style = { width: `${canvas.logicalWidth}px`, height: `${logicalHeight}px`, transform: `scale(${canvas.scale})` };
    return sized ? style : { ...style, visibility: 'hidden' };
}
