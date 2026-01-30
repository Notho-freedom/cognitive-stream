# 🎯 Système d'Actions Cognitives - Manuel vs Automatique

## 📋 Vue d'ensemble

Ce système distingue intelligemment les actions qui nécessitent une confirmation manuelle de l'utilisateur (avec message supplémentaire) des actions qui peuvent être envoyées automatiquement à l'IA.

## 🔄 Architecture

### 1. **Types d'Actions**

#### ✅ Actions Automatiques (Auto-submit)
Ces actions sont envoyées immédiatement à l'IA sans attendre d'input supplémentaire :

- **`button-click`** : Clic sur un bouton
  ```typescript
  { actionType: 'button-click', action: 'click' }
  ```

- **`choice-select`** : Sélection d'une option (radio/checkbox)
  ```typescript
  { actionType: 'choice-select', value: 'option1' }
  ```

- **`input-submit`** : Soumission d'un input (touche Entrée)
  ```typescript
  { actionType: 'input-submit', value: 'texte', action: 'submit' }
  ```

#### ⏸️ Actions Manuelles (Require Confirmation)
Ces actions sont stockées en attente et nécessitent que l'utilisateur complète un message :

- **`list-select`** : Sélection d'un élément dans une liste
  ```typescript
  { actionType: 'list-select', index: 0, item: 'Nigeria - Lagos' }
  ```

- **`input-change`** : Modification d'un input (onChange)
  ```typescript
  { actionType: 'input-change', value: 'texte en cours' }
  ```

---

## 🛠️ Implémentation

### Hook `useCognitiveChat`

Le hook gère les deux types d'actions :

```typescript
// État
pendingAction: ActionPayload | null // Action en attente de confirmation

// Méthodes
handleAction(action) // Reçoit l'action et décide si auto ou manuel
confirmAction(customMessage?) // Confirme une action en attente
sendMessage(input, action?) // Envoie le message avec l'action
```

**Logique de décision :**

```typescript
function requiresManualConfirmation(action: ActionPayload): boolean {
  const actionType = action.payload.actionType as string;
  const manualActions = ['list-select', 'input-change'];
  return manualActions.includes(actionType);
}
```

---

### Composants Primitifs

Chaque composant ajoute le `actionType` dans son payload :

#### CogButton
```tsx
<CogButton 
  actionId="validate"
  label="Valider"
  onAction={(action) => {
    // Auto-submit immédiat
    handleAction({
      id: 'validate',
      payload: { actionType: 'button-click', action: 'click' }
    })
  }}
/>
```

#### CogList
```tsx
<CogList 
  items={['Item 1', 'Item 2']}
  selectable
  onAction={(action) => {
    // Stocké en attente
    handleAction({
      id: 'list',
      payload: { actionType: 'list-select', index: 0, item: 'Item 1' }
    })
  }}
/>
```

#### CogChoice
```tsx
<CogChoice 
  options={[...]}
  onAction={(action) => {
    // Auto-submit immédiat
    handleAction({
      id: 'choice',
      payload: { actionType: 'choice-select', value: 'option1' }
    })
  }}
/>
```

#### CogInput
```tsx
<CogInput 
  id="search"
  onAction={(action) => {
    // onChange = manuel, onSubmit = auto
    handleAction({
      id: 'search',
      payload: { 
        actionType: isSubmit ? 'input-submit' : 'input-change',
        value: 'texte' 
      }
    })
  }}
/>
```

---

## 🎨 Interface Utilisateur

### Comportement Normal

1. Utilisateur tape un message
2. Clique sur "Envoyer"
3. Message envoyé à l'IA

### Avec Action Automatique

1. Utilisateur clique sur un bouton ou sélectionne un choix
2. ✅ **Action envoyée immédiatement** à l'IA
3. L'IA répond avec un nouveau schéma

### Avec Action Manuelle

1. Utilisateur sélectionne un élément dans une liste
2. ⏸️ **Action stockée en `pendingAction`**
3. Interface affiche : "ACTION EN ATTENTE"
4. Input est pré-rempli : `J'ai sélectionné: "Nigeria". `
5. Utilisateur complète son message
6. Clique sur "✓ Confirmer" ou appuie sur Entrée
7. Action + message envoyés ensemble à l'IA

---

## 🔍 Exemple de Flux

### Scénario : Sélection dans une liste de pays

```
1. IA affiche : Liste de pays africains
   - Nigeria - Lagos
   - Égypte - Le Caire
   - Afrique du Sud - Pretoria

2. Utilisateur clique sur "Nigeria - Lagos"
   → Action: { id: 'list', payload: { actionType: 'list-select', item: 'Nigeria - Lagos' } }
   → ⏸️ Stockée en pendingAction

3. Interface:
   - Indicateur: "EN ATTENTE D'INPUT" (listening mode)
   - Input pré-rempli: "J'ai sélectionné: \"Nigeria - Lagos\". "
   - Bouton: "✓ Confirmer"
   - Hint: "💡 Complétez votre message"

4. Utilisateur complète: "J'ai sélectionné: \"Nigeria - Lagos\". Donne-moi plus d'infos"

5. Envoi à l'IA:
   {
     "text": "J'ai sélectionné: \"Nigeria - Lagos\". Donne-moi plus d'infos",
     "action": {
       "id": "list",
       "payload": { "actionType": "list-select", "item": "Nigeria - Lagos" }
     }
   }

6. IA comprend la sélection ET le contexte additionnel
   → Peut répondre avec des infos sur le Nigeria
```

