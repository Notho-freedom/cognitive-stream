// Types for the dynamic schema-driven UI system

export type BlockVariant = 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
export type TextVariant = 'body' | 'heading' | 'label' | 'caption' | 'code';
export type ListVariant = 'bullet' | 'numbered' | 'tags';
export type StatusState = 'loading' | 'success' | 'error' | 'warning' | 'info';
export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type CardVariant = 'default' | 'framed' | 'ghost';
export type StackDirection = 'vertical' | 'horizontal' | 'row'; // 'row' alias for 'horizontal'
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
  spacing?: number; // Spacing as number (Tailwind gap units)
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

// Image block
export interface ImageBlock extends BaseBlock {
  type: 'image';
  src: string;
  alt?: string;
  caption?: string;
  aspectRatio?: '1:1' | '16:9' | '4:3' | '21:9';
  fit?: 'cover' | 'contain' | 'fill';
  rounded?: boolean;
  clickable?: boolean;
  actionId?: string;
}

// Code block
export interface CodeBlock extends BaseBlock {
  type: 'code';
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  copyable?: boolean;
}

// Table block
export interface TableBlock extends BaseBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  selectable?: boolean;
}

// Tabs block
export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  children: CognitiveBlock[];
}

export interface TabsBlock extends BaseBlock {
  type: 'tabs';
  tabs: TabItem[];
  defaultTab?: string;
  variant?: 'default' | 'pills' | 'underline';
}

// Accordion block
export interface AccordionItem {
  id: string;
  title: string;
  subtitle?: string;
  children: CognitiveBlock[];
}

export interface AccordionBlock extends BaseBlock {
  type: 'accordion';
  items: AccordionItem[];
  multiple?: boolean;
  defaultOpen?: string[];
  variant?: 'default' | 'bordered' | 'ghost';
}

// Alert block
export interface AlertBlock extends BaseBlock {
  type: 'alert';
  variant: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  dismissible?: boolean;
  actionLabel?: string;
  actionId?: string;
}

// Timer block
export interface TimerBlock extends BaseBlock {
  type: 'timer';
  duration: number;
  autoStart?: boolean;
  showControls?: boolean;
  variant?: 'countdown' | 'stopwatch' | 'progress';
  label?: string;
}

// Rating block
export interface RatingBlock extends BaseBlock {
  type: 'rating';
  max?: number;
  defaultValue?: number;
  label?: string;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Slider block
export interface SliderBlock extends BaseBlock {
  type: 'slider';
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  label?: string;
  showValue?: boolean;
  showMinMax?: boolean;
  suffix?: string;
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
  | EmptyBlock
  | ImageBlock
  | CodeBlock
  | TableBlock
  | TabsBlock
  | AccordionBlock
  | AlertBlock
  | TimerBlock
  | RatingBlock
  | SliderBlock;

// Schema structure
export interface CognitiveUISchema {
  blocks: CognitiveBlock[];
  metadata?: {
    title?: string;
    description?: string;
    timestamp?: string;
    // Transition/fallback flags for async handling
    isTransition?: boolean;
    isError?: boolean;
    isFallback?: boolean;
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
