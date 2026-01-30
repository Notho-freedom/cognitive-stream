import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { ActionPayload } from '../types';

interface CogTimerProps {
  duration: number; // in seconds
  autoStart?: boolean;
  showControls?: boolean;
  variant?: 'countdown' | 'stopwatch' | 'progress';
  label?: string;
  id?: string;
  onAction?: (action: ActionPayload) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function CogTimer({
  duration,
  autoStart = false,
  showControls = true,
  variant = 'countdown',
  label,
  id,
  onAction,
}: CogTimerProps) {
  const [timeLeft, setTimeLeft] = useState(variant === 'stopwatch' ? 0 : duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = variant === 'countdown' 
    ? ((duration - timeLeft) / duration) * 100
    : (timeLeft / duration) * 100;

  const handleComplete = useCallback(() => {
    setIsRunning(false);
    if (onAction && id) {
      onAction({
        id,
        payload: { actionType: 'timer-complete', finalTime: timeLeft },
      });
    }
  }, [onAction, id, timeLeft]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (variant === 'countdown') {
            if (prev <= 1) {
              handleComplete();
              return 0;
            }
            return prev - 1;
          } else {
            if (prev >= duration) {
              handleComplete();
              return duration;
            }
            return prev + 1;
          }
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, variant, duration, handleComplete]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
    if (onAction && id) {
      onAction({
        id,
        payload: { actionType: isRunning ? 'timer-pause' : 'timer-start' },
      });
    }
  };

  const resetTimer = () => {
    setTimeLeft(variant === 'stopwatch' ? 0 : duration);
    setIsRunning(false);
    if (onAction && id) {
      onAction({
        id,
        payload: { actionType: 'timer-reset' },
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-4 p-6 bg-surface-elevated/50 rounded-lg border border-white/5"
    >
      {/* Label */}
      {label && (
        <span className="text-xs text-ghost uppercase tracking-wider">{label}</span>
      )}

      {/* Timer display */}
      <div className="relative flex items-center justify-center">
        {variant === 'progress' ? (
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-white/5"
              />
              {/* Progress circle */}
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className="text-primary"
                initial={{ strokeDasharray: '283 283', strokeDashoffset: 283 }}
                animate={{ strokeDashoffset: 283 - (283 * progress) / 100 }}
                transition={{ duration: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-mono font-bold text-primary">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Timer className="w-6 h-6 text-primary" />
            <span className="text-4xl font-mono font-bold text-primary tracking-wider">
              {formatTime(timeLeft)}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTimer}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'border border-white/10 hover:border-primary/50',
              isRunning
                ? 'bg-intent-warning/20 text-intent-warning'
                : 'bg-intent-success/20 text-intent-success'
            )}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Démarrer</span>
              </>
            )}
          </button>
          <button
            onClick={resetTimer}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'border border-white/10 hover:border-primary/50',
              'text-ghost hover:text-primary'
            )}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}
