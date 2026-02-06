import { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  NotificationProvider,
  NotificationQueue,
} from '@/components/cognitive';
import { useNotifications } from '@/components/cognitive/NotificationQueue';
import { useCognitiveBrain } from '@/hooks/useCognitiveBrain';
import { useCognitiveEdgeTTS } from '@/hooks/useCognitiveEdgeTTS';
import { AutonomyConfirmDialog } from '@/components/cognitive/AutonomyConfirmDialog';
import { AutonomyQuestionDialog } from '@/components/cognitive/AutonomyQuestionDialog';
import { CommandWidget } from './CommandWidget';
import { StatusWidget } from './StatusWidget';

// Mapping des modes du cerveau
const brainModeLabels: Record<string, string> = {
  idle: 'VEILLE',
  listening: 'ÉCOUTE',
  thinking: 'RÉFLEXION',
  planning: 'PLANIFICATION',
  executing: 'EXÉCUTION',
  observing: 'OBSERVATION',
  adapting: 'ADAPTATION',
};

/**
 * DesktopWidgetShell — Conteneur principal du mode widgets Electron
 * Fond transparent, widgets flottants draggables, click-through sur le bureau
 */
function DesktopWidgetShellInner() {
  const { push: notifyPush } = useNotifications();
  const brain = useCognitiveBrain(notifyPush);

  const {
    messages,
    schema,
    thought,
    isLoading,
    isStreaming,
    error,
    pendingAction,
    pendingConfirmation,
    pendingQuestion,
    aiProvider,
    aiModel,
    isLocalFallback,
    mentalState,
    activeTasks,
    isAutonomousMode,
    autonomyActionCount,
    autonomyLimit,
    sendMessage,
    handleAction,
    confirmAction,
    respondToConfirmation,
    respondToQuestion,
    reset,
  } = brain;

  // TTS
  useCognitiveEdgeTTS({ autoPlay: true, maxLength: 500, skipIfSpeaking: true });

  const brainMode = useMemo(() => {
    if (!mentalState) return null;
    return brainModeLabels[mentalState.mode] || mentalState.mode.toUpperCase();
  }, [mentalState]);

  // Click-through pour Electron
  const handleMouseState = (inside: boolean) => {
    const bridge = (window as any).cognitiveBridge;
    if (!bridge) return;
    if (inside) {
      bridge.widgetMouseEnter?.();
    } else {
      bridge.widgetMouseLeave?.();
    }
  };

  return (
    <>
      {/* Dialogs (toujours au premier plan) */}
      <AutonomyConfirmDialog
        open={Boolean(pendingConfirmation)}
        action={pendingConfirmation?.action}
        description={pendingConfirmation?.description}
        onCancel={() => respondToConfirmation(false)}
        onConfirm={() => respondToConfirmation(true)}
      />
      <AutonomyQuestionDialog
        open={Boolean(pendingQuestion)}
        question={pendingQuestion?.question}
        onCancel={() => respondToQuestion('')}
        onSubmit={respondToQuestion}
      />

      {/* Notifications */}
      <NotificationQueue position="top-right" />

      {/* Widget Status (coin haut-droit) */}
      <StatusWidget
        brainMode={brainMode}
        isAutonomous={isAutonomousMode}
        autonomyCount={autonomyActionCount}
        autonomyLimit={autonomyLimit}
        activeTasks={activeTasks.length}
        onMouseStateChange={handleMouseState}
      />

      {/* Widget Command (bas-centre) */}
      <CommandWidget
        onSend={(msg) => sendMessage(msg)}
        onAction={handleAction}
        onConfirmAction={confirmAction}
        schema={schema}
        thought={thought}
        isLoading={isLoading}
        isStreaming={isStreaming}
        error={error}
        pendingAction={pendingAction}
        aiProvider={aiProvider}
        aiModel={aiModel}
        isLocalFallback={isLocalFallback}
        brainMode={brainMode}
        messageCount={messages.length}
        onMouseStateChange={handleMouseState}
        onReset={reset}
      />
    </>
  );
}

export function DesktopWidgetShell() {
  return (
    <NotificationProvider>
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'transparent' }}>
        <div className="pointer-events-auto">
          <DesktopWidgetShellInner />
        </div>
      </div>
    </NotificationProvider>
  );
}
