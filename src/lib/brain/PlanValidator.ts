 // ═══════════════════════════════════════════════════════════════
 // PLAN VALIDATOR & AUTO-CORRECTOR
 // Validation et correction intelligente des plans d'exécution
 // ═══════════════════════════════════════════════════════════════
 
 import type { AgentType } from './types';
 import type { PlanStep, ExecutionPlan } from './agents/plannerTypes';
 
 // ──────────────────────────────────────────────────────────────
 // TYPES
 // ──────────────────────────────────────────────────────────────
 
 export interface ValidationResult {
   isValid: boolean;
   errors: ValidationError[];
   warnings: ValidationWarning[];
   correctedStep?: PlanStep;
 }
 
 export interface ValidationError {
   stepId: string;
   code: 'UNKNOWN_AGENT' | 'UNKNOWN_ACTION' | 'MISSING_PARAMS' | 'INVALID_DEPENDENCY';
   message: string;
   suggestion?: string;
 }
 
 export interface ValidationWarning {
   stepId: string;
   code: 'DEPRECATED_ACTION' | 'OPTIONAL_PARAM_MISSING' | 'LONG_DURATION';
   message: string;
 }
 
 // ──────────────────────────────────────────────────────────────
 // AGENT CAPABILITIES REGISTRY
 // Actions valides et paramètres requis par agent
 // ──────────────────────────────────────────────────────────────
 
 interface AgentCapability {
   actions: string[];
   requiredParams: Record<string, string[]>;
   optionalParams?: Record<string, string[]>;
 }
 
 // Use Partial to not require all AgentType keys
 const AGENT_CAPABILITIES: Partial<Record<AgentType, AgentCapability>> = {
   thinker: {
     actions: ['respond', 'analyze', 'plan', 'summarize'],
     requiredParams: {
       respond: ['messages'],
       analyze: ['content'],
       plan: ['objective'],
       summarize: ['content'],
     },
   },
   
   uiBuilder: {
     actions: ['build', 'adapt', 'merge'],
     requiredParams: {
       build: ['data'],
       adapt: ['data'], // context.previousSchema checked separately
       merge: ['data'],
     },
     optionalParams: {
       build: ['context', 'messages'],
       adapt: ['context', 'messages'],
       merge: ['messages'],
     },
   },
   
   filesystem: {
     actions: ['read', 'write', 'list', 'exists', 'delete', 'search'],
     requiredParams: {
       read: ['path'],
       write: ['path', 'content'],
       list: ['path'],
       exists: ['path'],
       delete: ['path'],
       search: ['path'],
     },
     optionalParams: {
       list: ['options'],
       delete: ['options'],
       search: ['options'],
     },
   },
   
   system: {
     actions: ['exec', 'spawn', 'info'],
     requiredParams: {
       exec: ['command'],
       spawn: ['command'],
       info: [],
     },
     optionalParams: {
       exec: ['options'],
       spawn: ['args', 'options'],
     },
   },
   
   notification: {
     actions: ['push', 'clear', 'update'],
     requiredParams: {
       push: ['message'],
       clear: [],
       update: ['id', 'message'],
     },
   },
 };
 
 // ──────────────────────────────────────────────────────────────
 // ACTION MAPPINGS - Unknown actions → valid actions
 // ──────────────────────────────────────────────────────────────
 
 const ACTION_MAPPINGS: Record<string, { agent: AgentType; action: string; defaultParams?: Record<string, unknown> }> = {
   // UI intents that should become uiBuilder.build
   'get_current_tab': { agent: 'uiBuilder', action: 'build', defaultParams: { data: {} } },
   'show_current_view': { agent: 'uiBuilder', action: 'build', defaultParams: { data: {} } },
   'display_tab': { agent: 'uiBuilder', action: 'build', defaultParams: { data: {} } },
   'render_ui': { agent: 'uiBuilder', action: 'build', defaultParams: { data: {} } },
   'update_ui': { agent: 'uiBuilder', action: 'adapt', defaultParams: { data: {} } },
   
   // Filesystem shortcuts
   'read_file': { agent: 'filesystem', action: 'read' },
   'write_file': { agent: 'filesystem', action: 'write' },
   'list_files': { agent: 'filesystem', action: 'list' },
   'list_directory': { agent: 'filesystem', action: 'list' },
   'check_exists': { agent: 'filesystem', action: 'exists' },
   'delete_file': { agent: 'filesystem', action: 'delete' },
   'search_files': { agent: 'filesystem', action: 'search' },
   
   // System shortcuts
   'run_command': { agent: 'system', action: 'exec' },
   'execute': { agent: 'system', action: 'exec' },
   'shell': { agent: 'system', action: 'exec' },
   'get_system_info': { agent: 'system', action: 'info' },
   
   // Thinker shortcuts
   'think': { agent: 'thinker', action: 'respond' },
   'answer': { agent: 'thinker', action: 'respond' },
   'reply': { agent: 'thinker', action: 'respond' },
   
   // Notification shortcuts
   'notify': { agent: 'notification', action: 'push' },
   'alert': { agent: 'notification', action: 'push' },
 };
 
 // ──────────────────────────────────────────────────────────────
 // PLAN VALIDATOR CLASS
 // ──────────────────────────────────────────────────────────────
 
 export class PlanValidator {
   
   /**
    * Validate a single step
    */
   validateStep(step: PlanStep): ValidationResult {
     const errors: ValidationError[] = [];
     const warnings: ValidationWarning[] = [];
     
     // Check if agent is known
     const capability = AGENT_CAPABILITIES[step.agent];
     if (!capability) {
       errors.push({
         stepId: step.id,
         code: 'UNKNOWN_AGENT',
         message: `Unknown agent: ${step.agent}`,
         suggestion: 'Use one of: thinker, uiBuilder, filesystem, system, notification',
       });
       return { isValid: false, errors, warnings };
     }
     
     // Check if action is valid for this agent
     if (!capability.actions.includes(step.action)) {
       // Try to find a mapping
       const mapping = ACTION_MAPPINGS[step.action];
       if (mapping) {
         // Can be corrected
         errors.push({
           stepId: step.id,
           code: 'UNKNOWN_ACTION',
           message: `Unknown action "${step.action}" for agent "${step.agent}"`,
           suggestion: `Map to ${mapping.agent}.${mapping.action}`,
         });
       } else {
         errors.push({
           stepId: step.id,
           code: 'UNKNOWN_ACTION',
           message: `Unknown action "${step.action}" for agent "${step.agent}"`,
           suggestion: `Valid actions: ${capability.actions.join(', ')}`,
         });
       }
     }
     
     // Check required params
     const requiredParams = capability.requiredParams[step.action] || [];
     for (const param of requiredParams) {
       if (!(param in step.params) || step.params[param] === undefined) {
         errors.push({
           stepId: step.id,
           code: 'MISSING_PARAMS',
           message: `Missing required param "${param}" for ${step.agent}.${step.action}`,
         });
       }
     }
     
     // Special case: uiBuilder.adapt needs context.previousSchema
     if (step.agent === 'uiBuilder' && step.action === 'adapt') {
       const context = step.params.context as Record<string, unknown> | undefined;
       if (!context?.previousSchema) {
         warnings.push({
           stepId: step.id,
           code: 'OPTIONAL_PARAM_MISSING',
           message: 'uiBuilder.adapt works best with context.previousSchema',
         });
       }
     }
     
     return {
       isValid: errors.length === 0,
       errors,
       warnings,
     };
   }
   
   /**
    * Validate an entire plan
    */
   validatePlan(plan: ExecutionPlan): { isValid: boolean; stepResults: Map<string, ValidationResult> } {
     const stepResults = new Map<string, ValidationResult>();
     let isValid = true;
     
     for (const step of plan.steps) {
       const result = this.validateStep(step);
       stepResults.set(step.id, result);
       if (!result.isValid) {
         isValid = false;
       }
     }
     
     // Check dependency integrity
     const stepIds = new Set(plan.steps.map(s => s.id));
     for (const step of plan.steps) {
       for (const depId of step.dependsOn) {
         if (!stepIds.has(depId)) {
           stepResults.get(step.id)?.errors.push({
             stepId: step.id,
             code: 'INVALID_DEPENDENCY',
             message: `Step depends on non-existent step: ${depId}`,
           });
           isValid = false;
         }
       }
     }
     
     return { isValid, stepResults };
   }
   
   /**
    * Try to correct a step with an unknown action
    */
   correctStep(step: PlanStep): PlanStep | null {
     const mapping = ACTION_MAPPINGS[step.action];
     
     if (mapping) {
       console.log(`[PlanValidator] Correcting ${step.agent}.${step.action} → ${mapping.agent}.${mapping.action}`);
       
       return {
         ...step,
         agent: mapping.agent,
         action: mapping.action,
         params: {
           ...mapping.defaultParams,
           ...step.params,
         },
       };
     }
     
     // If the action is completely unknown, try to default to a safe action
     const capability = AGENT_CAPABILITIES[step.agent];
     if (capability && capability.actions.length > 0) {
       const defaultAction = capability.actions[0];
       console.log(`[PlanValidator] Defaulting ${step.agent}.${step.action} → ${step.agent}.${defaultAction}`);
       
       return {
         ...step,
         action: defaultAction,
       };
     }
     
     return null;
   }
   
   /**
    * Validate and auto-correct an entire plan
    */
   validateAndCorrectPlan(plan: ExecutionPlan): { plan: ExecutionPlan; correctionsMade: number } {
     let correctionsMade = 0;
     const correctedSteps: PlanStep[] = [];
     
     for (const step of plan.steps) {
       const validation = this.validateStep(step);
       
       if (validation.isValid) {
         correctedSteps.push(step);
       } else {
         // Try to correct
         const hasUnknownAction = validation.errors.some(e => e.code === 'UNKNOWN_ACTION');
         
         if (hasUnknownAction) {
           const corrected = this.correctStep(step);
           if (corrected) {
             correctedSteps.push(corrected);
             correctionsMade++;
             console.log(`[PlanValidator] Auto-corrected step ${step.id}`);
           } else {
             // Could not correct - keep original, will fail at runtime
             correctedSteps.push(step);
           }
         } else {
           // Other errors (missing params, etc.) - try to inject defaults
           const fixed = this.injectDefaults(step);
           correctedSteps.push(fixed);
           if (fixed !== step) correctionsMade++;
         }
       }
     }
     
     return {
       plan: {
         ...plan,
         steps: correctedSteps,
       },
       correctionsMade,
     };
   }
   
   /**
    * Inject default values for missing required params
    */
   private injectDefaults(step: PlanStep): PlanStep {
     const capability = AGENT_CAPABILITIES[step.agent];
     if (!capability) return step;
     
     const requiredParams = capability.requiredParams[step.action] || [];
     const newParams = { ...step.params };
     let modified = false;
     
     for (const param of requiredParams) {
       if (!(param in newParams) || newParams[param] === undefined) {
         // Inject sensible defaults
         switch (param) {
           case 'data':
             newParams.data = {};
             modified = true;
             break;
           case 'messages':
             newParams.messages = [];
             modified = true;
             break;
           case 'content':
             newParams.content = '';
             modified = true;
             break;
           case 'path':
             newParams.path = '.';
             modified = true;
             break;
           case 'command':
             newParams.command = 'echo "No command specified"';
             modified = true;
             break;
           case 'message':
             newParams.message = 'Action executed';
             modified = true;
             break;
         }
       }
     }
     
     if (modified) {
       console.log(`[PlanValidator] Injected defaults for step ${step.id}`);
       return { ...step, params: newParams };
     }
     
     return step;
   }
 }
 
 // ──────────────────────────────────────────────────────────────
 // ERROR CATEGORIZATION
 // Catégoriser les erreurs pour une résolution intelligente
 // ──────────────────────────────────────────────────────────────
 
 export type ErrorCategory = 'structural' | 'environmental' | 'functional' | 'unknown';
 
 export interface CategorizedError {
   category: ErrorCategory;
   originalError: string;
   suggestedAction: 'correct_step' | 'replace_agent' | 'skip' | 'abort' | 'retry';
   details?: string;
 }
 
 export function categorizeError(error: string, stepAgent: AgentType, stepAction: string): CategorizedError {
   const errorLower = error.toLowerCase();
   
   // Structural errors - can be fixed by correcting the step
   if (errorLower.includes('unknown action') || 
       errorLower.includes('missing required param') ||
       errorLower.includes('no action specified')) {
     return {
       category: 'structural',
       originalError: error,
       suggestedAction: 'correct_step',
       details: 'Step can be corrected via PlanValidator',
     };
   }
   
   // Environmental errors - agent/feature not available
   if (errorLower.includes('not available') ||
       errorLower.includes('requires electron') ||
       errorLower.includes('bridge not available') ||
       errorLower.includes('agent unavailable')) {
     return {
       category: 'environmental',
       originalError: error,
       suggestedAction: 'replace_agent',
       details: `${stepAgent} not available in this environment`,
     };
   }
   
   // Functional errors - the action executed but failed
   if (errorLower.includes('permission denied') ||
       errorLower.includes('file not found') ||
       errorLower.includes('command failed') ||
       errorLower.includes('timeout') ||
       errorLower.includes('exit code')) {
     return {
       category: 'functional',
       originalError: error,
       suggestedAction: 'retry',
       details: 'Action failed but can be retried with modifications',
     };
   }
   
   // Unknown - can't determine, safer to skip if canFail
   return {
     category: 'unknown',
     originalError: error,
     suggestedAction: 'skip',
     details: 'Unknown error type',
   };
 }
 
 // ──────────────────────────────────────────────────────────────
 // EXPORTS
 // ──────────────────────────────────────────────────────────────
 
 export function createPlanValidator(): PlanValidator {
   return new PlanValidator();
 }