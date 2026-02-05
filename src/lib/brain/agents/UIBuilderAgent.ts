// ═══════════════════════════════════════════════════════════════
// UI BUILDER AGENT
// Agent pour construction de schémas UI dynamiques
// ═══════════════════════════════════════════════════════════════

import type { Agent, AgentResult, CognitiveTask, Message } from '../types';
import { orchestrateAI, isElectronEnvironment } from '@/lib/ai';
import generateUnifiedSystemPrompt from '@/lib/UNIFIED_SYSTEM_PROMPT';

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

interface UIBuilderParams {
  action?: 'build' | 'adapt' | 'merge'; // Optional - prefer task.action
  data: unknown;
  context?: {
    previousSchema?: unknown;
    userPreferences?: Record<string, unknown>;
    dataType?: string;
  };
  messages?: Message[];
}

interface UIBuilderResult {
  schema: unknown;
  thought?: string;
  provider?: string;
  model?: string;
}

// ──────────────────────────────────────────────────────────────
// PROMPT SPÉCIFIQUE UI
// ──────────────────────────────────────────────────────────────

const UI_BUILDER_PROMPT = `
Tu es un constructeur d'interfaces dynamiques. Ta mission est de créer des schémas UI optimaux.

DONNÉES REÇUES:
Les données ci-dessous doivent être présentées de manière claire et structurée.

RÈGLES:
1. Choisis les composants les plus adaptés aux données
2. Utilise des layouts appropriés (grids pour comparaisons, stacks pour flux)
3. Ajoute des indicateurs de statut si pertinent
4. Propose des actions contextuelles
5. Optimise pour la lisibilité

COMPOSANTS DISPONIBLES: text, list, button, input, choice, card, stack, grid, progress, badge, keyValue, divider, status, skeleton, empty, image, alert, code, table, tabs, accordion, timer, rating, slider
`;

// ──────────────────────────────────────────────────────────────
// AGENT IMPLEMENTATION
// ──────────────────────────────────────────────────────────────

export class UIBuilderAgent implements Agent<UIBuilderParams, UIBuilderResult> {
  name = 'uiBuilder' as const;
  description = 'Agent pour construction de schémas UI';

  private lastProvider = '';
  private lastModel = '';

  async isAvailable(): Promise<boolean> {
    return true; // Toujours disponible via orchestrateur
  }

  async execute(task: CognitiveTask<UIBuilderParams, UIBuilderResult>): Promise<AgentResult<UIBuilderResult>> {
    const startTime = Date.now();
    const { data, context, messages } = task.params;
    
    // UNIFIED ACTION CONTRACT: use task.action first, fallback to params.action for legacy
    const action = (task.action as 'build' | 'adapt' | 'merge') || task.params.action;
    
    if (!action) {
      console.warn('[UIBuilderAgent] No action specified, defaulting to "build"');
    }
    
    const effectiveAction = action || 'build';
    
    // Log legacy usage for debugging
    if (task.params.action && !task.action) {
      console.warn('[UIBuilderAgent] Legacy action format used (params.action). Migrate to task.action.');
    }

    try {
      let result: UIBuilderResult;

      switch (effectiveAction) {
        case 'build': {
          // Construire un schéma à partir des données
          const schema = await this.buildSchemaFromData(data, context, messages);
          result = {
            schema: schema.schema,
            thought: schema.thought,
            provider: this.lastProvider,
            model: this.lastModel,
          };
          break;
        }

        case 'adapt': {
          // Adapter un schéma existant
          if (!context?.previousSchema) {
            return {
              success: false,
              error: 'Previous schema required for adapt action',
              duration: Date.now() - startTime,
            };
          }
          const adapted = await this.adaptSchema(data, context.previousSchema, messages);
          result = {
            schema: adapted.schema,
            thought: adapted.thought,
            provider: this.lastProvider,
            model: this.lastModel,
          };
          break;
        }

        case 'merge': {
          // Fusionner plusieurs sources de données
          const merged = await this.mergeDataToSchema(data, messages);
          result = {
            schema: merged.schema,
            thought: merged.thought,
            provider: this.lastProvider,
            model: this.lastModel,
          };
          break;
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${effectiveAction}`,
            duration: Date.now() - startTime,
          };
      }

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
        metadata: { action: effectiveAction, provider: this.lastProvider },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  private async buildSchemaFromData(
    data: unknown,
    context?: UIBuilderParams['context'],
    existingMessages?: Message[]
  ): Promise<{ schema: unknown; thought?: string }> {
    const systemPrompt = await this.getSystemPrompt();
    
    const dataMessage: Message = {
      role: 'user',
      content: `
${UI_BUILDER_PROMPT}

DONNÉES À AFFICHER:
${JSON.stringify(data, null, 2)}

${context?.dataType ? `TYPE DE DONNÉES: ${context.dataType}` : ''}

Crée un schéma UI optimal pour ces données.
      `,
    };

    const messages: Message[] = existingMessages 
      ? [...existingMessages, dataMessage]
      : [dataMessage];

    let fullContent = '';
    
    await orchestrateAI(
      messages.map(m => ({ role: m.role, content: m.content })),
      systemPrompt,
      (chunk) => { fullContent += chunk; },
      {
        enableLocalFallback: isElectronEnvironment(),
        onProviderChange: (provider, model) => {
          this.lastProvider = provider;
          this.lastModel = model;
        },
      }
    );

    return this.parseUIResponse(fullContent);
  }

  private async adaptSchema(
    newData: unknown,
    previousSchema: unknown,
    messages?: Message[]
  ): Promise<{ schema: unknown; thought?: string }> {
    const systemPrompt = await this.getSystemPrompt();
    
    const adaptMessage: Message = {
      role: 'user',
      content: `
SCHÉMA PRÉCÉDENT:
${JSON.stringify(previousSchema, null, 2)}

NOUVELLES DONNÉES:
${JSON.stringify(newData, null, 2)}

Adapte le schéma pour intégrer les nouvelles données tout en gardant la structure cohérente.
      `,
    };

    const allMessages = messages ? [...messages, adaptMessage] : [adaptMessage];

    let fullContent = '';
    
    await orchestrateAI(
      allMessages.map(m => ({ role: m.role, content: m.content })),
      systemPrompt,
      (chunk) => { fullContent += chunk; },
      {
        enableLocalFallback: isElectronEnvironment(),
        onProviderChange: (provider, model) => {
          this.lastProvider = provider;
          this.lastModel = model;
        },
      }
    );

    return this.parseUIResponse(fullContent);
  }

  private async mergeDataToSchema(
    data: unknown,
    messages?: Message[]
  ): Promise<{ schema: unknown; thought?: string }> {
    // Similaire à buildSchemaFromData mais pour données multiples
    return this.buildSchemaFromData(data, { dataType: 'merged' }, messages);
  }

  private async getSystemPrompt(): Promise<string> {
    const isElectron = isElectronEnvironment();
    
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
  }

  private parseUIResponse(content: string): { schema: unknown; thought?: string } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { schema: null };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        schema: parsed.response?.schema || parsed.schema || parsed,
        thought: parsed.thought,
      };
    } catch {
      return { schema: null };
    }
  }
}

// Export factory
export function createUIBuilderAgent(): Agent<UIBuilderParams, UIBuilderResult> {
  return new UIBuilderAgent();
}
