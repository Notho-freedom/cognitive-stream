import { useRef, useCallback } from 'react';

/**
 * useStableCallback — Returns a stable function reference that always calls the latest version.
 * Prevents useEffect dependency loops caused by inline callbacks.
 */
export function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef<T>(fn);
  ref.current = fn;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    ((...args: any[]) => ref.current(...args)) as T,
    [],
  );
}
