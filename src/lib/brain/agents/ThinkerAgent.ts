// ═══════════════════════════════════════════════════════════════
// THINKER AGENT
// Agent de raisonnement - utilise l'orchestrateur IA
// ═══════════════════════════════════════════════════════════════

import type { Agent, AgentResult, CognitiveTask, Message, Thought, Plan, PlanStep } from '../types';
import { orchestrateAI, isElectronEnvironment } from '@/lib/ai';
import generateUnifiedSystemPrompt from '@/lib/UNIFIED_SYSTEM_PROMPT';
import { generateId } from '../types';

// ──────────────────────────────────────────────────────────────
// TYPES SPÉCIFIQUES AU THINKER
// ──────────────────────────────────────────────────────────────

interface ThinkParams {
  messages: Message[];
  context?: {
    activeGoal?: string;
    systemResults?: unknown[];
    environmentInfo?: Record<string, unknown>;
  };
  mode: 'respond' | 'plan' | 'analyze' | 'decide';
}

interface ThinkResult {
  thought?: Thought;
  plan?: Plan;
  uiSchema?: unknown;
  actions?: Array<{
    agent: string;
    action: string;
    params: Record<string, unknown>;
  }>;
  notifications?: Array<{
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }>;
  rawResponse: string;
  provider: string;
  model: string;
}

// ──────────────────────────────────────────────────────────────
// PROMPTS DE PLANIFICATION
// ──────────────────────────────────────────────────────────────

const PLANNING_PROMPT = `
Tu es un cerveau cognitif autonome. Tu dois analyser la demande et créer un PLAN D'ACTIONS.

RÈGLES DE PLANIFICATION:
1. Décompose la demande en étapes atomiques
2. Identifie les dépendances entre étapes
3. Assigne chaque étape à un agent spécialisé
4. Prévoie les fallbacks en cas d'échec

AGENTS DISPONIBLES:
- filesystem: Lire/écrire fichiers, lister dossiers
- search: Recherche textuelle, grep, indexation
- system: Commandes shell, processus
- uiBuilder: Construire schémas UI
- notification: Alertes utilisateur

FORMAT DE RÉPONSE (JSON STRICT):
{
  "thought": "Ma réflexion sur la demande",
  "plan": {
    "description": "Description du plan",
    "steps": [
      {
        "action": "nom_action",
        "agent": "agent_type",
        "params": {...},
        "dependsOn": ["step_id_precedent"]
      }
    ]
  },
  "immediateActions": [
    {"agent": "...", "action": "...", "params": {...}}
  ]
}
`;

// ──────────────────────────────────────────────────────────────
// AGENT IMPLEMENTATION
// ──────────────────────────────────────────────────────────────

export class ThinkerAgent implements Agent<ThinkParams, ThinkResult> {
  name = 'thinker' as const;
  description = 'Agent de raisonnement utilisant LLM';
  
  private lastProvider = '';
  private lastModel = '';
  private onProviderChange?: (provider: string, model: string) => void;
  
  constructor(callbacks?: { onProviderChange?: (provider: string, model: string) => void }) {
    this.onProviderChange = callbacks?.onProviderChange;
  }

  async isAvailable(): Promise<boolean> {
    // Toujours disponible car l'orchestrateur gère les fallbacks
    return true;
  }

