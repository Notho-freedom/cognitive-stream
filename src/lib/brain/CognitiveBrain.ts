// ═══════════════════════════════════════════════════════════════
// COGNITIVE BRAIN - LE CERVEAU CENTRAL
// Orchestrateur asynchrone avec loop cognitif autonome
// ═══════════════════════════════════════════════════════════════

import type {
  CognitiveEvent,
  CognitiveEventType,
  CognitiveTask,
  MentalState,
  BrainMode,
  Goal,
  Thought,
  Plan,
  WorkingMemory,
  Episode,
  EpisodicMemory,
  BrainConfig,
  BrainCallbacks,
  Message,
  AgentType,
  AgentResult,
  Agent,
} from './types';
import { generateId, createEvent, createTask } from './types';
import {
  createThinkerAgent,
  createFileSystemAgent,
  createSystemAgent,
  createUIBuilderAgent,
  createNotificationAgent,
  NotificationAgent,
  createPlannerAgent,
  analyzeTaskComplexity,
  PLAN_CONFIG,
} from './agents';
import type { ExecutionPlan, PlanStep, PlanStats } from './agents/plannerTypes';
import { PlanExecutor, createPlanExecutor } from './PlanExecutor';
import {
  AutonomyConfig,
  DEFAULT_AUTONOMY_CONFIG,
  AutonomyJournal,
  AutonomyCounter,
  globalAutonomyJournal,
  isDestructiveAction,
} from './autonomy';
import { AutoContinueEngine } from './autonomy/AutoContinueEngine';
import { parseSystemActions, executeSystemAction, formatActionResultForAI } from '@/lib/systemActions';
import { isElectronEnvironment } from '@/lib/ai';
import {
  createLoadingSchema,
  createErrorSchema,
  createTextFallbackSchema,
  createSystemExecutionSchema,
  createPlanPreviewSchema,
  createPlanProgressSchema,
  createPlanCompletionSchema,
  buildCorrectionPrompt,
  ASYNC_CONFIG,
} from './schemaFallbacks';

// ──────────────────────────────────────────────────────────────
// DEFAULT CONFIGURATION
// ──────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: BrainConfig = {
  maxConcurrentTasks: 3,
  defaultTaskTimeout: 30000,
  memoryConfig: {
    maxWorkingEvents: 50,
    maxContextMessages: 20,
    maxEpisodes: 100,
  },
  thinkingConfig: {
    enableAutoPlanning: true,
    minConfidenceThreshold: 0.6,
    maxPlanSteps: 10,
  },
};

// ──────────────────────────────────────────────────────────────
// EXTENDED BRAIN CALLBACKS avec autonomie
// ──────────────────────────────────────────────────────────────

export interface ExtendedBrainCallbacks extends BrainCallbacks {
  onAutonomyLog: (entry: { type: string; summary: string; timestamp: number }) => void;
  onConfirmDestructive: (action: string, description: string) => Promise<boolean>;
  onAskQuestion: (question: string) => Promise<string>;
  onAutonomyPause: (reason: string) => void;
  onAutonomyResume: () => void;
}

// ──────────────────────────────────────────────────────────────
// COGNITIVE BRAIN CLASS
// ──────────────────────────────────────────────────────────────

export class CognitiveBrain {
  private config: BrainConfig;
  private callbacks: Partial<ExtendedBrainCallbacks>;
  
  // État mental
  private state: MentalState;
  
  // Mémoires
  private workingMemory: WorkingMemory;
  private episodicMemory: EpisodicMemory;
  
  // File d'événements
  private eventQueue: CognitiveEvent[] = [];
  private isProcessing = false;
  
  // File de tâches
  private taskQueue: CognitiveTask[] = [];
  private runningTasks: Map<string, CognitiveTask> = new Map();
  
  // Agents (any pour permettre différents types de params/results)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private agents: Map<AgentType, Agent<any, any>>;
  private notificationAgent: NotificationAgent;
  
  // Provider tracking
  private currentProvider = '';
  private currentModel = '';
  
  // Retry tracking for auto-correction
  private retryCount = 0;
  private lastRawResponse = '';
  
  // Plan execution
  private currentPlan: ExecutionPlan | null = null;
  private planExecutor: PlanExecutor | null = null;
  
  // ═══════════════════════════════════════════════════════════════
  // AUTONOMIE - Mode agent autonome jusqu'à l'objectif
  // ═══════════════════════════════════════════════════════════════
  private autonomyConfig: AutonomyConfig;
  private autonomyJournal: AutonomyJournal;
  private autonomyCounter: AutonomyCounter;
  private autoContinueEngine: AutoContinueEngine | null = null;
  private isAutonomousMode = false;

