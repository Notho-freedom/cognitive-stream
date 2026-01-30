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
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export function useCognitiveChat() {
  const [state, setState] = useState<CognitiveChatState>({
    messages: [],
    schema: null,
    thought: null,
    isLoading: false,
    isStreaming: false,
    error: null,
  });

  const sendMessage = useCallback(async (input: string) => {
    const userMessage: Message = { role: 'user', content: input };
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      isStreaming: true,
      error: null,
      schema: null,
      thought: null,
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

  const handleAction = useCallback((action: ActionPayload) => {
    console.log('Action received:', action);
    // Can be extended to send actions back to the AI
  }, []);

  const reset = useCallback(() => {
    setState({
      messages: [],
      schema: null,
      thought: null,
      isLoading: false,
      isStreaming: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    sendMessage,
    handleAction,
    reset,
  };
}
