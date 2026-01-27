export { CognitiveSurface } from './CognitiveSurface';
export type { CognitiveIntent, CognitiveState } from './CognitiveSurface';

export { StateIndicator } from './StateIndicator';
export type { IndicatorMode } from './StateIndicator';

export { ThoughtStream } from './ThoughtStream';
export { EphemeralAction } from './EphemeralAction';
export { ResponseCard } from './ResponseCard';
export type { ResponseState } from './ResponseCard';
export { FuturisticFrame } from './FuturisticFrame';

export { NotificationQueue, NotificationProvider, useNotifications } from './NotificationQueue';
export type { CognitiveNotification, NotificationPriority } from './NotificationQueue';

export { CommandInput } from './CommandInput';
export type { CommandSuggestion } from './CommandInput';

// Dynamic Renderer System
export { DynamicRenderer } from './DynamicRenderer';
export type { 
  ComponentConfig,
  TextConfig,
  ListConfig,
  GridConfig,
  CardConfig,
  InputConfig,
  ButtonConfig,
  ProgressConfig,
  StatsConfig,
  TimelineConfig,
  ChartConfig,
  LayoutConfig
} from './DynamicRenderer';

export { AI_EXAMPLES } from './examples.config';

// Config Utilities
export { ConfigUtils } from './components/cognitive/config.utils';
export type { ValidationResult } from './components/cognitive/config.utils';
