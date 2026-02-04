// ═══════════════════════════════════════════════════════════════
// AUTONOMY CONFIGURATION
// Configuration du niveau d'autonomie du cerveau cognitif
// ═══════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────
// TYPES D'AUTONOMIE
// ──────────────────────────────────────────────────────────────

export type AutonomyLevel = 'auto-run' | 'propose-only' | 'guided';

export interface AutonomyConfig {
  // Niveau d'autonomie global
  level: AutonomyLevel;
  
  // Déclencheurs automatiques
  triggers: {
    autoContinue: boolean;      // Enchaîner automatiquement les étapes
    minimalQuestions: boolean;  // Ne poser que les questions essentielles
    autoFixErrors: boolean;     // Tenter de corriger les erreurs seul
    autoPlan: boolean;          // Proposer des plans proactivement
  };
  
  // Garde-fous de sécurité
  safeguards: {
    confirmDestructive: boolean;  // Confirmer les actions destructrices
    maxAutoActions: number;       // Limite d'actions auto avant pause
    focusMode: boolean;           // Rester dans le périmètre de l'objectif
    enableJournal: boolean;       // Logger toutes les actions auto
  };
  
  // Périmètre d'action
  scope: 'web-only' | 'web-electron' | 'internal-only';
  
  // Timeouts
  timeouts: {
    stepTimeout: number;          // Timeout par étape (ms)
    totalPlanTimeout: number;     // Timeout total pour un plan (ms)
    pauseOnInactivity: number;    // Pause après inactivité (ms)
  };
}

// ──────────────────────────────────────────────────────────────
// CONFIGURATION PAR DÉFAUT - AUTONOMIE TOTALE
// ──────────────────────────────────────────────────────────────

export const DEFAULT_AUTONOMY_CONFIG: AutonomyConfig = {
  level: 'auto-run',
  
  triggers: {
    autoContinue: true,
    minimalQuestions: true,
    autoFixErrors: true,
    autoPlan: true,
  },
  
  safeguards: {
    confirmDestructive: true,
    maxAutoActions: 50,         // Max 50 actions avant demander confirmation
    focusMode: true,
    enableJournal: true,
  },
  
  scope: 'web-electron',
  
  timeouts: {
    stepTimeout: 120000,         // 2 minutes par étape
    totalPlanTimeout: 600000,   // 10 minutes max pour un plan
    pauseOnInactivity: 300000,  // Pause après 5 minutes d'inactivité
  },
};

// ──────────────────────────────────────────────────────────────
// ACTIONS DESTRUCTRICES (nécessitent confirmation)
// ──────────────────────────────────────────────────────────────

export const DESTRUCTIVE_ACTIONS = [
  'delete',
  'remove',
  'drop',
  'truncate',
  'reset',
  'clear',
  'destroy',
  'purge',
  'rm -rf',
  'format',
  'uninstall',
] as const;

export function isDestructiveAction(action: string): boolean {
  const lowerAction = action.toLowerCase();
  return DESTRUCTIVE_ACTIONS.some(destructive => lowerAction.includes(destructive));
}

// ──────────────────────────────────────────────────────────────
// JOURNAL D'ACTIONS AUTONOMES
// ──────────────────────────────────────────────────────────────

export interface AutonomyLogEntry {
  id: string;
  timestamp: number;
  type: 'action' | 'decision' | 'error' | 'fix' | 'question' | 'confirmation';
  summary: string;
  details?: Record<string, unknown>;
  stepId?: string;
  planId?: string;
  outcome?: 'success' | 'failure' | 'pending' | 'skipped';
  autoFixed?: boolean;
}

export class AutonomyJournal {
  private entries: AutonomyLogEntry[] = [];
  private maxEntries = 500;
  
  log(
    type: AutonomyLogEntry['type'],
    summary: string,
    details?: Record<string, unknown>
  ): AutonomyLogEntry {
    const entry: AutonomyLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      type,
      summary,
      details,
    };
    
    this.entries.push(entry);
    
    // Limiter la taille
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
    
    console.log(`[Autonomy] ${type.toUpperCase()}: ${summary}`);
    return entry;
  }
  
  logAction(summary: string, stepId?: string, planId?: string): AutonomyLogEntry {
    const entry = this.log('action', summary);
    entry.stepId = stepId;
    entry.planId = planId;
    return entry;
  }
  
  logDecision(summary: string, details?: Record<string, unknown>): AutonomyLogEntry {
    return this.log('decision', summary, details);
  }
  
  logError(summary: string, details?: Record<string, unknown>): AutonomyLogEntry {
    const entry = this.log('error', summary, details);
    entry.outcome = 'failure';
    return entry;
  }
  
  logFix(summary: string, wasAutomatic: boolean, details?: Record<string, unknown>): AutonomyLogEntry {
    const entry = this.log('fix', summary, details);
    entry.autoFixed = wasAutomatic;
    return entry;
  }
  
  markOutcome(entryId: string, outcome: AutonomyLogEntry['outcome']): void {
    const entry = this.entries.find(e => e.id === entryId);
    if (entry) {
      entry.outcome = outcome;
    }
  }
  
  getRecentEntries(count = 20): AutonomyLogEntry[] {
    return this.entries.slice(-count);
  }
  
  getEntriesForPlan(planId: string): AutonomyLogEntry[] {
    return this.entries.filter(e => e.planId === planId);
  }
  
  getErrorCount(since?: number): number {
    const threshold = since || Date.now() - 60000; // Dernière minute
    return this.entries.filter(e => e.type === 'error' && e.timestamp >= threshold).length;
  }
  
  clear(): void {
    this.entries = [];
  }
  
  export(): AutonomyLogEntry[] {
    return [...this.entries];
  }
}

// ──────────────────────────────────────────────────────────────
// COMPTEUR D'ACTIONS AUTONOMES
// ──────────────────────────────────────────────────────────────

export class AutonomyCounter {
  private actionCount = 0;
  private lastReset = Date.now();
  private config: AutonomyConfig;
  
  constructor(config: AutonomyConfig) {
    this.config = config;
  }
  
  increment(): number {
    this.actionCount++;
    return this.actionCount;
  }
  
  shouldPause(): boolean {
    return this.actionCount >= this.config.safeguards.maxAutoActions;
  }
  
  reset(): void {
    this.actionCount = 0;
    this.lastReset = Date.now();
  }
  
  getCount(): number {
    return this.actionCount;
  }
  
  getStats(): { count: number; lastReset: number; limit: number } {
    return {
      count: this.actionCount,
      lastReset: this.lastReset,
      limit: this.config.safeguards.maxAutoActions,
    };
  }
}

// ──────────────────────────────────────────────────────────────
// EXPORT SINGLETON JOURNAL
// ──────────────────────────────────────────────────────────────

export const globalAutonomyJournal = new AutonomyJournal();
