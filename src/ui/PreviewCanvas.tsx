import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { StippleParams, ExportSettings } from './App';
import { ImageProcessor } from '../core/ImageProcessor';
import { StippleEngine } from '../core/StippleEngine';
import { exportProcessedVideo } from '../core/VideoExporter';
import { PROCESSING } from '../constants';

type Props = { params: StippleParams; image: ImageBitmap | null; video?: HTMLVideoElement | null; sourceSize: { width: number; height: number } | null; exportSettings: ExportSettings };

export function PreviewCanvas({ params, image, video, sourceSize, exportSettings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const cacheRef = useRef<{ key?: string; silhouette?: Uint8Array; edges?: Uint8Array; img?: ImageData } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderImage = async () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      // Background
      ctx.fillStyle = params.backgroundColor;
      ctx.fillRect(0, 0, w, h);

      if (!image) return;

      // Fit image to canvas (contain)
      const scale = Math.min(w / image.width, h / image.height);
      const iw = Math.floor(image.width * scale);
      const ih = Math.floor(image.height * scale);
      const ox = Math.floor((w - iw) / 2);
      const oy = Math.floor((h - ih) / 2);

      ctx.drawImage(image, ox, oy, iw, ih);
      const imgData = ctx.getImageData(ox, oy, iw, ih);

      // Progressive rendering: quick then full
      setIsProcessing(true);
      const quickParams: StippleParams = { ...params, density: Math.max(PROCESSING.QUICK_PREVIEW_DENSITY_MIN, Math.min(params.density, PROCESSING.QUICK_PREVIEW_DENSITY_MAX)) };
      const stages: StippleParams[] = [quickParams, params];
      for (const p of stages) {
        const processor = new ImageProcessor(imgData, iw, ih);
        const silhouette = processor.extractSilhouette(p.threshold, p.invertThreshold);
        const edges = processor.detectEdges(silhouette);
        ctx.fillStyle = p.backgroundColor;
        ctx.fillRect(0, 0, w, h);
        const engine = new StippleEngine(ctx);
        engine.render({ originX: ox, originY: oy, width: iw, height: ih, silhouette, edges, params: p });
        // yield to frame
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      setIsProcessing(false);
    };

    const renderVideoFrameOnce = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !video) return;
      const anyVideo = video as any;
      // If rVFC exists, wait for a decoded frame before drawing for better cross-browser behavior (Firefox)
      if (typeof anyVideo.requestVideoFrameCallback === 'function' && video.readyState < 2) {
        anyVideo.requestVideoFrameCallback(() => renderVideoFrameOnce());
        return;
      }
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.fillStyle = params.backgroundColor;
      ctx.fillRect(0, 0, w, h);
      if (!video.videoWidth || !video.videoHeight) return; // wait until metadata is available
      const scale = Math.min(w / video.videoWidth, h / video.videoHeight);
      const iw = Math.floor(video.videoWidth * scale);
      const ih = Math.floor(video.videoHeight * scale);
      const ox = Math.floor((w - iw) / 2);
      const oy = Math.floor((h - ih) / 2);
      const maxDim = Math.max(iw, ih);
      const previewScale = maxDim > PROCESSING.MAX_PREVIEW_DIMENSION ? PROCESSING.MAX_PREVIEW_DIMENSION / maxDim : 1;
      const pw = Math.max(1, Math.floor(iw * previewScale));
      const ph = Math.max(1, Math.floor(ih * previewScale));
      ctx.drawImage(video, ox, oy, pw, ph);
      const imgData = ctx.getImageData(ox, oy, pw, ph);
      // compute fresh each frame to avoid stale cache issues (imageData identity differs per call)
      const processor = new ImageProcessor(imgData, pw, ph);
      const silhouette = processor.extractSilhouette(params.threshold, params.invertThreshold);
      const edges = processor.detectEdges(silhouette);

      ctx.fillStyle = params.backgroundColor;
      ctx.fillRect(0, 0, w, h);
      const engine = new StippleEngine(ctx);
      engine.render({ originX: ox, originY: oy, width: pw, height: ph, silhouette, edges, params });
    };

    const startPlayingLoop = () => {
      if (!video) return;
      if (timerRef.current) return;
      playingRef.current = true;
      const tick = () => {
        if (!playingRef.current) { timerRef.current = null; return; }
        renderVideoFrameOnce();
        timerRef.current = window.setTimeout(tick, 100); // ~10 fps while playing
      };
      timerRef.current = window.setTimeout(tick, 0);
    };

    const stopPlayingLoop = () => {
      playingRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const onCtl = (e: any) => {
      const cmd = e.detail?.cmd;
      if (cmd === 'play') { video?.play(); startPlayingLoop(); }
      if (cmd === 'pause') { video?.pause(); stopPlayingLoop(); renderVideoFrameOnce(); }
    };

    // Branch: image vs video vs empty
    if (image) {
      renderImage();
      return;
    }

    if (video) {
      window.addEventListener('stipple-video-control', onCtl as any);
      try { video.pause(); } catch {}
      renderVideoFrameOnce();
      return () => {
        window.removeEventListener('stipple-video-control', onCtl as any);
        stopPlayingLoop();
      };
    }

    // no input
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [params, image, video]);

  // Pause video and render once when parameters change (to keep UX responsive)
  useEffect(() => {
    if (!video) return;
    try { video.pause(); } catch {}
    // render a single frame with new params
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    // reuse the render function by triggering the main effect
  }, [params, video]);

  // Export handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onExport = async (e: any) => {
      try {
        setError(null);
        setIsProcessing(true);
        const t = e.detail?.type as 'png' | 'gif' | 'video';
        if (!t) return;
        if (t === 'png') await exportPngFullRes(canvas, params, image, video ?? null, sourceSize);
        else if (t === 'gif') await exportGifFullRes(canvas, params, image, video ?? null, sourceSize, exportSettings);
        else if (t === 'video') {
          if (video && sourceSize) {
            const exportSize = mapExportSize(sourceSize, exportSettings.resolution);
            const blob = await exportProcessedVideo(video, params, exportSize, {
              fps: exportSettings.fps,
              bitrate: 10_000_000,
              durationSec: exportSettings.durationSec,
              paramsForFrame: ({ progress }) => applyAnimationPreset(params, exportSettings.animation, progress),
            });
            const url = URL.createObjectURL(blob);
            window.dispatchEvent(new CustomEvent('stipple-exported-blob', { detail: { url, type: 'video', name: 'stipple.webm' } }));
            downloadBlob(blob, 'stipple.webm');
          } else {
            await exportVideo(canvas, exportSettings.fps, exportSettings.durationSec * 1000, Boolean(video));
          }
        }
      } catch (err) {
        console.error('Video export failed:', err);
        setError(err instanceof Error ? err.message : 'Video export failed');
        window.dispatchEvent(new CustomEvent('stipple-error', { detail: { message: 'Video export failed. Please try again.' } }));
      } finally {
        setIsProcessing(false);
      }
    };
    window.addEventListener('stipple-export', onExport as any);
    return () => window.removeEventListener('stipple-export', onExport as any);
  }, [params, image, video, sourceSize]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {isProcessing && (
        <ProgressOverlay />
      )}
      {error && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(220, 38, 38, 0.9)', color: '#fff', padding: '1rem 2rem', borderRadius: '0.5rem', zIndex: 1000 }}>
          {error}
        </div>
      )}
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportVideo(canvas: HTMLCanvasElement, fps: number, durationMs: number, shouldPlay: boolean) {
  const stream = canvas.captureStream(fps);
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((resolve) => (recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))));
  recorder.start(200); // collect data every 200ms
  await new Promise((r) => setTimeout(r, durationMs));
  recorder.stop();
  const blob = await done;
  const url = URL.createObjectURL(blob);
  downloadBlob(blob, 'stipple.webm');
  window.dispatchEvent(new CustomEvent('stipple-exported-blob', { detail: { url, type: 'video', name: 'stipple.webm' } }));
}

