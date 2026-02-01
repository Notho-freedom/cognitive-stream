// ═══════════════════════════════════════════════════════════════
// OPENROUTER SERVICE
// Service pour accéder aux modèles OpenRouter (gratuits et premium)
// ═══════════════════════════════════════════════════════════════

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// ═══════════════════════════════════════════════════════════════
// MODÈLES GRATUITS OPENROUTER (TRÈS PERFORMANTS)
// ═══════════════════════════════════════════════════════════════

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  topProvider: string;
  isFree: boolean;
  priority: number;
}

export const FREE_OPENROUTER_MODELS: OpenRouterModel[] = [
  // === MODÈLES GRATUITS PREMIUM ===
  {
    id: 'liquid/lfm-2.5-1.2b-thinking:free',
    name: 'Liquid LFM 2.5 Thinking',
    description: 'Modèle de raisonnement avancé (1.2B params) avec chain-of-thought',
    contextLength: 32768,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Liquid AI',
    isFree: true,
    priority: 1, // Meilleur modèle gratuit pour le raisonnement
  },
  {
    id: 'liquid/lfm-2.5-1.2b:free',
    name: 'Liquid LFM 2.5',
    description: 'Version rapide sans thinking (1.2B params)',
    contextLength: 32768,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Liquid AI',
    isFree: true,
    priority: 2,
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash Experimental',
    description: 'Modèle expérimental ultra-rapide de Google',
    contextLength: 1000000,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Google',
    isFree: true,
    priority: 3, // Excellent pour le contexte long
  },
  {
    id: 'google/gemini-flash-1.5-8b-exp:free',
    name: 'Gemini Flash 1.5 8B Experimental',
    description: 'Version compacte de Gemini 1.5',
    contextLength: 1000000,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Google',
    isFree: true,
    priority: 4,
  },
  {
    id: 'google/gemini-exp-1206:free',
    name: 'Gemini Experimental 1206',
    description: 'Version expérimentale de Gemini avec nouvelles fonctionnalités',
    contextLength: 32768,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Google',
    isFree: true,
    priority: 5,
  },
  {
    id: 'meta-llama/llama-3.2-3b-instruct:free',
    name: 'Llama 3.2 3B Instruct',
    description: 'Modèle compact de Meta (3B params)',
    contextLength: 131072,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Meta',
    isFree: true,
    priority: 6,
  },
  {
    id: 'meta-llama/llama-3.2-1b-instruct:free',
    name: 'Llama 3.2 1B Instruct',
    description: 'Ultra-léger et rapide (1B params)',
    contextLength: 131072,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Meta',
    isFree: true,
    priority: 7,
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct:free',
    name: 'Llama 3.1 8B Instruct',
    description: 'Équilibre performance/rapidité (8B params)',
    contextLength: 131072,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Meta',
    isFree: true,
    priority: 8,
  },
  {
    id: 'meta-llama/llama-3-8b-instruct:free',
    name: 'Llama 3 8B Instruct',
    description: 'Version stable de Llama 3 (8B params)',
    contextLength: 8192,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Meta',
    isFree: true,
    priority: 9,
  },
  {
    id: 'mistralai/mistral-7b-instruct:free',
    name: 'Mistral 7B Instruct',
    description: 'Excellent modèle open-source de Mistral AI',
    contextLength: 32768,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Mistral AI',
    isFree: true,
    priority: 10,
  },
  {
    id: 'mistralai/mistral-nemo:free',
    name: 'Mistral Nemo',
    description: 'Modèle multilingue optimisé',
    contextLength: 131072,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Mistral AI',
    isFree: true,
    priority: 11,
  },
  {
    id: 'nousresearch/hermes-3-llama-3.1-405b:free',
    name: 'Hermes 3 Llama 405B',
    description: 'Modèle géant ultra-performant (405B params)',
    contextLength: 16384,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Nous Research',
    isFree: true,
    priority: 12, // Excellent mais plus lent
  },
  {
    id: 'qwen/qwen-2.5-7b-instruct:free',
    name: 'Qwen 2.5 7B Instruct',
    description: 'Modèle chinois performant multilingue',
    contextLength: 32768,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Alibaba',
    isFree: true,
    priority: 13,
  },
  {
    id: 'microsoft/phi-3-mini-128k-instruct:free',
    name: 'Phi-3 Mini 128K',
    description: 'Petit modèle de Microsoft avec grand contexte',
    contextLength: 128000,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Microsoft',
    isFree: true,
    priority: 14,
  },
  {
    id: 'microsoft/phi-3-medium-128k-instruct:free',
    name: 'Phi-3 Medium 128K',
    description: 'Version medium de Phi-3',
    contextLength: 128000,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Microsoft',
    isFree: true,
    priority: 15,
  },
  {
    id: 'huggingfaceh4/zephyr-7b-beta:free',
    name: 'Zephyr 7B Beta',
    description: 'Modèle conversationnel de HuggingFace',
    contextLength: 4096,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'HuggingFace',
    isFree: true,
    priority: 16,
  },
  {
    id: 'openchat/openchat-7b:free',
    name: 'OpenChat 7B',
    description: 'Modèle open-source optimisé pour le chat',
    contextLength: 8192,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'OpenChat',
    isFree: true,
    priority: 17,
  },
  {
    id: 'undi95/toppy-m-7b:free',
    name: 'Toppy M 7B',
    description: 'Merge de plusieurs modèles Mistral',
    contextLength: 4096,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Undi95',
    isFree: true,
    priority: 18,
  },
  {
    id: 'gryphe/mythomist-7b:free',
    name: 'MythoMist 7B',
    description: 'Optimisé pour storytelling et roleplay',
    contextLength: 32768,
    pricing: { prompt: '$0', completion: '$0' },
    topProvider: 'Gryphe',
    isFree: true,
    priority: 19,
  },
];

