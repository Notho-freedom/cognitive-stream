
# Objectif
Rendre l’autonomie réellement “agentique” (comme Cursor/Lovable) en supprimant les causes structurelles d’échecs répétitifs et en faisant en sorte que le cerveau puisse détecter une erreur, la corriger (plan/step), réessayer, et continuer jusqu’à atteindre l’objectif — sans intervention manuelle.

---

# Ce que montrent tes logs (diagnostic précis)

## 1) Erreur runtime “Unknown action: undefined” (uiBuilder / filesystem / system)
Dans tes agents “capability-based” (UIBuilderAgent, FileSystemAgent, SystemAgent), l’**action est lue depuis `task.params.action`** :

- `UIBuilderAgent`: `const { action } = task.params`
- `FileSystemAgent`: `const { action } = task.params`
- `SystemAgent`: `const { action } = task.params`

Mais `PlanExecutor` construit les tâches avec :
- `createTask(step.agent, step.action, step.params, ...)`

Donc **`step.action` se retrouve dans `task.action`**, pas dans `task.params.action`.
Résultat : si le planner n’a pas mis `params.action`, alors `task.params.action === undefined` → “Unknown action: undefined”.

C’est exactement ce que tu vois sur `get_current_tab` :
- la step a `action: "get_current_tab"`
- mais `params: {}` → donc côté agent `action === undefined`.

## 2) Auto-correction “voit l’erreur” mais ne la résout pas
Tu as déjà un `IntelligentErrorResolver` capable de faire un `replace` quand l’erreur contient `Unknown action`.
Mais même quand il remplace `get_current_tab` → `build`, il peut rester coincé si :
- la correction ne **répare pas la forme attendue** (ex: injecter `params.action`)
- ou si après remplacement on ne **re-valide pas** le step modifié (et on retombe dans un retry identique).

## 3) L’autonomie “ne termine jamais” / impression de boucle
Actuellement, le `AutoContinueEngine` est **instancié mais n’est pas le moteur réel** d’exécution :
- `executePlan()` appelle `this.planExecutor.execute()` directement
- `AutoContinueEngine.runUntilObjective()` n’est jamais utilisé ici

Donc l’autonomie est surtout un “journal/contrôle” mais pas un pilote décisionnel qui boucle intelligemment jusqu’au succès.

## 4) Build error TS2739 (PlanValidator.ts)
`AGENT_CAPABILITIES` est typé comme `Record<AgentType,...>` mais `AgentType` (dans `src/lib/brain/types.ts`) contient aussi :
- `llm`, `planner`, `search`

Or `AGENT_CAPABILITIES` ne les définit pas → erreur de build.

---

# Principes de correction (décisions d’architecture)
1) **Unifier le contrat d’exécution des agents** : une action doit être portée de manière cohérente.
2) **Corriger dès le départ ET pendant l’exécution** : validation/correction initiale + correction runtime robuste.
3) **Autonomie = boucle de contrôle réelle** : le moteur autonome doit piloter la progression (pas seulement logger).
4) **Garde-fous anti-boucles** : limites de retries, détection de “same error repeating”, fallback deterministe, et “abort propre”.

---

# Plan d’implémentation (séquencé)

## Étape A — Fix build TS2739 (immédiat, incontournable)
### A1) Choix (le plus simple et robuste)
Modifier le typing de `AGENT_CAPABILITIES` pour ne plus exiger tous les AgentType :
- passer de `Record<AgentType, ...>` à `Partial<Record<AgentType, ...>>`
- ou définir explicitement des capacités pour `llm`, `planner`, `search` (même vides)

Recommandation : **Partial<Record<...>>** + ajout minimal de définitions `planner/search` si réellement utilisés par le planner.

### A2) Option complémentaire (plus “propre”)
Si `llm` n’est plus utilisé nulle part : le retirer d’`AgentType` dans `types.ts`.  
Mais ça peut avoir des impacts ailleurs, donc on privilégie l’option A1.

Livrable : build OK.

---

## Étape B — Unifier le contrat “action” des agents (supprime 80% des erreurs)
### B1) Standardiser : “l’action = `task.action`”
Modifier `UIBuilderAgent`, `FileSystemAgent`, `SystemAgent` pour utiliser :
- `task.action` comme action principale
- `task.params` uniquement pour les paramètres (data/path/command/etc.)

Exemple concret :
- UIBuilderAgent: switch sur `task.action` (build/adapt/merge) au lieu de `task.params.action`
- FileSystemAgent: switch sur `task.action` (read/write/list/…) au lieu de `task.params.action`
- SystemAgent: switch sur `task.action` (exec/spawn/info) au lieu de `task.params.action`

### B2) Ajuster les types params de ces agents
Supprimer le champ `action` dans les interfaces Params, ou le rendre optionnel (fallback), pour éviter la confusion.

### B3) Patch compat (au cas où des tâches anciennes envoient encore params.action)
Pour ne pas casser :
- si `task.action` est vide/undefined, fallback vers `task.params.action`
- log “legacy action format used”

Livrable : plus de “Unknown action: undefined” causé par le mapping action/params.

---

