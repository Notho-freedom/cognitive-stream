// ═══════════════════════════════════════════════════════════════
// COGNITIVE BRAIN - TYPE DEFINITIONS
// Architecture mentale: événements, états, tâches, mémoire
// ═══════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────
// COGNITIVE EVENTS - Tout ce qui entre dans le cerveau
// ──────────────────────────────────────────────────────────────

export type CognitiveEventSource = 
  | 'user'      // Input utilisateur
  | 'system'    // Résultats système (FS, commandes)
  | 'agent'     // Résultats d'agents
  | 'timer'     // Événements temporels
  | 'ui'        // Interactions UI
  | 'brain';    // Décisions internes

export type CognitiveEventType =
  | 'intent.message'           // Message utilisateur
  | 'intent.action'            // Action UI déclenchée
  | 'intent.search'            // Recherche demandée
  | 'task.started'             // Tâche démarrée
  | 'task.completed'           // Tâche terminée
  | 'task.failed'              // Tâche échouée
  | 'task.progress'            // Progression de tâche
  | 'system.result'            // Résultat commande système
  | 'system.error'             // Erreur système
  | 'thought.generated'        // Pensée générée par LLM
  | 'plan.created'             // Plan d'action créé
  | 'decision.made'            // Décision prise
  | 'ui.render'                // Schéma UI à afficher
  | 'notification.push'        // Notification à afficher
  | 'memory.update';           // Mise à jour mémoire

export interface CognitiveEvent<T = unknown> {
  id: string;
  source: CognitiveEventSource;
  type: CognitiveEventType;
  payload: T;
  timestamp: number;
  correlationId?: string;  // Pour lier des événements
  priority: 'low' | 'normal' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

// ──────────────────────────────────────────────────────────────
// MENTAL STATE - État global du cerveau
// ──────────────────────────────────────────────────────────────

export type BrainMode =
  | 'idle'           // En attente
  | 'listening'      // Écoute active
  | 'thinking'       // Réflexion en cours
  | 'planning'       // Création de plan
  | 'executing'      // Exécution de tâches
  | 'observing'      // Observation des résultats
  | 'adapting';      // Réajustement du plan

export interface Goal {
  id: string;
  description: string;
  priority: number;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'paused';
  createdAt: number;
  completedAt?: number;
  parentGoalId?: string;
  subGoalIds: string[];
}

export interface MentalState {
  mode: BrainMode;
  activeGoals: Goal[];
  pendingTasks: string[];
  completedTasks: string[];
  confidence: number;  // 0-1, confiance dans le plan actuel
  lastActivity: number;
  currentFocus?: string;  // ID de la tâche/goal en focus
  
  // Contexte conversationnel
  conversationContext: {
    messageCount: number;
    lastUserIntent?: string;
    lastResponse?: string;
    topicHistory: string[];
  };
  
  // État de l'environnement
  environmentContext: {
    isElectron: boolean;
    systemAvailable: boolean;
    lastSystemInfo?: SystemContextInfo;
  };
}

export interface SystemContextInfo {
  platform?: string;
  cwd?: string;
  homedir?: string;
  cpuUsage?: number;
  memoryUsage?: number;
}

// ──────────────────────────────────────────────────────────────
// COGNITIVE TASKS - Unités de travail
// ──────────────────────────────────────────────────────────────

export type AgentType = 
  | 'thinker'       // LLM reasoning
  | 'filesystem'    // Opérations fichiers
  | 'search'        // Recherche
  | 'uiBuilder'     // Construction UI
  | 'notification'  // Notifications
  | 'system';       // Commandes système

export type TaskStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'waiting';  // Attend une autre tâche

export interface CognitiveTask<T = unknown, R = unknown> {
  id: string;
  agent: AgentType;
  action: string;
  params: T;
  status: TaskStatus;
  priority: number;  // Plus bas = plus prioritaire
  
  // Timing
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  timeout?: number;
  
  // Relations
  correlationId: string;
  parentTaskId?: string;
  dependsOn?: string[];  // IDs des tâches prérequises
  
