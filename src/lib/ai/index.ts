// ═══════════════════════════════════════════════════════════════
// AI MODULE INDEX
// Export centralisé du module IA
// ═══════════════════════════════════════════════════════════════

// Types
export type { AIMessage, AIStreamResult, AIProviderConfig, OrchestratorConfig } from './types';

// Orchestrateur
export { orchestrateAI, getAvailableProviders, getProviderInfo } from './orchestrator';
export type { OrchestratorResult } from './orchestrator';

// Providers individuels (pour usage direct si besoin)
export * from './providers';
