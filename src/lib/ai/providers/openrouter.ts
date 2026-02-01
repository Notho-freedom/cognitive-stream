// ═══════════════════════════════════════════════════════════════
// OPENROUTER PROVIDER
// Provider IA utilisant OpenRouter (modèles gratuits)
// ═══════════════════════════════════════════════════════════════

import type { AIMessage, AIStreamResult, AIProviderConfig } from '../types';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Modèles gratuits par ordre de priorité
const OPENROUTER_MODELS = [
  'liquid/lfm-2.5-1.2b-thinking:free',
  'liquid/lfm-2.5-1.2b:free',
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
] as const;

export async function isOpenRouterAvailable(): Promise<boolean> {
  return !!OPENROUTER_API_KEY && OPENROUTER_API_KEY.length > 10;
}

export async function streamOpenRouter(
  messages: AIMessage[],
  systemPrompt: string,
  onChunk: (chunk: string) => void,
  modelIndex = 0
): Promise<AIStreamResult> {
  if (!OPENROUTER_API_KEY) {
    return {
      success: false,
      fullContent: '',
      model: 'none',
      provider: 'openrouter',
      error: 'OPENROUTER_API_KEY not configured',
    };
  }

  const model = OPENROUTER_MODELS.slice().reverse()[modelIndex] || OPENROUTER_MODELS.slice().reverse()[0];

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Cognitive Stream - Neural Interface',
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
      if (modelIndex + 1 < OPENROUTER_MODELS.length) {
        console.warn(`[OpenRouter] Rate limit on ${model}, trying next...`);
        await new Promise(r => setTimeout(r, 500));
        return streamOpenRouter(messages, systemPrompt, onChunk, modelIndex + 1);
      }
      return {
        success: false,
        fullContent: '',
        model,
        provider: 'openrouter',
        error: 'Rate limit exceeded',
        isRateLimit: true,
        status: 429,
      };
    }

    if (!response.ok) {
      // Essayer le modèle suivant sur erreur
      if (modelIndex + 1 < OPENROUTER_MODELS.length) {
        console.warn(`[OpenRouter] ${model} failed, trying next...`);
        return streamOpenRouter(messages, systemPrompt, onChunk, modelIndex + 1);
      }
      const errorText = await response.text();
      return {
        success: false,
        fullContent: '',
        model,
        provider: 'openrouter',
        error: `HTTP ${response.status}: ${errorText}`,
        status: response.status,
      };
    }

    if (!response.body) {
      return {
        success: false,
        fullContent: '',
        model,
        provider: 'openrouter',
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

    console.log(`[OpenRouter] Success with ${model}`);

    return {
      success: true,
      fullContent,
      model,
      provider: 'openrouter',
    };
  } catch (error) {
    // Essayer le modèle suivant sur exception
    if (modelIndex + 1 < OPENROUTER_MODELS.length) {
      console.warn(`[OpenRouter] Exception on ${model}, trying next...`);
      return streamOpenRouter(messages, systemPrompt, onChunk, modelIndex + 1);
    }
    return {
      success: false,
      fullContent: '',
      model,
      provider: 'openrouter',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const openRouterProvider: AIProviderConfig = {
  name: 'openrouter',
  priority: 2,
  isAvailable: isOpenRouterAvailable,
  stream: streamOpenRouter,
};
