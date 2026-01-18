import { useRef, useState } from 'react';
import { useLocalStorageState } from './useStorageState';

type HandleProps = {
  onPointerDown: (e: React.PointerEvent) => void;
};

export function useResizableWidth(key: string, defaultWidth: number, minWidth: number, maxWidth: number) {
  const [storedWidth, setStoredWidth] = useLocalStorageState<number>(key, defaultWidth);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const clamp = (v: number) => Math.max(minWidth, Math.min(maxWidth, v));

  const onPointerDown = (e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const startX = e.clientX;
    const startW = el.getBoundingClientRect().width;
    const pid = e.pointerId;
    // eslint-disable-next-line no-empty
    try { el.setPointerCapture(pid); } catch {}

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const raw = Math.round(startW + dx);
      setDragWidth(clamp(raw));
    };

    const onPointerUp = (ev: PointerEvent) => {
      try {
        const final = (dragWidth !== null) ? dragWidth : clamp(Math.round(startW + (ev.clientX - startX)));
        setStoredWidth(final);
        setDragWidth(null);
      } finally {
        // eslint-disable-next-line no-empty
        try { el.releasePointerCapture(pid); } catch {}
        document.body.style.cursor = '';
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      }
    };

    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const effective = clamp(Number(storedWidth) || defaultWidth);

  return { containerRef, width: dragWidth ?? effective, handleProps: { onPointerDown } as HandleProps };
}
