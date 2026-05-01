import { useState, useCallback } from 'react';

export type FocusTarget = 
  | { type: 'desktop' }
  | { type: 'window'; id: string }
  | { type: 'card'; id: string }
  | { type: 'terminal' }
  | { type: 'panel' };

/**
 * useFocusManager — Tracks which element has focus across the desktop.
 * Single source of truth for "who is active".
 */
export function useFocusManager() {
  const [focus, setFocus] = useState<FocusTarget>({ type: 'desktop' });

  const focusDesktop = useCallback(() => setFocus({ type: 'desktop' }), []);
  const focusWindow = useCallback((id: string) => setFocus({ type: 'window', id }), []);
  const focusCard = useCallback((id: string) => setFocus({ type: 'card', id }), []);
  const focusTerminal = useCallback(() => setFocus({ type: 'terminal' }), []);
  const focusPanel = useCallback(() => setFocus({ type: 'panel' }), []);

  const isFocused = useCallback((type: FocusTarget['type'], id?: string) => {
    if (focus.type !== type) return false;
    if (id && 'id' in focus) return focus.id === id;
    return true;
  }, [focus]);

  return {
    focus,
    focusDesktop,
    focusWindow,
    focusCard,
    focusTerminal,
    focusPanel,
    isFocused,
  };
}
