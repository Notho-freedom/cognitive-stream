// ═══════════════════════════════════════════════════════════════
// PLANNER TYPES
// Types pour le système de planification multi-étapes
// ═══════════════════════════════════════════════════════════════

import type { AgentType, AgentResult } from '../types';

// ──────────────────────────────────────────────────────────────
// PLAN STEP
// ──────────────────────────────────────────────────────────────

export type PlanStepStatus =
  | 'pending'   // En attente
  | 'ready'     // Prêt à exécuter (dépendances OK)
  | 'running'   // En cours d'exécution
  | 'completed' // Terminé avec succès
  | 'failed'    // Échoué
  | 'skipped'   // Ignoré (dépendance échouée)
  | 'retrying'; // En cours de retry

export interface PlanStep {
  id: string;
  action: string;
  agent: AgentType;
  description: string;
  params: Record<string, unknown>;
  dependsOn: string[];
  estimatedDuration: number;
  canFail: boolean;
  isCritical: boolean;
  fallback: { action: string; agent: string } | null;
  
  // État d'exécution
  status: PlanStepStatus;
  retryCount: number;
  maxRetries: number;
  
  // Résultats
  result?: unknown;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  actualDuration?: number;
}

// ──────────────────────────────────────────────────────────────
// EXECUTION PLAN
// ──────────────────────────────────────────────────────────────

export type ExecutionPlanStatus =
  | 'pending'    // Non démarré
  | 'planning'   // En cours de planification
  | 'executing'  // En cours d'exécution
  | 'adapting'   // En cours de replanification
  | 'paused'     // Mis en pause
  | 'completed'  // Terminé avec succès
  | 'failed';    // Échoué définitivement

export interface ExecutionPlan {
  id: string;
  objective: string;
  steps: PlanStep[];
  parallelGroups: string[][]; // Groupes d'étapes parallèles
  
  // État global
  status: ExecutionPlanStatus;
  currentPhase: number;
  totalPhases: number;
  progress: number; // 0-100
  
  // Timing
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  
  // Statistiques
  stats?: PlanStats;
}

export interface PlanStats {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  totalDuration: number;
  avgStepDuration: number;
}

// ──────────────────────────────────────────────────────────────
// PHASE RESULT
// ──────────────────────────────────────────────────────────────

export interface PhaseResult {
  phaseIndex: number;
  stepResults: Array<{
    stepId: string;
    success: boolean;
    result?: AgentResult;
    duration: number;
  }>;
  allSuccessful: boolean;
  needsReplan: boolean;
}

// ──────────────────────────────────────────────────────────────
// PLAN EVENTS
// ──────────────────────────────────────────────────────────────

export type PlanEventType =
  | 'plan.created'
  | 'plan.started'
  | 'plan.completed'
  | 'plan.failed'
  | 'plan.adapted'
  | 'phase.started'
  | 'phase.completed'
  | 'step.started'
  | 'step.completed'
  | 'step.failed'
  | 'step.retrying';

export interface PlanEvent {
  type: PlanEventType;
  planId: string;
  stepId?: string;
  phaseIndex?: number;
  data?: unknown;
  timestamp: number;
}

// ──────────────────────────────────────────────────────────────
// CALLBACKS
// ──────────────────────────────────────────────────────────────

export interface PlanExecutorCallbacks {
  onPlanEvent: (event: PlanEvent) => void;
  onStepUpdate: (step: PlanStep) => void;
  onProgressUpdate: (progress: number, currentStep?: PlanStep) => void;
  onPhaseComplete: (result: PhaseResult) => void;
  onPlanComplete: (plan: ExecutionPlan, stats: PlanStats) => void;
  onError: (error: string, step?: PlanStep) => void;
}
