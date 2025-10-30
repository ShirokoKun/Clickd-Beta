declare module 'gifenc/dist/gifenc.esm.js' {
  export function GIFEncoder(): {
    writeFrame(indexedPixels: Uint8Array, width: number, height: number, opts: { palette: Uint8Array; delay?: number; transparent?: boolean }): void;
    finish(): void;
    bytes(): Uint8Array;
  };
  export function quantize(rgba: Uint8ClampedArray, maxColors: number): Uint8Array;
  export function applyPalette(rgba: Uint8ClampedArray, palette: Uint8Array): Uint8Array;
}


