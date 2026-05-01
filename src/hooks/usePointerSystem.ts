import { useRef, useCallback } from 'react';

/**
 * usePointerSystem — Unified pointer handling for desktop interactions.
 * Resolves drag vs click vs double-click conflicts with threshold-based detection.
 */

const DRAG_THRESHOLD = 5; // px before a mousedown becomes a drag
const DOUBLE_CLICK_MS = 300;

interface PointerHandlers {
  onPointerDown: (e: React.MouseEvent) => void;
}

interface PointerOptions {
  onClick?: (e: { clientX: number; clientY: number; ctrlKey: boolean; metaKey: boolean }) => void;
  onDoubleClick?: (e: { clientX: number; clientY: number }) => void;
  onDragStart?: (e: { clientX: number; clientY: number }) => void;
  onDragMove?: (e: { clientX: number; clientY: number; dx: number; dy: number }) => void;
  onDragEnd?: (e: { clientX: number; clientY: number }) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function usePointerSystem(options: PointerOptions): PointerHandlers {
  const stateRef = useRef<{
    down: boolean;
    startX: number;
    startY: number;
    isDragging: boolean;
    lastClickTime: number;
    ctrlKey: boolean;
    metaKey: boolean;
  }>({
    down: false,
    startX: 0,
    startY: 0,
    isDragging: false,
    lastClickTime: 0,
    ctrlKey: false,
    metaKey: false,
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const onPointerDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) {
      optionsRef.current.onContextMenu?.(e);
      return;
    }
    if (e.button !== 0) return;

    const state = stateRef.current;
    state.down = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.isDragging = false;
    state.ctrlKey = e.ctrlKey;
    state.metaKey = e.metaKey;

    const handleMove = (ev: MouseEvent) => {
      if (!state.down) return;
      const dx = ev.clientX - state.startX;
      const dy = ev.clientY - state.startY;

      if (!state.isDragging && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        state.isDragging = true;
        optionsRef.current.onDragStart?.({ clientX: state.startX, clientY: state.startY });
      }

      if (state.isDragging) {
        optionsRef.current.onDragMove?.({ clientX: ev.clientX, clientY: ev.clientY, dx, dy });
      }
    };

    const handleUp = (ev: MouseEvent) => {
      state.down = false;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);

      if (state.isDragging) {
        optionsRef.current.onDragEnd?.({ clientX: ev.clientX, clientY: ev.clientY });
      } else {
        const now = Date.now();
        if (now - state.lastClickTime < DOUBLE_CLICK_MS) {
          optionsRef.current.onDoubleClick?.({ clientX: ev.clientX, clientY: ev.clientY });
          state.lastClickTime = 0;
        } else {
          optionsRef.current.onClick?.({
            clientX: ev.clientX,
            clientY: ev.clientY,
            ctrlKey: state.ctrlKey,
            metaKey: state.metaKey,
          });
          state.lastClickTime = now;
        }
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, []);

  return { onPointerDown };
}
