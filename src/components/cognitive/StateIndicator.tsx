import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type IndicatorMode = 'idle' | 'listening' | 'thinking' | 'responding' | 'success' | 'warning';

interface StateIndicatorProps {
  mode: IndicatorMode;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const modeConfig: Record<IndicatorMode, { 
  color: string; 
  label: string;
  pulseSpeed: number;
  rings: number;
}> = {
  idle: { 
    color: 'bg-intent-neutral', 
    label: 'Ready',
    pulseSpeed: 0,
    rings: 0,
  },
  listening: { 
    color: 'bg-intent-primary', 
    label: 'Listening',
    pulseSpeed: 1.5,
    rings: 2,
  },
  thinking: { 
    color: 'bg-intent-secondary', 
    label: 'Thinking',
    pulseSpeed: 0.8,
    rings: 3,
  },
  responding: { 
    color: 'bg-intent-primary', 
    label: 'Speaking',
    pulseSpeed: 1.2,
    rings: 1,
  },
  success: { 
    color: 'bg-intent-success', 
    label: 'Done',
    pulseSpeed: 0,
    rings: 0,
  },
  warning: { 
    color: 'bg-intent-warning', 
    label: 'Attention',
    pulseSpeed: 2,
    rings: 2,
  },
};

const sizeConfig = {
  sm: { core: 'w-2 h-2', ring: 12, container: 'w-8 h-8' },
  md: { core: 'w-3 h-3', ring: 16, container: 'w-12 h-12' },
  lg: { core: 'w-4 h-4', ring: 24, container: 'w-16 h-16' },
};

export function StateIndicator({ 
  mode, 
  size = 'md', 
  showLabel = false,
  className 
}: StateIndicatorProps) {
  const config = modeConfig[mode];
  const sizeConf = sizeConfig[size];
  
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Indicator container */}
      <div className={cn('relative flex items-center justify-center', sizeConf.container)}>
        
        {/* Expanding rings */}
        <AnimatePresence>
          {config.rings > 0 && Array.from({ length: config.rings }).map((_, i) => (
            <motion.div
              key={`ring-${i}`}
              initial={{ scale: 0.8, opacity: 0.6 }}
              animate={{
                scale: [1, 1.8 + i * 0.3, 2.2 + i * 0.4],
                opacity: [0.4, 0.2, 0],
              }}
              transition={{
                duration: config.pulseSpeed + i * 0.3,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeOut',
              }}
              className={cn(
                'absolute rounded-full border',
                mode === 'listening' && 'border-intent-primary/40',
                mode === 'thinking' && 'border-intent-secondary/40',
                mode === 'responding' && 'border-intent-primary/30',
                mode === 'warning' && 'border-intent-warning/40',
              )}
              style={{ 
                width: sizeConf.ring + i * 8, 
                height: sizeConf.ring + i * 8 
              }}
            />
          ))}
        </AnimatePresence>
        
        {/* Orbiting particle for thinking state */}
        {mode === 'thinking' && (
          <motion.div
            className="absolute w-1 h-1 rounded-full bg-intent-secondary"
            animate={{ rotate: 360 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              transformOrigin: `${sizeConf.ring / 2 + 4}px center`,
            }}
          />
        )}
        
        {/* Core dot */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ 
            scale: 1,
            boxShadow: mode !== 'idle' && mode !== 'success'
              ? [
                  `0 0 0 0 hsl(var(--intent-${mode === 'thinking' ? 'secondary' : 'primary'}) / 0.4)`,
                  `0 0 20px 4px hsl(var(--intent-${mode === 'thinking' ? 'secondary' : 'primary'}) / 0.2)`,
                  `0 0 0 0 hsl(var(--intent-${mode === 'thinking' ? 'secondary' : 'primary'}) / 0.4)`,
                ]
              : undefined
          }}
          transition={{
            scale: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
            boxShadow: config.pulseSpeed > 0 ? {
              duration: config.pulseSpeed,
              repeat: Infinity,
              ease: 'easeInOut',
            } : undefined,
          }}
          className={cn(
            'relative rounded-full',
            config.color,
            sizeConf.core
          )}
        >
          {/* Inner glow */}
          <div className={cn(
            'absolute inset-0 rounded-full',
            'bg-gradient-to-br from-white/30 to-transparent'
          )} />
        </motion.div>
      </div>
      
      {/* Label */}
      <AnimatePresence mode="wait">
        {showLabel && (
          <motion.span
            key={mode}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-light text-text-secondary tracking-wide"
          >
            {config.label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}