import { ImageProcessor } from './ImageProcessor';
import { StippleEngine } from './StippleEngine';
import type { StippleParams } from '../ui/App';

type Size = { width: number; height: number };

export async function exportProcessedVideo(
  video: HTMLVideoElement,
  baseParams: StippleParams,
  size: Size,
  options: { fps?: number; bitrate?: number; durationSec?: number; paramsForFrame?: (info: { tSec: number; frameIndex: number; totalFrames: number; progress: number }) => StippleParams } = {}
): Promise<Blob> {
  const fps = options.fps ?? 30;
  const bitrate = options.bitrate ?? 8_000_000;

  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context missing');

  const stream = canvas.captureStream(fps);
  // Prefer VP8 for Firefox compatibility, then VP9, then generic webm
  let mime = 'video/webm';
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
    mime = 'video/webm;codecs=vp8';
  } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
    mime = 'video/webm;codecs=vp9';
  }
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((resolve) => (recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))));

  // Ensure playback starts from beginning
  video.currentTime = 0;
  await video.play().catch(() => {});
  video.pause();

  const duration = options.durationSec ?? video.duration;
  const totalFrames = Math.max(1, Math.floor(duration * fps));

  recorder.start(200);
  // notify UI export started
  window.dispatchEvent(new CustomEvent('stipple-progress', { detail: { kind: 'export-video-start', progress: 0 } }));

  const renderFrame = (params: StippleParams) => {
    // draw current video frame
    ctx.drawImage(video, 0, 0, size.width, size.height);
    const img = ctx.getImageData(0, 0, size.width, size.height);
    const processor = new ImageProcessor(img, size.width, size.height);
    const mask = processor.extractSilhouette(params.threshold, params.invertThreshold);
    const edges = processor.detectEdges(mask);
    ctx.fillStyle = params.backgroundColor;
    ctx.fillRect(0, 0, size.width, size.height);
    const engine = new StippleEngine(ctx);
    engine.render({ originX: 0, originY: 0, width: size.width, height: size.height, silhouette: mask, edges, params });
  };

  let frameIndex = 0;

  // Deterministic manual seek per frame for reliability with pacing and requestFrame fallback
  for (frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const t = Math.min(video.duration - 0.001, frameIndex / fps);
    await seekTo(video, t);
    // allow decoding to settle before draw
    await waitForDecodedFrame(video);

    const progress = totalFrames > 1 ? frameIndex / (totalFrames - 1) : 1;
    const params = options.paramsForFrame ? options.paramsForFrame({ tSec: t, frameIndex, totalFrames, progress }) : baseParams;
    renderFrame(params);

    // try to push frame explicitly when supported
    const track = stream.getVideoTracks()[0] as any;
    if (track && typeof track.requestFrame === 'function') {
      try { track.requestFrame(); } catch {}
    }

    // pace frames to target fps to keep MediaRecorder fed consistently
    await waitMs(Math.max(0, Math.round(1000 / fps)));

    const pct = Math.min(100, Math.round((frameIndex / totalFrames) * 100));
    window.dispatchEvent(new CustomEvent('stipple-progress', { detail: { kind: 'export-video', progress: pct } }));
  }

  // give recorder time to flush last timeslice before stopping
  await waitMs(250);
  recorder.stop();

  const blob = await done;
  // notify UI export completed
  window.dispatchEvent(new CustomEvent('stipple-progress', { detail: { kind: 'export-video-complete', progress: 100 } }));
  return blob;
}

function waitMs(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function seekTo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve) => {
    const on = () => { video.removeEventListener('seeked', on); resolve(); };
    video.addEventListener('seeked', on);
    video.currentTime = Math.min(Math.max(0, time), video.duration - 0.001);
  });
}

async function waitForDecodedFrame(video: HTMLVideoElement) {
  // Prefer rVFC when available for precise frame readiness
  const anyVideo = video as any;
  if (typeof anyVideo.requestVideoFrameCallback === 'function') {
    await new Promise<void>((resolve) => anyVideo.requestVideoFrameCallback(() => resolve()));
    return;
  }
  // Fallback: wait briefly and ensure HAVE_CURRENT_DATA
  let tries = 0;
  while (video.readyState < 2 && tries < 5) {
    await waitMs(50);
    tries++;
  }
}


