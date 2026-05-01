import { useEffect, useRef, useCallback } from 'react';

interface TimerEntry {
  id: string;
  timeout: ReturnType<typeof setTimeout>;
  pausedRemaining: number | null;
  startedAt: number;
  duration: number;
  callback: () => void;
}

const timers = new Map<string, TimerEntry>();

function clearTimer(id: string) {
  const entry = timers.get(id);
  if (entry) {
    clearTimeout(entry.timeout);
    timers.delete(id);
  }
}

function startTimer(id: string, duration: number, callback: () => void) {
  clearTimer(id);
  const timeout = setTimeout(() => {
    timers.delete(id);
    callback();
  }, duration);
  timers.set(id, {
    id,
    timeout,
    pausedRemaining: null,
    startedAt: Date.now(),
    duration,
    callback,
  });
}

function pauseTimer(id: string) {
  const entry = timers.get(id);
  if (!entry || entry.pausedRemaining !== null) return;
  clearTimeout(entry.timeout);
  const elapsed = Date.now() - entry.startedAt;
  entry.pausedRemaining = Math.max(0, entry.duration - elapsed);
}

function resumeTimer(id: string) {
  const entry = timers.get(id);
  if (!entry || entry.pausedRemaining === null) return;
  const remaining = entry.pausedRemaining;
  entry.pausedRemaining = null;
  entry.startedAt = Date.now();
  entry.duration = remaining;
  entry.timeout = setTimeout(() => {
    timers.delete(id);
    entry.callback();
  }, remaining);
}

function forceClose(id: string) {
  const entry = timers.get(id);
  if (entry) {
    clearTimeout(entry.timeout);
    timers.delete(id);
    entry.callback();
  }
}

/**
 * useGlobalTimer — unified timer scheduler for all temporal UI elements.
 * Supports pause (hover), resume, force-close, and auto-cleanup on unmount.
 */
export function useGlobalTimer(id: string, duration: number, callback: () => void, active = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const stableCallback = useCallback(() => callbackRef.current(), []);

  useEffect(() => {
    if (!active || duration <= 0) return;
    startTimer(id, duration, stableCallback);
    return () => clearTimer(id);
  }, [id, duration, active, stableCallback]);

  return {
    pause: useCallback(() => pauseTimer(id), [id]),
    resume: useCallback(() => resumeTimer(id), [id]),
    forceClose: useCallback(() => forceClose(id), [id]),
    cancel: useCallback(() => clearTimer(id), [id]),
  };
}

// Static API for imperative usage
useGlobalTimer.start = startTimer;
useGlobalTimer.clear = clearTimer;
useGlobalTimer.pause = pauseTimer;
useGlobalTimer.resume = resumeTimer;
useGlobalTimer.forceClose = forceClose;