  async execute(task: CognitiveTask<ThinkParams, ThinkResult>): Promise<AgentResult<ThinkResult>> {
    const startTime = Date.now();
    const { messages, context, mode } = task.params;

    try {
      // Générer le prompt système approprié
      const systemPrompt = await this.buildSystemPrompt(mode, context);
      
      let fullContent = '';
      
      // Utiliser l'orchestrateur IA
      const result = await orchestrateAI(
        messages.map(m => ({ role: m.role, content: m.content })),
        systemPrompt,
        (chunk) => {
          fullContent += chunk;
        },
        {
          enableLocalFallback: isElectronEnvironment(),
          onProviderChange: (provider, model) => {
            this.lastProvider = provider;
            this.lastModel = model;
            this.onProviderChange?.(provider, model);
          },
        }
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'AI orchestration failed',
          duration: Date.now() - startTime,
        };
      }

      // Parser la réponse
      const parsed = this.parseResponse(fullContent, mode);

      return {
        success: true,
        data: {
          ...parsed,
          rawResponse: fullContent,
          provider: this.lastProvider,
          model: this.lastModel,
        },
        duration: Date.now() - startTime,
        metadata: {
          provider: this.lastProvider,
          model: this.lastModel,
          triedProviders: result.triedProviders,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  private async buildSystemPrompt(
    mode: ThinkParams['mode'],
    context?: ThinkParams['context']
  ): Promise<string> {
    const isElectron = isElectronEnvironment();
    
    // Prompt de base avec capacités
    let basePrompt = await (async () => {
      if (isElectron && window.cognitiveBridge) {
        const systemInfo = await window.cognitiveBridge.getSystemInfo();
        return generateUnifiedSystemPrompt({
          canExecuteCommands: true,
          canReadFiles: true,
          canWriteFiles: true,
          canListDirectories: true,
          platform: systemInfo.platform,
          arch: systemInfo.arch,
          homedir: systemInfo.homedir,
        });
      }
      return generateUnifiedSystemPrompt({
        canExecuteCommands: false,
        canReadFiles: false,
        canWriteFiles: false,
        canListDirectories: false,
      });
    })();

    // Ajouter des instructions selon le mode
    if (mode === 'plan') {
      basePrompt = PLANNING_PROMPT + '\n\n' + basePrompt;
    }

    // Ajouter le contexte si disponible
    if (context) {
      basePrompt += `\n\n=== CONTEXTE ACTUEL ===\n`;
      if (context.activeGoal) {
        basePrompt += `Objectif actif: ${context.activeGoal}\n`;
      }
      if (context.systemResults && context.systemResults.length > 0) {
        basePrompt += `Résultats système disponibles: ${JSON.stringify(context.systemResults)}\n`;
      }
      if (context.environmentInfo) {
        basePrompt += `Environnement: ${JSON.stringify(context.environmentInfo)}\n`;
      }
    }

    return basePrompt;
  }

  private parseResponse(content: string, mode: ThinkParams['mode']): Partial<ThinkResult> {
    try {
      // Extraire le JSON de la réponse
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { thought: this.createThought(content, 'observation') };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const result: Partial<ThinkResult> = {};

      // Extraire la pensée
      if (parsed.thought) {
        result.thought = this.createThought(parsed.thought, mode === 'plan' ? 'plan' : 'observation');
      }

      // Extraire le plan si mode planning
      if (parsed.plan && mode === 'plan') {
        result.plan = this.createPlan(parsed.plan);
      }

      // Extraire le schéma UI
      if (parsed.response?.schema) {
        result.uiSchema = parsed.response.schema;
      }

      // Extraire les actions immédiates
      if (parsed.immediateActions) {
        result.actions = parsed.immediateActions;
      }

      // Extraire les notifications
      if (parsed.notifications) {
        result.notifications = parsed.notifications;
      }

      return result;
    } catch {
      // Si parsing échoue, créer une pensée simple
      return { thought: this.createThought(content, 'observation') };
    }
  }

  private createThought(content: string, type: Thought['type']): Thought {
    return {
      id: generateId('thought'),
      content: typeof content === 'string' ? content : JSON.stringify(content),
      type,
      confidence: 0.8,
      timestamp: Date.now(),
    };
  }

  private createPlan(planData: {
    description?: string;
    steps?: Array<{
      action: string;
      agent: string;
      params: Record<string, unknown>;
      dependsOn?: string[];
    }>;
  }): Plan {
    const planId = generateId('plan');
    
    const steps: PlanStep[] = (planData.steps || []).map((step, index) => ({
      id: `${planId}_step_${index}`,
      action: step.action,
      agent: step.agent as PlanStep['agent'],
      params: step.params,
      dependsOn: step.dependsOn,
      status: 'pending' as const,
    }));

    return {
      id: planId,
      description: planData.description || 'Plan généré',
      steps,
      status: 'draft',
      createdAt: Date.now(),
      goalId: '', // Sera assigné par le Brain
    };
  }
}

// Export singleton factory
export function createThinkerAgent(
  callbacks?: { onProviderChange?: (provider: string, model: string) => void }
): Agent<ThinkParams, ThinkResult> {
  return new ThinkerAgent(callbacks);
}
