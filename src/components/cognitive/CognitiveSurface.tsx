import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export type CognitiveIntent = 'primary' | 'secondary' | 'neutral' | 'focus';
export type CognitiveState = 'idle' | 'listening' | 'thinking' | 'responding' | 'fading';

interface CognitiveSurfaceProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  intent?: CognitiveIntent;
  state?: CognitiveState;
  glow?: boolean;
  children?: React.ReactNode;
}

const intentStyles: Record<CognitiveIntent, string> = {
  primary: 'border-intent-primary/20 hover:border-intent-primary/40',
  secondary: 'border-intent-secondary/20 hover:border-intent-secondary/40',
  neutral: 'border-intent-neutral/20 hover:border-intent-neutral/30',
  focus: 'border-intent-focus/30 hover:border-intent-focus/50',
};

const glowStyles: Record<CognitiveIntent, string> = {
  primary: 'shadow-glow-primary',
  secondary: 'shadow-glow-secondary',
  neutral: 'shadow-glow-subtle',
  focus: 'shadow-glow-primary',
};

const stateVariants = {
  idle: { 
    scale: 1, 
    opacity: 1,
    filter: 'blur(0px)',
  },
  listening: { 
    scale: 1.01, 
    opacity: 1,
    filter: 'blur(0px)',
  },
  thinking: { 
    scale: 1, 
    opacity: 0.95,
    filter: 'blur(0px)',
  },
  responding: { 
    scale: 1, 
    opacity: 1,
    filter: 'blur(0px)',
  },
  fading: { 
    scale: 0.98, 
    opacity: 0,
    filter: 'blur(8px)',
  },
};

const CognitiveSurface = forwardRef<HTMLDivElement, CognitiveSurfaceProps>(
  ({ intent = 'primary', state = 'idle', glow = false, className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={stateVariants[state]}
        exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
        transition={{
          duration: 0.36,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={cn(
          // Base glass surface
          'relative overflow-hidden rounded-cognitive',
          'bg-surface-glass/[0.08] backdrop-blur-glass',
          'border transition-colors duration-medium ease-cognitive-enter',
          
          // Intent-based border
          intentStyles[intent],
          
          // Optional glow
          glow && glowStyles[intent],
          
          // State-based pulse for thinking
          state === 'thinking' && 'animate-glow-pulse',
          state === 'listening' && 'ring-1 ring-intent-primary/30',
          
          className
        )}
        {...props}
      >
        {/* Inner glow gradient */}
        <div 
          className={cn(
            'absolute inset-0 opacity-0 transition-opacity duration-medium',
            'bg-gradient-to-br from-intent-primary/5 via-transparent to-intent-secondary/5',
            (state === 'listening' || state === 'responding') && 'opacity-100'
          )} 
        />
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
        
        {/* Edge highlight */}
        <div 
          className={cn(
            'absolute inset-x-0 top-0 h-px',
            'bg-gradient-to-r from-transparent via-white/10 to-transparent'
          )}
        />
      </motion.div>
    );
  }
);

CognitiveSurface.displayName = 'CognitiveSurface';

export { CognitiveSurface };