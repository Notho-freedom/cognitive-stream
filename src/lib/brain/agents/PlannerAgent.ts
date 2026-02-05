// ═══════════════════════════════════════════════════════════════
// PLANNER AGENT
// Agent spécialisé dans la décomposition de tâches complexes
// en plans d'exécution multi-étapes avec parallélisme
// ═══════════════════════════════════════════════════════════════

import type { Agent, AgentResult, CognitiveTask, AgentType } from '../types';
import type { ExecutionPlan, PlanStep } from './plannerTypes';
import { generateId } from '../types';
import { orchestrateAI } from '@/lib/ai';

// ──────────────────────────────────────────────────────────────
// CONFIGURATION
// ──────────────────────────────────────────────────────────────

export const PLAN_CONFIG = {
  maxStepsPerPlan: 10,
  maxParallelTasks: 4,
  defaultStepTimeout: 30000,
  maxRetryPerStep: 2,
  replanThreshold: 0.5, // Si >50% des étapes échouent, replanifier
  complexityThreshold: 3, // Nombre de "verbes d'action" pour considérer complexe
};

// Mots-clés indiquant une tâche complexe
const COMPLEXITY_INDICATORS = [
  'crée', 'créer', 'create', 'build', 'construis',
  'configure', 'setup', 'installe', 'install',
  'ajoute', 'add', 'implémente', 'implement',
  'modifie', 'modify', 'change', 'update',
  'supprime', 'delete', 'remove',
  'analyse', 'analyze', 'scan',
  'teste', 'test', 'vérifie', 'verify',
  'déploie', 'deploy', 'publie', 'publish',
];

// ──────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ──────────────────────────────────────────────────────────────

const PLANNING_SYSTEM_PROMPT = `Tu es un planificateur de tâches autonome expert.

RÈGLES STRICTES:
1. Décompose l'objectif en étapes ATOMIQUES et VÉRIFIABLES
2. Identifie les DÉPENDANCES entre étapes (une étape ne peut commencer que si ses dépendances sont terminées)
3. Maximise le PARALLÉLISME (étapes indépendantes = même phase)
4. Marque TOUTE étape critique avec "isCritical": true et "canFail": false
5. Prévois des FALLBACKS pour chaque étape critique
6. Estime la durée de chaque étape en millisecondes

AGENTS DISPONIBLES:
- thinker: Raisonnement, analyse, génération de contenu, décisions
- filesystem: Lecture/écriture fichiers, création dossiers, navigation
- system: Commandes shell, installations npm/pip, processus système
- uiBuilder: Construction d'interfaces dynamiques, formulaires
- notification: Alertes et notifications utilisateur

RÈGLES DE DÉPENDANCES:
- Une étape avec dependsOn: ["step_1"] attend que step_1 soit complétée
- Les étapes sans dépendances peuvent s'exécuter en parallèle
- Crée des "phases" logiques (init → build → test → deploy)

FORMAT JSON STRICT (aucun texte avant/après):
{
  "objective": "Description claire de l'objectif",
  "estimatedTotalDuration": 15000,
  "steps": [
    {
      "id": "step_1",
      "action": "analyze_requirements",
      "agent": "thinker",
      "description": "Analyser les besoins",
      "params": { "mode": "analyze" },
      "dependsOn": [],
      "estimatedDuration": 3000,
      "canFail": false,
      "isCritical": true,
      "fallback": null
    },
    {
      "id": "step_2",
      "action": "create_structure",
      "agent": "filesystem",
      "description": "Créer la structure",
      "params": { "action": "write", "path": "/src" },
      "dependsOn": ["step_1"],
      "estimatedDuration": 2000,
      "canFail": true,
      "isCritical": false,
      "fallback": { "action": "notify_error", "agent": "notification" }
    }
  ],
  "parallelGroups": [
    ["step_1"],
    ["step_2", "step_3"],
    ["step_4"]
  ]
}`;

// ──────────────────────────────────────────────────────────────
// INTERFACES
// ──────────────────────────────────────────────────────────────

export interface PlannerParams {
  objective: string;
  context?: {
    systemAvailable: boolean;
    previousAttempts?: Array<{ stepId: string; error: string }>;
    environmentInfo?: Record<string, unknown>;
  };
}

export interface PlannerResult {
  plan: ExecutionPlan;
  isComplex: boolean;
  estimatedDuration: number;
}

// ──────────────────────────────────────────────────────────────
// COMPLEXITY ANALYSIS
// ──────────────────────────────────────────────────────────────

