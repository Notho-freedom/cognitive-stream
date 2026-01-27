import { motion } from 'framer-motion';
import { ComponentType } from 'react';

// ═══════════════════════════════════════════════════════
// TYPE SYSTEM - Définitions des structures JSON
// ═══════════════════════════════════════════════════════

export type ComponentConfig = 
  | TextConfig
  | ListConfig
  | GridConfig
  | CardConfig
  | InputConfig
  | ButtonConfig
  | ProgressConfig
  | StatsConfig
  | TimelineConfig
  | ChartConfig
  | LayoutConfig;

export interface BaseConfig {
  type: string;
  id?: string;
  className?: string;
  animation?: AnimationConfig;
}

export interface AnimationConfig {
  initial?: Record<string, any>;
  animate?: Record<string, any>;
  transition?: Record<string, any>;
}

// ═══════════════════════════════════════════════════════
// COMPONENT CONFIGS - Configurations spécifiques
// ═══════════════════════════════════════════════════════

export interface TextConfig extends BaseConfig {
  type: 'text';
  content: string;
  variant?: 'title' | 'subtitle' | 'body' | 'caption' | 'code';
  color?: 'primary' | 'secondary' | 'muted' | 'ghost';
  align?: 'left' | 'center' | 'right';
}

export interface ListConfig extends BaseConfig {
  type: 'list';
  items: Array<{
    id: string;
    label: string;
    description?: string;
    icon?: string;
    metadata?: Record<string, any>;
  }>;
  variant?: 'simple' | 'detailed' | 'numbered' | 'checkable';
  selectable?: boolean;
  onSelect?: (id: string) => void;
}

export interface GridConfig extends BaseConfig {
  type: 'grid';
  columns: number;
  gap?: number;
  children: ComponentConfig[];
}

export interface CardConfig extends BaseConfig {
  type: 'card';
  title?: string;
  subtitle?: string;
  content: ComponentConfig | ComponentConfig[];
  actions?: Array<{
    label: string;
    variant?: 'primary' | 'secondary' | 'ghost';
    onClick?: () => void;
  }>;
  variant?: 'glass' | 'solid' | 'outlined';
}

export interface InputConfig extends BaseConfig {
  type: 'input';
  placeholder?: string;
  label?: string;
  inputType?: 'text' | 'number' | 'email' | 'password';
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  suggestions?: string[];
}

