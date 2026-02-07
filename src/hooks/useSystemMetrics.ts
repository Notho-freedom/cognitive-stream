import { useEffect, useRef, useState } from 'react';
import { useSystemBridge, type SystemMetrics } from '@/hooks/useSystemBridge';

interface UseSystemMetricsOptions {
  intervalMs?: number;
  enabled?: boolean;
}

interface SystemMetricsState {
  metrics: SystemMetrics | null;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_INTERVAL = 2000;

export function useSystemMetrics(options: UseSystemMetricsOptions = {}) {
  const { intervalMs = DEFAULT_INTERVAL, enabled = true } = options;
  const { isAvailable, getSystemMetrics } = useSystemBridge();
  const [state, setState] = useState<SystemMetricsState>({
    metrics: null,
    isLoading: true,
    error: null,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !isAvailable) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    let cancelled = false;

    const fetchMetrics = async () => {
      try {
        const next = await getSystemMetrics();
        if (cancelled) return;
        setState({
          metrics: next,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };

    void fetchMetrics();
    timerRef.current = setInterval(fetchMetrics, intervalMs);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, intervalMs, isAvailable, getSystemMetrics]);

  return { ...state, isAvailable };
}
