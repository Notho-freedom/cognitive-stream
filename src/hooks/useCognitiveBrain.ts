// ═══════════════════════════════════════════════════════════════
// USE COGNITIVE BRAIN HOOK
// Hook React pour intégrer le cerveau cognitif dans l'UI
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { CognitiveBrain, createCognitiveBrain } from '@/lib/brain';
import type { 
  MentalState, 
  Thought, 
  CognitiveTask, 
  CognitiveEvent,
  Message,
  AutonomyConfig,
} from '@/lib/brain';
import type { ExtendedBrainCallbacks } from '@/lib/brain/CognitiveBrain';
import type { CognitiveUISchema, ActionPayload } from '@/components/cognitive/dynamic/types';
import type { CognitiveNotification, NotificationPriority } from '@/components/cognitive/NotificationQueue';
import { isTransitionSchema } from '@/lib/brain/schemaFallbacks';

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

type NotificationPushFn = (notification: Omit<CognitiveNotification, 'id' | 'timestamp'>) => string;

interface CognitiveBrainState {
  messages: Message[];
  schema: CognitiveUISchema | null;
  lastValidSchema: CognitiveUISchema | null; // Keep last valid schema for fallback
  thought: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  pendingAction: ActionPayload | null;
  
  // Brain-specific state
  mentalState: MentalState | null;
  currentThought: Thought | null;
  activeTasks: CognitiveTask[];
  recentEvents: CognitiveEvent[];
  
  // Provider info
  aiProvider: string | null;
  aiModel: string | null;
  isLocalFallback: boolean;
  
  // Plan state
  isPlanning: boolean;
  isPlanExecuting: boolean;
  
  // Autonomy state
  isAutonomousMode: boolean;
  autonomyActionCount: number;
  autonomyLimit: number;
  autonomyLog: Array<{ type: string; summary: string; timestamp: number }>;
}

// ──────────────────────────────────────────────────────────────
// HOOK
// ──────────────────────────────────────────────────────────────

