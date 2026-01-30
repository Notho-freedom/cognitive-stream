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
    bgClass: 'bg-intent-info/10 border-intent-info/30',
    iconClass: 'text-intent-info',
    titleClass: 'text-intent-info',
  },
  success: {
    icon: CheckCircle2,
    bgClass: 'bg-intent-success/10 border-intent-success/30',
    iconClass: 'text-intent-success',
    titleClass: 'text-intent-success',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-intent-warning/10 border-intent-warning/30',
    iconClass: 'text-intent-warning',
    titleClass: 'text-intent-warning',
  },
  error: {
    icon: AlertCircle,
    bgClass: 'bg-intent-error/10 border-intent-error/30',
    iconClass: 'text-intent-error',
    titleClass: 'text-intent-error',
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
      transition={{ duration: 0.2 }}
      className={cn(
        'relative flex gap-3 p-4 rounded-lg border',
        config.bgClass
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 pt-0.5">
        <Icon className={cn('w-5 h-5', config.iconClass)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={cn('font-medium text-sm mb-1', config.titleClass)}>
            {title}
          </h4>
        )}
        <p className="text-sm text-primary-foreground/80">{message}</p>
        
        {actionLabel && actionId && (
          <button
            onClick={handleAction}
            className={cn(
              'mt-3 text-sm font-medium underline underline-offset-2 transition-colors',
              config.titleClass,
              'hover:opacity-80'
            )}
          >
            {actionLabel}
          </button>
        )}
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-ghost" />
        </button>
      )}

      {/* Corner accents GX */}
      <div className={cn('absolute top-0 left-0 w-3 h-3 border-t border-l', config.iconClass.replace('text-', 'border-'))} />
      <div className={cn('absolute bottom-0 right-0 w-3 h-3 border-b border-r', config.iconClass.replace('text-', 'border-'))} />
    </motion.div>
  );
}
