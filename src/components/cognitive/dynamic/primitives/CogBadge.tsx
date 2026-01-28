// CogBadge.tsx
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BadgeBlock } from '../types';
import { AnimatedContainer } from '../utils/components';

interface CogBadgeProps extends Omit<BadgeBlock, 'type'> {}

const intentStyles: Record<string, string> = {
  primary: 'bg-intent-primary/20 border-intent-primary/40 text-intent-primary',
  secondary: 'bg-intent-secondary/20 border-intent-secondary/40 text-intent-secondary',
  neutral: 'bg-surface-glass/[0.1] border-intent-neutral/30 text-text-secondary',
  success: 'bg-intent-success/20 border-intent-success/40 text-intent-success',
  warning: 'bg-intent-warning/20 border-intent-warning/40 text-intent-warning',
  focus: 'bg-intent-focus/20 border-intent-focus/40 text-intent-focus',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
  xl: 'px-4 py-2 text-base',
};

export function CogBadge({ 
  text, 
  icon,
  intent = 'primary',
  size = 'md',
  className 
}: CogBadgeProps) {
  return (
    <AnimatedContainer className={cn('inline-block', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-medium uppercase tracking-wider',
          'border rounded-full relative overflow-hidden',
          intentStyles[intent],
          sizeStyles[size],
          'transition-all duration-short'
        )}
      >
        {icon && (
          <span className="flex-shrink-0">
            {icon}
          </span>
        )}
        
        <span className="relative z-10">{text}</span>
        
        {/* Edge highlight */}
        {(intent === 'primary' || intent === 'secondary') && (
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        )}
      </span>
    </AnimatedContainer>
  );
}