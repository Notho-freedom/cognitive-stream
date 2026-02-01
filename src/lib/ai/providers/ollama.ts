// ═══════════════════════════════════════════════════════════════
// OLLAMA PROVIDER (LOCAL)
// Provider IA utilisant Ollama en local (Electron uniquement)
// DERNIER RECOURS - utilisé uniquement quand tous les autres échouent
// ═══════════════════════════════════════════════════════════════

import type { AIMessage, AIStreamResult, AIProviderConfig } from '../types';

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/chat';
const OLLAMA_MODELS = ['llama3.2:3b', 'llama3.2:1b', 'llama3:8b', 'mistral'] as const;

interface OllamaStreamChunk {
  message?: { content: string };
  done: boolean;
}

/**
 * Vérifie si on est dans un environnement Electron
 */
export function isElectronEnvironment(): boolean {
  return !!(window as unknown as { cognitiveBridge?: unknown }).cognitiveBridge;
}

/**
 * Vérifie si Ollama est disponible localement
 */
export async function isOllamaAvailable(): Promise<boolean> {
  if (!isElectronEnvironment()) return false;

  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Récupère le contexte système via le bridge Electron
 */
export async function getSystemContext(): Promise<Record<string, unknown> | undefined> {
  const bridge = (window as unknown as {
    cognitiveBridge?: {
      getSystemInfo: () => Promise<Record<string, unknown>>;
    };
  }).cognitiveBridge;

  if (!bridge?.getSystemInfo) return undefined;

  try {
    return await bridge.getSystemInfo();
  } catch {
    return undefined;
  }
}

export async function streamOllama(
  messages: AIMessage[],
  systemPrompt: string,
  onChunk: (chunk: string) => void,
  modelIndex = 0
): Promise<AIStreamResult> {
  if (!isElectronEnvironment()) {
    return {
      success: false,
      fullContent: '',
      model: 'none',
      provider: 'ollama-local',
      error: 'Not in Electron environment',
    };
  }

  const model = OLLAMA_MODELS[modelIndex] || OLLAMA_MODELS[0];

  try {
    // Enrichir le system prompt avec le contexte système
    const systemContext = await getSystemContext();
    let enrichedPrompt = systemPrompt;
    
    if (systemContext) {
      enrichedPrompt += `\n\n[CONTEXTE SYSTÈME]
Plateforme: ${systemContext.platform || 'inconnu'}
Architecture: ${systemContext.arch || 'inconnu'}
Hostname: ${systemContext.hostname || 'inconnu'}
Utilisateur: ${systemContext.username || 'inconnu'}
Home: ${systemContext.homedir || 'inconnu'}
CPUs: ${systemContext.cpus || 'inconnu'}
Mémoire: ${systemContext.memory ? JSON.stringify(systemContext.memory) : 'inconnu'}
`;
    }

    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: enrichedPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      // Essayer le modèle suivant
      if (modelIndex + 1 < OLLAMA_MODELS.length) {
        console.warn(`[Ollama] ${model} failed, trying next...`);
        return streamOllama(messages, systemPrompt, onChunk, modelIndex + 1);
      }
      const errorText = await response.text();
      return {
        success: false,
        fullContent: '',
        model,
        provider: 'ollama-local',
        error: `HTTP ${response.status}: ${errorText}`,
        status: response.status,
      };
    }

    if (!response.body) {
      return {
        success: false,
        fullContent: '',
        model,
        provider: 'ollama-local',
        error: 'No response body',
      };
    }

    // Parse NDJSON stream (format Ollama)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Ollama retourne du NDJSON (une ligne JSON par chunk)
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const data: OllamaStreamChunk = JSON.parse(line);
          if (data.message?.content) {
            fullContent += data.message.content;
            onChunk(data.message.content);
          }
        } catch {
          // Ignorer les lignes mal formées
        }
      }
    }

    // Traiter le buffer restant
    if (buffer.trim()) {
      try {
        const data: OllamaStreamChunk = JSON.parse(buffer);
        if (data.message?.content) {
          fullContent += data.message.content;
          onChunk(data.message.content);
        }
      } catch {
        // Ignorer
      }
    }

    console.log(`[Ollama] Success with ${model}`);

    return {
      success: true,
      fullContent,
      model,
      provider: 'ollama-local',
    };
  } catch (error) {
    // Essayer le modèle suivant sur exception
    if (modelIndex + 1 < OLLAMA_MODELS.length) {
      console.warn(`[Ollama] Exception on ${model}, trying next...`);
      return streamOllama(messages, systemPrompt, onChunk, modelIndex + 1);
    }
    return {
      success: false,
      fullContent: '',
      model,
      provider: 'ollama-local',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const ollamaProvider: AIProviderConfig = {
  name: 'ollama-local',
  priority: 99, // Dernier recours
  isAvailable: isOllamaAvailable,
  stream: streamOllama,
};
