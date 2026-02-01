// ═══════════════════════════════════════════════════════════════
// AI PROVIDER TYPES
// Types communs pour tous les providers IA
// ═══════════════════════════════════════════════════════════════

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIStreamResult {
  success: boolean;
  fullContent: string;
  model: string;
  provider: string;
  error?: string;
  isRateLimit?: boolean;
  status?: number;
}

export interface AIProviderConfig {
  name: string;
  priority: number; // Plus bas = plus prioritaire
  isAvailable: () => Promise<boolean>;
  stream: (
    messages: AIMessage[],
    systemPrompt: string,
    onChunk: (chunk: string) => void
  ) => Promise<AIStreamResult>;
}

export interface OrchestratorConfig {
  maxRetries: number;
  retryDelayMs: number;
  enableLocalFallback: boolean;
}