## Étape C — Renforcer le PlanValidator + AutoCorrector pour refléter la réalité
### C1) Mettre `requiredParams` en cohérence avec la vraie exécution
Après Étape B, `requiredParams` doit vérifier ce qui compte réellement :
- FS: `path` requis pour read/list/delete/exists/search, `content` requis pour write, etc.
- System: `command` requis pour exec/spawn
- UIBuilder: `data` requis, `context.previousSchema` requis si action=adapt

### C2) Auto-correction doit corriger “action + params”
Quand on mappe une action invalide (ex: `get_current_tab` → `build`):
- mettre à jour `step.action`
- et adapter `step.params` si nécessaire (ex: injecter `data` vide si absent, ou context si adapt, etc.)
- si l’action d’origine était un “intent UI” non implémentable → basculer vers `thinker.respond` (expliquer + proposer alternative) plutôt que retry inutiles.

Livrable : un plan “corrigé” devient réellement exécutable.

---

## Étape D — Rendre la résolution runtime déterministe et non-bloquante
### D1) Dans `PlanExecutor.handleStepFailureIntelligently` :
Après un `replace` / `retry` avec `newStep` :
- re-valider le step modifié via PlanValidator (au minimum `validateStep`)
- si toujours invalide → fallback “skip si canFail, sinon abort” (pas de boucle infinie)

### D2) Détection “same error repeating”
Ajouter une règle : si (même stepId + même error substring) > N fois :
- stop retry
- force replace/skip/abort

Livrable : fin des boucles “retrying → failed → retrying …”.

---

## Étape E — Autonomie réelle : brancher AutoContinueEngine comme pilote
Actuellement, `AutoContinueEngine` n’est pas le chef d’orchestre. Deux options :

### Option E1 (recommandée, minimal change) : Autonomie pilote “phase par phase”
- Ajouter dans PlanExecutor une API “executeNextPhase() public” ou “executeOneTick()”
- Dans CognitiveBrain.executePlan():
  - faire une boucle pilotée par `AutoContinueEngine.runUntilObjective(...)`
  - où `executeStep(step)` appelle PlanExecutor pour exécuter la step (ou la phase correspondante)
  - AutoContinueEngine décide : continuer / pause / skip / confirm destructif

### Option E2 : Supprimer AutoContinueEngine et intégrer ses règles dans PlanExecutor
- PlanExecutor devient l’unique boucle d’autonomie (plus simple mentalement)
- CognitiveBrain ne fait que configurer (max actions, guardrails, confirmations)

Recommandation : **E2** à terme, mais **E1** est plus rapide à stabiliser maintenant.

Livrable : l’autonomie est une vraie boucle de contrôle jusqu’à “objective reached” ou échec propre.

---

## Étape F — Focus mode et “initiative”
Ton attente “comme Cursor” implique :
- si une step échoue, le système doit “chercher la cause” puis “appliquer un patch”
- pas juste retry/skip

Ce que je vais ajouter (sans surcomplexifier) :
1) Une catégorie d’erreurs “structurelles” (invalid action, missing params) → fix déterministe (validator/corrector)
2) Une catégorie d’erreurs “environnement” (Electron bridge absent, permission) → adaptation de plan (remplacer FS/System par Thinker + UI instructions)
3) Une catégorie d’erreurs “fonctionnelles” (ex: commande shell échoue) → ThinkerAgent analyze + propose alternative command → replace step

Livrable : il “voit l’erreur” et agit réellement (pas uniquement logging).

---

# Fichiers impactés (prévision)
- `src/lib/brain/PlanValidator.ts`
  - Fix TS2739 (Partial<Record> ou ajout capacités llm/planner/search)
  - Ajuster requiredParams + autocorrect “action+params”
- `src/lib/brain/PlanExecutor.ts`
  - Validation step après correction runtime
  - Anti-loop + “same error repeating”
  - (optionnel) API tick/phase pour autonomie
- `src/lib/brain/CognitiveBrain.ts`
  - Brancher AutoContinueEngine réellement (ou simplifier et le retirer)
- `src/lib/brain/agents/UIBuilderAgent.ts`
  - Switch sur `task.action` (+ fallback legacy)
- `src/lib/brain/agents/FileSystemAgent.ts`
  - Switch sur `task.action` (+ fallback legacy)
- `src/lib/brain/agents/SystemAgent.ts`
  - Switch sur `task.action` (+ fallback legacy)
- (optionnel) `src/lib/brain/types.ts`
  - clarifier AgentType si besoin (mais éviter si possible)

---

# Critères d’acceptation (tests concrets à faire après)
1) Un plan contenant une step uiBuilder “get_current_tab” ne produit plus “Unknown action: undefined” :
   - soit corrigé en “build”
   - soit remplacé par thinker step si non applicable
2) Si une step est invalidable, elle est corrigée avant exécution (validateAndCorrectPlan), ET si elle se modifie runtime elle est re-validée.
3) Autonomie : sur une commande complexe, le cerveau enchaîne sans clics et termine :
   - succès total, ou
   - échec propre (abort) avec résumé clair et journal exploitable
4) Aucune boucle infinie de retry sur la même erreur.

---

# Risques / points d’attention
- Cette correction change un contrat implicite “action dans params” : on maintiendra un fallback pour compat.
- Si Electron bridge est souvent indisponible (web), l’autonomie doit apprendre à “adapter” (ne pas planifier du filesystem/system si non dispo).
  - On ajoutera un “environmentInfo.systemAvailable/isElectron” au prompt du planner (si pas déjà).

