/**
 * 🧠 COGNITIVE DYNAMIC UI SYSTEM
 * 
 * Types pour le système de composants dynamiques piloté par JSON.
 * L'IA peut construire des interfaces en décrivant la structure en JSON.
 */

// ═══════════════════════════════════════════════════════
// ACTIONS & CALLBACKS
// ═══════════════════════════════════════════════════════

export interface CognitiveAction {
  /** Identifiant unique de l'action */
  id: string;
  /** Payload JSON personnalisable retourné lors de l'action */
  payload?: Record<string, unknown>;
  /** Type d'action (optionnel, pour catégoriser) */
  type?: 'navigate' | 'submit' | 'toggle' | 'select' | 'dismiss' | 'custom';
}

export type ActionCallback = (action: CognitiveAction) => void;

// ═══════════════════════════════════════════════════════
// STYLES & VARIANTS
// ═══════════════════════════════════════════════════════

export type IntentVariant = 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'focus';
export type SizeVariant = 'sm' | 'md' | 'lg' | 'xl';
export type LayoutDirection = 'horizontal' | 'vertical';

export interface BaseBlockProps {
  /** Identifiant unique du bloc */
  id?: string;
  /** Intent visuel */
  intent?: IntentVariant;
  /** Taille */
  size?: SizeVariant;
  /** Classes CSS additionnelles */
  className?: string;
}

// ═══════════════════════════════════════════════════════
// BLOCS DE DONNÉES (Affichage)
// ═══════════════════════════════════════════════════════

export interface TextBlock extends BaseBlockProps {
  type: 'text';
  content: string;
  variant?: 'heading' | 'subheading' | 'body' | 'caption' | 'code' | 'label';
  streaming?: boolean;
}

export interface ListBlock extends BaseBlockProps {
  type: 'list';
  title?: string;
  description?: string;
  items: Array<{
    id: string;
    content: string;
    icon?: string;
    action?: CognitiveAction;
    selected?: boolean;
  }>;
  variant?: 'bullet' | 'numbered' | 'inline' | 'interactive';
  selectable?: boolean;
}

export interface TableBlock extends BaseBlockProps {
  type: 'table';
  columns: Array<{
    key: string;
    label: string;
    width?: string;
  }>;
  rows: Array<Record<string, string | number>>;
  interactive?: boolean;
  rowAction?: (rowId: string) => CognitiveAction;
}

export interface KeyValueBlock extends BaseBlockProps {
  type: 'keyvalue';
  pairs: Array<{
    key: string;
    value: string | number;
    icon?: string;
  }>;
  layout?: LayoutDirection;
}

export interface ProgressBlock extends BaseBlockProps {
  type: 'progress';
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
}

export interface BadgeBlock extends BaseBlockProps {
  type: 'badge';
  text: string;
  icon?: string;
}

// ═══════════════════════════════════════════════════════
// BLOCS INTERACTIFS (Inputs)
// ═══════════════════════════════════════════════════════

export interface ButtonBlock extends BaseBlockProps {
  type: 'button';
  label: string;
  icon?: string;
  action: CognitiveAction;
  variant?: 'solid' | 'outline' | 'ghost' | 'glow';
  loading?: boolean;
  disabled?: boolean;
}

export interface InputBlock extends BaseBlockProps {
  type: 'input';
  placeholder?: string;
  value?: string;
  inputType?: 'text' | 'number' | 'email' | 'password' | 'search';
  action?: CognitiveAction; // Triggered on submit
  onChange?: CognitiveAction; // Triggered on change
}

export interface TextareaBlock extends BaseBlockProps {
  type: 'textarea';
  placeholder?: string;
  value?: string;
  rows?: number;
  action?: CognitiveAction;
}

export interface SelectBlock extends BaseBlockProps {
  type: 'select';
  placeholder?: string;
  value?: string;
  options: Array<{
    value: string;
    label: string;
    icon?: string;
  }>;
  action?: CognitiveAction;
}

