export class ImageProcessor {
  private imageData: ImageData;
  private width: number;
  private height: number;

  constructor(imageData: ImageData, width: number, height: number) {
    this.imageData = imageData;
    this.width = width;
    this.height = height;
  }

  extractSilhouette(threshold: number, invert: boolean): Uint8Array {
    const { data } = this.imageData;
    const mask = new Uint8Array(this.width * this.height);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      const inside = brightness < threshold ? 1 : 0;
      mask[p] = invert ? 1 - inside : inside;
    }
    return mask;
  }

  detectEdges(mask: Uint8Array): Uint8Array {
    // Simple 4-neighborhood edge: pixel in mask with any neighbor out of mask
    const edges = new Uint8Array(this.width * this.height);
    const w = this.width;
    const h = this.height;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!mask[i]) continue;
        const n0 = mask[i - 1];
        const n1 = mask[i + 1];
        const n2 = mask[i - w];
        const n3 = mask[i + w];
        if (!(n0 && n1 && n2 && n3)) edges[i] = 1;
      }
    }
    return edges;
  }
}


