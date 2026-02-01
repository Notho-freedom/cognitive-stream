// ═══════════════════════════════════════════════════════════════
// POE PROVIDER
// Provider IA utilisant l'API Poe (compatible OpenAI)
// ═══════════════════════════════════════════════════════════════

import type { AIMessage, AIStreamResult, AIProviderConfig } from '../types';

const POE_API_KEY = import.meta.env.VITE_POE_API_KEY || '';
const POE_ENDPOINT = 'https://api.poe.com/v1/chat/completions';

// Modèles disponibles sur Poe
const POE_MODELS = [
  'Claude-3.5-Sonnet',
  'GPT-4o',
  'Claude-3-Opus',
  'Gemini-1.5-Pro',
] as const;

export async function isPoeAvailable(): Promise<boolean> {
  return !!POE_API_KEY && POE_API_KEY.length > 10;
}

export async function streamPoe(
  messages: AIMessage[],
  systemPrompt: string,
  onChunk: (chunk: string) => void,
  modelIndex = 0
): Promise<AIStreamResult> {
  if (!POE_API_KEY) {
    return {
      success: false,
      fullContent: '',
      model: 'none',
      provider: 'poe',
      error: 'POE_API_KEY not configured',
    };
  }

  const model = POE_MODELS[modelIndex] || POE_MODELS[0];

  try {
    const response = await fetch(POE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (response.status === 429) {
      // Rate limit - essayer le modèle suivant
      if (modelIndex + 1 < POE_MODELS.length) {
        console.warn(`[Poe] Rate limit on ${model}, trying next...`);
        return streamPoe(messages, systemPrompt, onChunk, modelIndex + 1);
      }
      return {
        success: false,
        fullContent: '',
        model,
        provider: 'poe',
        error: 'Rate limit exceeded',
        isRateLimit: true,
        status: 429,
      };
    }

    if (!response.ok) {
      // Essayer le modèle suivant sur erreur
      if (modelIndex + 1 < POE_MODELS.length) {
        console.warn(`[Poe] ${model} failed, trying next...`);
        return streamPoe(messages, systemPrompt, onChunk, modelIndex + 1);
      }
      const errorText = await response.text();
      return {
        success: false,
        fullContent: '',
        model,
        provider: 'poe',
        error: `HTTP ${response.status}: ${errorText}`,
        status: response.status,
      };
    }

    if (!response.body) {
      return {
        success: false,
        fullContent: '',
        model,
        provider: 'poe',
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

    console.log(`[Poe] Success with ${model}`);

    return {
      success: true,
      fullContent,
      model,
      provider: 'poe',
    };
  } catch (error) {
    // Essayer le modèle suivant sur exception
    if (modelIndex + 1 < POE_MODELS.length) {
      console.warn(`[Poe] Exception on ${model}, trying next...`);
      return streamPoe(messages, systemPrompt, onChunk, modelIndex + 1);
    }
    return {
      success: false,
      fullContent: '',
      model,
      provider: 'poe',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const poeProvider: AIProviderConfig = {
  name: 'poe',
  priority: 4,
  isAvailable: isPoeAvailable,
  stream: streamPoe,
};
