// ═══════════════════════════════════════════════════════════════
// SCHEMA FALLBACKS
// Génération de schémas transitionnels pour les opérations async
// ═══════════════════════════════════════════════════════════════

import type { CognitiveUISchema } from '@/components/cognitive/dynamic/types';

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
