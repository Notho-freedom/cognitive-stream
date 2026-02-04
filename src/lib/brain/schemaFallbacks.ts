// ═══════════════════════════════════════════════════════════════
// SCHEMA FALLBACKS
// Génération de schémas transitionnels pour les opérations async
// ═══════════════════════════════════════════════════════════════

import type { CognitiveUISchema } from '@/components/cognitive/dynamic/types';
import type { ExecutionPlan, PlanStep, PlanStats } from './agents/plannerTypes';

// ──────────────────────────────────────────────────────────────
// CONFIGURATION
// ──────────────────────────────────────────────────────────────

export const ASYNC_CONFIG = {
  maxRetries: 2,
  retryDelayMs: 500,
  transitionSchemaTimeout: 30000, // 30s max avant timeout
};

// ──────────────────────────────────────────────────────────────
// TYPE GUARDS
// ──────────────────────────────────────────────────────────────

export function isTransitionSchema(schema: CognitiveUISchema): boolean {
  return schema.metadata?.isTransition === true;
}

export function isErrorSchema(schema: CognitiveUISchema): boolean {
  return schema.metadata?.isError === true;
}

// ──────────────────────────────────────────────────────────────
// LOADING SCHEMA
// ──────────────────────────────────────────────────────────────

export interface LoadingTaskInfo {
  count: number;
  current?: string;
  progress?: number;
}

export function createLoadingSchema(
  message: string,
  taskInfo?: LoadingTaskInfo
): CognitiveUISchema {
  const blocks: CognitiveUISchema['blocks'] = [
    {
      type: 'status',
      state: 'loading',
      message,
    },
  ];

  // Ajouter une barre de progression si on a des infos de tâches
  if (taskInfo) {
    blocks.push({
      type: 'progress',
      value: taskInfo.progress ?? 0,
      max: 100,
      label: taskInfo.current || `${taskInfo.count} tâche(s) en cours`,
      showValue: true,
    });
  }

  // Message informatif
  blocks.push({
    type: 'text',
    content: 'Traitement en cours, veuillez patienter...',
    variant: 'caption',
  });

  return {
    metadata: {
      title: 'Traitement en cours',
      description: message,
      isTransition: true,
    },
    layout: {
      width: 'md',
      maxHeight: 'sm',
      centered: true,
    },
    blocks,
  };
}

// ──────────────────────────────────────────────────────────────
// ERROR SCHEMA
// ──────────────────────────────────────────────────────────────

export interface ErrorDetails {
  code?: string;
  provider?: string;
  attemptNumber?: number;
  maxAttempts?: number;
  technicalMessage?: string;
}

export function createErrorSchema(
  errorMessage: string,
  canRetry: boolean,
  details?: ErrorDetails
): CognitiveUISchema {
  const blocks: CognitiveUISchema['blocks'] = [
    {
      type: 'alert',
      variant: 'error',
      title: 'Erreur de traitement',
      message: errorMessage,
    },
  ];

  // Détails techniques si disponibles
  if (details) {
    const detailParts: string[] = [];
    if (details.code) detailParts.push(`Code: ${details.code}`);
    if (details.provider) detailParts.push(`Provider: ${details.provider}`);
    if (details.attemptNumber && details.maxAttempts) {
      detailParts.push(`Tentative: ${details.attemptNumber}/${details.maxAttempts}`);
    }

    if (detailParts.length > 0) {
      blocks.push({
        type: 'code',
        code: detailParts.join('\n'),
        language: 'text',
      });
    }

    if (details.technicalMessage) {
      blocks.push({
        type: 'accordion',
        items: [
          {
            id: 'tech-details',
            title: 'Détails techniques',
            children: [
              {
                type: 'text',
                content: details.technicalMessage,
                variant: 'code',
              },
            ],
          },
        ],
      });
    }
  }

  // Actions disponibles
  if (canRetry) {
    blocks.push({
      type: 'divider',
    });

    blocks.push({
      type: 'stack',
      direction: 'horizontal',
      gap: 'md',
      children: [
        {
          type: 'button',
          label: 'Réessayer',
          actionId: 'retry-last-action',
          variant: 'primary',
        },
        {
          type: 'button',
          label: 'Annuler',
          actionId: 'cancel-action',
          variant: 'ghost',
        },
      ],
    });
  } else {
    blocks.push({
      type: 'text',
      content: 'Le nombre maximum de tentatives a été atteint.',
      variant: 'caption',
    });
  }

  return {
    metadata: {
      title: 'Erreur',
      isError: true,
      isTransition: !canRetry,
    },
    layout: {
      width: 'md',
      maxHeight: 'md',
    },
    blocks,
  };
}