  // Résultat
  result?: R;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

// ──────────────────────────────────────────────────────────────
// THOUGHT ENGINE - Raisonnement
// ──────────────────────────────────────────────────────────────

export interface Thought {
  id: string;
  content: string;
  type: 'hypothesis' | 'plan' | 'observation' | 'decision' | 'question';
  confidence: number;
  timestamp: number;
  relatedGoalId?: string;
}

export interface Plan {
  id: string;
  description: string;
  steps: PlanStep[];
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'failed' | 'adapted';
  createdAt: number;
  goalId: string;
}

export interface PlanStep {
  id: string;
  action: string;
  agent: AgentType;
  params: Record<string, unknown>;
  dependsOn?: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: unknown;
}

// ──────────────────────────────────────────────────────────────
// MEMORY SYSTEM - Mémoire à plusieurs niveaux
// ──────────────────────────────────────────────────────────────

export interface WorkingMemory {
  currentGoal?: Goal;
  currentPlan?: Plan;
  recentEvents: CognitiveEvent[];
  contextWindow: Message[];  // Derniers messages pour LLM
  activeVariables: Record<string, unknown>;  // Variables temporaires
}

export interface Episode {
  id: string;
  type: 'interaction' | 'task' | 'discovery' | 'error';
  summary: string;
  timestamp: number;
  duration: number;
  outcome: 'success' | 'failure' | 'partial';
  relatedGoalId?: string;
  data?: Record<string, unknown>;
}

export interface EpisodicMemory {
  episodes: Episode[];
  maxEpisodes: number;
}

export interface SemanticKnowledge {
  key: string;
  value: unknown;
  type: 'fact' | 'pattern' | 'preference';
  confidence: number;
  lastAccessed: number;
  accessCount: number;
}

export interface SemanticMemory {
  knowledge: Map<string, SemanticKnowledge>;
}

// ──────────────────────────────────────────────────────────────
// AGENT INTERFACES - Contrats des agents
// ──────────────────────────────────────────────────────────────

export interface AgentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface Agent<T = unknown, R = unknown> {
  name: AgentType;
  description: string;
  isAvailable: () => Promise<boolean>;
  execute: (task: CognitiveTask<T, R>) => Promise<AgentResult<R>>;
  cancel?: (taskId: string) => void;
}

// ──────────────────────────────────────────────────────────────
// BRAIN CONFIGURATION
// ──────────────────────────────────────────────────────────────

export interface BrainConfig {
  maxConcurrentTasks: number;
  defaultTaskTimeout: number;
  memoryConfig: {
    maxWorkingEvents: number;
    maxContextMessages: number;
    maxEpisodes: number;
  };
  thinkingConfig: {
    enableAutoPlanning: boolean;
    minConfidenceThreshold: number;
    maxPlanSteps: number;
  };
}

// ──────────────────────────────────────────────────────────────
// CALLBACK TYPES - Communication avec l'UI
// ──────────────────────────────────────────────────────────────

export interface BrainCallbacks {
  onStateChange: (state: MentalState) => void;
  onEvent: (event: CognitiveEvent) => void;
  onThought: (thought: Thought) => void;
  onTaskUpdate: (task: CognitiveTask) => void;
  onUISchema: (schema: unknown) => void;
  onNotification: (message: string, priority: 'low' | 'medium' | 'high' | 'critical') => void;
  onError: (error: string) => void;
}

// ──────────────────────────────────────────────────────────────
// MESSAGE TYPE (pour compatibilité)
// ──────────────────────────────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ──────────────────────────────────────────────────────────────
// UTILITY TYPES
// ──────────────────────────────────────────────────────────────

export type EventHandler<T = unknown> = (event: CognitiveEvent<T>) => void | Promise<void>;
export type TaskHandler<T = unknown, R = unknown> = (task: CognitiveTask<T, R>) => Promise<AgentResult<R>>;

export function generateId(prefix = 'cog'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEvent<T>(
  source: CognitiveEventSource,
  type: CognitiveEventType,
  payload: T,
  options: Partial<CognitiveEvent<T>> = {}
): CognitiveEvent<T> {
  return {
    id: generateId('evt'),
    source,
    type,
    payload,
    timestamp: Date.now(),
    priority: 'normal',
    ...options,
  };
}

export function createTask<T, R>(
  agent: AgentType,
  action: string,
  params: T,
  correlationId: string,
  options: Partial<CognitiveTask<T, R>> = {}
): CognitiveTask<T, R> {
  return {
    id: generateId('task'),
    agent,
    action,
    params,
    status: 'queued',
    priority: 5,
    createdAt: Date.now(),
    correlationId,
    retryCount: 0,
    maxRetries: 2,
    ...options,
  };
}