async function exportGif(canvas: HTMLCanvasElement, params: StippleParams) {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc/dist/gifenc.esm.js');
  const enc = GIFEncoder();
  const fps = 15;
  const frames = 30; // ~2s
  for (let i = 0; i < frames; i++) {
    // capture current canvas pixels
    const ctx = canvas.getContext('2d')!;
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const palette = quantize(img.data, 256);
    const index = applyPalette(img.data, palette);
    enc.writeFrame(index, canvas.width, canvas.height, { palette, transparent: false, delay: Math.round(1000 / fps) });
    await new Promise((r) => setTimeout(r, 0));
  }
  enc.finish();
  const bytes = enc.bytes() as unknown as Uint8Array;
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes as any);
  const blob = new Blob([copy], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  downloadBlob(blob, 'stipple.gif');
  window.dispatchEvent(new CustomEvent('stipple-exported-blob', { detail: { url, type: 'gif', name: 'stipple.gif' } }));
}

async function exportPngFullRes(viewCanvas: HTMLCanvasElement, params: StippleParams, image: ImageBitmap | null, video: HTMLVideoElement | null, size: { width: number; height: number } | null) {
  const { canvas, ctx } = prepareOffscreen(size);
  if (!ctx || !size) return;
  await renderFullRes(ctx, params, image, video, size);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png', 1));
  if (blob) {
    const url = URL.createObjectURL(blob);
    downloadBlob(blob, 'stipple.png');
    window.dispatchEvent(new CustomEvent('stipple-exported-blob', { detail: { url, type: 'image', name: 'stipple.png' } }));
  }
}

