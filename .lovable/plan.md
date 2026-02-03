
# Plan : Système de Planification Multi-Étapes Autonome

## Objectif
Transformer le cerveau cognitif en un système autonome capable de décomposer automatiquement des demandes complexes (ex: "crée-moi une app de chat") en sous-tâches, les exécuter en parallèle/séquence, gérer les erreurs avec auto-correction, et continuer jusqu'à complétion.

---

## Problèmes à résoudre

1. **Erreur de build** : Le tableau `GROQ_MODELS` est vide dans `groq.ts`, causant une erreur TypeScript
2. **Pas de planification** : Le cerveau ne décompose pas les tâches complexes en sous-étapes
3. **Pas de parallélisme** : Les tâches sont exécutées séquentiellement, une par une
4. **Pas d'auto-correction** : Quand une étape échoue, le système ne sait pas replanifier
5. **Pas de persistance de plan** : Pas de suivi des étapes accomplies vs restantes

---

## Architecture proposée

```text
┌─────────────────────────────────────────────────────────────────┐
│                        COGNITIVE BRAIN                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│   │  PLANNER    │───▶│  PLAN QUEUE  │───▶│  TASK EXECUTOR  │   │
│   │  Agent      │    │  (Steps)     │    │  (Parallel)     │   │
│   └─────────────┘    └──────────────┘    └────────┬────────┘   │
│         ▲                                          │            │
│         │                                          ▼            │
│   ┌─────┴─────────────────────────────────────────────────┐    │
│   │                   RESULT OBSERVER                      │    │
│   │   • Analyse résultats                                  │    │
│   │   • Détecte erreurs → trigger replanification          │    │
│   │   • Marque étapes complétées                           │    │
│   │   • Déclenche étapes suivantes (dépendances)           │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Solution en 6 étapes

### Étape 1 : Corriger l'erreur de build (groq.ts)

**Fichier** : `src/lib/ai/providers/groq.ts`

Remettre les modèles dans le tableau :
```typescript
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
] as const;
```

---

### Étape 2 : Créer un PlannerAgent dédié

**Fichier** : `src/lib/brain/agents/PlannerAgent.ts` (nouveau)

Un agent spécialisé qui :
- Analyse les demandes complexes
- Génère un plan structuré avec étapes et dépendances
- Identifie les étapes parallélisables vs séquentielles

```typescript
interface PlannerParams {
  objective: string;
  context: {
    systemAvailable: boolean;
    previousAttempts?: FailedStep[];
  };
}

