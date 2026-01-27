# 🧠 Cognitive Dynamic Renderer System

## Vue d'ensemble

Le **Dynamic Renderer** est un système révolutionnaire qui permet de construire des interfaces utilisateur **entièrement par configuration JSON**. Plus besoin d'écrire du JSX/HTML - tout est data-driven.

## Architecture

```
User Query → AI Processing → JSON Config → Dynamic Renderer → UI Components
```

### Principe fondamental

- **Entrée**: Configuration JSON décrivant l'interface
- **Traitement**: Le `DynamicRenderer` parse et assemble les composants
- **Sortie**: Interface React totalement fonctionnelle

## Composants disponibles

### 1. Text (`type: 'text'`)

Affiche du texte avec différents styles.

```typescript
{
  type: 'text',
  content: 'Mon texte',
  variant: 'title' | 'subtitle' | 'body' | 'caption' | 'code',
  color: 'primary' | 'secondary' | 'muted' | 'ghost',
  align: 'left' | 'center' | 'right'
}
```

### 2. List (`type: 'list'`)

Liste d'éléments interactive.

```typescript
{
  type: 'list',
  variant: 'simple' | 'detailed' | 'numbered' | 'checkable',
  selectable: true,
  items: [
    {
      id: 'item1',
      label: 'Titre',
      description: 'Description optionnelle',
      icon: '🔥',
      metadata: { custom: 'data' }
    }
  ],
  onSelect: (id) => console.log(id)
}
```

### 3. Grid (`type: 'grid'`)

Layout en grille pour organiser plusieurs composants.

```typescript
{
  type: 'grid',
  columns: 3,
  gap: 20,
  children: [
    // Autres composants...
  ]
}
```

### 4. Card (`type: 'card'`)

Carte conteneur avec titre et actions.

```typescript
{
  type: 'card',
  title: 'Titre de la carte',
  subtitle: 'Sous-titre',
  variant: 'glass' | 'solid' | 'outlined',
  content: { /* Composant enfant */ },
  actions: [
    {
      label: 'Action',
      variant: 'primary' | 'secondary' | 'ghost',
      onClick: () => {}
    }
  ]
}
```

### 5. Input (`type: 'input'`)

Champ de saisie.

```typescript
{
  type: 'input',
  label: 'Label du champ',
  placeholder: 'Entrez du texte...',
  inputType: 'text' | 'number' | 'email' | 'password',
  onChange: (value) => {},
  onSubmit: (value) => {},
  suggestions: ['suggestion1', 'suggestion2']
}
```

### 6. Button (`type: 'button'`)

Bouton d'action.

```typescript
{
  type: 'button',
  label: 'Cliquez ici',
  variant: 'primary' | 'secondary' | 'ghost' | 'danger',
  icon: '🚀',
  onClick: () => {},
  loading: false,
  disabled: false
}
```

### 7. Progress (`type: 'progress'`)

Barre de progression.

```typescript
{
  type: 'progress',
  label: 'Progression',
  value: 67,
  max: 100,
  showPercentage: true,
  variant: 'bar' | 'circle' | 'ring'
}
```

### 8. Stats (`type: 'stats'`)

Affichage de métriques.

```typescript
{
  type: 'stats',
  columns: 3,
  metrics: [
    {
      label: 'Total Users',
      value: '1.2M',
      change: 12.5,
      trend: 'up' | 'down' | 'neutral',
      icon: '👥'
    }
  ]
}
```

### 9. Timeline (`type: 'timeline'`)

Chronologie d'événements.

```typescript
{
  type: 'timeline',
  orientation: 'vertical' | 'horizontal',
  events: [
    {
      id: 'evt1',
      timestamp: '14:32:15',
      title: 'Événement',
      description: 'Détails',
      status: 'completed' | 'active' | 'pending'
    }
  ]
}
```

### 10. Chart (`type: 'chart'`)

Graphiques de données.

```typescript
{
  type: 'chart',
  chartType: 'line' | 'bar' | 'pie' | 'radar',
  title: 'Titre du graphique',
  height: 200,
  data: [
    { label: 'Jan', value: 45 },
    { label: 'Feb', value: 62 }
  ]
}
```

### 11. Layout (`type: 'layout'`)

Container de disposition.

