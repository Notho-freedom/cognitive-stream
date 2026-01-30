import { useState, useCallback, createContext, useContext, ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

// Types
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'alert';

export interface CognitiveNotification {
  id: string;
  message: string;
  priority: NotificationPriority;
  type?: NotificationType;
  timestamp: number;
  ttl?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: CognitiveNotification[];
  push: (notification: Omit<CognitiveNotification, 'id' | 'timestamp'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

// Context
const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};

// Priority config - reduced TTLs and simplified
const PRIORITY_CONFIG: Record<NotificationPriority, {
  defaultTTL: number;
  maxVisible: number;
}> = {
  low: { defaultTTL: 3000, maxVisible: 4 },
  medium: { defaultTTL: 4000, maxVisible: 4 },
  high: { defaultTTL: 6000, maxVisible: 5 },
  critical: { defaultTTL: 0, maxVisible: 5 }, // 0 = no auto-dismiss
};

// Type config for styling
const TYPE_CONFIG: Record<NotificationType, {
  icon: typeof AlertCircle;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  info: { 
    icon: Info, 
    color: 'text-intent-neutral', 
    bgColor: 'bg-intent-neutral/10',
    borderColor: 'border-intent-neutral/30'
  },
  success: { 
    icon: CheckCircle, 
    color: 'text-intent-success', 
    bgColor: 'bg-intent-success/10',
    borderColor: 'border-intent-success/30'
  },
  warning: { 
    icon: AlertTriangle, 
    color: 'text-intent-warning', 
    bgColor: 'bg-intent-warning/10',
    borderColor: 'border-intent-warning/30'
  },
  error: { 
    icon: AlertCircle, 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30'
  },
  alert: { 
    icon: AlertTriangle, 
    color: 'text-intent-primary', 
    bgColor: 'bg-intent-primary/10',
    borderColor: 'border-intent-primary/30'
  },
};

// Provider
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<CognitiveNotification[]>([]);

  const push = useCallback((notif: Omit<CognitiveNotification, 'id' | 'timestamp'>) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const config = PRIORITY_CONFIG[notif.priority];
    
    const newNotification: CognitiveNotification = {
      ...notif,
      id,
      timestamp: Date.now(),
      ttl: notif.ttl ?? config.defaultTTL,
      dismissible: notif.dismissible ?? true,
      type: notif.type ?? 'info',
    };

    setNotifications(prev => {
      // Add to top, most recent first
      const updated = [newNotification, ...prev];
      // Limit to max visible
      return updated.slice(0, config.maxVisible);
    });

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, push, dismiss, clear }}>
      {children}
    </NotificationContext.Provider>
  );
}

// Single Notification Item - Stacked cascade style
function NotificationItem({
  notification,
  index,
  total,
  onDismiss,
}: {
  notification: CognitiveNotification;
  index: number;
  total: number;
  onDismiss: () => void;
}) {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const typeConfig = TYPE_CONFIG[notification.type || 'info'];
  const Icon = typeConfig.icon;

  // Auto-dismiss with TTL
  useEffect(() => {
    if (!notification.ttl || notification.ttl <= 0 || isHovered) return;
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / notification.ttl!) * 100);
      setProgress(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [notification.ttl, isHovered, onDismiss]);

  // Calculate cascade effect - more visible stacking
  const yOffset = index * 56; // Vertical offset for each card
  const xOffset = index * 8; // Slight inward shift
  const scale = 1 - index * 0.03; // Subtle scale reduction
  const opacity = 1 - index * 0.12; // Fade older notifications

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, y: 0, scale: 0.9 }}
      animate={{ 
        opacity: Math.max(0.4, opacity),
        x: -xOffset,
        y: yOffset,
        scale: Math.max(0.85, scale),
      }}
      exit={{ opacity: 0, x: 80, scale: 0.8 }}
      transition={{ 
        type: 'spring', 
        stiffness: 500, 
        damping: 35,
        layout: { duration: 0.25 }
      }}
      style={{ zIndex: 100 - index }}
      className="absolute right-0 top-0 w-72"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* GX-styled notification card */}
      <div 
        className={`
          relative overflow-hidden rounded-sm border
          ${typeConfig.bgColor} ${typeConfig.borderColor}
          backdrop-blur-md
        `}
        style={{
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
        }}
      >
        {/* Content */}
        <div className="p-3">
          <div className="flex items-start gap-2.5">
            {/* Icon with glow */}
            <motion.div
              className={`flex-shrink-0 ${typeConfig.color}`}
              animate={notification.priority === 'critical' ? {
                scale: [1, 1.2, 1],
                opacity: [1, 0.7, 1],
              } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Icon size={16} />
            </motion.div>

            {/* Message */}
            <p className="flex-1 text-xs text-text-secondary leading-relaxed pr-6">
              {notification.message}
            </p>

            {/* Dismiss button */}
            {notification.dismissible && (
              <motion.button
                onClick={onDismiss}
                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-text-ghost hover:text-text-secondary transition-colors"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={12} />
              </motion.button>
            )}
          </div>

          {/* Action button */}
          {notification.action && (
            <motion.button
              onClick={() => {
                notification.action?.onClick();
                onDismiss();
              }}
              className={`
                mt-2 ml-6 px-2 py-1 text-[9px] font-mono uppercase tracking-wider
                ${typeConfig.color} border ${typeConfig.borderColor}
                hover:bg-white/5 transition-colors
              `}
              style={{
                clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {notification.action.label}
            </motion.button>
          )}
        </div>

        {/* Progress bar */}
        {notification.ttl && notification.ttl > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-surface-deep/50">
            <motion.div
              className={`h-full ${
                notification.type === 'error' ? 'bg-red-400' :
                notification.type === 'warning' ? 'bg-intent-warning' :
                notification.type === 'success' ? 'bg-intent-success' :
                'bg-intent-primary'
              }`}
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.05 }}
            />
          </div>
        )}

        {/* Corner accents */}
        <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${typeConfig.borderColor}`} />
        <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${typeConfig.borderColor}`} />
      </div>
    </motion.div>
  );
}

// Queue Display Component
export function NotificationQueue({ position = 'top-right' }: { position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' }) {
  const { notifications, dismiss } = useNotifications();

  const positionClasses = {
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  };

  // Calculate needed height based on notification count
  const containerHeight = Math.max(80, notifications.length * 56 + 60);

  return (
    <div className={`fixed ${positionClasses[position]} z-50 pointer-events-none`}>
      <div 
        className="relative pointer-events-auto"
        style={{ height: containerHeight, width: 288 }}
      >
        <AnimatePresence mode="popLayout">
          {notifications.map((notification, index) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              index={index}
              total={notifications.length}
              onDismiss={() => dismiss(notification.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
