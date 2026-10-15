import { describe, expect, it } from 'vitest';
import { imageSize } from '../../src/home/imageSize';

const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const png = (width: number, height: number) =>
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...be32(width), ...be32(height), 8, 6, 0, 0, 0]);
const jpeg = (sof: number, width: number, height: number) =>
    new Uint8Array([
        0xff, 0xd8,
        // APP0 (JFIF), 16 bytes
        0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0,
        // DHT (0xC4 is not a frame header), 5 bytes
        0xff, 0xc4, 0, 5, 0, 0, 0,
        0xff, sof, 0, 17, 8, height >> 8, height & 255, width >> 8, width & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1,
    ]);

describe('imageSize (a file\'s size from its first bytes, without decoding it)', () => {
    it("reads a PNG's size from its header: the #31 logo, 6790 x 3213", () => {
        expect(imageSize(png(6790, 3213))).toEqual({ width: 6790, height: 3213 });
    });
    it("reads a JPEG's size from its frame header, past the segments before it", () => {
        expect(imageSize(jpeg(0xc0, 3840, 1240))).toEqual({ width: 3840, height: 1240 });
    });
    it('reads a progressive JPEG too', () => {
        expect(imageSize(jpeg(0xc2, 1920, 620))).toEqual({ width: 1920, height: 620 });
    });
    it('null for a file cut short, another format or a size of 0', () => {
        expect(imageSize(png(6790, 3213).slice(0, 20))).toBeNull();
        expect(imageSize(jpeg(0xc0, 3840, 1240).slice(0, 30))).toBeNull();
        expect(imageSize(new TextEncoder().encode('RIFF....WEBPVP8 '))).toBeNull();
        expect(imageSize(png(0, 360))).toBeNull();
        expect(imageSize(new Uint8Array())).toBeNull();
    });
});
