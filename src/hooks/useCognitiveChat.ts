import { useState, useCallback } from 'react';
import type { CognitiveUISchema, ActionPayload } from '@/components/cognitive/dynamic/types';

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
  pendingAction: ActionPayload | null; // Action en attente de confirmation manuelle
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

// Déterminer si une action nécessite une confirmation manuelle
function requiresManualConfirmation(action: ActionPayload): boolean {
  const actionType = action.payload.actionType as string;
  
  // Actions qui nécessitent un input supplémentaire
  const manualActions = ['list-select', 'input-change'];
  
  return manualActions.includes(actionType);
}

export function useCognitiveChat() {
  const [state, setState] = useState<CognitiveChatState>({
    messages: [],
    schema: null,
    thought: null,
    isLoading: false,
    isStreaming: false,
    error: null,
    pendingAction: null,
  });

  const sendMessage = useCallback(async (input: string, action?: ActionPayload) => {
    // Construire le message utilisateur
    let messageContent = input;
    
    // Si une action est fournie, l'inclure dans le message
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
      pendingAction: null, // Effacer l'action en attente
    }));

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
          throw new Error('Rate limit exceeded. Please try again later.');
        }
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
      }

      const assistantMessage: Message = { role: 'assistant', content: fullContent };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        thought: parsedResponse?.thought || null,
        schema: parsedResponse?.response?.schema || null,
        isLoading: false,
        isStreaming: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [state.messages]);

  // Gérer les actions des composants
  const handleAction = useCallback((action: ActionPayload) => {
    console.log('Action received:', action);
    
    // Déterminer si l'action nécessite une confirmation manuelle
    if (requiresManualConfirmation(action)) {
      // Stocker l'action en attente pour envoi manuel
      setState(prev => ({
        ...prev,
        pendingAction: action,
      }));
    } else {
      // Envoyer automatiquement les actions de type bouton, choix, etc.
      const actionMessage = `Action: ${action.id} - ${JSON.stringify(action.payload)}`;
      sendMessage(actionMessage, action);
    }
  }, [sendMessage]);

  // Confirmer et envoyer une action en attente avec un message personnalisé
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
  };
}