  constructor(
    config: Partial<BrainConfig> = {},
    callbacks: Partial<ExtendedBrainCallbacks> = {},
    autonomyConfig: Partial<AutonomyConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = callbacks;
    
    // Initialiser l'autonomie
    this.autonomyConfig = { ...DEFAULT_AUTONOMY_CONFIG, ...autonomyConfig };
    this.autonomyJournal = globalAutonomyJournal;
    this.autonomyCounter = new AutonomyCounter(this.autonomyConfig);
    
    // Initialiser l'état mental
    this.state = this.createInitialState();
    
    // Initialiser les mémoires
    this.workingMemory = {
      currentGoal: undefined,
      currentPlan: undefined,
      recentEvents: [],
      contextWindow: [],
      activeVariables: {},
    };
    
    this.episodicMemory = {
      episodes: [],
      maxEpisodes: this.config.memoryConfig.maxEpisodes,
    };
    
    // Initialiser les agents
    this.notificationAgent = createNotificationAgent();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.agents = new Map<AgentType, any>([
      ['thinker', createThinkerAgent({
        onProviderChange: (provider, model) => {
          this.currentProvider = provider;
          this.currentModel = model;
        },
      })],
      ['filesystem', createFileSystemAgent()],
      ['system', createSystemAgent()],
      ['uiBuilder', createUIBuilderAgent()],
      ['notification', this.notificationAgent],
    ]);
    
    console.log('[CognitiveBrain] Initialized with autonomy level:', this.autonomyConfig.level);
  }

  // ──────────────────────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────────────────────

  /**
   * Configurer le callback de notification
   */
  setNotificationCallback(
    callback: (message: string, priority: 'low' | 'medium' | 'high' | 'critical') => string
  ): void {
    this.notificationAgent.setPushCallback(callback);
  }

  /**
   * Envoyer un message utilisateur au cerveau
   */
  async sendMessage(content: string): Promise<void> {
    const event = createEvent('user', 'intent.message', { content }, { priority: 'high' });
    await this.pushEvent(event);
  }

  /**
   * Envoyer une action UI au cerveau
   */
  async sendAction(actionId: string, payload: Record<string, unknown>): Promise<void> {
    const event = createEvent('ui', 'intent.action', { actionId, payload }, { priority: 'high' });
    await this.pushEvent(event);
  }
  
  // ──────────────────────────────────────────────────────────────
  // AUTONOMY PUBLIC API
  // ──────────────────────────────────────────────────────────────
  
  /**
   * Configurer le niveau d'autonomie
   */
  setAutonomyConfig(config: Partial<AutonomyConfig>): void {
    this.autonomyConfig = { ...this.autonomyConfig, ...config };
    this.autonomyCounter = new AutonomyCounter(this.autonomyConfig);
    this.autonomyJournal.logDecision('Configuration d\'autonomie mise à jour', config);
  }
  
  /**
   * Obtenir la configuration d'autonomie actuelle
   */
  getAutonomyConfig(): AutonomyConfig {
    return { ...this.autonomyConfig };
  }
  
  /**
   * Obtenir le journal d'autonomie
   */
  getAutonomyLog(count = 20): Array<{ type: string; summary: string; timestamp: number }> {
    return this.autonomyJournal.getRecentEntries(count);
  }
  
  /**
   * Mettre en pause l'exécution autonome
   */
  pauseAutonomy(): void {
    if (this.autoContinueEngine) {
      this.autoContinueEngine.pause();
      this.isAutonomousMode = false;
      this.autonomyJournal.logDecision('Autonomie mise en pause');
      this.callbacks.onAutonomyPause?.('Pause demandée par l\'utilisateur');
    }
  }
  
  /**
   * Reprendre l'exécution autonome
   */
  resumeAutonomy(): void {
    if (this.autoContinueEngine) {
      this.autoContinueEngine.resume();
      this.isAutonomousMode = true;
      this.autonomyJournal.logDecision('Autonomie reprise');
      this.callbacks.onAutonomyResume?.();
    }
  }
  
  /**
   * Vérifier si en mode autonome
   */
  isInAutonomousMode(): boolean {
    return this.isAutonomousMode;
  }
  
  /**
   * Obtenir les stats d'autonomie courantes
   */
  getAutonomyStats(): { actionCount: number; limit: number; isActive: boolean } {
    const stats = this.autonomyCounter.getStats();
    return {
      actionCount: stats.count,
      limit: stats.limit,
      isActive: this.isAutonomousMode,
    };
  }

  /**
   * Obtenir l'état mental actuel
   */
  getState(): MentalState {
    return { ...this.state };
  }

  /**
   * Obtenir le provider actif
   */
  getActiveProvider(): { provider: string; model: string } {
    return { provider: this.currentProvider, model: this.currentModel };
  }