// ──────────────────────────────────────────────────────────────
// TEXT FALLBACK SCHEMA
// Quand l'IA renvoie du texte non-JSON
// ──────────────────────────────────────────────────────────────

export function createTextFallbackSchema(
  text: string,
  thought?: string
): CognitiveUISchema {
  const blocks: CognitiveUISchema['blocks'] = [];

  // Pensée en header si disponible
  if (thought && thought !== text) {
    blocks.push({
      type: 'text',
      content: thought,
      variant: 'body',
    });
    blocks.push({
      type: 'divider',
    });
  }

  // Contenu principal
  blocks.push({
    type: 'text',
    content: text,
    variant: 'body',
  });

  // Actions suggérées par défaut
  blocks.push({
    type: 'divider',
  });

  blocks.push({
    type: 'stack',
    direction: 'horizontal',
    gap: 'md',
    children: [
      {
        type: 'button',
        label: 'Continuer',
        actionId: 'continue-conversation',
        variant: 'primary',
      },
      {
        type: 'button',
        label: 'Nouvelle question',
        actionId: 'new-question',
        variant: 'secondary',
      },
    ],
  });

  return {
    metadata: {
      title: 'Réponse',
      isFallback: true,
    },
    layout: {
      width: 'md',
    },
    blocks,
  };
}

// ──────────────────────────────────────────────────────────────
// SYSTEM EXECUTION SCHEMA
// Pendant l'exécution de commandes système
// ──────────────────────────────────────────────────────────────

export function createSystemExecutionSchema(
  commands: string[],
  currentIndex: number
): CognitiveUISchema {
  const progress = commands.length > 0 
    ? Math.round((currentIndex / commands.length) * 100) 
    : 0;

  const blocks: CognitiveUISchema['blocks'] = [
    {
      type: 'status',
      state: 'loading',
      message: 'Exécution des commandes système',
    },
    {
      type: 'progress',
      value: progress,
      max: 100,
      label: `Commande ${currentIndex + 1}/${commands.length}`,
      showValue: true,
    },
  ];

  // Liste des commandes avec état (format string simple selon le type)
  if (commands.length > 0) {
    const listItems = commands.map((cmd, i) => {
      const status = i < currentIndex ? '✓' : i === currentIndex ? '⏳' : '○';
      const cmdDisplay = cmd.length > 40 ? cmd.slice(0, 40) + '...' : cmd;
      return `${status} ${cmdDisplay}`;
    });

    blocks.push({
      type: 'list',
      items: listItems,
      variant: 'bullet',
    });
  }

  blocks.push({
    type: 'text',
    content: 'Les commandes sont exécutées séquentiellement pour garantir la stabilité.',
    variant: 'caption',
  });

  return {
    metadata: {
      title: 'Exécution système',
      isTransition: true,
    },
    layout: {
      width: 'md',
      maxHeight: 'md',
    },
    blocks,
  };
}

// ──────────────────────────────────────────────────────────────
// PLAN PREVIEW SCHEMA
// Affiche le plan avant exécution
// ──────────────────────────────────────────────────────────────

export function createPlanPreviewSchema(plan: ExecutionPlan): CognitiveUISchema {
  const blocks: CognitiveUISchema['blocks'] = [
    {
      type: 'text',
      content: `🎯 ${plan.objective}`,
      variant: 'heading',
    },
    {
      type: 'divider',
    },
    {
      type: 'text',
      content: `${plan.steps.length} étapes • ${plan.totalPhases} phases`,
      variant: 'caption',
    },
  ];

  // Afficher les étapes groupées par phase
  for (let phaseIdx = 0; phaseIdx < plan.parallelGroups.length; phaseIdx++) {
    const phaseStepIds = plan.parallelGroups[phaseIdx];
    const phaseSteps = plan.steps.filter(s => phaseStepIds.includes(s.id));
    
    const isParallel = phaseSteps.length > 1;
    const phaseLabel = isParallel 
      ? `Phase ${phaseIdx + 1} (parallèle)`
      : `Phase ${phaseIdx + 1}`;

    blocks.push({
      type: 'text',
      content: phaseLabel,
      variant: 'label',
    });

    // Liste des étapes de cette phase
    const stepItems = phaseSteps.map(step => {
      const agentIcon = getAgentIcon(step.agent);
      return `${agentIcon} ${step.description || step.action}`;
    });

    blocks.push({
      type: 'list',
      items: stepItems,
      variant: 'numbered',
    });
  }

  blocks.push({
    type: 'divider',
  });

  blocks.push({
    type: 'stack',
    direction: 'horizontal',
    gap: 'md',
    children: [
      {
        type: 'button',
        label: 'Exécuter le plan',
        actionId: 'execute-plan',
        variant: 'primary',
      },
      {
        type: 'button',
        label: 'Modifier',
        actionId: 'modify-plan',
        variant: 'secondary',
      },
    ],
  });

  return {
    metadata: {
      title: 'Plan d\'exécution',
      isPlan: true,
    },
    layout: {
      width: 'lg',
    },
    blocks,
  };
}

