
# Plan de correction : Gestion robuste des interactions asynchrones et schéma de fallback

## Objectif
Corriger les bugs d'interface vide et implémenter un système de schéma "vivant" qui affiche toujours quelque chose, même pendant les opérations asynchrones.

---

## Problèmes identifiés

1. **Bug crash ligne 88** : Accès à `firstTextBlock.type` sans vérification `null`
2. **Interface vide** : Aucun schéma affiché pendant les opérations asynchrones
3. **Pas de fallback** : Si l'IA ne renvoie pas de JSON valide, l'UI reste vide
4. **Composants statiques** : Pas de mécanisme de mise à jour en temps réel

---

## Solution en 5 étapes

### Étape 1 : Corriger le crash TTS (immédiat)

**Fichier** : `src/components/cognitive/CognitiveInterface.tsx`

Corriger la ligne 88 :
```typescript
// AVANT (crash si undefined)
const textToSpeak = firstTextBlock.type === 'text' && firstTextBlock?.content || thought;

// APRÈS (sécurisé)
const textToSpeak = (firstTextBlock && firstTextBlock.type === 'text' && firstTextBlock.content) || thought;
```

---

### Étape 2 : Créer un système de schéma transitionnel

**Nouveau concept** : Pendant une opération asynchrone, on affiche un "schéma de transition" avec indicateur de progression qui s'actualise en temps réel.

**Fichier** : `src/lib/brain/schemaFallbacks.ts` (nouveau)

```typescript
export function createLoadingSchema(message: string, taskInfo?: { count: number; current?: string }): CognitiveUISchema {
  return {
    metadata: { title: 'Traitement en cours' },
    layout: { width: 'md' },
    blocks: [
      { type: 'status', state: 'loading', message },
      taskInfo && { type: 'progress', value: 0, label: `${taskInfo.count} tâche(s)` },
    ].filter(Boolean),
  };
}

export function createErrorSchema(error: string, canRetry: boolean): CognitiveUISchema {...}
export function createTextFallbackSchema(text: string): CognitiveUISchema {...}
```

---

### Étape 3 : Modifier le CognitiveBrain pour gérer les états transitionnels

**Fichier** : `src/lib/brain/CognitiveBrain.ts`

Modifications :
1. **Émettre un schéma de transition** avant d'exécuter les actions système
2. **Garder le dernier schéma valide** en mémoire pour fallback
3. **Auto-retry** avec schéma explicatif si le parsing JSON échoue (max 2 tentatives)

```typescript
// Dans executeSystemActions()
private async executeSystemActions(...) {
  // 1. Émettre schéma de transition IMMÉDIATEMENT
  this.callbacks.onUISchema?.(createLoadingSchema(
    'Exécution des commandes système...',
    { count: actions.length }
  ));

  // 2. Exécuter les actions
  for (const action of actions) {...}

  // 3. Construire le schéma final
  await this.buildUIFromSystemResults(results, correlationId);
}
```

---

### Étape 4 : Ajouter un système d'auto-correction IA

**Fichier** : `src/lib/brain/agents/ThinkerAgent.ts`

Si le parsing échoue, on relance automatiquement avec un prompt de correction :

```typescript
private parseResponse(content: string, mode: string): Partial<ThinkResult> {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Pas de JSON → retourner un flag pour auto-retry
      return { 
        thought: content,
        needsRetry: true,
        retryReason: 'no_json_found'
      };
    }
    // ... parsing normal
  } catch (parseError) {
    return {
      thought: content,
      needsRetry: true,
      retryReason: 'json_parse_error',
      rawError: parseError.message
    };
  }
}
```

Dans `CognitiveBrain.processTaskResult()` :
```typescript
if (thinkResult.needsRetry && this.retryCount < 2) {
  this.retryCount++;
  // Afficher schéma d'erreur temporaire
  this.callbacks.onUISchema?.(createErrorSchema(
    `Erreur de format (tentative ${this.retryCount}/2)`,
    true
  ));
  // Auto-prompt de correction
  await this.sendCorrectionPrompt(thinkResult.rawResponse);
} else if (thinkResult.needsRetry) {
  // Max retries atteint → schéma d'erreur final
  this.callbacks.onUISchema?.(createErrorSchema(
    'Impossible de traiter la réponse',
    false
  ));
}
```

---

### Étape 5 : Améliorer le hook pour conserver le dernier schéma valide

**Fichier** : `src/hooks/useCognitiveBrain.ts`

```typescript
const [lastValidSchema, setLastValidSchema] = useState<CognitiveUISchema | null>(null);

// Dans le callback onUISchema
onUISchema: (schema: unknown) => {
  const typedSchema = schema as CognitiveUISchema;
  
  // Sauvegarder si c'est un schéma "complet" (pas juste un loading)
  if (typedSchema.blocks?.length > 0 && !isTransitionSchema(typedSchema)) {
    setLastValidSchema(typedSchema);
  }
  
  setState(prev => ({
    ...prev,
    schema: typedSchema,
    // ...
  }));
};

// Exposer lastValidSchema pour fallback UI
return {
  // ...
  lastValidSchema,
};
```

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `src/components/cognitive/CognitiveInterface.tsx` | Fix crash ligne 88 + utiliser lastValidSchema |
| `src/lib/brain/schemaFallbacks.ts` | Créer (fonctions de génération de schémas) |
| `src/lib/brain/CognitiveBrain.ts` | Émettre schémas transitionnels + auto-retry |
| `src/lib/brain/agents/ThinkerAgent.ts` | Détection erreur parsing + flag retry |
| `src/hooks/useCognitiveBrain.ts` | Conserver lastValidSchema |
| `src/lib/brain/types.ts` | Ajouter types pour retry |

---

## Détails techniques

### Flux après correction

```text
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Action    │ ───▶ │  Schéma     │ ───▶ │  Exécution  │
│ utilisateur │      │ transition  │      │  async      │
└─────────────┘      │ (loading)   │      └──────┬──────┘
                     └─────────────┘             │
                                                 ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Schéma     │ ◀─── │  IA génère  │ ◀─── │  Résultat   │
│  final      │      │  réponse    │      │  reçu       │
└─────────────┘      └──────┬──────┘      └─────────────┘
                            │
                     ┌──────▼──────┐
                     │ JSON valide?│
                     └──────┬──────┘
                      Non   │  Oui
                 ┌──────────┴──────────┐
                 ▼                     ▼
         ┌───────────────┐      ┌───────────────┐
         │ Auto-retry    │      │ Afficher      │
         │ (max 2x)      │      │ schéma        │
         └───────┬───────┘      └───────────────┘
                 │
         ┌───────▼───────┐
         │ Schéma erreur │
         │ + actions     │
         └───────────────┘
```

### Constantes de configuration

```typescript
const ASYNC_CONFIG = {
  maxRetries: 2,
  retryDelayMs: 500,
  transitionSchemaTimeout: 30000, // 30s max avant timeout
};
```