  /**
   * Obtenir les messages du contexte
   */
  getMessages(): Message[] {
    return [...this.workingMemory.contextWindow];
  }

  /**
   * Reset complet du cerveau
   */
  reset(): void {
    this.state = this.createInitialState();
    this.workingMemory = {
      currentGoal: undefined,
      currentPlan: undefined,
      recentEvents: [],
      contextWindow: [],
      activeVariables: {},
    };
    this.eventQueue = [];
    this.taskQueue = [];
    this.runningTasks.clear();
    this.isProcessing = false;
    
    this.callbacks.onStateChange?.(this.state);
    console.log('[CognitiveBrain] Reset complete');
  }

  // ──────────────────────────────────────────────────────────────
  // EVENT PROCESSING - Le cœur du loop cognitif
  // ──────────────────────────────────────────────────────────────

  private async pushEvent(event: CognitiveEvent): Promise<void> {
    this.eventQueue.push(event);
    this.workingMemory.recentEvents.push(event);
    
    // Limiter la taille de la mémoire de travail
    if (this.workingMemory.recentEvents.length > this.config.memoryConfig.maxWorkingEvents) {
      this.workingMemory.recentEvents.shift();
    }
    
    this.callbacks.onEvent?.(event);
    
    // Démarrer le processing si pas déjà en cours
    if (!this.isProcessing) {
      await this.processEventLoop();
    }
  }

  /**
   * LOOP COGNITIF PRINCIPAL
   * C'est ici que la magie opère
   */
  private async processEventLoop(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    console.log('[CognitiveBrain] Starting cognitive loop');

    try {
      while (this.eventQueue.length > 0) {
        // 1. Récupérer l'événement prioritaire
        const event = this.getNextEvent();
        if (!event) break;

        console.log(`[CognitiveBrain] Processing event: ${event.type}`);

        // 2. Mettre à jour l'état mental
        this.updateMentalState(event);

        // 3. Penser (générer hypothèses/plans)
        const decision = await this.think(event);

        // 4. Exécuter les actions décidées
        if (decision.tasks.length > 0) {
          await this.executeTasks(decision.tasks, event.id);
        }

        // 5. Observer les résultats (géré par les callbacks des tâches)
        
        // 6. Adapter le plan si nécessaire (fait dans think())
      }
    } finally {
      this.isProcessing = false;
      this.setMode('idle');
      console.log('[CognitiveBrain] Cognitive loop ended');
    }
  }

  private getNextEvent(): CognitiveEvent | undefined {
    // Trier par priorité (critical > high > normal > low)
    this.eventQueue.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    return this.eventQueue.shift();
  }

  // ──────────────────────────────────────────────────────────────
  // THINKING ENGINE - Raisonnement
  // ──────────────────────────────────────────────────────────────

  private async think(event: CognitiveEvent): Promise<{
    thoughts: Thought[];
    tasks: CognitiveTask[];
  }> {
    this.setMode('thinking');
    
    const thoughts: Thought[] = [];
    const tasks: CognitiveTask[] = [];

    // Selon le type d'événement, décider quoi faire
    switch (event.type) {
      case 'intent.message': {
        const { content } = event.payload as { content: string };
        
        // Ajouter le message à la mémoire
        this.addToContext({ role: 'user', content });
        
        // Analyser la complexité de la tâche
        const complexity = analyzeTaskComplexity(content);
        
        if (complexity.isComplex && this.config.thinkingConfig.enableAutoPlanning) {
          // Tâche complexe → activer le mode planification
          console.log(`[CognitiveBrain] Complex task detected (score: ${complexity.score})`);
          await this.handleComplexTask(content, event.id);
        } else {
          // Tâche simple → traitement direct
          const goal = this.createGoal(`Répondre à: ${content.slice(0, 50)}...`);
          this.workingMemory.currentGoal = goal;
          
          const thinkTask = createTask(
            'thinker',
            'respond',
            {
              messages: this.workingMemory.contextWindow,
              context: {
                activeGoal: goal.description,
                environmentInfo: {
                  isElectron: isElectronEnvironment(),
                  systemAvailable: this.state.environmentContext.systemAvailable,
                },
              },
              mode: 'respond' as const,
            },
            event.id,
            { priority: 1 }
          );
          
          tasks.push(thinkTask);
        }
        break;
      }

      case 'intent.action': {
        const { actionId, payload } = event.payload as { actionId: string; payload: Record<string, unknown> };
        
        // Construire un message d'action
        const actionContent = `Action: ${actionId} - ${JSON.stringify(payload)}`;
        this.addToContext({ role: 'user', content: actionContent });
        
        // Créer une tâche de réponse à l'action
        const actionTask = createTask(
          'thinker',
          'respond',
          {
            messages: this.workingMemory.contextWindow,
            mode: 'respond' as const,
          },
          event.id,
          { priority: 1 }
        );
        
        tasks.push(actionTask);
        break;
      }

      case 'task.completed': {
        const taskResult = event.payload as { taskId: string; result: unknown };
        await this.handleTaskCompletion(taskResult, event.id, tasks);
        break;
      }

      case 'system.result': {
        // Les résultats système sont traités dans handleTaskCompletion
        break;
      }

      default:
        console.log(`[CognitiveBrain] Unhandled event type: ${event.type}`);
    }

    // Notifier des pensées générées
    thoughts.forEach(t => this.callbacks.onThought?.(t));

    return { thoughts, tasks };
  }

