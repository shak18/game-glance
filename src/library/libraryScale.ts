export interface LibraryCanvas {
    logicalWidth: number;
    logicalHeight: number;
    scale: number;
}

const WIDE = { logicalWidth: 1440, logicalHeight: 810 }; // 16:9 (ROG Ally 1920x1080 renders it x4/3)
const DECK = { logicalWidth: 1280, logicalHeight: 800 }; // 16:10 (Steam Deck renders it x1)
const WIDE_ASPECT = 1.7;

export function libraryCanvas(width: number, height: number): LibraryCanvas {
    const valid = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
    if (!valid) return { ...DECK, scale: 1 };
    const canvas = width / height > WIDE_ASPECT ? WIDE : DECK;
    const byWidth = width / canvas.logicalWidth;
    const byHeight = height / canvas.logicalHeight;
    if (byWidth <= byHeight) return { ...canvas, scale: byWidth };
    return { logicalWidth: width / byHeight, logicalHeight: canvas.logicalHeight, scale: byHeight };
}

const MIN_BOX_PX = 64;

export function usableSize(width: number, height: number): boolean {
    return Number.isFinite(width) && Number.isFinite(height) && width >= MIN_BOX_PX && height >= MIN_BOX_PX;
}