export function analyzeTaskComplexity(input: string): {
  isComplex: boolean;
  score: number;
  indicators: string[];
} {
  const lowerInput = input.toLowerCase();
  const foundIndicators: string[] = [];
  
  for (const indicator of COMPLEXITY_INDICATORS) {
    if (lowerInput.includes(indicator)) {
      foundIndicators.push(indicator);
    }
  }
  
  // Autres facteurs de complexité
  const hasMultipleSentences = (input.match(/[.!?]/g) || []).length > 2;
  const hasListMarkers = /[-•*]|\d+\./g.test(input);
  const isLongInput = input.length > 200;
  
  let score = foundIndicators.length;
  if (hasMultipleSentences) score += 1;
  if (hasListMarkers) score += 2;
  if (isLongInput) score += 1;
  
  return {
    isComplex: score >= PLAN_CONFIG.complexityThreshold,
    score,
    indicators: foundIndicators,
  };
}

// ──────────────────────────────────────────────────────────────
// PLAN GENERATION
// ──────────────────────────────────────────────────────────────

async function generatePlan(params: PlannerParams): Promise<ExecutionPlan> {
  const { objective, context } = params;
  
  // Construire le prompt
  let prompt = `OBJECTIF À PLANIFIER:\n${objective}\n\n`;
  
  if (context?.previousAttempts && context.previousAttempts.length > 0) {
    prompt += `TENTATIVES PRÉCÉDENTES ÉCHOUÉES:\n`;
    for (const attempt of context.previousAttempts) {
      prompt += `- ${attempt.stepId}: ${attempt.error}\n`;
    }
    prompt += `\nADAPTE le plan pour éviter ces erreurs.\n\n`;
  }
  
  if (context?.environmentInfo) {
    prompt += `CONTEXTE ENVIRONNEMENT:\n${JSON.stringify(context.environmentInfo, null, 2)}\n\n`;
  }
  
  prompt += `Génère un plan d'exécution optimisé.`;
  
  // Appeler l'IA
  let planJson: unknown = null;
  
  await orchestrateAI(
    [{ role: 'user', content: prompt }],
    PLANNING_SYSTEM_PROMPT,
    (chunk) => {
      // On accumule pour parser à la fin
    }
  ).then(result => {
    if (result.success) {
      // Extraire le JSON de la réponse
      const jsonMatch = result.fullContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          planJson = JSON.parse(jsonMatch[0]);
        } catch {
          console.error('[PlannerAgent] Failed to parse plan JSON');
        }
      }
    }
  });
  
  if (!planJson || typeof planJson !== 'object') {
    // Plan par défaut si échec
    return createDefaultPlan(objective);
  }
  
  // Transformer en ExecutionPlan
  return transformToPlan(planJson as RawPlanData, objective);
}

interface RawPlanData {
  objective?: string;
  estimatedTotalDuration?: number;
  steps?: Array<{
    id: string;
    action: string;
    agent: string;
    description?: string;
    params?: Record<string, unknown>;
    dependsOn?: string[];
    estimatedDuration?: number;
    canFail?: boolean;
    isCritical?: boolean;
    fallback?: { action: string; agent: string } | null;
  }>;
  parallelGroups?: string[][];
}

const CRITICAL_ACTION_KEYWORDS = [
  'validate',
  'verify',
  'test',
  'deploy',
  'publish',
  'migrate',
  'backup',
  'restore',
  'apply',
  'commit',
  'build',
  'install',
  'configure',
  'setup',
  'init',
  'plan',
  'analyze',
  'analyse',
  'check',
];

function inferCriticalStep(step: {
  action: string;
  description?: string;
  canFail?: boolean;
  dependsOn?: string[];
}): boolean {
  if (step.canFail === false) return true;
  const description = `${step.action} ${step.description || ''}`.toLowerCase();
  if (CRITICAL_ACTION_KEYWORDS.some(keyword => description.includes(keyword))) {
    return true;
  }
  return (step.dependsOn || []).length === 0;
}