export interface ButtonConfig extends BaseConfig {
  type: 'button';
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export interface ProgressConfig extends BaseConfig {
  type: 'progress';
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'bar' | 'circle' | 'ring';
}

export interface StatsConfig extends BaseConfig {
  type: 'stats';
  metrics: Array<{
    label: string;
    value: string | number;
    change?: number;
    trend?: 'up' | 'down' | 'neutral';
    icon?: string;
  }>;
  columns?: number;
}

export interface TimelineConfig extends BaseConfig {
  type: 'timeline';
  events: Array<{
    id: string;
    timestamp: string;
    title: string;
    description?: string;
    status?: 'completed' | 'active' | 'pending';
  }>;
  orientation?: 'vertical' | 'horizontal';
}

export interface ChartConfig extends BaseConfig {
  type: 'chart';
  chartType: 'line' | 'bar' | 'pie' | 'radar';
  data: Array<{ label: string; value: number }>;
  title?: string;
  height?: number;
}

export interface LayoutConfig extends BaseConfig {
  type: 'layout';
  direction?: 'row' | 'column';
  gap?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  children: ComponentConfig[];
}

// ═══════════════════════════════════════════════════════
// DYNAMIC RENDERER - Le moteur de rendu
// ═══════════════════════════════════════════════════════

interface DynamicRendererProps {
  config: ComponentConfig | ComponentConfig[];
  context?: Record<string, any>;
}

export function DynamicRenderer({ config, context = {} }: DynamicRendererProps) {
  // Si c'est un array de configs, on les rend tous
  if (Array.isArray(config)) {
    return (
      <>
        {config.map((cfg, i) => (
          <DynamicRenderer key={cfg.id || i} config={cfg} context={context} />
        ))}
      </>
    );
  }

  // Récupérer le bon composant selon le type
  const Component = COMPONENT_MAP[config.type];
  
  if (!Component) {
    console.warn(`Unknown component type: ${config.type}`);
    return null;
  }

  // Wrapper avec animation si spécifiée
  const content = <Component config={config as any} context={context} />;

  if (config.animation) {
    return (
      <motion.div
        initial={config.animation.initial}
        animate={config.animation.animate}
        transition={config.animation.transition}
        className={config.className}
      >
        {content}
      </motion.div>
    );
  }

  return <div className={config.className}>{content}</div>;
}

// ═══════════════════════════════════════════════════════
// COMPONENT MAP - Registry des composants
// ═══════════════════════════════════════════════════════

const COMPONENT_MAP: Record<string, ComponentType<{ config: any; context: any }>> = {
  text: TextComponent,
  list: ListComponent,
  grid: GridComponent,
  card: CardComponent,
  input: InputComponent,
  button: ButtonComponent,
  progress: ProgressComponent,
  stats: StatsComponent,
  timeline: TimelineComponent,
  chart: ChartComponent,
  layout: LayoutComponent,
};

// ═══════════════════════════════════════════════════════
// COMPONENT IMPLEMENTATIONS - Les composants atomiques
// ═══════════════════════════════════════════════════════

function TextComponent({ config }: { config: TextConfig }) {
  const variantClasses = {
    title: 'text-2xl font-light text-text-primary tracking-wide',
    subtitle: 'text-lg font-light text-text-secondary',
    body: 'text-sm text-text-secondary leading-relaxed',
    caption: 'text-xs text-text-muted',
    code: 'text-xs font-mono text-intent-primary bg-surface-glass/20 px-2 py-1 rounded',
  };

  const colorClasses = {
    primary: 'text-intent-primary',
    secondary: 'text-intent-secondary',
    muted: 'text-text-muted',
    ghost: 'text-text-ghost',
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <p
      className={`
        ${variantClasses[config.variant || 'body']}
        ${config.color ? colorClasses[config.color] : ''}
        ${config.align ? alignClasses[config.align] : ''}
      `}
    >
      {config.content}
    </p>
  );
}

function ListComponent({ config, context }: { config: ListConfig; context: any }) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelected(id);
    config.onSelect?.(id);
  };

  return (
    <div className="space-y-2">
      {config.items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => config.selectable && handleSelect(item.id)}
          className={`
            p-3 rounded-lg border transition-all cursor-pointer
            ${selected === item.id 
              ? 'bg-intent-primary/10 border-intent-primary' 
              : 'bg-surface-glass/5 border-intent-neutral/20 hover:border-intent-primary/40'
            }
          `}
        >
          <div className="flex items-start gap-3">
            {config.variant === 'numbered' && (
              <span className="text-xs text-intent-primary font-mono">{index + 1}</span>
            )}
            {item.icon && <span className="text-intent-primary">{item.icon}</span>}
            <div className="flex-1">
              <p className="text-sm text-text-primary">{item.label}</p>
              {item.description && (
                <p className="text-xs text-text-muted mt-1">{item.description}</p>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function GridComponent({ config, context }: { config: GridConfig; context: any }) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${config.columns}, 1fr)`,
        gap: `${config.gap || 16}px`,
      }}
    >
      {config.children.map((child, i) => (
        <DynamicRenderer key={child.id || i} config={child} context={context} />
      ))}
    </div>
  );
}

function CardComponent({ config, context }: { config: CardConfig; context: any }) {
  return (
    <div className="glass-surface p-6 rounded-cognitive">
      {config.title && (
        <h3 className="text-lg font-light text-text-primary mb-2">{config.title}</h3>
      )}
      {config.subtitle && (
        <p className="text-xs text-text-muted mb-4">{config.subtitle}</p>
      )}
      
      <div className="mb-4">
        {Array.isArray(config.content) 
          ? config.content.map((c, i) => <DynamicRenderer key={i} config={c} context={context} />)
          : <DynamicRenderer config={config.content} context={context} />
        }
      </div>

      {config.actions && config.actions.length > 0 && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-intent-primary/10">
          {config.actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`
                px-4 py-2 text-xs uppercase tracking-wider rounded
                ${action.variant === 'primary' 
                  ? 'bg-intent-primary/20 text-intent-primary border border-intent-primary/40' 
                  : 'text-text-ghost hover:text-text-secondary'
                }
              `}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InputComponent({ config }: { config: InputConfig }) {
  const [value, setValue] = useState(config.value || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    config.onChange?.(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    config.onSubmit?.(value);
  };

  return (
    <div className="space-y-2">
      {config.label && (
        <label className="text-xs text-text-muted uppercase tracking-wider">
          {config.label}
        </label>
      )}
      <form onSubmit={handleSubmit}>
        <input
          type={config.inputType || 'text'}
          value={value}
          onChange={handleChange}
          placeholder={config.placeholder}
          className="w-full bg-surface-glass/10 border border-intent-neutral/20 rounded px-4 py-2 text-sm text-text-primary placeholder:text-text-ghost focus:border-intent-primary/40 outline-none transition-colors"
        />
      </form>
    </div>
  );
}

function ButtonComponent({ config }: { config: ButtonConfig }) {
  return (
    <button
      onClick={config.onClick}
      disabled={config.disabled || config.loading}
      className={`
        px-6 py-2 text-xs uppercase tracking-wider rounded transition-all
        ${config.variant === 'primary' 
          ? 'bg-intent-primary/20 text-intent-primary border border-intent-primary/40 hover:bg-intent-primary/30' 
          : config.variant === 'danger'
          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
          : 'text-text-ghost hover:text-text-secondary'
        }
        ${config.disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {config.loading ? 'Loading...' : config.label}
    </button>
  );
}

function ProgressComponent({ config }: { config: ProgressConfig }) {
  const percentage = ((config.value / (config.max || 100)) * 100).toFixed(0);

  return (
    <div className="space-y-2">
      {config.label && (
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">{config.label}</span>
          {config.showPercentage && (
            <span className="text-intent-primary font-mono">{percentage}%</span>
          )}
        </div>
      )}
      <div className="h-2 bg-surface-glass/20 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-intent-primary"
        />
      </div>
    </div>
  );
}

function StatsComponent({ config }: { config: StatsConfig }) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${config.columns || 3}, 1fr)` }}
    >
      {config.metrics.map((metric, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass-surface p-4 rounded-lg"
        >
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
            {metric.label}
          </p>
          <p className="text-2xl font-light text-text-primary">
            {metric.value}
          </p>
          {metric.change !== undefined && (
            <p
              className={`text-xs mt-1 ${
                metric.trend === 'up' ? 'text-green-400' : 
                metric.trend === 'down' ? 'text-red-400' : 
                'text-text-muted'
              }`}
            >
              {metric.change > 0 ? '+' : ''}{metric.change}%
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function TimelineComponent({ config }: { config: TimelineConfig }) {
  return (
    <div className="space-y-4">
      {config.events.map((event, i) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex gap-4"
        >
          <div className="flex flex-col items-center">
            <div
              className={`w-3 h-3 rounded-full ${
                event.status === 'completed' ? 'bg-intent-success' :
                event.status === 'active' ? 'bg-intent-primary' :
                'bg-intent-neutral'
              }`}
            />
            {i < config.events.length - 1 && (
              <div className="w-px h-full bg-intent-neutral/20 mt-2" />
            )}
          </div>
          <div className="flex-1 pb-6">
            <p className="text-xs text-text-ghost font-mono mb-1">{event.timestamp}</p>
            <p className="text-sm text-text-primary">{event.title}</p>
            {event.description && (
              <p className="text-xs text-text-muted mt-1">{event.description}</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ChartComponent({ config }: { config: ChartConfig }) {
  const max = Math.max(...config.data.map(d => d.value));
  
  return (
    <div className="space-y-4">
      {config.title && (
        <h4 className="text-sm text-text-muted uppercase tracking-wider">{config.title}</h4>
      )}
      <div className="flex items-end gap-2" style={{ height: config.height || 200 }}>
        {config.data.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(item.value / max) * 100}%` }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="w-full bg-intent-primary/60 rounded-t"
            />
            <p className="text-xs text-text-ghost">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LayoutComponent({ config, context }: { config: LayoutConfig; context: any }) {
  return (
    <div
      className={`flex ${config.direction === 'column' ? 'flex-col' : 'flex-row'}`}
      style={{ gap: `${config.gap || 16}px` }}
    >
      {config.children.map((child, i) => (
        <DynamicRenderer key={child.id || i} config={child} context={context} />
      ))}
    </div>
  );
}

// Import useState
import { useState } from 'react';
