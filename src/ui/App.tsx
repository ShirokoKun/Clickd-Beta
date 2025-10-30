import React, { useMemo, useRef, useState, useEffect } from 'react';
import { ControlPanel } from './ControlPanel';
import { PreviewCanvas } from './PreviewCanvas';
import { OriginalCanvas } from './OriginalCanvas';
import { OutputPanel } from './OutputPanel';
import { useDebounce } from '../hooks/useDebounce';
import { LIMITS } from '../constants';

export type StippleParams = {
  density: number;
  iconSize: number;
  threshold: number;
  invertThreshold: boolean;
  dispersionAmount: number;
  rotationVariance: number;
  backgroundColor: string;
  iconType: 'cursor' | 'circle' | 'triangle' | 'star';
};

export type ExportSettings = {
  fps: number;
  durationSec: number;
  resolution: 'source' | '1080p' | '720p';
  animation: 'none' | 'pulseDensity' | 'sweepThreshold' | 'spinRotation';
};

const defaultParams: StippleParams = {
  density: 60,
  iconSize: 14,
  threshold: 120,
  invertThreshold: false,
  dispersionAmount: 70,
  rotationVariance: 18,
  backgroundColor: '#0b0f1a',
  iconType: 'cursor',
};

export default function App() {
  const [params, setParams] = useState<StippleParams>(defaultParams);
  const [imageBitmap, setImageBitmap] = useState<ImageBitmap | null>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(null);
  const [exportSettings, setExportSettings] = useState<ExportSettings>({ fps: 30, durationSec: 5, resolution: 'source', animation: 'none' });

  const videoUrlRef = useRef<string | null>(null);

  const onFile = async (file: File) => {
    // Validate size and type
    const maxSize = LIMITS.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File too large. Maximum size is ${LIMITS.MAX_FILE_SIZE_MB}MB`);
      return;
    }
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      alert('Please upload an image or video file');
      return;
    }

    if (file.type.startsWith('video/')) {
      // revoke previous object URL if any
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      videoUrlRef.current = url;
      const video = document.createElement('video');
      video.src = url;
      video.crossOrigin = 'anonymous';
      // ensure metadata and first frame are available
      if (video.readyState < 1) {
        await new Promise<void>((resolve) => {
          const on = () => { video.removeEventListener('loadedmetadata', on); resolve(); };
          video.addEventListener('loadedmetadata', on);
        });
      }
      if (video.readyState < 2) {
        // ensure we have current frame decoded
        try {
          video.currentTime = Math.min(0.001, Math.max(0, (video.duration || 0) - 0.001));
        } catch {}
        await new Promise<void>((resolve) => {
          const on = () => { video.removeEventListener('seeked', on); resolve(); };
          video.addEventListener('seeked', on);
        });
      }
      try { video.pause(); } catch {}
      setVideoEl(video);
      setImageBitmap(null);
      setSourceSize({ width: video.videoWidth || 1920, height: video.videoHeight || 1080 });
      return;
    }
    const bmp = await createImageBitmap(file);
    setImageBitmap(bmp);
    setVideoEl(null);
    setSourceSize({ width: bmp.width, height: bmp.height });
  };

  useEffect(() => {
    return () => {
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
    };
  }, []);

  const memoParams = useDebounce(params, 350);

  const ratio = sourceSize ? sourceSize.width / sourceSize.height : 16 / 9;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100%' }}>
      <ControlPanel params={params} onParamsChange={setParams} onFile={onFile} exportSettings={exportSettings} onExportSettingsChange={setExportSettings} />
      <div style={{ display: 'grid', gridTemplateRows: '1fr 200px', padding: 12, gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: '#10141f', border: '1px solid #1f2737', borderRadius: 6, padding: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Original</div>
            <div style={{ width: '100%', height: '100%', position: 'relative', aspectRatio: `${ratio}` }}>
              <OriginalCanvas image={imageBitmap} video={videoEl} sourceSize={sourceSize} />
            </div>
          </div>
          <div style={{ background: '#10141f', border: '1px solid #1f2737', borderRadius: 6, padding: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Processed</div>
            <div style={{ width: '100%', height: '100%', position: 'relative', aspectRatio: `${ratio}` }}>
              <PreviewCanvas params={memoParams} image={imageBitmap} video={videoEl} sourceSize={sourceSize} exportSettings={exportSettings} />
            </div>
          </div>
        </div>
        <OutputPanel />
      </div>
    </div>
  );
}


