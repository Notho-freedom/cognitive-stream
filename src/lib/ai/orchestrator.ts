// ═══════════════════════════════════════════════════════════════
// AI ORCHESTRATOR
// Orchestre les providers IA avec fallback en cascade
// Architecture en escalier: Groq → OpenRouter → DeepSeek → Poe → Lovable → Ollama
// ═══════════════════════════════════════════════════════════════

import type { AIMessage, AIStreamResult, AIProviderConfig } from './types';
import {
  groqProvider,
  openRouterProvider,
  deepSeekProvider,
  poeProvider,
  lovableProvider,
  ollamaProvider,
  isElectronEnvironment,
} from './providers';

// Ordre de priorité des providers (du plus prioritaire au moins prioritaire)
const PROVIDER_CASCADE: AIProviderConfig[] = [
  groqProvider,        // 1. Groq - Ultra rapide, gratuit
  openRouterProvider,  // 2. OpenRouter - Beaucoup de modèles gratuits
  deepSeekProvider,    // 3. DeepSeek - Bon rapport qualité/prix
  poeProvider,         // 4. Poe - Accès à Claude/GPT-4
  lovableProvider,     // 5. Lovable Cloud - Backup cloud
  ollamaProvider,      // 6. Ollama Local - DERNIER RECOURS (Electron only)
];

interface OrchestratorOptions {
  enableLocalFallback?: boolean; // Autoriser Ollama (défaut: true si Electron)
  maxRetries?: number;           // Nombre de tentatives par provider
  retryDelayMs?: number;         // Délai entre tentatives
  preferredProvider?: string;    // Provider préféré à essayer en premier
  onProviderChange?: (provider: string, model: string) => void;
  onProviderError?: (provider: string, error: string) => void;
}

export interface OrchestratorResult extends AIStreamResult {
  triedProviders: string[];
  finalProvider: string;
}

/**
 * Orchestre l'appel aux providers IA avec fallback en cascade
 */
export async function orchestrateAI(
  messages: AIMessage[],
  systemPrompt: string,
  onChunk: (chunk: string) => void,
  options: OrchestratorOptions = {}
): Promise<OrchestratorResult> {
  const {
    enableLocalFallback = isElectronEnvironment(),
    maxRetries = 1,
    retryDelayMs = 500,
    preferredProvider,
    onProviderChange,
    onProviderError,
  } = options;

  const triedProviders: string[] = [];
  let lastError = 'All providers failed';
  let lastStatus = 503;

  // Réorganiser si provider préféré
  let providers = [...PROVIDER_CASCADE];
  if (preferredProvider) {
    const preferred = providers.find(p => p.name === preferredProvider);
    if (preferred) {
      providers = [preferred, ...providers.filter(p => p.name !== preferredProvider)];
    }
  }

  // Filtrer Ollama si on n'est pas en Electron
  if (!enableLocalFallback) {
    providers = providers.filter(p => p.name !== 'ollama-local');
  }

  for (const provider of providers) {
    // Vérifier si le provider est disponible
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      console.log(`[Orchestrator] ${provider.name} not available, skipping`);
      continue;
    }

    triedProviders.push(provider.name);

    // Essayer ce provider (avec retry si configuré)
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      console.log(`[Orchestrator] Trying ${provider.name} (attempt ${attempt + 1}/${maxRetries})`);

      try {
        const result = await provider.stream(messages, systemPrompt, onChunk);

        if (result.success) {
          onProviderChange?.(provider.name, result.model);
          
          return {
            ...result,
            triedProviders,
            finalProvider: provider.name,
          };
        }

        // Échec mais pas rate limit - ne pas réessayer
        if (!result.isRateLimit) {
          lastError = result.error || 'Unknown error';
          lastStatus = result.status || 503;
          onProviderError?.(provider.name, lastError);
          break;
        }

        // Rate limit - attendre et réessayer
        console.warn(`[Orchestrator] ${provider.name} rate limited, waiting...`);
        await new Promise(r => setTimeout(r, retryDelayMs));

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        onProviderError?.(provider.name, lastError);
        break;
      }
    }

    // Petit délai entre providers
    await new Promise(r => setTimeout(r, 200));
  }

  // Tous les providers ont échoué
  return {
    success: false,
    fullContent: '',
    model: 'none',
    provider: 'none',
    error: lastError,
    status: lastStatus,
    triedProviders,
    finalProvider: 'none',
  };
}

/**
 * Vérifie quels providers sont disponibles
 */
export async function getAvailableProviders(): Promise<string[]> {
  const available: string[] = [];
  
  for (const provider of PROVIDER_CASCADE) {
    if (await provider.isAvailable()) {
      available.push(provider.name);
    }
  }
  
  return available;
}

/**
 * Retourne les infos sur les providers
 */
export function getProviderInfo() {
  return PROVIDER_CASCADE.map(p => ({
    name: p.name,
    priority: p.priority,
  }));
}
