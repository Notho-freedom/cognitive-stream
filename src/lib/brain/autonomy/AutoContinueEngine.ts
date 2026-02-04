// ═══════════════════════════════════════════════════════════════
// AUTO-CONTINUE ENGINE
// Moteur d'enchaînement automatique des étapes jusqu'à l'objectif
// ═══════════════════════════════════════════════════════════════

import type { ExecutionPlan, PlanStep } from '../agents/plannerTypes';
import type { AutonomyConfig, AutonomyLogEntry } from './AutonomyConfig';
import { isDestructiveAction, globalAutonomyJournal } from './AutonomyConfig';

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

export interface ContinueDecision {
  shouldContinue: boolean;
  reason: 'objective_reached' | 'next_step_ready' | 'waiting_input' | 'error_blocking' | 'max_actions' | 'destructive_pending' | 'timeout';
  nextSteps?: PlanStep[];
  pendingQuestion?: string;
  pendingConfirmation?: {
    action: string;
    description: string;
  };
}

export interface AutoContinueCallbacks {
  onContinue: (steps: PlanStep[]) => Promise<void>;
  onPause: (reason: string) => void;
  onQuestion: (question: string) => Promise<string>;
  onConfirmDestructive: (action: string, description: string) => Promise<boolean>;
  onObjectiveReached: (summary: string) => void;
}

// ──────────────────────────────────────────────────────────────
// AUTO-CONTINUE ENGINE
// ──────────────────────────────────────────────────────────────

export class AutoContinueEngine {
  private config: AutonomyConfig;
  private callbacks: Partial<AutoContinueCallbacks>;
  private actionCount = 0;
  private startTime = 0;
  private isPaused = false;
  private pendingConfirmations: Map<string, boolean> = new Map();
  
  constructor(
    config: AutonomyConfig,
    callbacks: Partial<AutoContinueCallbacks> = {}
  ) {
    this.config = config;
    this.callbacks = callbacks;
  }
  
  // ──────────────────────────────────────────────────────────────
  // DÉCISION DE CONTINUATION
  // ──────────────────────────────────────────────────────────────
  
  evaluateContinuation(
    plan: ExecutionPlan,
    lastStepResult?: { success: boolean; error?: string }
  ): ContinueDecision {
    // Vérifier si objectif atteint
    if (plan.status === 'completed') {
      globalAutonomyJournal.logDecision('Objectif atteint, arrêt de l\'exécution');
      return {
        shouldContinue: false,
        reason: 'objective_reached',
      };
    }
    
    // Vérifier timeout global
    if (this.startTime > 0) {
      const elapsed = Date.now() - this.startTime;
      if (elapsed >= this.config.timeouts.totalPlanTimeout) {
        globalAutonomyJournal.logDecision('Timeout global atteint', { elapsed, limit: this.config.timeouts.totalPlanTimeout });
        return {
          shouldContinue: false,
          reason: 'timeout',
        };
      }
    }
    
    // Vérifier limite d'actions
    if (this.actionCount >= this.config.safeguards.maxAutoActions) {
      globalAutonomyJournal.logDecision(`Limite d'actions atteinte (${this.actionCount}/${this.config.safeguards.maxAutoActions})`);
      return {
        shouldContinue: false,
        reason: 'max_actions',
      };
    }
    
    // Vérifier si pause demandée
    if (this.isPaused) {
      return {
        shouldContinue: false,
        reason: 'waiting_input',
        pendingQuestion: 'Exécution en pause. Voulez-vous continuer ?',
      };
    }
    
    // Trouver les prochaines étapes prêtes
    const nextSteps = this.findReadySteps(plan);
    
    if (nextSteps.length === 0) {
      // Vérifier s'il y a des erreurs bloquantes
      const hasBlockingErrors = plan.steps.some(
        s => s.status === 'failed' && !this.canSkipStep(s, plan)
      );
      
      if (hasBlockingErrors) {
        return {
          shouldContinue: false,
          reason: 'error_blocking',
        };
      }
      
      // Toutes les étapes sont complétées ou en cours
      const pendingSteps = plan.steps.filter(s => s.status === 'pending' || s.status === 'running');
      if (pendingSteps.length === 0) {
        return {
          shouldContinue: false,
          reason: 'objective_reached',
        };
      }
      
      // Des étapes sont en cours
      return {
        shouldContinue: true,
        reason: 'waiting_input',
      };
    }
    
    // Vérifier les actions destructrices
    const destructiveSteps = nextSteps.filter(s => isDestructiveAction(s.action));
    if (destructiveSteps.length > 0 && this.config.safeguards.confirmDestructive) {
      const step = destructiveSteps[0];
      return {
        shouldContinue: false,
        reason: 'destructive_pending',
        pendingConfirmation: {
          action: step.action,
          description: step.description,
        },
      };
    }
    
    // Tout est OK, continuer
    return {
      shouldContinue: true,
      reason: 'next_step_ready',
      nextSteps,
    };
  }
  
