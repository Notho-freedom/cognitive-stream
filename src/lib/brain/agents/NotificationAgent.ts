// ═══════════════════════════════════════════════════════════════
// NOTIFICATION AGENT
// Agent pour gestion des notifications utilisateur
// ═══════════════════════════════════════════════════════════════

import type { Agent, AgentResult, CognitiveTask } from '../types';

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

interface NotificationParams {
  action: 'push' | 'clear' | 'update';
  notification?: {
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    duration?: number;
    actionLabel?: string;
    actionId?: string;
  };
  notificationId?: string;
}

interface NotificationResult {
  action: string;
  notificationId?: string;
  success: boolean;
}

type NotificationCallback = (
  message: string,
  priority: 'low' | 'medium' | 'high' | 'critical',
  options?: { action?: { label: string; onClick: () => void } }
) => string;

// ──────────────────────────────────────────────────────────────
// AGENT IMPLEMENTATION
// ──────────────────────────────────────────────────────────────

export class NotificationAgent implements Agent<NotificationParams, NotificationResult> {
  name = 'notification' as const;
  description = 'Agent pour notifications utilisateur';

  private pushCallback?: NotificationCallback;
  private activeNotifications = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(pushCallback?: NotificationCallback) {
    this.pushCallback = pushCallback;
  }

  setPushCallback(callback: NotificationCallback): void {
    this.pushCallback = callback;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.pushCallback;
  }

  async execute(task: CognitiveTask<NotificationParams, NotificationResult>): Promise<AgentResult<NotificationResult>> {
    const startTime = Date.now();
    const { action, notification, notificationId } = task.params;

    try {
      let result: NotificationResult;

      switch (action) {
        case 'push': {
          if (!notification) {
            return {
              success: false,
              error: 'Notification data required for push action',
              duration: Date.now() - startTime,
            };
          }

          if (!this.pushCallback) {
            return {
              success: false,
              error: 'Notification callback not configured',
              duration: Date.now() - startTime,
            };
          }

          const id = this.pushCallback(
            notification.message,
            notification.priority,
            notification.actionLabel && notification.actionId
              ? {
                  action: {
                    label: notification.actionLabel,
                    onClick: () => {
                      console.log(`[NotificationAgent] Action clicked: ${notification.actionId}`);
                    },
                  },
                }
              : undefined
          );

          // Auto-clear si duration spécifié
          if (notification.duration) {
            const timeout = setTimeout(() => {
              this.activeNotifications.delete(id);
            }, notification.duration);
            this.activeNotifications.set(id, timeout);
          }

          result = {
            action: 'push',
            notificationId: id,
            success: true,
          };
          break;
        }

        case 'clear': {
          if (!notificationId) {
            // Clear all
            this.activeNotifications.forEach((timeout) => clearTimeout(timeout));
            this.activeNotifications.clear();
            result = { action: 'clear', success: true };
          } else {
            // Clear specific
            const timeout = this.activeNotifications.get(notificationId);
            if (timeout) {
              clearTimeout(timeout);
              this.activeNotifications.delete(notificationId);
            }
            result = { action: 'clear', notificationId, success: true };
          }
          break;
        }

        case 'update': {
          // Pour l'instant, on re-push simplement
          if (notification && this.pushCallback) {
            const id = this.pushCallback(notification.message, notification.priority);
            result = { action: 'update', notificationId: id, success: true };
          } else {
            result = { action: 'update', success: false };
          }
          break;
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
            duration: Date.now() - startTime,
          };
      }

      return {
        success: result.success,
        data: result,
        duration: Date.now() - startTime,
        metadata: { action },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }
}

// Export factory
export function createNotificationAgent(
  pushCallback?: NotificationCallback
): NotificationAgent {
  return new NotificationAgent(pushCallback);
}
