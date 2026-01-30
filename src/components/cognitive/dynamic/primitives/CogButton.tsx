import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ButtonBlock, ActionPayload } from '../types';

interface CogButtonProps extends Omit<ButtonBlock, 'type'> {
  className?: string;
  onAction?: (action: ActionPayload) => void;
}

const variantStyles: Record<string, { bg: string; border: string; text: string }> = {
  primary: {
    bg: 'bg-intent-primary/20 hover:bg-intent-primary/30',
    border: 'border-intent-primary/50',
    text: 'text-text-primary',
  },
  secondary: {
    bg: 'bg-intent-secondary/15 hover:bg-intent-secondary/25',
    border: 'border-intent-secondary/40',
    text: 'text-text-secondary',
  },
  ghost: {
    bg: 'bg-transparent hover:bg-intent-neutral/10',
    border: 'border-intent-neutral/20',
    text: 'text-text-ghost hover:text-text-secondary',
  },
  danger: {
    bg: 'bg-intent-focus/15 hover:bg-intent-focus/25',
    border: 'border-intent-focus/40',
    text: 'text-intent-focus',
  },
  default: {
    bg: 'bg-intent-primary/20 hover:bg-intent-primary/30',
    border: 'border-intent-primary/50',
    text: 'text-text-primary',
  },
};

export function CogButton({ 
  actionId, 
  label, 
  variant = 'primary', 
  disabled = false, 
  loading = false,
  className,
  onAction 
}: CogButtonProps) {
  const styles = variantStyles[variant] || variantStyles.default;

  const handleClick = () => {
    if (disabled || loading) return;
    
    // Envoi automatique pour les boutons
    onAction?.({ 
      id: actionId, 
      payload: { 
        actionType: 'button-click', // Auto-submit
        action: 'click' 
      } 
    });
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={cn(
        'group relative px-5 py-2.5 text-xs uppercase tracking-wider font-medium transition-all duration-200',
        styles.bg,
        styles.text,
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{
        clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
      }}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading && (
          <motion.span
            className="w-3 h-3 border border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
        {label}
      </span>
      
      {/* Border overlay */}
      <div 
        className={cn('absolute inset-0 border transition-colors', styles.border)}
        style={{
          clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
        }}
      />
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-intent-primary opacity-60" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-intent-primary opacity-60" />
    </motion.button>
  );
}
