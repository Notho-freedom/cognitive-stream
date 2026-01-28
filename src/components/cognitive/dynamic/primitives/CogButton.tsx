// CogButton.tsx
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ButtonBlock, ActionCallback } from '../types';
import { Loader2 } from 'lucide-react';
import { AnimatedContainer, FuturisticButton } from '../utils/components';

interface CogButtonProps extends Omit<ButtonBlock, 'type'> {
  onAction?: ActionCallback;
}

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg',
};

export function CogButton({ 
  label, 
  icon,
  action,
  variant = 'solid',
  intent = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onAction,
  className 
}: CogButtonProps) {
  const handleClick = () => {
    if (!disabled && !loading && onAction) {
      onAction(action);
    }
  };

  return (
    <AnimatedContainer className={cn('inline-block', className)}>
      <FuturisticButton
        onClick={handleClick}
        variant={variant}
        intent={intent}
        disabled={disabled || loading}
        className={cn(sizeStyles[size], 'font-medium uppercase tracking-wider')}
      >
        <span className="flex items-center justify-center gap-2">
          {loading ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="w-4 h-4" />
            </motion.span>
          ) : icon ? (
            <span>{icon}</span>
          ) : null}
          {label}
        </span>
      </FuturisticButton>
    </AnimatedContainer>
  );
}