  // ──────────────────────────────────────────────────────────────
  // TASK EXECUTION - Exécution des tâches via agents
  // ──────────────────────────────────────────────────────────────

  private async executeTasks(tasks: CognitiveTask[], correlationId: string): Promise<void> {
    this.setMode('executing');
    
    for (const task of tasks) {
      await this.executeTask(task, correlationId);
    }
  }

  private async executeTask(task: CognitiveTask, correlationId: string): Promise<void> {
    const agent = this.agents.get(task.agent);
    if (!agent) {
      console.error(`[CognitiveBrain] Agent not found: ${task.agent}`);
      return;
    }

    // Vérifier disponibilité
    const isAvailable = await agent.isAvailable();
    if (!isAvailable) {
      console.warn(`[CognitiveBrain] Agent not available: ${task.agent}`);
      // Fallback ou notification
      this.callbacks.onNotification?.(`Agent ${task.agent} non disponible`, 'high');
      return;
    }

    // Marquer comme en cours
    task.status = 'running';
    task.startedAt = Date.now();
    this.runningTasks.set(task.id, task);
    this.callbacks.onTaskUpdate?.(task);

    try {
      // Exécuter l'agent
      const result = await agent.execute(task);

      // Marquer comme terminé
      task.status = result.success ? 'completed' : 'failed';
      task.completedAt = Date.now();
      task.result = result.data;
      task.error = result.error;

      this.runningTasks.delete(task.id);
      this.callbacks.onTaskUpdate?.(task);

      // Traiter le résultat selon l'agent
      await this.processTaskResult(task, result, correlationId);

    } catch (error) {
      task.status = 'failed';
      task.completedAt = Date.now();
      task.error = error instanceof Error ? error.message : 'Unknown error';
      
      this.runningTasks.delete(task.id);
      this.callbacks.onTaskUpdate?.(task);
      this.callbacks.onError?.(task.error);
    }
  }

  private async processTaskResult(
    task: CognitiveTask,
    result: AgentResult,
    correlationId: string
  ): Promise<void> {
    this.setMode('observing');

    if (!result.success) {
      console.error(`[CognitiveBrain] Task failed: ${task.id}`, result.error);
      // Afficher un schéma d'erreur
      this.callbacks.onUISchema?.(createErrorSchema(
        result.error || 'Une erreur est survenue',
        true,
        { provider: this.currentProvider }
      ));
      return;
    }

    switch (task.agent) {
      case 'thinker': {
        const thinkResult = result.data as {
          thought?: Thought;
          uiSchema?: unknown;
          actions?: Array<{ agent: string; action: string; params: Record<string, unknown> }>;
          notifications?: Array<{ message: string; priority: 'low' | 'medium' | 'high' | 'critical' }>;
          rawResponse: string;
          provider: string;
          model: string;
          needsRetry?: boolean;
          retryReason?: string;
          rawError?: string;
        };

        // Sauvegarder la réponse brute pour retry potentiel
        this.lastRawResponse = thinkResult.rawResponse;

        // Enregistrer la pensée
        if (thinkResult.thought) {
          this.callbacks.onThought?.(thinkResult.thought);
        }

        // Vérifier si un retry est nécessaire
        if (thinkResult.needsRetry) {
          await this.handleRetry(thinkResult, correlationId);
          return;
        }

        // Reset retry count on success
        this.retryCount = 0;

        // Ajouter la réponse au contexte
        this.addToContext({ role: 'assistant', content: thinkResult.rawResponse });

        // Vérifier les commandes système dans la réponse
        const systemActions = parseSystemActions(thinkResult.rawResponse);
        if (systemActions.length > 0 && isElectronEnvironment()) {
          // Exécuter les commandes système
          await this.executeSystemActions(systemActions, correlationId, thinkResult.rawResponse);
        } else {
          // Pas de commandes système, afficher le schéma directement
          if (thinkResult.uiSchema) {
            this.callbacks.onUISchema?.(thinkResult.uiSchema);
          } else {
            // Pas de schéma → créer un fallback
            console.warn('[CognitiveBrain] No UI schema in response, creating fallback');
            const fallbackSchema = createTextFallbackSchema(
              thinkResult.rawResponse.slice(0, 500),
              thinkResult.thought?.content
            );
            this.callbacks.onUISchema?.(fallbackSchema);
          }
        }

        // Traiter les notifications
        if (thinkResult.notifications) {
          for (const notif of thinkResult.notifications) {
            this.callbacks.onNotification?.(notif.message, notif.priority);
          }
        }

        // Créer des tâches supplémentaires si demandées
        if (thinkResult.actions) {
          for (const action of thinkResult.actions) {
            const newTask = createTask(
              action.agent as AgentType,
              action.action,
              action.params,
              correlationId,
              { priority: 5 }
            );
            await this.executeTask(newTask, correlationId);
          }
        }
        break;
      }

      case 'uiBuilder': {
        const uiResult = result.data as { schema: unknown };
        if (uiResult.schema) {
          this.callbacks.onUISchema?.(uiResult.schema);
        }
        break;
      }

      case 'notification': {
        // Déjà géré par l'agent
        break;
      }

      default:
        // Autres agents : stocker le résultat
        this.workingMemory.activeVariables[`lastResult_${task.agent}`] = result.data;
    }

    // Enregistrer l'épisode
    this.recordEpisode(task, result);
  }

