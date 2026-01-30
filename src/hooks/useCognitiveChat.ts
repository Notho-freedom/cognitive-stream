import { useState, useCallback, useRef, useEffect } from 'react';
import type { CognitiveUISchema, ActionPayload } from '@/components/cognitive/dynamic/types';
import type { CognitiveNotification, NotificationType, NotificationPriority } from '@/components/cognitive/NotificationQueue';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CognitiveChatState {
  messages: Message[];
  schema: CognitiveUISchema | null;
  thought: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  pendingAction: ActionPayload | null;
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
    error: null,
    pendingAction: null,
  });

  // Store notification push function in a ref to avoid dependency issues
  const notifyRef = useRef(notificationPush);
  useEffect(() => {
    notifyRef.current = notificationPush;
  }, [notificationPush]);

  // Helper to push notifications - only for important events
  const notify = useCallback((
    message: string,
    type: NotificationType = 'info',
    priority: NotificationPriority = 'medium',
    options?: { action?: { label: string; onClick: () => void } }
  ) => {
    if (notifyRef.current) {
      notifyRef.current({
        message,
        type,
        priority,
        dismissible: true,
        ...options,
      });
    }
  }, []);

  const sendMessage = useCallback(async (input: string, action?: ActionPayload) => {
    // Build user message
    let messageContent = input;
    
    // Include action in message if provided
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
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      isStreaming: true,
      error: null,
      schema: null,
      thought: null,
      pendingAction: null,
    }));

    // NO notification on start - reduces spam

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...state.messages, userMessage],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          notify('Limite de requêtes atteinte. Réessayez plus tard.', 'error', 'high');
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        notify(`Erreur serveur: ${response.status}`, 'error', 'high');
        throw new Error(`Request failed: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
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

      // Parse the full response
      let parsedResponse: { thought?: string; response?: { type: string; schema: CognitiveUISchema } } | null = null;
      
      try {
        // Try to extract JSON from the response
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        notify('Erreur lors de l\'analyse de la réponse', 'warning', 'medium');
      }

      const assistantMessage: Message = { role: 'assistant', content: fullContent };

      // NO success notification - reduces spam

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        thought: parsedResponse?.thought || null,
        schema: parsedResponse?.response?.schema || null,
        isLoading: false,
        isStreaming: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      notify(`Erreur: ${errorMessage}`, 'error', 'high');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        error: errorMessage,
      }));
    }
  }, [state.messages, notify]);

  // Handle component actions
  const handleAction = useCallback((action: ActionPayload) => {
    console.log('Action received:', action);
    
    const actionType = action.payload.actionType as string;
    const formData = action.payload.formData as Record<string, unknown> | undefined;
    
    // Log form data if present - NO notification, just log
    if (formData && Object.keys(formData).length > 0) {
      console.log('Form data collected:', formData);
    }
    
    // Button clicks with form data are auto-submitted
    if (actionType === 'button-click' || actionType === 'form-submit') {
      // NO notification - action happens silently
      let actionMessage = `Action: ${action.id}`;
      if (formData && Object.keys(formData).length > 0) {
        actionMessage += ` avec données: ${JSON.stringify(formData)}`;
      }
      sendMessage(actionMessage, action);
      return;
    }
    
    // Input submit (Enter key) - auto-submit
    if (actionType === 'input-submit') {
      const actionMessage = `Soumission: ${action.id} - ${JSON.stringify(action.payload)}`;
      sendMessage(actionMessage, action);
      return;
    }
    
    // Timer complete - this IS notification-worthy
    if (actionType === 'timer-complete') {
      notify('Timer terminé!', 'alert', 'high', {
        action: {
          label: 'Redémarrer',
          onClick: () => sendMessage(`Redémarrer le timer ${action.id}`, action),
        },
      });
      return;
    }
    
    // Table row selection - silent
    if (actionType === 'table-row-select') {
      sendMessage(`Sélection table: ligne ${action.payload.rowIndex}`, action);
      return;
    }
    
    // Alert actions - push to notifications!
    if (actionType === 'alert-action') {
      const alertVariant = action.payload.variant as string || 'info';
      const alertMessage = action.payload.message as string || 'Alerte';
      const notifType: NotificationType = 
        alertVariant === 'error' ? 'error' :
        alertVariant === 'warning' ? 'warning' :
        alertVariant === 'success' ? 'success' : 'alert';
      
      notify(alertMessage, notifType, 'high');
      sendMessage(`Action alerte: ${action.id}`, action);
      return;
    }
    
    // Other actions that might need manual confirmation
    if (actionType === 'list-select' || actionType === 'input-change') {
      // Store pending action for manual confirmation
      setState(prev => ({
        ...prev,
        pendingAction: action,
      }));
    } else {
      // Default: send action immediately
      const actionMessage = `Action: ${action.id} - ${JSON.stringify(action.payload)}`;
      sendMessage(actionMessage, action);
    }
  }, [sendMessage, notify]);

  // Confirm and send pending action with custom message
  const confirmAction = useCallback((customMessage?: string) => {
    if (!state.pendingAction) return;
    
    const message = customMessage || `Action: ${state.pendingAction.id}`;
    sendMessage(message, state.pendingAction);
  }, [state.pendingAction, sendMessage]);

  const reset = useCallback(() => {
    // Silent reset - no notification
    setState({
      messages: [],
      schema: null,
      thought: null,
      isLoading: false,
      isStreaming: false,
      error: null,
      pendingAction: null,
    });
  }, []);

  return {
    ...state,
    sendMessage,
    handleAction,
    confirmAction,
    reset,
    // Expose notify for external use (alerts from components)
    pushAlert: notify,
  };
}
