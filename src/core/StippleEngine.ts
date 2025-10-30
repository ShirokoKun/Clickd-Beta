import type { StippleParams } from '../ui/App';
import { IconRenderer } from './icons/IconRenderer';

type RenderInput = {
  originX: number;
  originY: number;
  width: number;
  height: number;
  silhouette: Uint8Array;
  edges: Uint8Array;
  params: StippleParams;
};

export class StippleEngine {
  private ctx: CanvasRenderingContext2D;
  private iconRenderer: IconRenderer;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.iconRenderer = new IconRenderer();
  }

  render(input: RenderInput) {
    const { originX, originY, width, height, silhouette, edges, params } = input;

    const gridStep = Math.max(2, Math.round((35 - (params.density / 100) * 30)));
    const centerX = originX + width / 2;
    const centerY = originY + height / 2;

    const maxDispersionPx = (Math.max(width, height) * params.dispersionAmount) / 100;

    for (let y = 0; y < height; y += gridStep) {
      for (let x = 0; x < width; x += gridStep) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const i = iy * width + ix;
        if (!silhouette[i]) continue;

        // distance to edge (cheap): BFS-less local search radius
        let dist = 0;
        const radius = 8;
        if (!edges[i]) {
          outer: for (let r = 1; r <= radius; r++) {
            for (let oy = -r; oy <= r; oy++) {
              const yy = iy + oy;
              if (yy < 0 || yy >= height) continue;
              for (let ox = -r; ox <= r; ox++) {
                const xx = ix + ox;
                if (xx < 0 || xx >= width) continue;
                if (edges[yy * width + xx]) {
                  dist = Math.hypot(ox, oy);
                  break outer;
                }
              }
            }
          }
        }

        const normalizedFromEdge = Math.min(dist / radius, 1);
        const awayAngle = Math.atan2(originY + y - centerY, originX + x - centerX);
        const strength = (1 - normalizedFromEdge) * maxDispersionPx;

        const tx = originX + x + Math.cos(awayAngle) * strength;
        const ty = originY + y + Math.sin(awayAngle) * strength;

        const rotation = ((Math.random() - 0.5) * params.rotationVariance * (1 - normalizedFromEdge) * Math.PI) / 180;

        const style = { fill: '#ffffff', stroke: '#000000', lineWidth: 0.6 } as const;
        if (params.iconType === 'cursor') {
          this.iconRenderer.drawCursor(this.ctx, tx, ty, params.iconSize, rotation, style);
        } else if (params.iconType === 'circle') {
          this.iconRenderer.drawCircle(this.ctx, tx, ty, params.iconSize, style);
        } else if (params.iconType === 'triangle') {
          this.iconRenderer.drawTriangle(this.ctx, tx, ty, params.iconSize, rotation, style);
        } else if (params.iconType === 'star') {
          this.iconRenderer.drawStar(this.ctx, tx, ty, params.iconSize, rotation, style);
        } else {
          this.iconRenderer.drawCursor(this.ctx, tx, ty, params.iconSize, rotation, style);
        }
      }
    }
  }
}