  // ──────────────────────────────────────────────────────────────
  // RETRY HANDLING - Auto-correction
  // ──────────────────────────────────────────────────────────────

  private async handleRetry(
    thinkResult: { retryReason?: string; rawResponse: string; rawError?: string },
    correlationId: string
  ): Promise<void> {
    if (this.retryCount >= ASYNC_CONFIG.maxRetries) {
      // Max retries atteint → afficher erreur finale
      console.error('[CognitiveBrain] Max retries reached');
      this.callbacks.onUISchema?.(createErrorSchema(
        'Impossible de traiter la réponse après plusieurs tentatives',
        false,
        {
          attemptNumber: this.retryCount,
          maxAttempts: ASYNC_CONFIG.maxRetries,
          technicalMessage: thinkResult.rawError,
        }
      ));
      this.retryCount = 0;
      return;
    }

    this.retryCount++;
    console.log(`[CognitiveBrain] Retry attempt ${this.retryCount}/${ASYNC_CONFIG.maxRetries}`);

    // Afficher schéma de transition pendant le retry
    this.callbacks.onUISchema?.(createLoadingSchema(
      `Correction en cours (tentative ${this.retryCount}/${ASYNC_CONFIG.maxRetries})`,
      { count: 1, current: 'Auto-correction du format' }
    ));

    // Attendre un peu avant de retry
    await new Promise(resolve => setTimeout(resolve, ASYNC_CONFIG.retryDelayMs));

    // Créer le prompt de correction
    const correctionPrompt = buildCorrectionPrompt(
      thinkResult.rawResponse,
      thinkResult.retryReason || 'unknown_error'
    );

    // Ajouter au contexte et relancer
    this.addToContext({ role: 'user', content: correctionPrompt });

    const retryTask = createTask(
      'thinker',
      'respond',
      {
        messages: this.workingMemory.contextWindow,
        mode: 'respond' as const,
      },
      correlationId,
      { priority: 1 }
    );

    await this.executeTask(retryTask, correlationId);
  }

  // ──────────────────────────────────────────────────────────────
  // COMPLEX TASK HANDLING - Planification multi-étapes
  // ──────────────────────────────────────────────────────────────