---

## 📦 Fichiers Modifiés

### Nouveaux/Mis à jour

1. **`useCognitiveChat.ts`**
   - État `pendingAction`
   - Méthode `handleAction()` avec logique de décision
   - Méthode `confirmAction()`
   - Paramètre `action` dans `sendMessage()`

2. **`CogList.tsx`**
   - Ajout `actionType: 'list-select'`

3. **`CogButton.tsx`**
   - Ajout `actionType: 'button-click'`

4. **`CogChoice.tsx`**
   - Ajout `actionType: 'choice-select'`

5. **`CogInput.tsx`**
   - Distinction `input-change` vs `input-submit`

6. **`CognitiveInterface.tsx`**
   - Affichage de `pendingAction`
   - Indicateur "EN ATTENTE D'INPUT"
   - Pré-remplissage de l'input
   - Bouton "✓ Confirmer"
   - Hint utilisateur

---

## 🚀 Installation

### 1. Remplacer les fichiers

```bash
# Hook
cp useCognitiveChat.ts src/hooks/

# Composants primitifs
cp CogList.tsx src/components/cognitive/dynamic/primitives/
cp CogButton.tsx src/components/cognitive/dynamic/primitives/
cp CogChoice.tsx src/components/cognitive/dynamic/primitives/
cp CogInput.tsx src/components/cognitive/dynamic/primitives/

# Interface principale
cp CognitiveInterface.tsx src/components/cognitive/
```

### 2. Aucune autre modification nécessaire

Le système est **plug-and-play** et fonctionne avec l'architecture existante.

---

## 🎯 Avantages

### ✅ Pour l'Utilisateur

- **Actions rapides** : Boutons et choix s'envoient instantanément
- **Contexte enrichi** : Peut ajouter des précisions aux sélections
- **Feedback clair** : Sait quand une action attend confirmation
- **Flexibilité** : Peut modifier son message avant envoi

### ✅ Pour l'IA

- **Contexte complet** : Reçoit l'action + le message utilisateur
- **Intentions claires** : Sait distinguer les actions simples des requêtes complexes
- **Meilleure compréhension** : Le message additionnel enrichit la compréhension

### ✅ Pour le Développeur

- **Système extensible** : Facile d'ajouter de nouveaux types d'actions
- **Type-safe** : TypeScript assure la cohérence
- **Maintenable** : Logique centralisée dans le hook

---

## 🔮 Extensions Possibles

### 1. Actions Multi-étapes

```typescript
// Action qui déclenche un wizard
{ actionType: 'wizard-start', step: 1 }
```

### 2. Actions Conditionnelles

```typescript
// Action qui dépend d'une validation
{ actionType: 'delete-confirm', requiresDoubleCheck: true }
```

### 3. Actions Groupées

```typescript
// Plusieurs actions en batch
{ actionType: 'batch', actions: [...] }
```

### 4. Actions avec Timeout

```typescript
// Action qui expire après X secondes
{ actionType: 'timed-action', ttl: 30000 }
```

---

## 🎓 Best Practices

### DO ✅

- Utiliser `actionType` descriptifs
- Préfixer les types : `component-action` (ex: `list-select`, `button-click`)
- Fournir un contexte dans le pré-remplissage
- Afficher un feedback visuel clair pour les actions en attente

### DON'T ❌

- Ne pas envoyer d'actions sans `actionType`
- Ne pas mélanger les logiques auto/manuel dans un même composant
- Ne pas oublier de gérer `pendingAction` dans l'interface
- Ne pas bloquer l'input pendant une action en attente

---

## 🐛 Debugging

### Action not sent?

1. Vérifier que `actionType` est défini
2. Vérifier que `onAction` est bien passé au composant
3. Logger dans `handleAction()` du hook

### Action sent twice?

1. Vérifier qu'il n'y a pas de double appel `onAction`
2. S'assurer que `pendingAction` est bien effacé après envoi

### Wrong action type?

1. Vérifier la logique dans `requiresManualConfirmation()`
2. Vérifier que le composant envoie le bon `actionType`

---

## 📝 Changelog

### v1.0 - Initial Implementation

- ✅ Distinction actions manuelles vs automatiques
- ✅ État `pendingAction`
- ✅ Méthode `confirmAction()`
- ✅ Pré-remplissage de l'input
- ✅ Feedback visuel pour actions en attente
- ✅ Support de tous les composants primitifs

---

## 👥 Contribution

Pour ajouter un nouveau type d'action :

1. Définir si elle est manuelle ou auto
2. Ajouter le type dans le composant
3. Mettre à jour `requiresManualConfirmation()` si nécessaire
4. Documenter le comportement

---

## 📞 Support

Pour toute question ou problème :

- Consulter les exemples ci-dessus
- Vérifier les logs console
- Tester avec des actions simples d'abord

---

**Fait avec 🧠 et ⚡ pour une UX cognitive optimale**
