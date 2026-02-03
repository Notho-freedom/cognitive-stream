// ═══════════════════════════════════════════════════════════════
// PLAN EXECUTOR
// Moteur d'exécution parallèle des plans multi-étapes
// ═══════════════════════════════════════════════════════════════

import type {
  ExecutionPlan,
  PlanStep,
  PhaseResult,
  PlanStats,
  PlanExecutorCallbacks,
  PlanEvent,
} from './agents/plannerTypes';
import type { Agent, AgentResult, AgentType, CognitiveTask } from './types';
import { generateId, createTask } from './types';
import { PLAN_CONFIG } from './agents/PlannerAgent';

// ──────────────────────────────────────────────────────────────
// PLAN EXECUTOR CLASS
// ──────────────────────────────────────────────────────────────

export class PlanExecutor {
  private plan: ExecutionPlan;
  private agents: Map<AgentType, Agent>;
  private callbacks: Partial<PlanExecutorCallbacks>;
  private runningTasks: Map<string, Promise<AgentResult>> = new Map();
  private aborted = false;

  constructor(
    plan: ExecutionPlan,
    agents: Map<AgentType, Agent>,
    callbacks: Partial<PlanExecutorCallbacks> = {}
  ) {
    this.plan = plan;
    this.agents = agents;
    this.callbacks = callbacks;
  }

  // ──────────────────────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────────────────────

  async execute(): Promise<ExecutionPlan> {
    this.plan.status = 'executing';
    this.plan.startedAt = Date.now();
    
    this.emitEvent('plan.started');
    
    try {
      // Exécuter phase par phase
      while (this.plan.currentPhase < this.plan.totalPhases && !this.aborted) {
        const phaseResult = await this.executeNextPhase();
        
        if (!phaseResult.allSuccessful && phaseResult.needsReplan) {
          // Trop d'échecs - adapter le plan
          await this.adaptPlan(phaseResult);
        }
        
        this.plan.currentPhase++;
        this.updateProgress();
      }
      
      // Calculer les stats
      this.plan.stats = this.computeStats();
      this.plan.status = this.aborted ? 'failed' : 'completed';
      this.plan.completedAt = Date.now();
      
      this.emitEvent('plan.completed');
      this.callbacks.onPlanComplete?.(this.plan, this.plan.stats);
      
    } catch (error) {
      this.plan.status = 'failed';
      this.plan.completedAt = Date.now();
      this.emitEvent('plan.failed', { error: (error as Error).message });
      throw error;
    }
    
    return this.plan;
  }

  abort(): void {
    this.aborted = true;
    this.plan.status = 'paused';
  }

  // ──────────────────────────────────────────────────────────────
  // PHASE EXECUTION
  // ──────────────────────────────────────────────────────────────

  private async executeNextPhase(): Promise<PhaseResult> {
    const phaseIndex = this.plan.currentPhase;
    const phaseStepIds = this.plan.parallelGroups[phaseIndex] || [];
    
    this.emitEvent('phase.started', { phaseIndex });
    
    // Récupérer les étapes de cette phase
    const phaseSteps = this.plan.steps.filter(s => phaseStepIds.includes(s.id));
    
    // Vérifier quelles étapes sont prêtes (dépendances satisfaites)
    const readySteps = phaseSteps.filter(step => {
      const depsCompleted = step.dependsOn.every(depId => {
        const dep = this.plan.steps.find(s => s.id === depId);
        return dep?.status === 'completed';
      });
      
      // Marquer comme skipped si une dépendance a échoué
      const depFailed = step.dependsOn.some(depId => {
        const dep = this.plan.steps.find(s => s.id === depId);
        return dep?.status === 'failed' || dep?.status === 'skipped';
      });
      
      if (depFailed && !step.canFail) {
        step.status = 'skipped';
        this.callbacks.onStepUpdate?.(step);
        return false;
      }
      
      return depsCompleted;
    });
    
    // Exécuter en parallèle
    const promises = readySteps.map(step => this.executeStep(step));
    const results = await Promise.allSettled(promises);
    
    // Compiler les résultats
    const stepResults = results.map((r, i) => {
      const step = readySteps[i];
      const success = r.status === 'fulfilled' && r.value?.success;
      return {
        stepId: step.id,
        success,
        result: r.status === 'fulfilled' ? r.value : undefined,
        duration: step.actualDuration || 0,
      };
    });
    
    const failedCount = stepResults.filter(r => !r.success).length;
    const failureRatio = failedCount / Math.max(stepResults.length, 1);
    
    const phaseResult: PhaseResult = {
      phaseIndex,
      stepResults,
      allSuccessful: failedCount === 0,
      needsReplan: failureRatio >= PLAN_CONFIG.replanThreshold,
    };
    
    this.emitEvent('phase.completed', phaseResult);
    this.callbacks.onPhaseComplete?.(phaseResult);
    
    return phaseResult;
  }