// ═══════════════════════════════════════════════════════════════
// MODÈLES PREMIUM (PAYANTS - EXCELLENTE QUALITÉ)
// ═══════════════════════════════════════════════════════════════

export const PREMIUM_OPENROUTER_MODELS: OpenRouterModel[] = [
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Le meilleur modèle d\'Anthropic',
    contextLength: 200000,
    pricing: { prompt: '$3/M tokens', completion: '$15/M tokens' },
    topProvider: 'Anthropic',
    isFree: false,
    priority: 1,
  },
  {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Modèle le plus capable d\'OpenAI',
    contextLength: 128000,
    pricing: { prompt: '$10/M tokens', completion: '$30/M tokens' },
    topProvider: 'OpenAI',
    isFree: false,
    priority: 2,
  },
  {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    description: 'Modèle premium de Google',
    contextLength: 1000000,
    pricing: { prompt: '$1.25/M tokens', completion: '$5/M tokens' },
    topProvider: 'Google',
    isFree: false,
    priority: 3,
  },
  {
    id: 'meta-llama/llama-3.1-405b-instruct',
    name: 'Llama 3.1 405B Instruct',
    description: 'Le plus grand modèle de Meta',
    contextLength: 131072,
    pricing: { prompt: '$2.75/M tokens', completion: '$2.75/M tokens' },
    topProvider: 'Meta',
    isFree: false,
    priority: 4,
  },
];

// ═══════════════════════════════════════════════════════════════
// SERVICE OPENROUTER
// ═══════════════════════════════════════════════════════════════

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenRouterStreamChunk {
  id: string;
  choices: Array<{
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }>;
  model: string;
}

/**
 * Appelle OpenRouter avec streaming
 */
export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  } = {}
): Promise<{
  success: boolean;
  stream?: ReadableStream<Uint8Array>;
  model: string;
  error?: string;
}> {
  const model = options.model || FREE_OPENROUTER_MODELS[0].id;
  
  try {
    // Préparer les messages avec system prompt
    const fullMessages: OpenRouterMessage[] = options.systemPrompt
      ? [{ role: 'system', content: options.systemPrompt }, ...messages]
      : messages;
    
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Cognitive Stream - Neural Interface',
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        stream: true,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OpenRouter] HTTP ${response.status}:`, errorText);
      return {
        success: false,
        model,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    if (!response.body) {
      return {
        success: false,
        model,
        error: 'No response body',
      };
    }

    console.log(`[OpenRouter] Success with model: ${model}`);
    
    return {
      success: true,
      stream: response.body,
      model,
    };
  } catch (error) {
    console.error('[OpenRouter] Error:', error);
    return {
      success: false,
      model,
      error: String(error),
    };
  }
}

/**
 * Essaie plusieurs modèles gratuits jusqu'à ce qu'un fonctionne
 */
export async function callOpenRouterWithFallback(
  messages: OpenRouterMessage[],
  options: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<{
  success: boolean;
  stream?: ReadableStream<Uint8Array>;
  model: string;
  error?: string;
}> {
  // Essayer les modèles gratuits par ordre de priorité
  for (const modelConfig of FREE_OPENROUTER_MODELS) {
    console.log(`[OpenRouter] Trying ${modelConfig.name}...`);
    
    const result = await callOpenRouter(messages, {
      ...options,
      model: modelConfig.id,
    });
    
    if (result.success) {
      return result;
    }
    
    console.warn(`[OpenRouter] ${modelConfig.name} failed:`, result.error);
    
    // Petit délai entre les tentatives
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return {
    success: false,
    model: 'none',
    error: 'All OpenRouter models failed',
  };
}

/**
 * Parse le stream SSE d'OpenRouter
 */
export async function parseOpenRouterStream(
  stream: ReadableStream<Uint8Array>,
  onChunk: (content: string) => void
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  try {
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
          const parsed: OpenRouterStreamChunk = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            onChunk(content);
          }
        } catch {
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullContent;
}

/**
 * Fonction utilitaire complète : appelle et parse
 */
export async function speakWithOpenRouter(
  messages: OpenRouterMessage[],
  onChunk: (content: string) => void,
  options: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    useFallback?: boolean;
  } = {}
): Promise<{
  success: boolean;
  fullContent: string;
  model: string;
  error?: string;
}> {
  const result = options.useFallback
    ? await callOpenRouterWithFallback(messages, options)
    : await callOpenRouter(messages, options);

  if (!result.success || !result.stream) {
    return {
      success: false,
      fullContent: '',
      model: result.model,
      error: result.error,
    };
  }

  try {
    const fullContent = await parseOpenRouterStream(result.stream, onChunk);
    
    return {
      success: true,
      fullContent,
      model: result.model,
    };
  } catch (error) {
    return {
      success: false,
      fullContent: '',
      model: result.model,
      error: String(error),
    };
  }
}
