import React, { useEffect, useRef, useState } from 'react';

type Item = { url: string; type: 'image' | 'gif' | 'video'; name: string };

export function OutputPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const itemsRef = useRef<Item[]>(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    const onExported = (e: any) => {
      const d = e.detail as { url: string; type: Item['type']; name: string };
      if (!d) return;
      setItems((prev) => [{ url: d.url, type: d.type, name: d.name }, ...prev].slice(0, 5));
    };
    window.addEventListener('stipple-exported-blob', onExported as any);
    return () => {
      window.removeEventListener('stipple-exported-blob', onExported as any);
      // revoke any remaining blob URLs on unmount
      itemsRef.current.forEach((it) => {
        try { URL.revokeObjectURL(it.url); } catch {}
      });
    };
  }, []);

  return (
    <div style={{ background: '#10141f', border: '1px solid #1f2737', borderRadius: 6, padding: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Output</div>
      {items.length === 0 ? (
        <div style={{ opacity: 0.7 }}>No exports yet.</div>
      ) : (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
          {items.map((it, i) => (
            <div key={i} style={{ minWidth: 240 }}>
              {it.type === 'video' ? (
                <video src={it.url} controls style={{ width: 240, height: 140, background: '#000' }} />
              ) : (
                <img src={it.url} style={{ width: 240, height: 140, objectFit: 'contain', background: '#000' }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>{it.name}</span>
                <a href={it.url} download={it.name} style={{ fontSize: 12 }}>Download</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


