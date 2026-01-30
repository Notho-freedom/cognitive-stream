import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSystemBridge } from '@/hooks/useSystemBridge';

// ═══════════════════════════════════════════════════════════════
// COG STATUS BRIDGE - GX Style System Status Indicator
// Displays bridge connection state and system metrics
// ═══════════════════════════════════════════════════════════════

export function CogStatusBridge({ className }: { className?: string }) {
  const { isAvailable, systemInfo } = useSystemBridge();

  const formatMemory = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)}`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}H${mins.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative overflow-hidden',
        'border border-intent-neutral/20 bg-surface-deep/60 backdrop-blur-sm',
        className
      )}
      style={{
        clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
      }}
    >
      {/* Corner accents */}
      <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-intent-primary/40" />
      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-intent-primary/40" />
      
      <div className="px-3 py-2 flex items-center gap-4">
        {/* Connection Status Indicator */}
        <div className="flex items-center gap-2">
          {/* Animated status dot */}
          <div className="relative w-2 h-2">
            <motion.div
              className={cn(
                'absolute inset-0 rounded-full',
                isAvailable ? 'bg-intent-success' : 'bg-text-ghost/40'
              )}
              animate={isAvailable ? {
                scale: [1, 1.3, 1],
                opacity: [0.7, 1, 0.7],
              } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {isAvailable && (
              <motion.div
                className="absolute inset-0 rounded-full bg-intent-success/30"
                animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </div>
          
          {/* Mode label */}
          <span className={cn(
            'text-[9px] uppercase tracking-[0.15em] font-light',
            isAvailable ? 'text-intent-success' : 'text-text-ghost'
          )}>
            {isAvailable ? 'BRIDGE' : 'WEB'}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-3 bg-intent-neutral/20" />

        {/* System Info (only when connected) */}
        {isAvailable && systemInfo ? (
          <div className="flex items-center gap-3">
            {/* Platform */}
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-text-ghost/50 uppercase tracking-wider">SYS</span>
              <span className="text-[9px] font-light text-text-secondary tracking-wide">
                {systemInfo.platform.toUpperCase()}
              </span>
            </div>

            {/* CPU */}
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-text-ghost/50 uppercase tracking-wider">CPU</span>
              <span className="text-[9px] font-light text-text-secondary tracking-wide">
                {systemInfo.cpus}C
              </span>
            </div>

            {/* Memory with mini progress */}
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-text-ghost/50 uppercase tracking-wider">MEM</span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-light text-text-secondary tracking-wide">
                  {formatMemory(systemInfo.memory.free)}
                </span>
                <span className="text-[7px] text-text-ghost/40">/</span>
                <span className="text-[8px] text-text-ghost/60">
                  {formatMemory(systemInfo.memory.total)}G
                </span>
              </div>
            </div>

            {/* Uptime */}
            <div className="flex items-center gap-1.5">
              <motion.span 
                className="text-[8px] text-text-ghost/50"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                ↑
              </motion.span>
              <span className="text-[9px] font-light text-text-ghost tracking-wide">
                {formatUptime(systemInfo.uptime)}
              </span>
            </div>
          </div>
        ) : (
          /* Browser-only info */
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-text-ghost/50 uppercase tracking-wider">MODE</span>
            <span className="text-[9px] font-light text-text-ghost tracking-wide">
              NAVIGATEUR
            </span>
          </div>
        )}
      </div>

      {/* Scan line effect */}
      <motion.div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-intent-primary/30 to-transparent"
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  );
}
