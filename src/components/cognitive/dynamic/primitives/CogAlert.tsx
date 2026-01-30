import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useState } from 'react';
import type { ActionPayload } from '../types';

interface CogAlertProps {
  variant: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  dismissible?: boolean;
  actionLabel?: string;
  actionId?: string;
  id?: string;
  onAction?: (action: ActionPayload) => void;
}

const variantConfig = {
  info: {
    icon: Info,
    bgClass: 'bg-[hsl(var(--intent-focus)/0.1)]',
    borderClass: 'border-[hsl(var(--intent-focus)/0.4)]',
    iconClass: 'text-[hsl(var(--intent-focus))]',
    titleClass: 'text-[hsl(var(--intent-focus))]',
    glowClass: 'shadow-[0_0_20px_-5px_hsl(var(--intent-focus)/0.3)]',
  },
  success: {
    icon: CheckCircle2,
    bgClass: 'bg-[hsl(var(--intent-success)/0.1)]',
    borderClass: 'border-[hsl(var(--intent-success)/0.4)]',
    iconClass: 'text-[hsl(var(--intent-success))]',
    titleClass: 'text-[hsl(var(--intent-success))]',
    glowClass: 'shadow-[0_0_20px_-5px_hsl(var(--intent-success)/0.3)]',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-[hsl(var(--intent-warning)/0.1)]',
    borderClass: 'border-[hsl(var(--intent-warning)/0.4)]',
    iconClass: 'text-[hsl(var(--intent-warning))]',
    titleClass: 'text-[hsl(var(--intent-warning))]',
    glowClass: 'shadow-[0_0_20px_-5px_hsl(var(--intent-warning)/0.3)]',
  },
  error: {
    icon: AlertCircle,
    bgClass: 'bg-[hsl(0,70%,50%/0.1)]',
    borderClass: 'border-[hsl(0,70%,50%/0.4)]',
    iconClass: 'text-[hsl(0,70%,50%)]',
    titleClass: 'text-[hsl(0,70%,50%)]',
    glowClass: 'shadow-[0_0_20px_-5px_hsl(0,70%,50%/0.3)]',
  },
};

export function CogAlert({
  variant,
  title,
  message,
  dismissible = false,
  actionLabel,
  actionId,
  id,
  onAction,
}: CogAlertProps) {
  const [dismissed, setDismissed] = useState(false);
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleAction = () => {
    if (actionId && onAction) {
      onAction({
        id: actionId,
        payload: { actionType: 'alert-action' },
      });
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (onAction && id) {
      onAction({
        id,
        payload: { actionType: 'alert-dismiss' },
      });
    }
  };

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative flex gap-3 p-4 rounded-lg border backdrop-blur-sm',
        config.bgClass,
        config.borderClass,
        config.glowClass
      )}
    >
      {/* Icon with pulse effect */}
      <div className="flex-shrink-0 pt-0.5 relative">
        <Icon className={cn('w-5 h-5 relative z-10', config.iconClass)} />
        <motion.div
          className={cn('absolute inset-0 rounded-full blur-md opacity-40', config.iconClass.replace('text-', 'bg-'))}
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.2, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={cn('font-medium text-sm mb-1 tracking-wide', config.titleClass)}>
            {title}
          </h4>
        )}
        <p className="text-sm text-[hsl(var(--text-secondary))] leading-relaxed">{message}</p>
        
        {actionLabel && actionId && (
          <motion.button
            onClick={handleAction}
            className={cn(
              'mt-3 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border rounded transition-all',
              config.titleClass,
              config.borderClass,
              'hover:bg-white/5'
            )}
            whileHover={{ scale: 1.02, x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            {actionLabel}
          </motion.button>
        )}
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <motion.button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[hsl(var(--text-ghost))] hover:text-[hsl(var(--text-secondary))]"
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-4 h-4" />
        </motion.button>
      )}

      {/* Corner accents GX */}
      <div className={cn('absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl pointer-events-none', config.borderClass)} />
      <div className={cn('absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br pointer-events-none', config.borderClass)} />
      
      {/* Animated scan line */}
      <motion.div
        className={cn('absolute top-0 left-0 right-0 h-px opacity-50', config.iconClass.replace('text-', 'bg-'))}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      />
    </motion.div>
  );
}