async function exportGifFullRes(viewCanvas: HTMLCanvasElement, baseParams: StippleParams, image: ImageBitmap | null, video: HTMLVideoElement | null, size: { width: number; height: number } | null, exportSettings: { fps: number; durationSec: number; animation: string }) {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc/dist/gifenc.esm.js');
  const { canvas, ctx } = prepareOffscreen(size);
  if (!ctx || !size) return;
  const enc = GIFEncoder();
  const fps = Math.max(1, Math.min(60, exportSettings.fps || 15));
  const frames = Math.max(1, Math.round((exportSettings.durationSec || 2) * fps));
  window.dispatchEvent(new CustomEvent('stipple-progress', { detail: { kind: 'export-gif-start', progress: 0 } }));
  for (let i = 0; i < frames; i++) {
    const progress = frames > 1 ? i / (frames - 1) : 1;
    const params = applyAnimationPreset(baseParams, exportSettings.animation, progress);
    await renderFullRes(ctx, params, image, video, size);
    const img = ctx.getImageData(0, 0, size.width, size.height);
    const palette = quantize(img.data, 256);
    const index = applyPalette(img.data, palette);
    enc.writeFrame(index, size.width, size.height, { palette, delay: Math.round(1000 / fps) });
    await new Promise((r) => setTimeout(r, 0));
    const pct = Math.min(100, Math.round((i / frames) * 100));
    window.dispatchEvent(new CustomEvent('stipple-progress', { detail: { kind: 'export-gif', progress: pct } }));
  }
  enc.finish();
  const bytes = enc.bytes() as unknown as Uint8Array;
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes as any);
  const blob = new Blob([copy], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  downloadBlob(blob, 'stipple.gif');
  window.dispatchEvent(new CustomEvent('stipple-exported-blob', { detail: { url, type: 'gif', name: 'stipple.gif' } }));
  window.dispatchEvent(new CustomEvent('stipple-progress', { detail: { kind: 'export-gif-complete', progress: 100 } }));
}

function prepareOffscreen(size: { width: number; height: number } | null) {
  const canvas = document.createElement('canvas');
  if (size) {
    canvas.width = size.width;
    canvas.height = size.height;
  }
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

async function renderFullRes(ctx: CanvasRenderingContext2D, params: StippleParams, image: ImageBitmap | null, video: HTMLVideoElement | null, size: { width: number; height: number }) {
  const { width, height } = size;
  ctx.fillStyle = params.backgroundColor;
  ctx.fillRect(0, 0, width, height);
  if (image) ctx.drawImage(image, 0, 0, width, height);
  else if (video) ctx.drawImage(video, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const processor = new ImageProcessor(imgData, width, height);
  const silhouette = processor.extractSilhouette(params.threshold, params.invertThreshold);
  const edges = processor.detectEdges(silhouette);
  ctx.fillStyle = params.backgroundColor;
  ctx.fillRect(0, 0, width, height);
  const engine = new StippleEngine(ctx);
  engine.render({ originX: 0, originY: 0, width, height, silhouette, edges, params });
}

function mapExportSize(source: { width: number; height: number }, res: 'source' | '1080p' | '720p') {
  if (res === 'source') return { width: source.width, height: source.height };
  const targetH = res === '1080p' ? 1080 : 720;
  const ratio = source.width / source.height;
  // ensure even dimensions for encoder compatibility
  const w = Math.round(targetH * ratio);
  const even = (n: number) => (n % 2 === 0 ? n : n + 1);
  return { width: even(w), height: even(targetH) };
}

function applyAnimationPreset(p: StippleParams, preset: string, progress: number): StippleParams {
  if (preset === 'pulseDensity') {
    const amp = 30;
    const base = p.density;
    const density = Math.max(10, Math.min(100, Math.round(base + Math.sin(progress * Math.PI * 2) * amp)));
    return { ...p, density };
  }
  if (preset === 'sweepThreshold') {
    const threshold = Math.max(0, Math.min(255, Math.round(50 + progress * 205)));
    return { ...p, threshold };
  }
  if (preset === 'spinRotation') {
    const rotationVariance = Math.max(0, Math.min(45, Math.round(5 + progress * 45)));
    return { ...p, rotationVariance };
  }
  return p;
}

function ProgressOverlay() {
  const [pct, setPct] = React.useState(0);
  React.useEffect(() => {
    const on = (e: any) => {
      const d = e.detail;
      if ((d?.kind === 'export-video' || d?.kind === 'export-gif') && typeof d.progress === 'number') setPct(d.progress);
      if (d?.kind === 'export-video-start' || d?.kind === 'export-gif-start') setPct(0);
      if (d?.kind === 'export-video-complete' || d?.kind === 'export-gif-complete') setPct(100);
    };
    window.addEventListener('stipple-progress', on as any);
    return () => window.removeEventListener('stipple-progress', on as any);
  }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexDirection: 'column', gap: 8 }}>
      <div>Processing… {pct}%</div>
      <div style={{ width: 240, height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#6ea8ff', borderRadius: 4 }} />
      </div>
    </div>
  );
}


