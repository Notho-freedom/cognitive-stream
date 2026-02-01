import { useState, useCallback, useRef, useEffect } from 'react';
import type { CognitiveUISchema, ActionPayload } from '@/components/cognitive/dynamic/types';
import type { CognitiveNotification, NotificationPriority } from '@/components/cognitive/NotificationQueue';
import { parseSystemActions, executeSystemAction, formatActionResult } from '@/lib/systemActions';
import { 
  isElectronEnvironment, 
  isOllamaAvailable, 
  callOllamaLocal, 
  getSystemContext 
} from '@/lib/ollamaLocal';

// NotificationType is determined by priority in the new system
type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'alert';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SystemExecutionResult {
  action: string;
  success: boolean;
  output: string;
}

interface CognitiveChatState {
  messages: Message[];
  schema: CognitiveUISchema | null;
  thought: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  isExecutingSystem: boolean;
  systemResults: SystemExecutionResult[];
  error: string | null;
  pendingAction: ActionPayload | null;
  aiProvider: string | null;
  isLocalFallback: boolean; // Indique si on utilise Ollama local
}

// Notification callback type
type NotificationPushFn = (notification: Omit<CognitiveNotification, 'id' | 'timestamp'>) => string;

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export function useCognitiveChat(notificationPush?: NotificationPushFn) {
  const [state, setState] = useState<CognitiveChatState>({
    messages: [],
    schema: null,
    thought: null,
    isLoading: false,
    isStreaming: false,
    isExecutingSystem: false,
    systemResults: [],
    error: null,
    pendingAction: null,
    aiProvider: null,
    isLocalFallback: false,
  });

  // Store notification push function in a ref to avoid dependency issues
  const notifyRef = useRef(notificationPush);
  useEffect(() => {
    notifyRef.current = notificationPush;
  }, [notificationPush]);

  // Helper to push notifications
  const notify = useCallback((
    message: string,
    type: NotificationType = 'info',
    priority: NotificationPriority = 'medium',
    options?: { action?: { label: string; onClick: () => void } }
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
        ...options,
      });
    }
  }, []);

  /**
   * Parse la réponse de l'IA et met à jour l'état
   */
  const parseAndUpdateResponse = useCallback((fullContent: string, provider: string, isLocal: boolean) => {
    let parsedResponse: { thought?: string; response?: { type: string; schema: CognitiveUISchema } } | null = null;
    
    try {
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      notify('Erreur lors de l\'analyse de la réponse', 'warning', 'medium');
    }

    return {
      thought: parsedResponse?.thought || null,
      schema: parsedResponse?.response?.schema || null,
      aiProvider: provider,
      isLocalFallback: isLocal,
    };
  }, [notify]);

  /**
   * Tente d'appeler Ollama localement (fallback Electron)
   */
  const tryLocalOllama = useCallback(async (
    allMessages: Message[]
  ): Promise<{ success: boolean; fullContent: string; error?: string }> => {
    if (!isElectronEnvironment()) {
      return { success: false, fullContent: '', error: 'Not in Electron' };
    }

    const ollamaReady = await isOllamaAvailable();
    if (!ollamaReady) {
      return { success: false, fullContent: '', error: 'Ollama not available' };
    }

    notify('Fallback vers IA locale (Ollama)...', 'info', 'medium');
    
    // Récupérer le contexte système
    const systemContext = await getSystemContext();
    
    let fullContent = '';
    const result = await callOllamaLocal(
      allMessages.map(m => ({ ...m, role: m.role as 'user' | 'assistant' })),
      (chunk) => {
        fullContent += chunk;
        // On pourrait mettre à jour le state pour du streaming ici
      },
      systemContext
    );

    if (result.success) {
      notify(`IA locale: ${result.model}`, 'success', 'low');
    }

    return {
      success: result.success,
      fullContent: result.fullResponse,
      error: result.error,
    };
  }, [notify]);

  const sendMessage = useCallback(async (input: string, action?: ActionPayload) => {
    // Build user message
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
    
    const userMessage: Message = { role: 'user', content: messageContent };
    const allMessages = [...state.messages, userMessage];
    
    setState(prev => ({
      ...prev,
      messages: allMessages,
      isLoading: true,
      isStreaming: true,
      error: null,
      schema: null,
      thought: null,
      pendingAction: null,
      isLocalFallback: false,
    }));

    let fullContent = '';
    let aiProvider: string | null = null;
    let isLocalFallback = false;
    let cloudFailed = false;

    try {
      // === ÉTAPE 1: Essayer la Cloud Function ===
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
        }),
      });

      // Extract AI provider from response headers
      aiProvider = response.headers.get('X-AI-Provider') || null;

      if (!response.ok) {
        cloudFailed = true;
        
        // Essayer d'extraire les détails de l'erreur
        let errorDetails = '';
        try {
          const errorBody = await response.json();
          errorDetails = errorBody.error || errorBody.details || '';
        } catch {
          // Ignore
        }
        
        console.warn(`Cloud function failed (${response.status}): ${errorDetails}`);
        
        // On continue pour essayer le fallback local
      } else if (response.body) {
        // Lire le stream de la cloud function
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                fullContent += content;
              }
            } catch {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }
      }
    } catch (error) {
      cloudFailed = true;
      console.warn('Cloud function error:', error);
    }

    // === ÉTAPE 2: Si Cloud a échoué, essayer Ollama local (Electron seulement) ===
    if (cloudFailed && isElectronEnvironment()) {
      const localResult = await tryLocalOllama(allMessages);
      
      if (localResult.success) {
        fullContent = localResult.fullContent;
        aiProvider = 'ollama-local';
        isLocalFallback = true;
      } else {
        // Tout a échoué
        const errorMsg = `Tous les modèles IA indisponibles. Cloud: échec, Local: ${localResult.error}`;
        notify(errorMsg, 'error', 'critical');
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          error: errorMsg,
        }));
        return;
      }
    } else if (cloudFailed) {
      // Pas d'Electron, pas de fallback
      const errorMsg = 'Service IA temporairement indisponible';
      notify(errorMsg, 'error', 'high');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        error: errorMsg,
      }));
      return;
    }

    // === ÉTAPE 3: Parser la réponse ===
    const parsed = parseAndUpdateResponse(fullContent, aiProvider || 'unknown', isLocalFallback);
    const assistantMessage: Message = { role: 'assistant', content: fullContent };

    // === ÉTAPE 4: Exécuter les actions système si présentes ===
    const systemActions = parseSystemActions(fullContent);
    let systemResults: SystemExecutionResult[] = [];
    
    if (systemActions.length > 0 && window.cognitiveBridge) {
      setState(prev => ({ ...prev, isExecutingSystem: true }));
      notify('Exécution des commandes système...', 'alert', 'medium');
      
      for (const sysAction of systemActions) {
        const result = await executeSystemAction(sysAction);
        systemResults.push({
          action: sysAction.type,
          success: result.success,
          output: formatActionResult(result),
        });
        
        if (!result.success) {
          notify(`Échec: ${sysAction.type}`, 'error', 'high');
        }
      }
      
      notify(`${systemResults.length} commande(s) exécutée(s)`, 'success', 'medium');
    }

    // === ÉTAPE 5: Mettre à jour l'état final ===
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, assistantMessage],
      thought: parsed.thought,
      schema: parsed.schema,
      aiProvider: parsed.aiProvider,
      isLocalFallback: parsed.isLocalFallback,
      isLoading: false,
      isStreaming: false,
      isExecutingSystem: false,
      systemResults,
    }));
  }, [state.messages, notify, tryLocalOllama, parseAndUpdateResponse]);

  // Handle component actions
  const handleAction = useCallback((action: ActionPayload) => {
    console.log('Action received:', action);
    
    const actionType = action.payload.actionType as string;
    const formData = action.payload.formData as Record<string, unknown> | undefined;
    
    if (formData && Object.keys(formData).length > 0) {
      console.log('Form data collected:', formData);
    }
    
    // Boutons avec form data sont auto-soumis
    if (actionType === 'button-click' || actionType === 'form-submit') {
      let actionMessage = `Action: ${action.id}`;
      if (formData && Object.keys(formData).length > 0) {
        actionMessage += ` avec données: ${JSON.stringify(formData)}`;
      }
      sendMessage(actionMessage, action);
      return;
    }
    
    // Input submit
    if (actionType === 'input-submit') {
      const actionMessage = `Soumission: ${action.id} - ${JSON.stringify(action.payload)}`;
      sendMessage(actionMessage, action);
      return;
    }
    
    // Timer complete - notification-worthy
    if (actionType === 'timer-complete') {
      notify('Timer terminé!', 'alert', 'high', {
        action: {
          label: 'Redémarrer',
          onClick: () => sendMessage(`Redémarrer le timer ${action.id}`, action),
        },
      });
      return;
    }
    
    // Table row selection
    if (actionType === 'table-row-select') {
      sendMessage(`Sélection table: ligne ${action.payload.rowIndex}`, action);
      return;
    }
    
    // Alert actions - push to notifications!
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
    
    // Actions nécessitant confirmation manuelle
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

  // Confirm pending action
  const confirmAction = useCallback((customMessage?: string) => {
    if (!state.pendingAction) return;
    
    const message = customMessage || `Action: ${state.pendingAction.id}`;
    sendMessage(message, state.pendingAction);
  }, [state.pendingAction, sendMessage]);

  const reset = useCallback(() => {
    setState({
      messages: [],
      schema: null,
      thought: null,
      isLoading: false,
      isStreaming: false,
      isExecutingSystem: false,
      systemResults: [],
      error: null,
      pendingAction: null,
      aiProvider: null,
      isLocalFallback: false,
    });
  }, []);

  return {
    ...state,
    sendMessage,
    handleAction,
    confirmAction,
    reset,
    pushAlert: notify,
  };
}