  // ──────────────────────────────────────────────────────────────
  // BOUCLE D'AUTO-CONTINUATION
  // ──────────────────────────────────────────────────────────────
  
  async runUntilObjective(
    plan: ExecutionPlan,
    executeStep: (step: PlanStep) => Promise<{ success: boolean; error?: string }>
  ): Promise<{ success: boolean; finalPlan: ExecutionPlan; summary: string }> {
    this.startTime = Date.now();
    this.actionCount = 0;
    this.isPaused = false;
    
    globalAutonomyJournal.logDecision('Démarrage de l\'exécution autonome', {
      objective: plan.objective,
      totalSteps: plan.steps.length,
    });
    
    let lastResult: { success: boolean; error?: string } | undefined;
    
    while (true) {
      const decision = this.evaluateContinuation(plan, lastResult);
      
      if (!decision.shouldContinue) {
        // Gérer les différents cas d'arrêt
        switch (decision.reason) {
          case 'objective_reached':
            { const summary = this.generateCompletionSummary(plan);
            this.callbacks.onObjectiveReached?.(summary);
            return { success: true, finalPlan: plan, summary }; }
            
          case 'max_actions':
            this.callbacks.onPause?.('Limite d\'actions autonomes atteinte');
            return {
              success: false,
              finalPlan: plan,
              summary: `Exécution pausée après ${this.actionCount} actions. Objectif non atteint.`,
            };
            
          case 'destructive_pending':
            if (decision.pendingConfirmation) {
              const confirmed = await this.callbacks.onConfirmDestructive?.(
                decision.pendingConfirmation.action,
                decision.pendingConfirmation.description
              );
              if (confirmed) {
                this.pendingConfirmations.set(decision.pendingConfirmation.action, true);
                continue; // Relancer l'évaluation
              }
            }
            return {
              success: false,
              finalPlan: plan,
              summary: 'Action destructrice refusée par l\'utilisateur.',
            };
            
          case 'error_blocking':
            return {
              success: false,
              finalPlan: plan,
              summary: this.generateErrorSummary(plan),
            };
            
          case 'timeout':
            return {
              success: false,
              finalPlan: plan,
              summary: `Timeout global atteint (${Math.round((Date.now() - this.startTime) / 1000)}s).`,
            };
            
          case 'waiting_input':
            if (decision.pendingQuestion && this.callbacks.onQuestion) {
              await this.callbacks.onQuestion(decision.pendingQuestion);
            }
            continue;
        }
      }
      
      // Exécuter les prochaines étapes
      if (decision.nextSteps && decision.nextSteps.length > 0) {
        for (const step of decision.nextSteps) {
          this.actionCount++;
          
          globalAutonomyJournal.logAction(
            `Exécution: ${step.action}`,
            step.id,
            plan.id
          );
          
          try {
            lastResult = await executeStep(step);
            
            if (!lastResult.success && this.config.triggers.autoFixErrors) {
              // Tenter auto-fix
              const fixResult = await this.attemptAutoFix(step, lastResult.error || 'Unknown error', executeStep);
              if (fixResult.fixed) {
                lastResult = { success: true };
                globalAutonomyJournal.logFix(
                  `Auto-fix réussi: ${step.action}`,
                  true,
                  { originalError: lastResult.error, fixMethod: fixResult.method }
                );
              }
            }
            
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            globalAutonomyJournal.logError(`Erreur: ${step.action}`, { error: errorMsg });
            lastResult = { success: false, error: errorMsg };
          }
        }
      }
      
      // Petit délai pour éviter de surcharger
      await new Promise(r => setTimeout(r, 100));
    }
  }
  
