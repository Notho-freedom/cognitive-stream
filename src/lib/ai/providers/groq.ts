// ═══════════════════════════════════════════════════════════════
// GROQ PROVIDER
// Provider IA utilisant l'API Groq (ultra-rapide)
// ═══════════════════════════════════════════════════════════════

import type { AIMessage, AIStreamResult, AIProviderConfig } from '../types';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// Modèles par ordre de priorité (plus légers = moins de rate-limit)
const GROQ_MODELS = [
  // Heavy reasoning
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  
  // Balanced
  "qwen/qwen3-32b",
  "groq/compound",
  "moonshotai/kimi-k2-instruct",
  "moonshotai/kimi-k2-instruct-0905",
  "canopylabs/orpheus-v1-english",

  // Fast UI
  "llama-3.1-8b-instant",
  "groq/compound-mini",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
] as const;

export async function isGroqAvailable(): Promise<boolean> {
  return !!GROQ_API_KEY && GROQ_API_KEY.length > 10;
}

export async function streamGroq(
  messages: AIMessage[],
  systemPrompt: string,
  onChunk: (chunk: string) => void,
  modelIndex = 0
): Promise<AIStreamResult> {
  if (!GROQ_API_KEY) {
    return {
      success: false,
      fullContent: '',
      model: 'none',
      provider: 'groq',
      error: 'GROQ_API_KEY not configured',
    };
  }

  const model = GROQ_MODELS[modelIndex] || GROQ_MODELS[0];

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
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
      if (modelIndex + 1 < GROQ_MODELS.length) {
        console.warn(`[Groq] Rate limit on ${model}, trying next...`);
        return streamGroq(messages, systemPrompt, onChunk, modelIndex + 1);
      }
      return {
        success: false,
        fullContent: '',
        model,
        provider: 'groq',
        error: 'Rate limit exceeded',
        isRateLimit: true,
        status: 429,
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        fullContent: '',
        model,
        provider: 'groq',
        error: `HTTP ${response.status}: ${errorText}`,
        status: response.status,
      };
    }

    if (!response.body) {
      return {
        success: false,
        fullContent: '',
        model,
        provider: 'groq',
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

    console.log(`[Groq] Success with ${model}`);

    return {
      success: true,
      fullContent,
      model,
      provider: 'groq',
    };
  } catch (error) {
    return {
      success: false,
      fullContent: '',
      model,
      provider: 'groq',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const groqProvider: AIProviderConfig = {
  name: 'groq',
  priority: 1,
  isAvailable: isGroqAvailable,
  stream: streamGroq,
};
