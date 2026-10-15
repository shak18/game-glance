/**
 * A PNG's or JPEG's size from its first bytes, without decoding it: a huge custom logo is then decoded once, straight to a
 * smaller copy (home/logoArt), instead of whole first to learn its size (#31). Null for another format, a file cut short
 * or a size of 0. Pure.
 */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
    const size = (width: number, height: number) => (width > 0 && height > 0 ? { width, height } : null);
    const u16 = (i: number) => (bytes[i] << 8) | bytes[i + 1];
    const u32 = (i: number) => ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
    const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (bytes.length >= 24 && PNG.every((b, i) => bytes[i] === b)) return size(u32(16), u32(20));
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
    // JPEG: segments one after another until a frame header (SOF0-SOF15, but C4, C8 and CC are other segments).
    let i = 2;
    while (i + 3 < bytes.length) {
        if (bytes[i] !== 0xff) return null;
        const marker = bytes[i + 1];
        if (marker === 0xff) {
            i++;
            continue;
        }
        if (marker >= 0xd0 && marker <= 0xd9) {
            i += 2;
            continue;
        }
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
            return i + 8 < bytes.length ? size(u16(i + 7), u16(i + 5)) : null;
        }
        i += 2 + u16(i + 2);
    }
    return null;
}