  // ──────────────────────────────────────────────────────────────
  // AUTO-FIX ENGINE
  // ──────────────────────────────────────────────────────────────
  
  private async attemptAutoFix(
    step: PlanStep,
    error: string,
    executeStep: (step: PlanStep) => Promise<{ success: boolean; error?: string }>
  ): Promise<{ fixed: boolean; method?: string }> {
    const maxRetries = 3;
    let attempt = 0;
    
    // Stratégies de fix
    const strategies = [
      {
        name: 'retry-simple',
        condition: () => true,
        fix: async () => {
          // Simple retry après délai
          await new Promise(r => setTimeout(r, 1000));
          return await executeStep(step);
        },
      },
      {
        name: 'retry-with-timeout',
        condition: () => error.toLowerCase().includes('timeout'),
        fix: async () => {
          // Retry avec timeout plus long
          step.estimatedDuration = (step.estimatedDuration || 5000) * 2;
          await new Promise(r => setTimeout(r, 2000));
          return await executeStep(step);
        },
      },
      {
        name: 'skip-optional',
        condition: () => step.canFail === true,
        fix: async () => {
          // Marquer comme skipped si optionnel
          step.status = 'skipped';
          return { success: true };
        },
      },
    ];
    
    for (const strategy of strategies) {
      if (!strategy.condition()) continue;
      
      attempt++;
      if (attempt > maxRetries) break;
      
      globalAutonomyJournal.logFix(
        `Tentative auto-fix: ${strategy.name} (${attempt}/${maxRetries})`,
        true,
        { step: step.action, originalError: error }
      );
      
      try {
        const result = await strategy.fix();
        if (result.success) {
          return { fixed: true, method: strategy.name };
        }
      } catch {
        // Continue avec la stratégie suivante
      }
    }
    
    return { fixed: false };
  }
  
  // ──────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────
  
  private findReadySteps(plan: ExecutionPlan): PlanStep[] {
    return plan.steps.filter(step => {
      if (step.status !== 'pending') return false;
      
      // Vérifier que toutes les dépendances sont complétées
      const depsCompleted = step.dependsOn.every(depId => {
        const dep = plan.steps.find(s => s.id === depId);
        return dep?.status === 'completed' || dep?.status === 'skipped';
      });
      
      return depsCompleted;
    });
  }
  
  private canSkipStep(step: PlanStep, plan: ExecutionPlan): boolean {
    // Peut-on skipper cette étape ?
    if (step.canFail) return true;
    
    // Vérifier si d'autres étapes critiques en dépendent
    const dependents = plan.steps.filter(s => s.dependsOn.includes(step.id));
    return dependents.every(d => d.canFail);
  }
  
  private generateCompletionSummary(plan: ExecutionPlan): string {
    const completed = plan.steps.filter(s => s.status === 'completed').length;
    const skipped = plan.steps.filter(s => s.status === 'skipped').length;
    const failed = plan.steps.filter(s => s.status === 'failed').length;
    
    const duration = Date.now() - this.startTime;
    const durationStr = duration > 60000 
      ? `${Math.round(duration / 60000)}min` 
      : `${Math.round(duration / 1000)}s`;
    
    return `✅ Objectif atteint en ${durationStr}. ${completed} étapes réussies, ${skipped} ignorées, ${failed} échouées. ${this.actionCount} actions autonomes.`;
  }
  
  private generateErrorSummary(plan: ExecutionPlan): string {
    const failedSteps = plan.steps.filter(s => s.status === 'failed');
    const errors = failedSteps.map(s => `• ${s.action}: ${s.error}`).join('\n');
    
    return `❌ Exécution bloquée par ${failedSteps.length} erreur(s):\n${errors}`;
  }
  
  // ──────────────────────────────────────────────────────────────
  // CONTRÔLE EXTERNE
  // ──────────────────────────────────────────────────────────────
  
  pause(): void {
    this.isPaused = true;
    globalAutonomyJournal.logDecision('Pause demandée par l\'utilisateur');
  }
  
  resume(): void {
    this.isPaused = false;
    globalAutonomyJournal.logDecision('Reprise de l\'exécution');
  }
  
  getStats(): { actionCount: number; elapsed: number; isPaused: boolean } {
    return {
      actionCount: this.actionCount,
      elapsed: this.startTime > 0 ? Date.now() - this.startTime : 0,
      isPaused: this.isPaused,
    };
  }
}