interface GeneratedPlan {
  id: string;
  objective: string;
  estimatedDuration: number;
  steps: PlanStep[];
  parallelGroups: string[][]; // Groupes d'étapes exécutables en parallèle
}
```

---

### Étape 3 : Étendre les types pour la planification

**Fichier** : `src/lib/brain/types.ts`

Ajouter :
```typescript
// Nouveau type de tâche avec dépendances
export interface PlanStep {
  id: string;
  action: string;
  agent: AgentType;
  params: Record<string, unknown>;
  dependsOn: string[];        // IDs des étapes prérequises
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying';
  retryCount: number;
  maxRetries: number;
  result?: unknown;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface ExecutionPlan {
  id: string;
  objective: string;
  steps: PlanStep[];
  status: 'planning' | 'executing' | 'completed' | 'failed' | 'paused';
  currentPhase: number;       // Phase actuelle (groupe parallèle)
  totalPhases: number;
  progress: number;           // 0-100
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

// Nouveau mode du cerveau
export type BrainMode = 
  | 'idle' | 'listening' | 'thinking' 
  | 'planning'      // Génération du plan
  | 'executing'     // Exécution des tâches
  | 'observing'     // Analyse des résultats
  | 'adapting'      // Replanification après échec
  | 'recovering';   // Tentative de récupération d'erreur
```

---

### Étape 4 : Implémenter le moteur d'exécution parallèle

**Fichier** : `src/lib/brain/PlanExecutor.ts` (nouveau)

Classe qui gère l'exécution du plan :
```typescript
class PlanExecutor {
  private plan: ExecutionPlan;
  private runningTasks: Map<string, Promise<AgentResult>>;
  
  // Exécute les étapes par "vagues" (groupes parallèles)
  async executeNextPhase(): Promise<PhaseResult> {
    const readySteps = this.getReadySteps(); // Étapes sans dépendances non résolues
    
    // Lancer en parallèle
    const promises = readySteps.map(step => this.executeStep(step));
    const results = await Promise.allSettled(promises);
    
    return this.processPhaseResults(results);
  }
  
  // Gestion des erreurs avec replanification
  async handleStepFailure(step: PlanStep, error: string): Promise<void> {
    if (step.retryCount < step.maxRetries) {
      // Retry automatique
      step.retryCount++;
      step.status = 'retrying';
      await this.executeStep(step);
    } else {
      // Demander à l'IA de corriger/adapter le plan
      await this.requestReplan(step, error);
    }
  }
}
```

---

### Étape 5 : Intégrer la planification dans CognitiveBrain

**Fichier** : `src/lib/brain/CognitiveBrain.ts`

Modifications majeures :
1. Détecter les demandes complexes → activer le mode planification
2. Créer un plan avant d'exécuter
3. Afficher le plan à l'utilisateur avec progression
4. Exécuter par phases parallèles
5. Observer les résultats et adapter

```typescript
// Dans think()
case 'intent.message': {
  const { content } = event.payload;
  
  // Analyse de complexité
  const isComplexTask = await this.analyzeTaskComplexity(content);
  
  if (isComplexTask) {
    // Mode planification
    this.setMode('planning');
    const plan = await this.generatePlan(content);
    this.workingMemory.currentPlan = plan;
    
    // Afficher le plan
    this.callbacks.onUISchema?.(this.createPlanPreviewSchema(plan));
    
    // Exécuter le plan
    await this.executePlan(plan);
  } else {
    // Mode réponse simple (actuel)
    // ...
  }
}
```

---

### Étape 6 : Créer les schémas UI pour le suivi de plan

**Fichier** : `src/lib/brain/schemaFallbacks.ts`

Ajouter :
```typescript
// Schéma de prévisualisation du plan
export function createPlanPreviewSchema(plan: ExecutionPlan): CognitiveUISchema {
  return {
    metadata: { title: `Plan: ${plan.objective}` },
    blocks: [
      { type: 'text', content: `Objectif: ${plan.objective}`, variant: 'heading' },
      { type: 'progress', value: plan.progress, label: `Phase ${plan.currentPhase}/${plan.totalPhases}` },
      // Liste des étapes avec statuts
      ...plan.steps.map(step => ({
        type: 'status',
        state: step.status === 'completed' ? 'success' : 
               step.status === 'running' ? 'loading' :
               step.status === 'failed' ? 'error' : 'idle',
        message: `${step.action} (${step.agent})`,
      })),
    ],
  };
}

// Schéma de progression en temps réel
export function createPlanProgressSchema(plan: ExecutionPlan, currentStep: PlanStep): CognitiveUISchema;

// Schéma de résumé final
export function createPlanCompletionSchema(plan: ExecutionPlan, results: StepResult[]): CognitiveUISchema;
```

---

## Fichiers à créer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/lib/ai/providers/groq.ts` | Modifier | Corriger tableau GROQ_MODELS vide |
| `src/lib/brain/types.ts` | Modifier | Ajouter types ExecutionPlan, PlanStep étendu |
| `src/lib/brain/agents/PlannerAgent.ts` | Créer | Agent de génération de plans |
| `src/lib/brain/PlanExecutor.ts` | Créer | Moteur d'exécution parallèle |
| `src/lib/brain/CognitiveBrain.ts` | Modifier | Intégrer planification + exécution |
| `src/lib/brain/schemaFallbacks.ts` | Modifier | Schémas UI pour suivi de plan |
| `src/lib/brain/agents/index.ts` | Modifier | Exporter PlannerAgent |
| `src/hooks/useCognitiveBrain.ts` | Modifier | Exposer état du plan à l'UI |

---

## Détails techniques

### Flux d'exécution complet

```text
Utilisateur: "Crée-moi une app de chat"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. ANALYSE DE COMPLEXITÉ                                     │
│    → Demande complexe détectée (plusieurs étapes requises)   │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. GÉNÉRATION DU PLAN (PlannerAgent)                         │
│    Étapes générées:                                          │
│    ├── [1] Définir structure projet (filesystem)             │
│    ├── [2] Créer composants UI (uiBuilder)       ─┐          │
│    ├── [3] Configurer base de données (system)   ─┤ Parallèle│
│    ├── [4] Ajouter auth (system)                 ─┘          │
│    └── [5] Tester & valider (thinker) ← dépend de 2,3,4     │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. AFFICHAGE PLAN (UI)                                       │
│    → Schéma avec toutes les étapes et progression            │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. EXÉCUTION PAR PHASES                                      │
│    Phase 1: [1] Définir structure                            │
│    Phase 2: [2,3,4] en parallèle                             │
│    Phase 3: [5] Tests (attend que 2,3,4 soient OK)           │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. OBSERVATION & ADAPTATION                                  │
│    Si [3] échoue:                                            │
│    → Retry automatique (max 2x)                              │
│    → Si échec persistant: demander à l'IA de corriger        │
│    → Replanifier si nécessaire                               │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. FINALISATION                                              │
│    → Schéma de résumé avec résultats de chaque étape         │
│    → Actions suggérées pour continuer                        │
└─────────────────────────────────────────────────────────────┘
```

### Prompt du PlannerAgent

```typescript
const PLANNING_SYSTEM_PROMPT = `
Tu es un planificateur de tâches autonome. 

RÈGLES:
1. Décompose l'objectif en étapes ATOMIQUES et VÉRIFIABLES
2. Identifie les DÉPENDANCES entre étapes
3. Maximise le PARALLÉLISME (étapes indépendantes = même phase)
4. Prévoie des FALLBACKS pour chaque étape critique
5. Estime la durée de chaque étape

AGENTS DISPONIBLES:
- thinker: Raisonnement, analyse, génération de contenu
- filesystem: Lecture/écriture fichiers, navigation
- system: Commandes shell, installations, processus
- uiBuilder: Construction interfaces dynamiques
- search: Recherche textuelle, indexation

FORMAT JSON STRICT:
{
  "objective": "Description claire",
  "steps": [
    {
      "id": "step_1",
      "action": "create_project_structure",
      "agent": "filesystem",
      "description": "Créer la structure de dossiers",
      "params": { "path": "/project", "template": "chat-app" },
      "dependsOn": [],
      "estimatedDuration": 5000,
      "canFail": false,
      "fallback": { "action": "...", "params": {...} }
    }
  ],
  "parallelGroups": [
    ["step_1"],
    ["step_2", "step_3", "step_4"],
    ["step_5"]
  ]
}
`;
```

### Configuration de planification

```typescript
const PLAN_CONFIG = {
  maxStepsPerPlan: 10,
  maxParallelTasks: 4,
  defaultStepTimeout: 30000,
  maxRetryPerStep: 2,
  replanThreshold: 0.5, // Si >50% des étapes échouent, replanifier
  complexityThreshold: 3, // Nombre de "verbes d'action" pour considérer complexe
};
```