  // ──────────────────────────────────────────────────────────────
  // STEP EXECUTION
  // ──────────────────────────────────────────────────────────────

  private async executeStep(step: PlanStep): Promise<AgentResult> {
    const agent = this.agents.get(step.agent);
    
    if (!agent) {
      step.status = 'failed';
      step.error = `Agent not found: ${step.agent}`;
      this.callbacks.onStepUpdate?.(step);
      this.emitEvent('step.failed', { stepId: step.id, error: step.error });
      return { success: false, error: step.error, duration: 0 };
    }
    
    // Vérifier disponibilité
    const isAvailable = await agent.isAvailable();
    if (!isAvailable) {
      step.status = 'failed';
      step.error = `Agent unavailable: ${step.agent}`;
      this.callbacks.onStepUpdate?.(step);
      return { success: false, error: step.error, duration: 0 };
    }
    
    // Marquer comme en cours
    step.status = 'running';
    step.startedAt = Date.now();
    this.callbacks.onStepUpdate?.(step);
    this.emitEvent('step.started', { stepId: step.id });
    
    try {
      // Créer la tâche
      const task = createTask(
        step.agent,
        step.action,
        step.params,
        this.plan.id,
        {
          timeout: step.estimatedDuration * 2,
          maxRetries: step.maxRetries,
        }
      );
      
      // Exécuter avec timeout
      const result = await this.executeWithTimeout(agent, task, step.estimatedDuration * 2);
      
      step.completedAt = Date.now();
      step.actualDuration = step.completedAt - step.startedAt;
      step.result = result.data;
      
      if (result.success) {
        step.status = 'completed';
        this.emitEvent('step.completed', { stepId: step.id, result });
      } else {
        await this.handleStepFailure(step, result.error || 'Unknown error', agent);
      }
      
      this.callbacks.onStepUpdate?.(step);
      return result;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.handleStepFailure(step, errorMsg, agent);
      return { success: false, error: errorMsg, duration: 0 };
    }
  }

