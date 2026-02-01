// ═══════════════════════════════════════════════════════════════
// OLLAMA LOCAL SERVICE
// Service pour appeler Ollama directement depuis Electron
// Utilisé UNIQUEMENT comme fallback final quand la cloud function échoue
// ═══════════════════════════════════════════════════════════════

import ELECTRON_SYSTEM_PROMPT from './electronSystemPrompt';

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'llama3.2:3b';

interface OllamaResponse {
  response: string;
  model: string;
  done: boolean;
  context?: number[];
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface SystemContext {
  platform?: string;
  arch?: string;
  hostname?: string;
  username?: string;
  homedir?: string;
  cpus?: number;
  memory?: { total: number; free: number };
  uptime?: number;
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
 * Construit le prompt système avec le contexte Electron
 */
function buildSystemPromptWithContext(systemContext?: SystemContext): string {
  let contextSection = '';
  
  if (systemContext) {
    contextSection = `
═══════════════════════════════════════════════════════════════════════════════
🖥️ CONTEXTE SYSTÈME ACTUEL
═══════════════════════════════════════════════════════════════════════════════

Tu es exécuté dans un environnement Electron avec accès COMPLET au système.

INFORMATIONS SYSTÈME:
• Plateforme: ${systemContext.platform || 'inconnue'}
• Architecture: ${systemContext.arch || 'inconnue'}
• Nom d'hôte: ${systemContext.hostname || 'inconnu'}
• Utilisateur: ${systemContext.username || 'inconnu'}
• Répertoire home: ${systemContext.homedir || 'inconnu'}
• CPUs: ${systemContext.cpus || 'inconnu'}
• Mémoire totale: ${systemContext.memory ? Math.round(systemContext.memory.total / 1024 / 1024 / 1024) + ' GB' : 'inconnue'}
• Mémoire libre: ${systemContext.memory ? Math.round(systemContext.memory.free / 1024 / 1024 / 1024) + ' GB' : 'inconnue'}
• Uptime: ${systemContext.uptime ? Math.round(systemContext.uptime / 60) + ' minutes' : 'inconnu'}
. Informations completes à exploité au besoin pour plus de details: ${systemContext}
`;
  }
  
  return ELECTRON_SYSTEM_PROMPT.replace('{{CONTEXT_PLACEHOLDER}}', contextSection);
}

/**
 * Récupère les informations système via le bridge Electron
 */
export async function getSystemContext(): Promise<SystemContext | undefined> {
  const bridge = (window as unknown as { cognitiveBridge?: {
    getSystemInfo: () => Promise<SystemContext>;
  } }).cognitiveBridge;
  
  if (!bridge?.getSystemInfo) return undefined;
  
  try {
    return await bridge.getSystemInfo();
  } catch {
    return undefined;
  }
}

/**
 * Appelle Ollama localement avec streaming simulé
 * @param messages - Historique des messages
 * @param onChunk - Callback pour chaque chunk de texte
 * @param systemContext - Contexte système optionnel
 */
export async function callOllamaLocal(
  messages: Message[],
  onChunk: (chunk: string) => void,
  systemContext?: SystemContext
): Promise<{
  success: boolean;
  fullResponse: string;
  error?: string;
  model: string;
  provider: string;
}> {
  // Construire le prompt avec contexte système
  const systemPrompt = buildSystemPromptWithContext(systemContext);
  
  // Combiner les messages en un prompt
  const conversationHistory = messages.map(m => {
    if (m.role === 'user') return `User: ${m.content}`;
    if (m.role === 'assistant') return `Assistant: ${m.content}`;
    return '';
  }).filter(Boolean).join('\n\n');
  
  const fullPrompt = `${systemPrompt}\n\n${conversationHistory}\n\nAssistant:`;
  
  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: fullPrompt,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        fullResponse: '',
        error: `Ollama error ${response.status}: ${errorText}`,
        model: OLLAMA_MODEL,
        provider: OLLAMA_MODEL,
      };
    }
    
    if (!response.body) {
      return {
        success: false,
        fullResponse: '',
        error: 'No response body from Ollama',
        model: OLLAMA_MODEL,
        provider: OLLAMA_MODEL,
      };
    }
    
    // Lire le stream Ollama (format NDJSON)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Ollama retourne du NDJSON (une ligne JSON par chunk)
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Garder le reste incomplet
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const data: OllamaResponse = JSON.parse(line);
          if (data.response) {
            fullResponse += data.response;
            onChunk(data.response);
          }
        } catch {
          // Ignorer les lignes mal formées
        }
      }
    }
    
    // Traiter le buffer restant
    if (buffer.trim()) {
      try {
        const data: OllamaResponse = JSON.parse(buffer);
        if (data.response) {
          fullResponse += data.response;
          onChunk(data.response);
        }
      } catch {
        // Ignorer
      }
    }
    
    return {
      success: true,
      fullResponse,
      model: OLLAMA_MODEL,
      provider: OLLAMA_MODEL,
    };
  } catch (error) {
    return {
      success: false,
      fullResponse: '',
      error: error instanceof Error ? error.message : 'Unknown Ollama error',
      model: OLLAMA_MODEL,
      provider: OLLAMA_MODEL,
    };
  }
}