// ──────────────────────────────────────────────────────────────
// PLAN PROGRESS SCHEMA
// Affiche la progression en temps réel
// ──────────────────────────────────────────────────────────────

export function createPlanProgressSchema(
  plan: ExecutionPlan,
  currentStep?: PlanStep
): CognitiveUISchema {
  const blocks: CognitiveUISchema['blocks'] = [
    {
      type: 'text',
      content: `📋 ${plan.objective}`,
      variant: 'heading',
    },
    {
      type: 'progress',
      value: plan.progress,
      max: 100,
      label: `Phase ${plan.currentPhase + 1}/${plan.totalPhases}`,
      showValue: true,
    },
  ];

  // Étape en cours
  if (currentStep) {
    blocks.push({
      type: 'status',
      state: 'loading',
      message: `${getAgentIcon(currentStep.agent)} ${currentStep.description || currentStep.action}`,
    });
  }

  // Liste de toutes les étapes avec statut
  const stepStatusList = plan.steps.map(step => {
    const icon = getStepStatusIcon(step.status);
    const text = step.description || step.action;
    return `${icon} ${text}`;
  });

  blocks.push({
    type: 'accordion',
    items: [
      {
        id: 'step-details',
        title: `Détails (${plan.steps.filter(s => s.status === 'completed').length}/${plan.steps.length})`,
        children: [
          {
            type: 'list',
            items: stepStatusList,
            variant: 'bullet',
          },
        ],
      },
    ],
  });

  return {
    metadata: {
      title: 'Exécution en cours',
      isTransition: true,
      isPlan: true,
    },
    layout: {
      width: 'md',
    },
    blocks,
  };
}

// ──────────────────────────────────────────────────────────────
// PLAN COMPLETION SCHEMA
// Résumé final après exécution
// ──────────────────────────────────────────────────────────────

export function createPlanCompletionSchema(
  plan: ExecutionPlan,
  stats: PlanStats
): CognitiveUISchema {
  const isSuccess = stats.failedSteps === 0;
  const durationSeconds = Math.round(stats.totalDuration / 1000);

  const blocks: CognitiveUISchema['blocks'] = [
    {
      type: 'alert',
      variant: isSuccess ? 'success' : 'warning',
      title: isSuccess ? 'Plan exécuté avec succès' : 'Plan terminé avec des erreurs',
      message: `${stats.completedSteps}/${stats.totalSteps} étapes réussies`,
    },
    {
      type: 'divider',
    },
  ];

  // Stats as key-value pairs
  blocks.push({
    type: 'keyValue',
    pairs: [
      { key: 'Objectif', value: plan.objective },
      { key: 'Durée totale', value: `${durationSeconds}s` },
      { key: 'Étapes réussies', value: `${stats.completedSteps}` },
      { key: 'Étapes échouées', value: `${stats.failedSteps}` },
      { key: 'Étapes ignorées', value: `${stats.skippedSteps}` },
    ],
  });

  // Détails des étapes échouées
  const failedSteps = plan.steps.filter(s => s.status === 'failed');
  if (failedSteps.length > 0) {
    blocks.push({
      type: 'accordion',
      items: [
        {
          id: 'failed-steps',
          title: `Erreurs (${failedSteps.length})`,
          children: failedSteps.map(step => ({
            type: 'alert' as const,
            variant: 'error' as const,
            title: step.description || step.action,
            message: step.error || 'Erreur inconnue',
          })),
        },
      ],
    });
  }

  blocks.push({
    type: 'divider',
  });

  blocks.push({
    type: 'stack',
    direction: 'horizontal',
    gap: 'md',
    children: [
      {
        type: 'button',
        label: 'Nouvelle tâche',
        actionId: 'new-task',
        variant: 'primary',
      },
      ...(stats.failedSteps > 0 ? [{
        type: 'button' as const,
        label: 'Réessayer les échecs',
        actionId: 'retry-failed',
        variant: 'secondary' as const,
      }] : []),
    ],
  });

  return {
    metadata: {
      title: 'Résultat du plan',
      isPlan: true,
    },
    layout: {
      width: 'lg',
    },
    blocks,
  };
}

// ──────────────────────────────────────────────────────────────
// RETRY PROMPT BUILDER
// Pour l'auto-correction
// ──────────────────────────────────────────────────────────────