  private async executeWithTimeout(
    agent: Agent,
    task: CognitiveTask,
    timeout: number
  ): Promise<AgentResult> {
    const timeoutPromise = new Promise<AgentResult>((_, reject) => {
      setTimeout(() => reject(new Error('Task timeout')), timeout);
    });
    
    const taskPromise = agent.execute(task);
    this.runningTasks.set(task.id, taskPromise);
    
    try {
      return await Promise.race([taskPromise, timeoutPromise]);
    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // ERROR HANDLING & RETRY
  // ──────────────────────────────────────────────────────────────

  private async handleStepFailure(
    step: PlanStep,
    error: string,
    agent?: Agent
  ): Promise<void> {
    step.error = error;
    
    if (step.retryCount < step.maxRetries) {
      // Retry
      step.retryCount++;
      step.status = 'retrying';
      this.callbacks.onStepUpdate?.(step);
      this.emitEvent('step.retrying', { stepId: step.id, attempt: step.retryCount });
      
      // Attendre un peu avant retry
      await new Promise(r => setTimeout(r, 500 * step.retryCount));
      
      // Re-exécuter
      if (agent) {
        const retryResult = await this.executeStep(step);
        if (retryResult.success) return;
      }
    }
    
    // Échec définitif
    step.status = 'failed';
    step.completedAt = Date.now();
    this.callbacks.onStepUpdate?.(step);
    this.emitEvent('step.failed', { stepId: step.id, error });
    this.callbacks.onError?.(error, step);
    
    // Exécuter le fallback si disponible
    if (step.fallback && step.canFail) {
      await this.executeFallback(step);
    }
  }

  private async executeFallback(step: PlanStep): Promise<void> {
    if (!step.fallback) return;
    
    const fallbackAgent = this.agents.get(step.fallback.agent as AgentType);
    if (!fallbackAgent) return;
    
    console.log(`[PlanExecutor] Executing fallback for ${step.id}`);
    
    const fallbackTask = createTask(
      step.fallback.agent as AgentType,
      step.fallback.action,
      { originalStep: step.id, error: step.error },
      this.plan.id
    );
    
    try {
      await fallbackAgent.execute(fallbackTask);
    } catch {
      // Fallback failed - continue silently
    }
  }

  // ──────────────────────────────────────────────────────────────
  // ADAPTATION
  // ──────────────────────────────────────────────────────────────

  private async adaptPlan(failedPhase: PhaseResult): Promise<void> {
    this.plan.status = 'adapting';
    this.emitEvent('plan.adapted', { failedPhase });
    
    // Marquer les étapes non exécutées comme skipped
    const failedStepIds = new Set(
      failedPhase.stepResults.filter(r => !r.success).map(r => r.stepId)
    );
    
    for (const step of this.plan.steps) {
      if (step.status === 'pending') {
        // Vérifier si dépend d'une étape échouée
        const dependsOnFailed = step.dependsOn.some(id => failedStepIds.has(id));
        if (dependsOnFailed && !step.canFail) {
          step.status = 'skipped';
          this.callbacks.onStepUpdate?.(step);
        }
      }
    }
    
    this.plan.status = 'executing';
  }

  // ──────────────────────────────────────────────────────────────
  // UTILITIES
  // ──────────────────────────────────────────────────────────────

  private updateProgress(): void {
    const completed = this.plan.steps.filter(
      s => s.status === 'completed' || s.status === 'skipped' || s.status === 'failed'
    ).length;
    
    this.plan.progress = Math.round((completed / this.plan.steps.length) * 100);
    
    const currentStep = this.plan.steps.find(s => s.status === 'running');
    this.callbacks.onProgressUpdate?.(this.plan.progress, currentStep);
  }

  private computeStats(): PlanStats {
    const completedSteps = this.plan.steps.filter(s => s.status === 'completed');
    const failedSteps = this.plan.steps.filter(s => s.status === 'failed');
    const skippedSteps = this.plan.steps.filter(s => s.status === 'skipped');
    
    const totalDuration = this.plan.steps.reduce(
      (sum, s) => sum + (s.actualDuration || 0),
      0
    );
    
    return {
      totalSteps: this.plan.steps.length,
      completedSteps: completedSteps.length,
      failedSteps: failedSteps.length,
      skippedSteps: skippedSteps.length,
      totalDuration,
      avgStepDuration: totalDuration / Math.max(completedSteps.length, 1),
    };
  }

  private emitEvent(type: PlanEvent['type'], data?: unknown): void {
    const event: PlanEvent = {
      type,
      planId: this.plan.id,
      data,
      timestamp: Date.now(),
    };
    this.callbacks.onPlanEvent?.(event);
  }
}

// ──────────────────────────────────────────────────────────────
// FACTORY
// ──────────────────────────────────────────────────────────────

export function createPlanExecutor(
  plan: ExecutionPlan,
  agents: Map<AgentType, Agent>,
  callbacks?: Partial<PlanExecutorCallbacks>
): PlanExecutor {
  return new PlanExecutor(plan, agents, callbacks);
}
