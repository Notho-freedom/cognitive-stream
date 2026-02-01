// ═══════════════════════════════════════════════════════════════
// LOVABLE AI PROVIDER (CLOUD FUNCTION)
// Provider utilisant la cloud function qui appelle Lovable AI Gateway
// C'est le SEUL provider qui reste dans la cloud function
// ═══════════════════════════════════════════════════════════════

import type { AIMessage, AIStreamResult, AIProviderConfig } from '../types';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export async function isLovableAvailable(): Promise<boolean> {
  // La cloud function est toujours potentiellement disponible
  return !!import.meta.env.VITE_SUPABASE_URL;
}

export async function streamLovable(
  messages: AIMessage[],
  systemPrompt: string,
  onChunk: (chunk: string) => void
): Promise<AIStreamResult> {
  try {
    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages,
        systemPrompt,
      }),
    });

    const aiProvider = response.headers.get('X-AI-Provider') || 'lovable';
    const aiModel = response.headers.get('X-AI-Model') || 'unknown';

    if (response.status === 429) {
      return {
        success: false,
        fullContent: '',
        model: aiModel,
        provider: aiProvider,
        error: 'Rate limit exceeded',
        isRateLimit: true,
        status: 429,
      };
    }

    if (response.status === 402) {
      return {
        success: false,
        fullContent: '',
        model: aiModel,
        provider: aiProvider,
        error: 'Payment required',
        status: 402,
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        fullContent: '',
        model: aiModel,
        provider: aiProvider,
        error: `HTTP ${response.status}: ${errorText}`,
        status: response.status,
      };
    }

    if (!response.body) {
      return {
        success: false,
        fullContent: '',
        model: aiModel,
        provider: aiProvider,
        error: 'No response body',
      };
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            onChunk(content);
          }
        } catch {
          // Incomplete JSON, continue
        }
      }
    }

    console.log(`[Lovable Cloud] Success with ${aiModel} via ${aiProvider}`);

    return {
      success: true,
      fullContent,
      model: aiModel,
      provider: aiProvider,
    };
  } catch (error) {
    return {
      success: false,
      fullContent: '',
      model: 'unknown',
      provider: 'lovable-cloud',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const lovableProvider: AIProviderConfig = {
  name: 'lovable-cloud',
  priority: 5, // Utilisé si les providers locaux échouent
  isAvailable: isLovableAvailable,
  stream: streamLovable,
};
