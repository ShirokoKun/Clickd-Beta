import React from 'react';

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ width: 'min(840px, 92vw)', maxHeight: '80vh', overflow: 'auto', background: '#0f1422', color: '#eaeaea', border: '1px solid #22304a', borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Help & Tips</h3>
          <button onClick={onClose} style={{ background: 'transparent', color: '#eaeaea', border: '1px solid #2a3a66', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>Close</button>
        </div>
        <ul style={{ lineHeight: 1.5 }}>
          <li>Upload image or video. Video preview is processed at reduced resolution; exports can be 720p/1080p.</li>
          <li>Adjust Density, Icon Size, Threshold, Dispersion, Rotation for creative effects.</li>
          <li>Pick Icon Style: Cursor, Circle, Triangle, Star.</li>
          <li>Export settings: choose FPS, Duration (s), Resolution, Animation preset, and Format.</li>
          <li>Animation presets animate parameters across the clip for dynamic results (works for GIF/WebM/MP4*).</li>
          <li>MP4 conversion uses ffmpeg.wasm in-browser and may be slower than WebM; if it fails, WebM is saved.</li>
          <li>Tip: For faster exports, try 720p or lower FPS; for quality, use 1080p at 30 FPS.</li>
        </ul>
      </div>
    </div>
  );
}