  private async handleComplexTask(content: string, correlationId: string): Promise<void> {
    this.setMode('planning');
    
    // Afficher un schéma de transition pendant la planification
    this.callbacks.onUISchema?.(createLoadingSchema(
      'Analyse de la demande...',
      { count: 1, current: 'Génération du plan d\'exécution' }
    ));
    
    // Créer un goal pour cette tâche complexe
    const goal = this.createGoal(`Plan: ${content.slice(0, 50)}...`);
    this.workingMemory.currentGoal = goal;
    
    // Générer le plan via PlannerAgent
    const plannerAgent = createPlannerAgent();
    const planParams = {
      objective: content,
      context: {
        systemAvailable: this.state.environmentContext.systemAvailable,
      },
    };
    
    // Exécuter directement sans passer par createTask pour éviter les problèmes de typage
    const startTime = Date.now();
    let planResult: AgentResult<{ plan: ExecutionPlan; isComplex: boolean; estimatedDuration: number }>;
    
    try {
      const complexity = analyzeTaskComplexity(content);
      
      if (!complexity.isComplex) {
        // Pas vraiment complexe - fallback direct
        const thinkTask = createTask(
          'thinker',
          'respond',
          {
            messages: this.workingMemory.contextWindow,
            mode: 'respond' as const,
          },
          correlationId,
          { priority: 1 }
        );
        await this.executeTask(thinkTask, correlationId);
        return;
      }
      
      // Créer le plan via l'IA
      const mockTask: CognitiveTask = {
        id: generateId('task'),
        agent: 'thinker' as AgentType,
        action: 'plan',
        params: planParams,
        status: 'running' as const,
        priority: 1,
        createdAt: Date.now(),
        correlationId,
        retryCount: 0,
        maxRetries: 2,
      };
      
      planResult = await plannerAgent.execute(mockTask);
    } catch (error) {
      console.error('[CognitiveBrain] Planning error:', error);
      const thinkTask = createTask(
        'thinker',
        'respond',
        {
          messages: this.workingMemory.contextWindow,
          mode: 'respond' as const,
        },
        correlationId,
        { priority: 1 }
      );
      await this.executeTask(thinkTask, correlationId);
      return;
    }
    
    if (!planResult.success || !planResult.data) {
      // Fallback sur traitement simple si planification échoue
      console.warn('[CognitiveBrain] Planning failed, falling back to simple mode');
      const thinkTask = createTask(
        'thinker',
        'respond',
        {
          messages: this.workingMemory.contextWindow,
          mode: 'respond' as const,
        },
        correlationId,
        { priority: 1 }
      );
      await this.executeTask(thinkTask, correlationId);
      return;
    }
    
    const { plan, isComplex } = planResult.data;
    this.currentPlan = plan;
    
    if (!isComplex) {
      // Finalement pas si complexe → traitement direct
      const thinkTask = createTask(
        'thinker',
        'respond',
        {
          messages: this.workingMemory.contextWindow,
          mode: 'respond' as const,
        },
        correlationId,
        { priority: 1 }
      );
      await this.executeTask(thinkTask, correlationId);
      return;
    }
    
    // Afficher le plan à l'utilisateur
    this.callbacks.onUISchema?.(createPlanPreviewSchema(plan));
    this.callbacks.onNotification?.(`Plan généré: ${plan.steps.length} étapes`, 'medium');
    
    // Exécuter le plan
    await this.executePlan(plan, correlationId);
  }

