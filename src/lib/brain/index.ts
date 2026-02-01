// ═══════════════════════════════════════════════════════════════
// COGNITIVE BRAIN MODULE - INDEX
// Export centralisé du cerveau cognitif
// ═══════════════════════════════════════════════════════════════

// Core Brain
export { CognitiveBrain, createCognitiveBrain } from './CognitiveBrain';

// Types
export type {
  CognitiveEvent,
  CognitiveEventSource,
  CognitiveEventType,
  CognitiveTask,
  TaskStatus,
  MentalState,
  BrainMode,
  Goal,
  Thought,
  Plan,
  PlanStep,
  WorkingMemory,
  Episode,
  EpisodicMemory,
  SemanticMemory,
  BrainConfig,
  BrainCallbacks,
  Message,
  AgentType,
  Agent,
  AgentResult,
} from './types';

// Utilities
export { generateId, createEvent, createTask } from './types';

// Agents
export * from './agents';
