import React, { useEffect, useRef } from 'react';

type Props = { image: ImageBitmap | null; video: HTMLVideoElement | null; sourceSize: { width: number; height: number } | null };

export function OriginalCanvas({ image, video, sourceSize }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let rafId: number | null = null;
    let active = true;

    const loop = () => {
      if (!active) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      if (!image && !video) return;
      const sw = image ? image.width : (video && video.videoWidth ? video.videoWidth : 0);
      const sh = image ? image.height : (video && video.videoHeight ? video.videoHeight : 0);
      if (video && (!sw || !sh)) { if (video) { requestAnimationFrame(loop); } return; }
      const scale = Math.min(w / sw, h / sh);
      const iw = Math.floor(sw * scale);
      const ih = Math.floor(sh * scale);
      const ox = Math.floor((w - iw) / 2);
      const oy = Math.floor((h - ih) / 2);
      if (image) ctx.drawImage(image, ox, oy, iw, ih);
      if (video) ctx.drawImage(video, ox, oy, iw, ih);
      if (video) rafId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      active = false;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [image, video, sourceSize]);

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}