function transformToPlan(raw: RawPlanData, objective: string): ExecutionPlan {
  const steps: PlanStep[] = (raw.steps || []).map(s => ({
    id: s.id || generateId('step'),
    action: s.action,
    agent: s.agent as AgentType,
    description: s.description || s.action,
    params: s.params || {},
    dependsOn: s.dependsOn || [],
    estimatedDuration: s.estimatedDuration || PLAN_CONFIG.defaultStepTimeout,
    canFail: s.canFail ?? true,
    isCritical: s.isCritical ?? inferCriticalStep(s),
    fallback: s.fallback || null,
    status: 'pending',
    retryCount: 0,
    maxRetries: PLAN_CONFIG.maxRetryPerStep,
  }));
  
  // Calculer les phases parallèles
  const parallelGroups = raw.parallelGroups || computeParallelGroups(steps);
  
  return {
    id: generateId('plan'),
    objective: raw.objective || objective,
    steps,
    parallelGroups,
    status: 'pending',
    currentPhase: 0,
    totalPhases: parallelGroups.length,
    progress: 0,
    createdAt: Date.now(),
  };
}

function computeParallelGroups(steps: PlanStep[]): string[][] {
  const groups: string[][] = [];
  const completed = new Set<string>();
  const remaining = new Set(steps.map(s => s.id));
  
  while (remaining.size > 0) {
    const currentGroup: string[] = [];
    
    for (const step of steps) {
      if (!remaining.has(step.id)) continue;
      
      // Vérifier si toutes les dépendances sont satisfaites
      const depsReady = (step.dependsOn || []).every(d => completed.has(d));
      if (depsReady) {
        currentGroup.push(step.id);
      }
    }
    
    if (currentGroup.length === 0) {
      // Cycle détecté ou erreur - ajouter les restants
      currentGroup.push(...remaining);
    }
    
    // Limiter la taille du groupe
    const limitedGroup = currentGroup.slice(0, PLAN_CONFIG.maxParallelTasks);
    groups.push(limitedGroup);
    
    for (const id of limitedGroup) {
      completed.add(id);
      remaining.delete(id);
    }
  }
  
  return groups;
}

function createDefaultPlan(objective: string): ExecutionPlan {
  return {
    id: generateId('plan'),
    objective,
    steps: [
      {
        id: 'step_analyze',
        action: 'analyze',
        agent: 'thinker',
        description: 'Analyser la demande',
        params: { objective },
        dependsOn: [],
        estimatedDuration: 5000,
        canFail: false,
        isCritical: true,
        fallback: null,
        status: 'pending',
        retryCount: 0,
        maxRetries: 2,
      },
      {
        id: 'step_execute',
        action: 'respond',
        agent: 'thinker',
        description: 'Exécuter la tâche principale',
        params: { objective },
        dependsOn: ['step_analyze'],
        estimatedDuration: 10000,
        canFail: false,
        isCritical: true,
        fallback: { action: 'notify', agent: 'notification' },
        status: 'pending',
        retryCount: 0,
        maxRetries: 2,
      },
    ],
    parallelGroups: [['step_analyze'], ['step_execute']],
    status: 'pending',
    currentPhase: 0,
    totalPhases: 2,
    progress: 0,
    createdAt: Date.now(),
  };
}

// ──────────────────────────────────────────────────────────────
// AGENT IMPLEMENTATION
// ──────────────────────────────────────────────────────────────

export class PlannerAgent implements Agent<PlannerParams, PlannerResult> {
  name: AgentType = 'thinker'; // Utilise le type thinker pour la compatibilité
  description = 'Agent de planification multi-étapes';
  
  async isAvailable(): Promise<boolean> {
    return true;
  }
  
  async execute(
    task: CognitiveTask
  ): Promise<AgentResult<PlannerResult>> {
    const startTime = Date.now();
    
    try {
      // Extraire les params avec cast
      const params = task.params as PlannerParams;
      const { objective, context } = params;
      
      // Analyser la complexité
      const complexity = analyzeTaskComplexity(objective);
      
      if (!complexity.isComplex) {
        // Tâche simple - pas besoin de plan élaboré
        return {
          success: true,
          data: {
            plan: createDefaultPlan(objective),
            isComplex: false,
            estimatedDuration: 5000,
          },
          duration: Date.now() - startTime,
        };
      }
      
      // Générer un plan complet
      const plan = await generatePlan({ objective, context });
      
      return {
        success: true,
        data: {
          plan,
          isComplex: true,
          estimatedDuration: plan.steps.reduce(
            (sum, s) => sum + (s.estimatedDuration || 0),
            0
          ),
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Planning failed',
        duration: Date.now() - startTime,
      };
    }
  }
}

// ──────────────────────────────────────────────────────────────
// FACTORY
// ──────────────────────────────────────────────────────────────

export function createPlannerAgent(): PlannerAgent {
  return new PlannerAgent();
}
