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
import { PlanValidator, categorizeError, type CategorizedError } from './PlanValidator';

// ──────────────────────────────────────────────────────────────
// PLAN EXECUTOR CLASS
// ──────────────────────────────────────────────────────────────

// Track errors per step to detect infinite loops
interface ErrorTracker {
  stepId: string;
  errorSignature: string;
  count: number;
  lastOccurrence: number;
}

export class PlanExecutor {
  private plan: ExecutionPlan;
  private agents: Map<AgentType, Agent>;
  private callbacks: Partial<PlanExecutorCallbacks>;
  private runningTasks: Map<string, Promise<AgentResult>> = new Map();
  private aborted = false;
  
  // Anti-loop detection
  private errorTrackers: Map<string, ErrorTracker> = new Map();
  private static readonly MAX_SAME_ERROR_COUNT = 3;
  
  // Plan validator for auto-correction
  private validator: PlanValidator;

  constructor(
    plan: ExecutionPlan,
    agents: Map<AgentType, Agent>,
    callbacks: Partial<PlanExecutorCallbacks> = {}
  ) {
    // Validate and auto-correct the plan upfront
    this.validator = new PlanValidator();
    const { plan: correctedPlan, correctionsMade } = this.validator.validateAndCorrectPlan(plan);
    
    if (correctionsMade > 0) {
      console.log(`[PlanExecutor] Auto-corrected ${correctionsMade} step(s) during initialization`);
    }
    
    this.plan = correctedPlan;
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
      const failedDeps = step.dependsOn.filter(depId => {
        const dep = this.plan.steps.find(s => s.id === depId);
        return dep?.status === 'failed' || dep?.status === 'skipped';
      });
      
      if (failedDeps.length > 0) {
        const failedReason = `Dependency failed: ${failedDeps.join(', ')}`;
        if (step.isCritical) {
          step.status = 'failed';
          step.error = failedReason;
          step.completedAt = Date.now();
          this.callbacks.onStepUpdate?.(step);
          this.emitEvent('step.failed', { stepId: step.id, error: step.error, blocked: true });
          this.callbacks.onError?.(step.error, step);
          return false;
        }

        step.status = 'skipped';
        step.error = failedReason;
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
    
    // Categorize the error for intelligent handling
    const categorized = categorizeError(error, step.agent, step.action);
    
    // Check for infinite loop (same error repeating)
    const errorKey = `${step.id}:${this.getErrorSignature(error)}`;
    const tracker = this.errorTrackers.get(errorKey) || {
      stepId: step.id,
      errorSignature: this.getErrorSignature(error),
      count: 0,
      lastOccurrence: 0,
    };
    
    tracker.count++;
    tracker.lastOccurrence = Date.now();
    this.errorTrackers.set(errorKey, tracker);
    
    // If same error repeats too many times, force skip/abort
    if (tracker.count >= PlanExecutor.MAX_SAME_ERROR_COUNT) {
      console.warn(`[PlanExecutor] Same error repeated ${tracker.count} times for step ${step.id}, forcing resolution`);
      
      if (step.canFail && !step.isCritical) {
        step.status = 'skipped';
        step.error = `Skipped after ${tracker.count} identical errors: ${error}`;
        this.callbacks.onStepUpdate?.(step);
        this.emitEvent('step.failed', { stepId: step.id, error: step.error, skipped: true });
        return;
      } else {
        step.status = 'failed';
        step.completedAt = Date.now();
        this.callbacks.onStepUpdate?.(step);
        this.emitEvent('step.failed', { stepId: step.id, error: `Abort: ${error}`, critical: true });
        this.callbacks.onError?.(error, step);
        return;
      }
    }
    
    // Try intelligent correction based on error category
    if (categorized.suggestedAction === 'correct_step' && step.retryCount < step.maxRetries) {
      const corrected = this.validator.correctStep(step);
      if (corrected && corrected.action !== step.action) {
        console.log(`[PlanExecutor] Correcting step ${step.id}: ${step.action} → ${corrected.action}`);
        
        // Apply correction to the step in the plan
        Object.assign(step, corrected);
        step.retryCount++;
        step.status = 'retrying';
        this.callbacks.onStepUpdate?.(step);
        this.emitEvent('step.retrying', { stepId: step.id, attempt: step.retryCount, corrected: true });
        
        // Wait before retry
        await new Promise(r => setTimeout(r, 300));
        
        // Re-execute with corrected step
        if (agent || this.agents.has(corrected.agent)) {
          const targetAgent = this.agents.get(corrected.agent);
          if (targetAgent) {
            const retryResult = await this.executeStep(step);
            if (retryResult.success) return;
          }
        }
      }
    }
    
    // Standard retry logic
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
    if (!step.canFail || step.isCritical) {
      this.callbacks.onError?.(error, step);
    }
    
    // Exécuter le fallback si disponible
    if (step.fallback && step.canFail && !step.isCritical) {
      await this.executeFallback(step);
    }
  }
  
  /**
   * Get a normalized error signature for loop detection
   */
  private getErrorSignature(error: string): string {
    // Normalize the error to detect repeated identical errors
    return error
      .toLowerCase()
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .slice(0, 100); // Limit length
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
        if (dependsOnFailed) {
          const failedReason = `Dependency failed: ${step.dependsOn.filter(id => failedStepIds.has(id)).join(', ')}`;
          if (step.isCritical) {
            step.status = 'failed';
            step.error = failedReason;
            step.completedAt = Date.now();
            this.callbacks.onStepUpdate?.(step);
            this.emitEvent('step.failed', { stepId: step.id, error: step.error, blocked: true });
            this.callbacks.onError?.(step.error, step);
          } else {
            step.status = 'skipped';
            step.error = failedReason;
            this.callbacks.onStepUpdate?.(step);
          }
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