export function useCognitiveBrain(notificationPush?: NotificationPushFn) {
  // Brain instance (singleton per hook instance)
  const brainRef = useRef<CognitiveBrain | null>(null);
  
  const [state, setState] = useState<CognitiveBrainState>({
    messages: [],
    schema: null,
    lastValidSchema: null,
    thought: null,
    isLoading: false,
    isStreaming: false,
    error: null,
    pendingAction: null,
    mentalState: null,
    currentThought: null,
    activeTasks: [],
    recentEvents: [],
    aiProvider: null,
    aiModel: null,
    isLocalFallback: false,
    isPlanning: false,
    isPlanExecuting: false,
    // Autonomy
    isAutonomousMode: false,
    autonomyActionCount: 0,
    autonomyLimit: 50,
    autonomyLog: [],
  });

  // Notification ref for callbacks
  const notifyRef = useRef(notificationPush);
  useEffect(() => {
    notifyRef.current = notificationPush;
  }, [notificationPush]);

  // Notification helper
  const notify = useCallback((
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' | 'alert' = 'info',
    priority: NotificationPriority = 'medium'
  ) => {
    if (notifyRef.current) {
      const mappedPriority: NotificationPriority = 
        type === 'error' ? 'critical' :
        type === 'warning' ? 'high' :
        type === 'alert' ? 'high' :
        type === 'success' ? 'medium' :
        priority;
      
      notifyRef.current({
        message,
        priority: mappedPriority,
        dismissible: true,
      });
    }
  }, []);

  // Brain callbacks
  const callbacks: Partial<ExtendedBrainCallbacks> = useMemo(() => ({
    onStateChange: (mentalState: MentalState) => {
      setState(prev => ({
        ...prev,
        mentalState,
        isLoading: mentalState.mode === 'thinking' || mentalState.mode === 'executing' || mentalState.mode === 'planning',
        isStreaming: mentalState.mode === 'thinking',
        isPlanning: mentalState.mode === 'planning',
        isPlanExecuting: mentalState.mode === 'executing',
      }));
    },
    
    onEvent: (event: CognitiveEvent) => {
      setState(prev => ({
        ...prev,
        recentEvents: [...prev.recentEvents.slice(-20), event],
      }));
    },
    
    onThought: (thought: Thought) => {
      setState(prev => ({
        ...prev,
        thought: thought.content,
        currentThought: thought,
      }));
    },
    
    onTaskUpdate: (task: CognitiveTask) => {
      setState(prev => {
        const activeTasks = [...prev.activeTasks];
        const existingIndex = activeTasks.findIndex(t => t.id === task.id);
        
        if (task.status === 'running') {
          if (existingIndex === -1) {
            activeTasks.push(task);
          } else {
            activeTasks[existingIndex] = task;
          }
        } else if (existingIndex !== -1) {
          activeTasks.splice(existingIndex, 1);
        }
        
        return { ...prev, activeTasks };
      });
    },
    
    onUISchema: (schema: unknown) => {
      const typedSchema = schema as CognitiveUISchema;
      
      setState(prev => {
        // Sauvegarder comme lastValidSchema si ce n'est pas un schéma transitionnel
        const isTransition = isTransitionSchema(typedSchema);
        const newLastValid = isTransition ? prev.lastValidSchema : typedSchema;
        
        return {
          ...prev,
          schema: typedSchema,
          lastValidSchema: newLastValid,
          isLoading: isTransition, // Keep loading state if transitional
          isStreaming: false,
          error: null,
        };
      });
      
      // Update provider info from brain
      if (brainRef.current) {
        const providerInfo = brainRef.current.getActiveProvider();
        setState(prev => ({
          ...prev,
          aiProvider: providerInfo.provider,
          aiModel: providerInfo.model,
          isLocalFallback: providerInfo.provider === 'ollama-local',
        }));
      }
    },
    
    onNotification: (message: string, priority: 'low' | 'medium' | 'high' | 'critical') => {
      if (notifyRef.current) {
        notifyRef.current({
          message,
          priority,
          dismissible: true,
        });
      }
    },
    
    onError: (error: string) => {
      setState(prev => ({
        ...prev,
        error,
        isLoading: false,
        isStreaming: false,
      }));
      notify(error, 'error', 'critical');
    },
    
    // Extended callbacks pour l'autonomie
    onAutonomyLog: (entry: { type: string; summary: string; timestamp: number }) => {
      setState(prev => ({
        ...prev,
        autonomyLog: [...prev.autonomyLog.slice(-100), entry],
      }));
    },
    
    onAutonomyPause: (reason: string) => {
      setState(prev => ({
        ...prev,
        isAutonomousMode: false,
      }));
      notify(`Autonomie en pause: ${reason}`, 'warning', 'high');
    },
    
    onAutonomyResume: () => {
      setState(prev => ({
        ...prev,
        isAutonomousMode: true,
      }));
      notify('Mode autonome repris', 'info', 'medium');
    },
    
    onConfirmDestructive: async (action: string, description: string): Promise<boolean> => {
      // Pour l'instant, afficher une notification et retourner false
      // TODO: Implémenter un dialog de confirmation
      notify(`Action destructrice bloquée: ${action}`, 'warning', 'high');
      return false;
    },
    
    onAskQuestion: async (question: string): Promise<string> => {
      // TODO: Implémenter un dialog de question
      notify(`Question en attente: ${question}`, 'info', 'medium');
      return '';
    },
  }), [notify]);

  // Initialize brain on mount
  useEffect(() => {
    if (!brainRef.current) {
      brainRef.current = createCognitiveBrain({}, callbacks);
      
      // Set notification callback
      if (notifyRef.current) {
        brainRef.current.setNotificationCallback((msg, priority) => {
          const id = `notif_${Date.now()}`;
          if (notifyRef.current) {
            notifyRef.current({
              message: msg,
              priority,
              dismissible: true,
            });
          }
          return id;
        });
      }
      
      console.log('[useCognitiveBrain] Brain initialized');
    }
    
    return () => {
      // Cleanup if needed
    };
  }, [callbacks]);

  // ──────────────────────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (input: string, action?: ActionPayload) => {
    if (!brainRef.current) {
      console.error('[useCognitiveBrain] Brain not initialized');
      return;
    }

    // Reset state for new message
    setState(prev => ({
      ...prev,
      isLoading: true,
      isStreaming: true,
      error: null,
      schema: null,
      thought: null,
      pendingAction: null,
    }));

    // Build message content
    let messageContent = input;
    if (action) {
      messageContent = JSON.stringify({
        text: input,
        action: {
          id: action.id,
          payload: action.payload,
        }
      });
    }

    // Add message to local state
    const userMessage: Message = { role: 'user', content: messageContent };
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
    }));

    try {
      // Send to brain
      await brainRef.current.sendMessage(messageContent);
      
      // Update messages from brain
      const brainMessages = brainRef.current.getMessages();
      setState(prev => ({
        ...prev,
        messages: brainMessages,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        error: errorMsg,
        isLoading: false,
        isStreaming: false,
      }));
    }
  }, []);

  const handleAction = useCallback((action: ActionPayload) => {
    console.log('[useCognitiveBrain] Action received:', action);
    
    const actionType = action.payload.actionType as string;
    const formData = action.payload.formData as Record<string, unknown> | undefined;
    
    if (formData && Object.keys(formData).length > 0) {
      console.log('Form data collected:', formData);
    }
    
    if (actionType === 'button-click' || actionType === 'form-submit') {
      let actionMessage = `Action: ${action.id}`;
      if (formData && Object.keys(formData).length > 0) {
        actionMessage += ` avec données: ${JSON.stringify(formData)}`;
      }
      sendMessage(actionMessage, action);
      return;
    }
    
    if (actionType === 'input-submit') {
      const actionMessage = `Soumission: ${action.id} - ${JSON.stringify(action.payload)}`;
      sendMessage(actionMessage, action);
      return;
    }
    
    if (actionType === 'timer-complete') {
      notify('Timer terminé!', 'alert', 'high');
      return;
    }
    
    if (actionType === 'table-row-select') {
      sendMessage(`Sélection table: ligne ${action.payload.rowIndex}`, action);
      return;
    }
    
    if (actionType === 'alert-action') {
      const alertVariant = action.payload.variant as string || 'info';
      const alertMessage = action.payload.message as string || 'Alerte';
      const notifPriority: NotificationPriority = 
        alertVariant === 'error' ? 'critical' :
        alertVariant === 'warning' ? 'high' :
        alertVariant === 'success' ? 'medium' : 'high';
      
      notify(alertMessage, 'alert', notifPriority);
      sendMessage(`Action alerte: ${action.id}`, action);
      return;
    }
    
    if (actionType === 'list-select' || actionType === 'input-change') {
      setState(prev => ({
        ...prev,
        pendingAction: action,
      }));
    } else {
      const actionMessage = `Action: ${action.id} - ${JSON.stringify(action.payload)}`;
      sendMessage(actionMessage, action);
    }
  }, [sendMessage, notify]);

  const confirmAction = useCallback((customMessage?: string) => {
    if (!state.pendingAction) return;
    
    const message = customMessage || `Action: ${state.pendingAction.id}`;
    sendMessage(message, state.pendingAction);
    
    setState(prev => ({
      ...prev,
      pendingAction: null,
    }));
  }, [state.pendingAction, sendMessage]);

  const reset = useCallback(() => {
    if (brainRef.current) {
      brainRef.current.reset();
    }
    
    setState({
      messages: [],
      schema: null,
      lastValidSchema: null,
      thought: null,
      isLoading: false,
      isStreaming: false,
      error: null,
      pendingAction: null,
      mentalState: null,
      currentThought: null,
      activeTasks: [],
      recentEvents: [],
      aiProvider: null,
      aiModel: null,
      isLocalFallback: false,
      isPlanning: false,
      isPlanExecuting: false,
      isAutonomousMode: false,
      autonomyActionCount: 0,
      autonomyLimit: 50,
      autonomyLog: [],
    });
  }, []);

  // ──────────────────────────────────────────────────────────────
  // AUTONOMY CONTROLS
  // ──────────────────────────────────────────────────────────────

  const pauseAutonomy = useCallback(() => {
    if (brainRef.current) {
      brainRef.current.pauseAutonomy();
    }
  }, []);

  const resumeAutonomy = useCallback(() => {
    if (brainRef.current) {
      brainRef.current.resumeAutonomy();
    }
  }, []);

  const setAutonomyConfig = useCallback((config: Partial<AutonomyConfig>) => {
    if (brainRef.current) {
      brainRef.current.setAutonomyConfig(config);
    }
  }, []);

  // ──────────────────────────────────────────────────────────────
  // RETURN
  // ──────────────────────────────────────────────────────────────

  return {
    // State
    messages: state.messages,
    schema: state.schema,
    lastValidSchema: state.lastValidSchema,
    thought: state.thought,
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    error: state.error,
    pendingAction: state.pendingAction,
    
    // Brain-specific
    mentalState: state.mentalState,
    currentThought: state.currentThought,
    activeTasks: state.activeTasks,
    recentEvents: state.recentEvents,
    
    // Provider info
    aiProvider: state.aiProvider,
    aiModel: state.aiModel,
    isLocalFallback: state.isLocalFallback,
    
    // Plan state
    isPlanning: state.isPlanning,
    isPlanExecuting: state.isPlanExecuting,
    
    // Autonomy state
    isAutonomousMode: state.isAutonomousMode,
    autonomyActionCount: state.autonomyActionCount,
    autonomyLimit: state.autonomyLimit,
    autonomyLog: state.autonomyLog,
    
    // Actions
    sendMessage,
    handleAction,
    confirmAction,
    reset,
    
    // Autonomy controls
    pauseAutonomy,
    resumeAutonomy,
    setAutonomyConfig,
    
    // Brain access (for advanced usage)
    getBrain: () => brainRef.current,
  };
}