export function buildCorrectionPrompt(
  originalResponse: string,
  retryReason: string
): string {
  return `
ERREUR DE FORMAT DÉTECTÉE

Raison: ${retryReason}

Ta réponse précédente:
\`\`\`
${originalResponse.slice(0, 500)}${originalResponse.length > 500 ? '...' : ''}
\`\`\`

CORRECTION REQUISE:
Tu DOIS reformater ta réponse en JSON valide selon ce schéma EXACT:

{
  "thought": "Ta réflexion courte ici",
  "response": {
    "type": "schema",
    "schema": {
      "metadata": { "title": "Titre" },
      "layout": { "width": "md" },
      "blocks": [
        { "type": "text", "content": "Ton message", "variant": "body" }
      ]
    }
  }
}

IMPORTANT:
- Le JSON doit être valide (pas de virgules en trop, guillemets corrects)
- Utilise uniquement les types de blocs valides: text, button, list, card, etc.
- N'inclue AUCUN texte avant ou après le JSON
`;
}

// ──────────────────────────────────────────────────────────────
// AUTONOMY JOURNAL SCHEMA
// Affiche le journal des actions autonomes
// ──────────────────────────────────────────────────────────────

interface AutonomyLogEntry {
  type: string;
  summary: string;
  timestamp: number;
  outcome?: 'success' | 'failure' | 'pending' | 'skipped';
}

export function createAutonomyJournalSchema(
  entries: AutonomyLogEntry[],
  stats: { actionCount: number; limit: number; isActive: boolean }
): CognitiveUISchema {
  const blocks: CognitiveUISchema['blocks'] = [];
  
  // Header avec stats
  blocks.push({
    type: 'stack',
    direction: 'horizontal',
    gap: 'lg',
    children: [
      {
        type: 'status',
        state: stats.isActive ? 'loading' : 'info',
        message: stats.isActive ? 'Mode autonome actif' : 'Mode autonome inactif',
      },
      {
        type: 'badge',
        text: `${stats.actionCount}/${stats.limit} actions`,
        variant: stats.actionCount > stats.limit * 0.8 ? 'warning' : 'default',
      },
    ],
  });
  
  // Barre de progression vers la limite
  blocks.push({
    type: 'progress',
    value: Math.min((stats.actionCount / stats.limit) * 100, 100),
    max: 100,
    label: 'Actions autonomes',
    showValue: false,
  });
  
  // Liste des entrées récentes
  const recentEntries = entries.slice(-15).reverse();
  
  blocks.push({
    type: 'divider',
  });
  
  blocks.push({
    type: 'text',
    content: 'Journal d\'activité',
    variant: 'heading',
  });
  
  for (const entry of recentEntries) {
    const icon = getLogTypeIcon(entry.type);
    const time = new Date(entry.timestamp).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
    });
    
    blocks.push({
      type: 'stack',
      direction: 'horizontal',
      gap: 'sm',
      children: [
        {
          type: 'text',
          content: `${time}`,
          variant: 'caption',
        },
        {
          type: 'text',
          content: `${icon} ${entry.summary}`,
          variant: entry.type === 'error' ? 'caption' : 'body',
        },
      ],
    });
  }
  
  // Boutons de contrôle
  blocks.push({
    type: 'divider',
  });
  
  blocks.push({
    type: 'stack',
    direction: 'horizontal',
    gap: 'md',
    children: [
      {
        type: 'button',
        label: stats.isActive ? '⏸️ Pause' : '▶️ Reprendre',
        actionId: stats.isActive ? 'autonomy-pause' : 'autonomy-resume',
        variant: 'secondary',
      },
      {
        type: 'button',
        label: '🔄 Réinitialiser',
        actionId: 'autonomy-reset',
        variant: 'ghost',
      },
    ],
  });
  
  return {
    metadata: {
      title: 'Journal d\'autonomie',
      description: `${entries.length} entrées • ${stats.actionCount} actions`,
    },
    layout: {
      width: 'md',
      maxHeight: 'lg',
    },
    blocks,
  };
}

function getLogTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    action: '▶️',
    decision: '🧠',
    error: '❌',
    fix: '🔧',
    question: '❓',
    confirmation: '✅',
    step: '📌',
  };
  return icons[type] || '•';
}

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────

function getAgentIcon(agent: string): string {
  const icons: Record<string, string> = {
    thinker: '🧠',
    filesystem: '📁',
    system: '⚙️',
    uiBuilder: '🎨',
    notification: '🔔',
    search: '🔍',
  };
  return icons[agent] || '▶️';
}

function getStepStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    pending: '○',
    ready: '◐',
    running: '⏳',
    completed: '✅',
    failed: '❌',
    skipped: '⏭️',
    retrying: '🔄',
  };
  return icons[status] || '○';
}
