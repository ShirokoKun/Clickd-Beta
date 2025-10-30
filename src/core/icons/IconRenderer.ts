export type IconStyle = { fill: string; stroke: string; lineWidth: number };

export class IconRenderer {
  drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotationRad: number, style: IconStyle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotationRad);

    const pts: Array<[number, number]> = [
      [0, 0],
      [0, size * 1.5],
      [size * 0.4, size * 1.1],
      [size * 0.7, size * 1.8],
      [size * 0.9, size * 1.7],
      [size * 0.6, size],
      [size * 1.1, size * 0.95],
    ];

    ctx.fillStyle = style.fill;
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, style: IconStyle) {
    ctx.save();
    ctx.fillStyle = style.fill;
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotationRad: number, style: IconStyle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotationRad);
    ctx.fillStyle = style.fill;
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth;
    ctx.beginPath();
    const h = size * 1.2;
    ctx.moveTo(0, -h * 0.6);
    ctx.lineTo(-h * 0.5, h * 0.6);
    ctx.lineTo(h * 0.5, h * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotationRad: number, style: IconStyle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotationRad);
    ctx.fillStyle = style.fill;
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth;
    const outer = size * 0.8;
    const inner = size * 0.35;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}


