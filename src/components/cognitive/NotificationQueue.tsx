import { useState, useCallback, createContext, useContext, ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FuturisticFrame } from './FuturisticFrame';

// Types
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface CognitiveNotification {
  id: string;
  message: string;
  priority: NotificationPriority;
  timestamp: number;
  ttl?: number; // Time to live in ms
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

// Priority config
const PRIORITY_CONFIG: Record<NotificationPriority, {
  variant: 'primary' | 'secondary' | 'minimal';
  defaultTTL: number;
  maxVisible: number;
  zBoost: number;
}> = {
  low: { variant: 'minimal', defaultTTL: 3000, maxVisible: 4, zBoost: 0 },
  medium: { variant: 'secondary', defaultTTL: 4000, maxVisible: 4, zBoost: 10 },
  high: { variant: 'primary', defaultTTL: 6000, maxVisible: 5, zBoost: 20 },
  critical: { variant: 'primary', defaultTTL: 0, maxVisible: 5, zBoost: 30 }, // 0 = no auto-dismiss
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
    };

    setNotifications(prev => {
      // Add to top, most recent first (cascade style)
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

// Single Notification Item
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
  const config = PRIORITY_CONFIG[notification.priority];
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);

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

  // Calculate cascade effect
  const yOffset = index * 60; // Vertical offset for each card
  const xOffset = index * 6; // Slight inward shift
  const scale = 1 - index * 0.04; // Subtle scale reduction
  const opacity = 1 - index * 0.15; // Fade older notifications

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
      style={{ zIndex: 100 - index + config.zBoost }}
      className="absolute right-0 top-0 w-80"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <FuturisticFrame variant={config.variant} animated={notification.priority === 'critical'}>
        <div className="p-4 min-h-[80px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {/* Priority indicator */}
              <motion.div
                className={`w-2 h-2 rounded-full ${
                  notification.priority === 'critical' ? 'bg-red-500' :
                  notification.priority === 'high' ? 'bg-intent-primary' :
                  notification.priority === 'medium' ? 'bg-intent-secondary' :
                  'bg-intent-neutral'
                }`}
                animate={notification.priority === 'critical' ? {
                  scale: [1, 1.4, 1],
                  opacity: [1, 0.6, 1],
                } : {}}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <span className="text-[9px] font-mono uppercase tracking-wider text-text-ghost">
                {notification.priority}
              </span>
            </div>

            {/* Dismiss button */}
            {notification.dismissible && (
              <motion.button
                onClick={onDismiss}
                className="w-5 h-5 flex items-center justify-center text-text-ghost hover:text-text-secondary transition-colors"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </motion.button>
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            {notification.message}
          </p>

          {/* Action button */}
          {notification.action && (
            <motion.button
              onClick={() => {
                notification.action?.onClick();
                onDismiss();
              }}
              className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-intent-primary border border-intent-primary/40 hover:bg-intent-primary/10 transition-colors"
              style={{
                clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {notification.action.label}
            </motion.button>
          )}

          {/* TTL Progress bar */}
          {notification.ttl && notification.ttl > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-surface-deep overflow-hidden">
              <motion.div
                className={`h-full ${
                  notification.priority === 'critical' ? 'bg-red-500' :
                  notification.priority === 'high' ? 'bg-intent-primary' :
                  'bg-intent-neutral'
                }`}
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.05 }}
              />
            </div>
          )}
        </div>
      </FuturisticFrame>
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

  // Calculate needed height based on notification count (cascade effect)
  const containerHeight = Math.max(80, notifications.length * 60 + 60);

  return (
    <div className={`fixed ${positionClasses[position]} z-50 pointer-events-none`}>
      <div 
        className="relative pointer-events-auto"
        style={{ height: containerHeight, width: 320 }}
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