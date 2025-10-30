import React from 'react';
import type { StippleParams, ExportSettings } from './App';

type Props = {
  params: StippleParams;
  onParamsChange: (p: StippleParams) => void;
  onFile: (file: File) => void;
  exportSettings: ExportSettings;
  onExportSettingsChange: (s: ExportSettings) => void;
};

export function ControlPanel({ params, onParamsChange, onFile, exportSettings, onExportSettingsChange }: Props) {
  const update = (k: keyof StippleParams, v: number | string) =>
    onParamsChange({ ...params, [k]: v });

  return (
    <div style={{ padding: 16, borderRight: '1px solid #1f2737', overflow: 'auto' }}>
      <h2 style={{ marginTop: 0 }}>Controls</h2>
      <div>
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </div>

      <VideoControls />
      <ExportButtons exportSettings={exportSettings} onExportSettingsChange={onExportSettingsChange} />

      <Section title="Density">
        <Slider value={params.density} min={10} max={100} step={1} onChange={(v) => update('density', v)} />
      </Section>
      <Section title="Icon Size (px)">
        <Slider value={params.iconSize} min={5} max={30} step={1} onChange={(v) => update('iconSize', v)} />
      </Section>
      <Section title="Threshold">
        <Slider value={params.threshold} min={0} max={255} step={1} onChange={(v) => update('threshold', v)} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <input
            type="checkbox"
            checked={params.invertThreshold}
            onChange={(e) => onParamsChange({ ...params, invertThreshold: e.target.checked })}
          />
          Invert Threshold
        </label>
      </Section>
      <Section title="Dispersion (%)">
        <Slider value={params.dispersionAmount} min={0} max={100} step={1} onChange={(v) => update('dispersionAmount', v)} />
      </Section>
      <Section title="Rotation Variance (°)">
        <Slider value={params.rotationVariance} min={0} max={45} step={1} onChange={(v) => update('rotationVariance', v)} />
      </Section>
      <Section title="Background">
        <input type="color" value={params.backgroundColor} onChange={(e) => update('backgroundColor', e.target.value)} />
      </Section>
      <Section title="Icon Style">
        <select
          value={params.iconType}
          onChange={(e) => update('iconType', e.target.value)}
          style={{
            background: '#0f1422',
            color: '#eaeaea',
            border: '1px solid #22304a',
            borderRadius: 6,
            padding: '6px 8px'
          }}
        >
          <option value="cursor">Cursor</option>
          <option value="circle">Circle</option>
          <option value="triangle">Triangle</option>
          <option value="star">Star</option>
        </select>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ margin: '14px 0' }}>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
      <span style={{ opacity: 0.75 }}>{label}</span>
      <div>{children}</div>
    </label>
  );
}

function Slider({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: '100%' }}
    />
  );
}

function ExportButtons({ exportSettings, onExportSettingsChange }: { exportSettings: ExportSettings; onExportSettingsChange: (s: ExportSettings) => void }) {
  const emit = (name: string) => {
    const ev = new CustomEvent('stipple-export', { detail: { type: name } });
    window.dispatchEvent(ev);
  };
  return (
      <Section title="Export">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginBottom: 8 }}>
          <Labeled label="FPS">
            <input type="number" min={1} max={60} value={exportSettings.fps} onChange={(e) => onExportSettingsChange({ ...exportSettings, fps: Number(e.target.value) })} />
          </Labeled>
          <Labeled label="Duration (s)">
            <input type="number" min={1} max={120} value={exportSettings.durationSec} onChange={(e) => onExportSettingsChange({ ...exportSettings, durationSec: Number(e.target.value) })} />
          </Labeled>
          <Labeled label="Resolution">
            <select value={exportSettings.resolution} onChange={(e) => onExportSettingsChange({ ...exportSettings, resolution: e.target.value as ExportSettings['resolution'] })}
              style={{ background: '#0f1422', color: '#eaeaea', border: '1px solid #22304a', borderRadius: 6, padding: '6px 8px' }}>
              <option value="source">Source</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
            </select>
          </Labeled>
          <Labeled label="Animation">
            <select value={exportSettings.animation} onChange={(e) => onExportSettingsChange({ ...exportSettings, animation: e.target.value as ExportSettings['animation'] })}
              style={{ background: '#0f1422', color: '#eaeaea', border: '1px solid #22304a', borderRadius: 6, padding: '6px 8px' }}>
              <option value="none">None</option>
              <option value="pulseDensity">Pulse Density</option>
              <option value="sweepThreshold">Sweep Threshold</option>
              <option value="spinRotation">Spin Rotation</option>
            </select>
          </Labeled>
        </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Btn onClick={() => emit('png')}>Export PNG</Btn>
        <Btn onClick={() => emit('gif')}>Export GIF</Btn>
        <Btn onClick={() => emit('video')}>Export Video</Btn>
      </div>
    </Section>
  );
}

function VideoControls() {
  const send = (cmd: string) => window.dispatchEvent(new CustomEvent('stipple-video-control', { detail: { cmd } }));
  return (
    <Section title="Video Controls">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Btn onClick={() => send('play')}>Play</Btn>
        <Btn onClick={() => send('pause')}>Pause</Btn>
      </div>
    </Section>
  );
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'linear-gradient(180deg, #1a2240, #131a33)',
        color: '#e8ecff',
        border: '1px solid #2a3a66',
        padding: '6px 10px',
        borderRadius: 8,
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
  );
}


