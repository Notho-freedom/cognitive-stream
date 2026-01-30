// Types for the dynamic schema-driven UI system

export type BlockVariant = 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
export type TextVariant = 'body' | 'heading' | 'label' | 'caption' | 'code';
export type ListVariant = 'bullet' | 'numbered' | 'tags';
export type StatusState = 'loading' | 'success' | 'error' | 'warning' | 'info';
export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type CardVariant = 'default' | 'framed' | 'ghost';
export type StackDirection = 'vertical' | 'horizontal';
export type GapSize = 'none' | 'sm' | 'md' | 'lg' | 'xl';
// Layout control types
export type LayoutWidth = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type LayoutMaxHeight = 'sm' | 'md' | 'lg' | 'xl' | 'screen';

// Base block interface
interface BaseBlock {
  id?: string;
}

// Text block
export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;
  variant?: TextVariant;
  streaming?: boolean;
}

// List block
export interface ListBlock extends BaseBlock {
  type: 'list';
  items: string[];
  variant?: ListVariant;
  selectable?: boolean;
}

// Button block
export interface ButtonBlock extends BaseBlock {
  type: 'button';
  label: string;
  actionId: string;
  variant?: BlockVariant;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
}

// Input block
export interface InputBlock extends BaseBlock {
  type: 'input';
  id: string;
  placeholder?: string;
  inputType?: 'text' | 'textarea' | 'number' | 'email' | 'password';
  defaultValue?: string;
  label?: string;
}

// Choice block (radio/checkbox)
export interface ChoiceBlock extends BaseBlock {
  type: 'choice';
  id: string;
  options: Array<{ value: string; label: string; description?: string }>;
  multiple?: boolean;
  defaultValue?: string | string[];
}

// Card container
export interface CardBlock extends BaseBlock {
  type: 'card';
  children: CognitiveBlock[];
  variant?: CardVariant;
  title?: string;
}

// Stack layout
export interface StackBlock extends BaseBlock {
  type: 'stack';
  children: CognitiveBlock[];
  direction?: StackDirection;
  gap?: GapSize;
  align?: 'start' | 'center' | 'end' | 'stretch';
}

// Grid layout
export interface GridBlock extends BaseBlock {
  type: 'grid';
  children: CognitiveBlock[];
  columns?: 2 | 3 | 4;
  gap?: GapSize;
}

// Progress indicator
export interface ProgressBlock extends BaseBlock {
  type: 'progress';
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
}

// Badge/Tag
export interface BadgeBlock extends BaseBlock {
  type: 'badge';
  text: string;
  variant?: BadgeVariant;
}

// Key-Value pairs
export interface KeyValueBlock extends BaseBlock {
  type: 'keyValue';
  pairs: Array<{ key: string; value: string }>;
}

// Divider
export interface DividerBlock extends BaseBlock {
  type: 'divider';
  label?: string;
}

// Status indicator
export interface StatusBlock extends BaseBlock {
  type: 'status';
  state: StatusState;
  message?: string;
}

// Skeleton loading
export interface SkeletonBlock extends BaseBlock {
  type: 'skeleton';
  lines?: number;
  height?: string;
}

// Empty state
export interface EmptyBlock extends BaseBlock {
  type: 'empty';
  title: string;
  description?: string;
  actionLabel?: string;
  actionId?: string;
}

// Union of all block types
export type CognitiveBlock =
  | TextBlock
  | ListBlock
  | ButtonBlock
  | InputBlock
  | ChoiceBlock
  | CardBlock
  | StackBlock
  | GridBlock
  | ProgressBlock
  | BadgeBlock
  | KeyValueBlock
  | DividerBlock
  | StatusBlock
  | SkeletonBlock
  | EmptyBlock;

// Schema structure
export interface CognitiveUISchema {
  blocks: CognitiveBlock[];
  metadata?: {
    title?: string;
    description?: string;
    timestamp?: string;
  };
  layout?: {
    width?: LayoutWidth;
    maxHeight?: LayoutMaxHeight;
    scrollable?: boolean;
    centered?: boolean;
  };
}


// Action payload returned from interactions
export interface ActionPayload {
  id: string;
  payload: Record<string, unknown>;
}
