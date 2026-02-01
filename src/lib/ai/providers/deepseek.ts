// ═══════════════════════════════════════════════════════════════
// DEEPSEEK PROVIDER
// Provider IA utilisant l'API DeepSeek
// ═══════════════════════════════════════════════════════════════

import type { AIMessage, AIStreamResult, AIProviderConfig } from '../types';

const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

const DEEPSEEK_MODEL = 'deepseek-chat';

export async function isDeepSeekAvailable(): Promise<boolean> {
  return !!DEEPSEEK_API_KEY && DEEPSEEK_API_KEY.length > 10;
}

export async function streamDeepSeek(
  messages: AIMessage[],
  systemPrompt: string,
  onChunk: (chunk: string) => void
): Promise<AIStreamResult> {
  if (!DEEPSEEK_API_KEY) {
    return {
      success: false,
      fullContent: '',
      model: DEEPSEEK_MODEL,
      provider: 'deepseek',
      error: 'DEEPSEEK_API_KEY not configured',
    };
  }

  try {
    const response = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
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
      return {
        success: false,
        fullContent: '',
        model: DEEPSEEK_MODEL,
        provider: 'deepseek',
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
        model: DEEPSEEK_MODEL,
        provider: 'deepseek',
        error: `HTTP ${response.status}: ${errorText}`,
        status: response.status,
      };
    }

    if (!response.body) {
      return {
        success: false,
        fullContent: '',
        model: DEEPSEEK_MODEL,
        provider: 'deepseek',
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

    console.log(`[DeepSeek] Success`);

    return {
      success: true,
      fullContent,
      model: DEEPSEEK_MODEL,
      provider: 'deepseek',
    };
  } catch (error) {
    return {
      success: false,
      fullContent: '',
      model: DEEPSEEK_MODEL,
      provider: 'deepseek',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const deepSeekProvider: AIProviderConfig = {
  name: 'deepseek',
  priority: 3,
  isAvailable: isDeepSeekAvailable,
  stream: streamDeepSeek,
};
