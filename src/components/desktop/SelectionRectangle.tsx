import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Rect { x: number; y: number; w: number; h: number }

interface Props {
  /** Returns DOM rects of selectable items by id (in viewport coords). */
  getItemRects: () => Array<{ id: string; rect: DOMRect }>;
  onSelectionChange: (ids: Set<string>) => void;
  children?: ReactNode;
  /** Only start selection on direct clicks of this layer (ignore icons). */
  enabled?: boolean;
}

export function SelectionRectangle({ getItemRects, onSelectionChange, children, enabled = true }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const layer = layerRef.current;
    if (!layer) return;

    let startX = 0;
    let startY = 0;
    let active = false;

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // Only when clicking on the layer itself, not on icons
      if (e.target !== layer) return;
      active = true;
      startX = e.clientX;
      startY = e.clientY;
      setRect({ x: startX, y: startY, w: 0, h: 0 });
    };
    const onMove = (e: MouseEvent) => {
      if (!active) return;
      const x = Math.min(startX, e.clientX);
      const y = Math.min(startY, e.clientY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      setRect({ x, y, w, h });

      const selected = new Set<string>();
      const items = getItemRects();
      items.forEach(({ id, rect: r }) => {
        const intersects =
          r.right >= x && r.left <= x + w && r.bottom >= y && r.top <= y + h;
        if (intersects) selected.add(id);
      });
      onSelectionChange(selected);
    };
    const onUp = () => {
      if (!active) return;
      active = false;
      setRect(null);
    };

    layer.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      layer.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [enabled, getItemRects, onSelectionChange]);

  return (
    <div ref={layerRef} className="absolute inset-0">
      {children}
      {rect && rect.w > 2 && rect.h > 2 && (
        <div
          className="fixed pointer-events-none border border-intent-primary/60 bg-intent-primary/10"
          style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
        />
      )}
    </div>
  );
}