```typescript
{
  type: 'layout',
  direction: 'row' | 'column',
  gap: 16,
  align: 'start' | 'center' | 'end' | 'stretch',
  children: [
    // Composants enfants...
  ]
}
```

## Animations

Tous les composants supportent des animations personnalisées via Framer Motion :

```typescript
{
  type: 'text',
  content: 'Texte animé',
  animation: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay: 0.2 }
  }
}
```

## Utilisation

### Exemple simple

```tsx
import { DynamicRenderer } from '@/components/cognitive';

const config = {
  type: 'text',
  content: 'Hello World',
  variant: 'title',
  color: 'primary'
};

function MyComponent() {
  return <DynamicRenderer config={config} />;
}
```

### Exemple complexe (composition)

```tsx
const complexConfig = {
  type: 'card',
  title: 'Dashboard',
  content: [
    {
      type: 'stats',
      columns: 3,
      metrics: [...]
    },
    {
      type: 'chart',
      chartType: 'bar',
      data: [...]
    }
  ]
};

<DynamicRenderer config={complexConfig} />
```

### Exemple avec contexte

Le contexte permet de passer des données dynamiques aux composants :

```tsx
const context = {
  userId: '123',
  theme: 'dark',
  permissions: ['read', 'write']
};

<DynamicRenderer 
  config={config} 
  context={context} 
/>
```

## Intégration avec l'IA

### Flow typique

1. **User**: "Liste les pays d'Afrique"
2. **AI**: Génère le JSON suivant:

```json
{
  "type": "list",
  "variant": "detailed",
  "items": [
    {
      "id": "nigeria",
      "label": "Nigeria",
      "description": "Population: 206M",
      "icon": "🇳🇬"
    }
  ]
}
```

3. **DynamicRenderer**: Parse et rend l'interface
4. **User**: Voit une belle liste interactive

### Exemple de prompt pour l'IA

```
Tu es un générateur d'interfaces utilisateur. 
Ton rôle est de créer des configurations JSON 
pour le DynamicRenderer.

Types de composants disponibles: text, list, grid, 
card, input, button, progress, stats, timeline, chart, layout.

User: "Crée un dashboard de métriques"

AI Response (JSON):
{
  "type": "grid",
  "columns": 3,
  "children": [
    {
      "type": "card",
      "title": "Users",
      "content": {
        "type": "stats",
        "metrics": [{"label": "Total", "value": "1.2M"}]
      }
    }
  ]
}
```

## Avantages

✅ **Zero JSX** - Tout est configuration
✅ **Composable** - Mix and match des composants
✅ **Type-safe** - TypeScript natif
✅ **AI-friendly** - Facile à générer par IA
✅ **Réutilisable** - Un composant, mille usages
✅ **Extensible** - Ajouter de nouveaux types facilement

## Extension du système

Pour ajouter un nouveau type de composant :

1. **Définir le type** dans `DynamicRenderer.tsx`:

```typescript
export interface MyComponentConfig extends BaseConfig {
  type: 'mycomponent';
  customProp: string;
}
```

2. **Créer le composant**:

```typescript
function MyComponent({ config }: { config: MyComponentConfig }) {
  return <div>{config.customProp}</div>;
}
```

3. **Enregistrer dans le MAP**:

```typescript
const COMPONENT_MAP = {
  // ...
  mycomponent: MyComponent,
};
```

## Exemples pré-construits

Voir `examples.config.ts` pour des exemples complets :

- `africanCountries` - Liste de données
- `quiz` - Interface de quiz
- `dashboard` - Dashboard analytique
- `timeline` - Chronologie
- `searchForm` - Formulaire de recherche
- `productComparison` - Grille de comparaison

## Best Practices

1. **Toujours typer** les configs pour TypeScript
2. **Utiliser les animations** pour une meilleure UX
3. **Composer les composants** plutôt que tout mettre dans un seul
4. **Passer le contexte** pour les données dynamiques
5. **Handler les callbacks** pour l'interactivité

## Roadmap

- [ ] Support des websockets pour live updates
- [ ] Composants de data visualization avancés
- [ ] System de theming dynamique
- [ ] Export/Import de configurations
- [ ] Validation de schéma JSON
- [ ] Composants 3D avec Three.js

---

**Créé avec 🧠 par les systèmes cognitifs Anthropic-inspired**
