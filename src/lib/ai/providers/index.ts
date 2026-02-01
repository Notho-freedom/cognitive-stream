// ═══════════════════════════════════════════════════════════════
// AI PROVIDERS INDEX
// Export centralisé de tous les providers IA
// ═══════════════════════════════════════════════════════════════

export { groqProvider, isGroqAvailable, streamGroq } from './groq';
export { openRouterProvider, isOpenRouterAvailable, streamOpenRouter } from './openrouter';
export { deepSeekProvider, isDeepSeekAvailable, streamDeepSeek } from './deepseek';
export { poeProvider, isPoeAvailable, streamPoe } from './poe';
export { lovableProvider, isLovableAvailable, streamLovable } from './lovable';
export { 
  ollamaProvider, 
  isOllamaAvailable, 
  streamOllama, 
  isElectronEnvironment,
  getSystemContext 
} from './ollama';

export type { AIProviderConfig } from '../types';