export interface ChoiceBlock extends BaseBlockProps {
  type: 'choice';
  options: Array<{
    id: string;
    label: string;
    description?: string;
    icon?: string;
    selected?: boolean;
  }>;
  multiple?: boolean;
  action?: CognitiveAction;
}

export interface SliderBlock extends BaseBlockProps {
  type: 'slider';
  value: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  action?: CognitiveAction;
}

export interface ToggleBlock extends BaseBlockProps {
  type: 'toggle';
  label: string;
  checked?: boolean;
  action?: CognitiveAction;
}

// ═══════════════════════════════════════════════════════
// BLOCS DE LAYOUT (Conteneurs)
// ═══════════════════════════════════════════════════════

export interface CardBlock extends BaseBlockProps {
  type: 'card';
  title?: string;
  subtitle?: string;
  children: CognitiveBlock[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  actions?: ButtonBlock[];
  variant?: 'glass' | 'solid' | 'minimal' | 'framed';
}

export interface GridBlock extends BaseBlockProps {
  type: 'grid';
  columns?: number | 'auto';
  gap?: SizeVariant;
  children: CognitiveBlock[];
}

export interface StackBlock extends BaseBlockProps {
  type: 'stack';
  direction?: LayoutDirection;
  gap?: SizeVariant;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  children: CognitiveBlock[];
}

export interface AccordionBlock extends BaseBlockProps {
  type: 'accordion';
  items: Array<{
    id: string;
    title: string;
    children: CognitiveBlock[];
    defaultOpen?: boolean;
  }>;
  multiple?: boolean;
}

export interface TabsBlock extends BaseBlockProps {
  type: 'tabs';
  tabs: Array<{
    id: string;
    label: string;
    icon?: string;
    children: CognitiveBlock[];
  }>;
  defaultTab?: string;
}

export interface DividerBlock extends BaseBlockProps {
  type: 'divider';
  label?: string;
}

export interface SpacerBlock extends BaseBlockProps {
  type: 'spacer';
}

// ═══════════════════════════════════════════════════════
// BLOCS SPÉCIAUX
// ═══════════════════════════════════════════════════════

export interface StatusBlock extends BaseBlockProps {
  type: 'status';
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning';
  message?: string;
}

export interface SkeletonBlock extends BaseBlockProps {
  type: 'skeleton';
  variant?: 'text' | 'card' | 'list' | 'image';
  lines?: number;
}

export interface EmptyBlock extends BaseBlockProps {
  type: 'empty';
  title?: string;
  description?: string;
  icon?: string;
  action?: ButtonBlock;
}

export interface ImageBlock extends BaseBlockProps {
  type: 'image';
  src: string;
  alt?: string;
  aspectRatio?: '1:1' | '16:9' | '4:3' | 'auto';
}

export interface IconBlock extends BaseBlockProps {
  type: 'icon';
  name: string;
}

// ═══════════════════════════════════════════════════════
// UNION TYPE - Tous les blocs possibles
// ═══════════════════════════════════════════════════════

export type CognitiveBlock =
  // Data blocks
  | TextBlock
  | ListBlock
  | TableBlock
  | KeyValueBlock
  | ProgressBlock
  | BadgeBlock
  // Interactive blocks
  | ButtonBlock
  | InputBlock
  | TextareaBlock
  | SelectBlock
  | ChoiceBlock
  | SliderBlock
  | ToggleBlock
  // Layout blocks
  | CardBlock
  | GridBlock
  | StackBlock
  | AccordionBlock
  | TabsBlock
  | DividerBlock
  | SpacerBlock
  // Special blocks
  | StatusBlock
  | SkeletonBlock
  | EmptyBlock
  | ImageBlock
  | IconBlock;

// ═══════════════════════════════════════════════════════
// SCHEMA RACINE - Point d'entrée JSON
// ═══════════════════════════════════════════════════════

export interface CognitiveUISchema {
  /** Version du schéma */
  version?: '1.0';
  /** Intent global */
  intent?: IntentVariant;
  /** Blocs à rendre */
  blocks: CognitiveBlock[];
  /** Métadonnées optionnelles */
  meta?: {
    title?: string;
    description?: string;
    timestamp?: string;
  };
}