  private async executePlan(plan: ExecutionPlan, correlationId: string): Promise<void> {
    this.setMode('executing');
    this.isAutonomousMode = true;
    
    // Créer le moteur d'auto-continuation
    this.autoContinueEngine = new AutoContinueEngine(this.autonomyConfig, {
      onContinue: async (steps) => {
        this.autonomyJournal.logAction(
          `Auto-continue: ${steps.length} étape(s)`,
          steps[0]?.id,
          plan.id
        );
      },
      
      onPause: (reason) => {
        this.callbacks.onNotification?.(reason, 'medium');
        this.callbacks.onAutonomyPause?.(reason);
      },
      
      onConfirmDestructive: async (action, description) => {
        if (this.callbacks.onConfirmDestructive) {
          return await this.callbacks.onConfirmDestructive(action, description);
        }
        // Par défaut, refuser les actions destructrices sans callback
        this.autonomyJournal.logDecision('Action destructrice bloquée (pas de callback)', { action });
        return false;
      },
      
      onObjectiveReached: (summary) => {
        this.autonomyJournal.logDecision('Objectif atteint', { summary });
        this.callbacks.onNotification?.(summary, 'medium');
      },
    });
    
    // Créer l'exécuteur de plan avec callbacks
    this.planExecutor = createPlanExecutor(plan, this.agents, {
      onPlanEvent: (event) => {
        console.log(`[CognitiveBrain] Plan event: ${event.type}`);
        // Notifier le journal d'autonomie
        this.callbacks.onAutonomyLog?.({
          type: event.type,
          summary: `Plan: ${event.type}`,
          timestamp: event.timestamp,
        });
      },
      
      onStepUpdate: (step) => {
        this.callbacks.onUISchema?.(createPlanProgressSchema(plan, step));
        this.autonomyCounter.increment();
        
        // Logger chaque action dans le journal
        this.callbacks.onAutonomyLog?.({
          type: 'step',
          summary: `${step.action} (${step.status})`,
          timestamp: Date.now(),
        });
      },
      
      onProgressUpdate: (progress, currentStep) => {
        plan.progress = progress;
        if (currentStep) {
          this.callbacks.onUISchema?.(createPlanProgressSchema(plan, currentStep));
        }
      },
      
      onPhaseComplete: (result) => {
        console.log(`[CognitiveBrain] Phase ${result.phaseIndex} complete, success: ${result.allSuccessful}`);
        
        // Si auto-continue activé et phase réussie, continuer automatiquement
        if (this.autonomyConfig.triggers.autoContinue && result.allSuccessful) {
          this.autonomyJournal.logDecision(`Phase ${result.phaseIndex + 1} réussie, auto-continue`);
        }
        
        if (!result.allSuccessful) {
          this.callbacks.onNotification?.(
            `Phase ${result.phaseIndex + 1}: ${result.stepResults.filter(r => !r.success).length} erreur(s)`,
            'high'
          );
          
          // Si auto-fix activé, tenter de corriger
          if (this.autonomyConfig.triggers.autoFixErrors) {
            this.autonomyJournal.logDecision('Tentative d\'auto-correction après échec de phase');
          }
        }
      },
      
      onPlanComplete: (completedPlan, stats) => {
        this.isAutonomousMode = false;
        
        this.callbacks.onUISchema?.(createPlanCompletionSchema(completedPlan, stats));
        
        const summary = stats.failedSteps === 0 
          ? `✅ Plan exécuté avec succès (${stats.completedSteps} étapes en ${Math.round(stats.totalDuration / 1000)}s)`
          : `⚠️ Plan terminé avec ${stats.failedSteps} erreur(s)`;
          
        this.callbacks.onNotification?.(summary, stats.failedSteps === 0 ? 'medium' : 'high');
        
        // Logger le résumé final
        this.autonomyJournal.logDecision('Plan terminé', {
          objective: completedPlan.objective,
          completed: stats.completedSteps,
          failed: stats.failedSteps,
          skipped: stats.skippedSteps,
          duration: stats.totalDuration,
        });
        
        // Enregistrer dans l'historique
        this.addToContext({
          role: 'assistant',
          content: `${summary}\nObjectif: "${completedPlan.objective}"\n${stats.completedSteps}/${stats.totalSteps} étapes réussies.`,
        });
        
        // Marquer le goal comme complété
        if (this.workingMemory.currentGoal) {
          this.workingMemory.currentGoal.status = stats.failedSteps === 0 ? 'completed' : 'failed';
          this.workingMemory.currentGoal.completedAt = Date.now();
        }
      },
      
      onError: (error, step) => {
        console.error(`[CognitiveBrain] Plan error: ${error}`, step);
        this.autonomyJournal.logError(`Erreur étape: ${step?.action || 'unknown'}`, { error });
        this.callbacks.onError?.(error);
      },
    });
    
    try {
      // Vérifier si on doit utiliser l'auto-continuation autonome
      if (this.autonomyConfig.level === 'auto-run' && this.autonomyConfig.triggers.autoContinue) {
        // Mode autonome complet - le plan s'exécute jusqu'à l'objectif
        this.autonomyJournal.logDecision('Démarrage en mode autonome total');
        await this.planExecutor.execute();
      } else {
        // Mode classique
        await this.planExecutor.execute();
      }
    } catch (error) {
      console.error('[CognitiveBrain] Plan execution failed:', error);
      this.autonomyJournal.logError('Échec d\'exécution du plan', { error: error instanceof Error ? error.message : 'Unknown' });
      this.callbacks.onUISchema?.(createErrorSchema(
        error instanceof Error ? error.message : 'Erreur d\'exécution du plan',
        true,
        { provider: this.currentProvider }
      ));
    } finally {
      this.currentPlan = null;
      this.planExecutor = null;
      this.autoContinueEngine = null;
      this.isAutonomousMode = false;
      this.setMode('idle');
    }
  }

  // ──────────────────────────────────────────────────────────────
  // SYSTEM ACTIONS - Exécution commandes système
  // ──────────────────────────────────────────────────────────────

  private async executeSystemActions(
    actions: ReturnType<typeof parseSystemActions>,
    correlationId: string,
    originalResponse: string
  ): Promise<void> {
    this.setMode('executing');
    
    // Afficher IMMÉDIATEMENT un schéma de transition
    const commandStrings = actions.map(a => {
      const payload = a.payload;
      return `${a.type}: ${payload.command || payload.path || ''}`;
    });
    this.callbacks.onUISchema?.(createSystemExecutionSchema(commandStrings, 0));
    this.callbacks.onNotification?.('Exécution des commandes système...', 'medium');

    const results: Array<{ action: string; success: boolean; output: string; data?: unknown }> = [];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      
      // Mettre à jour le schéma de progression
      this.callbacks.onUISchema?.(createSystemExecutionSchema(commandStrings, i));
      
      const result = await executeSystemAction(action);
      const formatted = formatActionResultForAI(result);
      
      results.push({
        action: action.type,
        success: result.success,
        output: formatted.summary,
        data: formatted.data,
      });

      if (!result.success) {
        this.callbacks.onNotification?.(`Échec: ${action.type}`, 'high');
      }
    }

