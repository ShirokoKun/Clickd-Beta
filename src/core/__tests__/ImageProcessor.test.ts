// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { ImageProcessor } from '../ImageProcessor';

function makeImageData(width: number, height: number, fill: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  let i = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = fill(x, y);
      data[i++] = r; data[i++] = g; data[i++] = b; data[i++] = a;
    }
  }
  // Create a minimal ImageData-like object for tests to avoid canvas/jsdom dependency
  return { data, width, height } as unknown as ImageData;
}

describe('ImageProcessor', () => {
  it('extractSilhouette thresholds correctly', () => {
    const w = 4, h = 1;
    // pixels: [0,0,0], [100,100,100], [200,200,200], [255,255,255]
    const img = makeImageData(w, h, (x) => [x * 85, x * 85, x * 85, 255]);
    const proc = new ImageProcessor(img, w, h);
    const mask = proc.extractSilhouette(128, false);
    expect(Array.from(mask)).toEqual([1, 1, 0, 0]);
    const maskInv = proc.extractSilhouette(128, true);
    expect(Array.from(maskInv)).toEqual([0, 0, 1, 1]);
  });

  it('detectEdges marks boundary pixels', () => {
    const w = 5, h = 5;
    // solid 3x3 block in the center
    const img = makeImageData(w, h, () => [0, 0, 0, 255]);
    const proc = new ImageProcessor(img, w, h);
    const mask = new Uint8Array(w * h);
    for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) mask[y * w + x] = 1;
    const edges = proc.detectEdges(mask);
    // center should have edge ring but not the inner-most pixel when neighbors are all 1
    expect(edges[2 * w + 2]).toBe(0);
    // corners of the block should be edges
    expect(edges[1 * w + 1]).toBe(1);
    expect(edges[1 * w + 3]).toBe(1);
    expect(edges[3 * w + 1]).toBe(1);
    expect(edges[3 * w + 3]).toBe(1);
  });
});


