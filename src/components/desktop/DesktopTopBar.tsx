import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSystemBridge } from '@/hooks/useSystemBridge';

interface DesktopTopBarProps {
  brainMode: string | null;
  isAutonomous: boolean;
  autonomyCount: number;
  autonomyLimit: number;
  activeTasks: number;
}

export const DesktopTopBar = memo(function DesktopTopBar({
  brainMode,
  isAutonomous,
  autonomyCount,
  autonomyLimit,
  activeTasks,
}: DesktopTopBarProps) {
  const { isAvailable, systemInfo } = useSystemBridge();
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatMem = (bytes: number) => `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 pointer-events-auto"
    >
      <div
        className="flex items-center justify-between px-6 py-2 bg-surface-deep/95 backdrop-blur-xl border-b border-intent-primary/10"
      >
        {/* Left: Bridge status + brain mode */}
        <div className="flex items-center gap-3 text-[8px] font-mono tracking-wider">
          <motion.div
            className={cn(
              'w-2 h-2 rounded-full',
              isAvailable ? 'bg-intent-success' : 'bg-text-ghost/40',
            )}
            animate={isAvailable ? { opacity: [0.6, 1, 0.6] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className={cn('uppercase', isAvailable ? 'text-intent-success' : 'text-text-ghost')}>
            {isAvailable ? 'SYSTEM' : 'WEB'}
          </span>

          {brainMode && (
            <>
              <span className="text-text-ghost/30">|</span>
              <span className="text-intent-primary">{brainMode}</span>
            </>
          )}

          {isAutonomous && (
            <>
              <span className="text-text-ghost/30">|</span>
              <motion.span
                className="text-intent-secondary"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                AUTO {autonomyCount}/{autonomyLimit}
              </motion.span>
            </>
          )}

          {activeTasks > 0 && (
            <>
              <span className="text-text-ghost/30">|</span>
              <motion.span
                className="text-intent-focus"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {activeTasks}T
              </motion.span>
            </>
          )}
        </div>

        {/* Center: Hostname */}
        <div className="text-[9px] uppercase tracking-[0.3em] text-text-ghost/50 font-light">
          {isAvailable && systemInfo ? systemInfo.hostname : 'COGNITIVE STREAM'}
        </div>

        {/* Right: System info + clock */}
        <div className="flex items-center gap-3 text-[8px] font-mono tracking-wider text-text-ghost">
          {isAvailable && systemInfo && (
            <>
              <span>{systemInfo.cpus}C</span>
              <span>{formatMem(systemInfo.memory.free)}</span>
              <span className="text-text-ghost/30">|</span>
            </>
          )}
          <span className="text-text-primary/80 tabular-nums">
            {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Top edge accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, hsl(187 85% 53% / 0.3), transparent)' }}
      />
    </motion.div>
  );
});