    this.callbacks.onNotification?.(`${results.length} commande(s) exécutée(s)`, 'medium');

    // Demander à l'IA de construire un schéma avec les résultats
    await this.buildUIFromSystemResults(results, correlationId);
  }

  private async buildUIFromSystemResults(
    results: Array<{ action: string; success: boolean; output: string; data?: unknown }>,
    correlationId: string
  ): Promise<void> {
    this.setMode('thinking');

    // Créer un message avec les résultats
    const resultsMessage: Message = {
      role: 'user',
      content: `
RÉSULTATS DES COMMANDES SYSTÈME:

${results.map((r, i) => `
[COMMANDE ${i + 1}]
Action: ${r.action}
Statut: ${r.success ? 'SUCCÈS' : 'ÉCHEC'}
Sortie: ${r.output}
Données: ${JSON.stringify(r.data)}
`).join('\n---\n')}

Construis un schéma UI optimal pour afficher ces résultats.
      `,
    };

    // Ajouter au contexte et lancer le thinker
    this.addToContext(resultsMessage);

    const task = createTask(
      'thinker',
      'buildUI',
      {
        messages: this.workingMemory.contextWindow,
        context: { systemResults: results },
        mode: 'respond' as const,
      },
      correlationId,
      { priority: 1 }
    );

    await this.executeTask(task, correlationId);
  }

  // ──────────────────────────────────────────────────────────────
  // MEMORY MANAGEMENT
  // ──────────────────────────────────────────────────────────────

  private addToContext(message: Message): void {
    this.workingMemory.contextWindow.push(message);
    
    // Limiter la taille
    if (this.workingMemory.contextWindow.length > this.config.memoryConfig.maxContextMessages) {
      this.workingMemory.contextWindow.shift();
    }
  }

  private recordEpisode(task: CognitiveTask, result: AgentResult): void {
    const episode: Episode = {
      id: generateId('ep'),
      type: 'task',
      summary: `${task.agent}:${task.action} - ${result.success ? 'success' : 'failure'}`,
      timestamp: Date.now(),
      duration: result.duration,
      outcome: result.success ? 'success' : 'failure',
      relatedGoalId: this.workingMemory.currentGoal?.id,
      data: { taskId: task.id, result: result.data },
    };

    this.episodicMemory.episodes.push(episode);
    
    // Limiter la taille
    if (this.episodicMemory.episodes.length > this.episodicMemory.maxEpisodes) {
      this.episodicMemory.episodes.shift();
    }
  }

  // ──────────────────────────────────────────────────────────────
  // STATE MANAGEMENT
  // ──────────────────────────────────────────────────────────────

  private createInitialState(): MentalState {
    return {
      mode: 'idle',
      activeGoals: [],
      pendingTasks: [],
      completedTasks: [],
      confidence: 1.0,
      lastActivity: Date.now(),
      conversationContext: {
        messageCount: 0,
        topicHistory: [],
      },
      environmentContext: {
        isElectron: isElectronEnvironment(),
        systemAvailable: typeof window !== 'undefined' && !!window.cognitiveBridge?.isElectron,
      },
    };
  }

  private setMode(mode: BrainMode): void {
    if (this.state.mode !== mode) {
      this.state.mode = mode;
      this.state.lastActivity = Date.now();
      this.callbacks.onStateChange?.(this.state);
    }
  }

  private updateMentalState(event: CognitiveEvent): void {
    this.state.lastActivity = Date.now();
    
    if (event.type === 'intent.message') {
      this.state.conversationContext.messageCount++;
    }
    
    this.callbacks.onStateChange?.(this.state);
  }

  private createGoal(description: string, priority = 1): Goal {
    const goal: Goal = {
      id: generateId('goal'),
      description,
      priority,
      status: 'active',
      createdAt: Date.now(),
      subGoalIds: [],
    };
    
    this.state.activeGoals.push(goal);
    return goal;
  }

  private async handleTaskCompletion(
    taskResult: { taskId: string; result: unknown },
    correlationId: string,
    tasks: CognitiveTask[]
  ): Promise<void> {
    // Marquer le goal comme complété si plus de tâches
    const goal = this.workingMemory.currentGoal;
    if (goal && this.runningTasks.size === 0 && this.taskQueue.length === 0) {
      goal.status = 'completed';
      goal.completedAt = Date.now();
    }
  }
}

// ──────────────────────────────────────────────────────────────
// FACTORY
// ──────────────────────────────────────────────────────────────

export function createCognitiveBrain(
  config?: Partial<BrainConfig>,
  callbacks?: Partial<BrainCallbacks>
): CognitiveBrain {
  return new CognitiveBrain(config, callbacks);
}
