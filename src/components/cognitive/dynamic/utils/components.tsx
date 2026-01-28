// utils/components.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Check, ChevronRight, Circle, Hash, List, 
  ChevronDown, Loader2, Inbox, Search, Database, 
  Code, Info, AlertCircle, X, 
  CheckCircle, AlertTriangle, XCircle
} from 'lucide-react';
import React, { useState } from 'react';

// ============================================================================
// ANIMATED CONTAINER
// ============================================================================

interface AnimatedContainerProps {
  children: React.ReactNode;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function AnimatedContainer({
  children,
  className,
  onMouseEnter,
  onMouseLeave
}: AnimatedContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// PULSE INDICATOR
// ============================================================================

interface PulseIndicatorProps {
  intent?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | string;
  size?: 'sm' | 'md' | 'lg';
}

export function PulseIndicator({ 
  intent = 'primary', 
  size = 'md' 
}: PulseIndicatorProps) {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  const intentClass = `intent-${intent}`;

  return (
    <motion.div 
      className={cn("relative", sizeClasses[size])} 
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className={cn("absolute inset-0 rounded-full", `bg-${intentClass}/60`)} />
      <motion.div 
        className={cn("absolute inset-0 rounded-full", `bg-${intentClass}`)}
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1, 0.8] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

// ============================================================================
// STATUS INDICATOR
// ============================================================================

interface StatusIndicatorProps {
  text: string;
  intent?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | string;
}

export function StatusIndicator({ text, intent = 'primary' }: StatusIndicatorProps) {
  const intentClass = `intent-${intent}`;

  return (
    <motion.span 
      className={cn("text-[8px] font-mono", `text-${intentClass}`)}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      {text}
    </motion.span>
  );
}

// ============================================================================
// ANIMATED DATA ITEM
// ============================================================================

interface AnimatedDataItemProps {
  label: string;
  value: string;
  delay?: number;
}

export function AnimatedDataItem({ label, value, delay = 0 }: AnimatedDataItemProps) {
  return (
    <motion.span
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {label}:{value}
    </motion.span>
  );
}

// ============================================================================
// COGNITIVE HEADER
// ============================================================================

interface CognitiveHeaderProps {
  title?: string;
  description?: string;
  variant?: 'numbered' | 'bullet' | 'interactive' | 'inline' | string;
  selectable?: boolean;
  icon?: React.ReactNode;
  variantLabel?: string;
  intent?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | string;
  customCode?: string;
}

export function CognitiveHeader({
  title,
  description,
  variant = 'bullet',
  selectable = false,
  icon,
  variantLabel,
  intent = 'primary',
  customCode = 'COGNITIVE.LIST.v2.4'
}: CognitiveHeaderProps) {
  const getDefaultIcon = () => {
    switch (variant) {
      case 'numbered': return <Hash className="w-4 h-4" />;
      case 'bullet': return <Circle className="w-3 h-3" fill="currentColor" />;
      case 'interactive': return <List className="w-4 h-4" />;
      default: return <List className="w-4 h-4" />;
    }
  };

  const getDefaultLabel = () => {
    switch (variant) {
      case 'numbered': return 'NUMÉROTÉE';
      case 'bullet': return 'LISTE';
      case 'interactive': return selectable ? 'SÉLECTION' : 'INTERACTIVE';
      default: return 'LISTE';
    }
  };

  const intentClass = `intent-${intent}`;

  return (
    <div className={cn("flex items-start justify-between mb-5 pb-4 border-b", `border-${intentClass}/20`)}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          {/* Status indicator */}
          <div className="relative flex-shrink-0">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              `bg-${intentClass}/10`
            )}>
              <div className={cn(`text-${intentClass}`)}>
                {icon || getDefaultIcon()}
              </div>
            </div>
            <motion.div 
              className={cn("absolute -inset-1 rounded-full border", `border-${intentClass}/20`)}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          
          {/* Titre et métadonnées */}
          <div className="flex-1 min-w-0">
            {title ? (
              <h3 className="text-base font-medium text-text-primary tracking-tight truncate">
                {title}
              </h3>
            ) : (
              <span className="text-[10px] uppercase tracking-[0.2em] text-intent-primary font-medium">
                {variantLabel || getDefaultLabel()}
              </span>
            )}
            
            {description ? (
              <p className="text-xs text-text-secondary mt-1 truncate">
                {description}
              </p>
            ) : (
              <span className="text-[9px] text-text-ghost tracking-wider">
                {customCode}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tech decoration - right side */}
      <div className="flex items-center gap-3 pl-4 flex-shrink-0">
        <PulseIndicator intent={intent} />
        <StatusIndicator text="SYS.OK" intent={intent} />
      </div>
    </div>
  );
}

// ============================================================================
// LIST ITEM
// ============================================================================

interface ListItemProps {
  item: any;
  index: number;
  isSelected: boolean;
  variant: 'numbered' | 'bullet' | 'interactive' | 'inline' | string;
  selectable: boolean;
  onClick: () => void;
  showCheckbox?: boolean;
  showChevron?: boolean;
  intent?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | string;
  isLast?: boolean;
}

export function ListItem({
  item,
  index,
  isSelected,
  variant,
  selectable,
  onClick,
  showCheckbox = true,
  showChevron = true,
  intent = 'primary',
  isLast = false
}: ListItemProps) {
  const intentClass = `intent-${intent}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onClick}
      className={cn(
        'group relative',
        'flex items-center text-sm font-light',
        variant === 'interactive' && 'cursor-pointer transition-all duration-medium',
        !isLast && cn('border-b', `border-${intentClass}/10`),
        variant === 'interactive' && isSelected && cn('bg-', `${intentClass}/5`),
        variant === 'interactive' && !isSelected && 'hover:bg-surface-glass/[0.04]'
      )}
    >
      <div className={cn(
        'flex items-center w-full py-3 px-1',
        variant === 'interactive' ? 'px-2' : '',
        variant === 'bullet' || variant === 'numbered' ? 'gap-3' : 'gap-3'
      )}>
        {/* Sélecteur */}
        {variant === 'interactive' && selectable && showCheckbox && (
          <div className={cn(
            'w-5 h-5 rounded-sm border flex items-center justify-center transition-colors flex-shrink-0',
            isSelected 
              ? cn(`bg-${intentClass}`, `border-${intentClass}`) 
              : 'border-intent-neutral/30 group-hover:border-intent-primary/50'
          )}>
            {isSelected && <Check className="w-3 h-3 text-surface-void" />}
          </div>
        )}

        {/* Bullet point */}
        {variant === 'bullet' && (
          <div className="flex-shrink-0">
            <motion.div 
              className={cn("w-1.5 h-1.5 rounded-full", `bg-${intentClass}/60`)}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
            />
          </div>
        )}

        {/* Numéro */}
        {variant === 'numbered' && (
          <div className="flex-shrink-0">
            <span className="text-xs text-text-ghost font-mono">{index + 1}</span>
          </div>
        )}

        {/* Contenu texte */}
        <span className={cn(
          'flex-1',
          variant === 'interactive' && isSelected ? 'text-text-primary font-medium' : 'text-text-secondary',
          variant === 'interactive' && 'group-hover:text-text-primary'
        )}>
          {item.content}
        </span>

        {/* Icon d'action */}
        {item.action && variant === 'interactive' && !selectable && showChevron && (
          <ChevronRight className="w-4 h-4 text-text-ghost opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// FUTURISTIC BUTTON
// ============================================================================

interface FuturisticButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  intent?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | string;
  className?: string;
  disabled?: boolean;
}

export function FuturisticButton({
  children,
  onClick,
  variant = 'primary',
  intent = 'primary',
  className,
  disabled = false
}: FuturisticButtonProps) {
  const baseClasses = "group relative px-4 py-2 text-xs uppercase tracking-wider transition-colors";
  const intentClass = `intent-${intent}`;
  
  const variantClasses = {
    primary: cn(
      "text-text-primary font-medium",
      `bg-${intentClass}/20 hover:bg-${intentClass}/30`,
      disabled && "opacity-50 cursor-not-allowed"
    ),
    secondary: cn(
      "text-text-secondary hover:text-text-primary",
      "bg-intent-neutral/10 hover:bg-intent-neutral/20",
      disabled && "opacity-50 cursor-not-allowed"
    ),
    ghost: cn(
      "text-text-ghost hover:text-text-secondary",
      disabled && "opacity-30 cursor-not-allowed"
    )
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(baseClasses, variantClasses[variant], className)}
    >
      <span className="relative z-10">{children}</span>
      {/* Button frame avec coins biseautés */}
      {variant !== 'ghost' && (
        <>
          <div 
            className={cn(
              "absolute inset-0 transition-colors",
              variant === 'primary' ? `bg-${intentClass}/20 group-hover:bg-${intentClass}/30` : "bg-intent-neutral/10 group-hover:bg-intent-neutral/20"
            )} 
            style={{ clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)' }}
          />
          <div 
            className={cn(
              "absolute inset-0 border",
              variant === 'primary' ? `border-${intentClass}/50` : "border-intent-neutral/30"
            )} 
            style={{ clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)' }}
          />
          {/* Corner accents */}
          <div className={cn(
            "absolute top-0 left-0 w-2 h-2 border-t border-l",
            variant === 'primary' ? `border-${intentClass}` : "border-intent-neutral"
          )} />
          <div className={cn(
            "absolute bottom-0 right-0 w-2 h-2 border-b border-r",
            variant === 'primary' ? `border-${intentClass}` : "border-intent-neutral"
          )} />
        </>
      )}
    </button>
  );
}

// ============================================================================
// DATA BAR
// ============================================================================

interface DataBarProps {
  items?: any[];
  variant?: string;
  customData?: Array<{ label: string; value: string }>;
  intent?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | string;
}

export function DataBar({ 
  items = [], 
  variant = '', 
  customData = [],
  intent = 'primary'
}: DataBarProps) {
  const intentClass = `intent-${intent}`;
  const defaultData = [
    { label: 'ID', value: `0x${Math.random().toString(16).slice(2, 6).toUpperCase()}` },
    { label: 'MEM', value: `${Math.round(items.length * 2.4)}KB` },
    { label: 'UPD', value: new Date().toISOString().slice(11, 19) },
    { label: 'ITEMS', value: items.length.toString() },
    ...(variant ? [{ label: 'TYPE', value: variant.toUpperCase() }] : []),
  ];

  const dataToShow = customData.length > 0 ? customData : defaultData;

  return (
    <div className={cn("flex items-center justify-between mt-4 pt-3 border-t", `border-${intentClass}/10`)}>
      <div className="flex items-center gap-4 text-[8px] text-text-ghost font-mono tracking-wide">
        {dataToShow.map((item, index) => (
          <AnimatedDataItem 
            key={item.label}
            label={item.label}
            value={item.value}
            delay={index * 0.8}
          />
        ))}
      </div>
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <PulseIndicator key={i} size="sm" intent={intent} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// COGNITIVE SURFACE
// ============================================================================

interface CognitiveSurfaceProps {
  children: React.ReactNode;
  intent?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | string;
  hover?: boolean;
  className?: string;
  border?: boolean;
  glow?: boolean;
}

export function CognitiveSurface({
  children,
  intent = 'primary',
  hover = false,
  className,
  border = true,
  glow = false
}: CognitiveSurfaceProps) {
  const [isHovered, setIsHovered] = useState(false);
  const intentClass = `intent-${intent}`;

  return (
    <div 
      className={cn('relative', className)}
      onMouseEnter={() => hover && setIsHovered(true)}
      onMouseLeave={() => hover && setIsHovered(false)}
    >
      {/* Main glass surface */}
      <div 
        className={cn(
          'absolute inset-0 bg-surface-glass/[0.08] backdrop-blur-glass',
          border && 'border transition-colors duration-medium',
          border && cn(`border-${intentClass}/20`, isHovered && `border-${intentClass}/40`)
        )}
        style={{
          clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
        }}
      />
      
      {/* Inner glow gradient */}
      {glow && (
        <div 
          className={cn(
            'absolute inset-0 opacity-0 transition-opacity duration-medium',
            `bg-gradient-to-br from-${intentClass}/5 via-transparent to-intent-secondary/5`,
            isHovered && 'opacity-100'
          )} 
        />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Edge highlight */}
      <div 
        className={cn(
          'absolute inset-x-0 top-0 h-px',
          'bg-gradient-to-r from-transparent via-white/10 to-transparent'
        )}
      />
    </div>
  );
}

// ============================================================================
// TECH DIVIDER
// ============================================================================

interface TechDividerProps {
  label?: string;
  intent?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | string;
  className?: string;
}

export function TechDivider({ label, intent = 'primary', className }: TechDividerProps) {
  const intentClass = `intent-${intent}`;

  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      exit={{ opacity: 0, scaleX: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn('relative flex items-center gap-4 py-4', className)}
    >
      {/* Animated lines */}
      <motion.div
        className="flex-1 h-px"
        initial={{ scaleX: 0, originX: 1 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <div className={cn("h-full bg-gradient-to-r from-transparent via-intent-primary/30 to-transparent", `via-${intentClass}/30`)} />
      </motion.div>
      
      {/* Label */}
      {label && (
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[10px] uppercase tracking-[0.2em] text-intent-primary font-medium px-3 py-1 relative"
        >
          <div 
            className="absolute inset-0 bg-surface-glass/[0.08] border border-intent-primary/20"
            style={{
              clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
            }}
          />
          <span className="relative z-10">{label}</span>
        </motion.span>
      )}
      
      <motion.div
        className="flex-1 h-px"
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        <div className={cn("h-full bg-gradient-to-r from-transparent via-intent-primary/30 to-transparent", `via-${intentClass}/30`)} />
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ 
  title, 
  description, 
  icon, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <CognitiveSurface intent="primary" className={className}>
      <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
        <motion.div
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
          className="relative mb-6"
        >
          {/* Icon container */}
          <div className="relative w-20 h-20 rounded-full bg-surface-glass/[0.1] flex items-center justify-center border border-intent-primary/30">
            {icon}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-intent-primary/5 to-transparent" />
          </div>
        </motion.div>
        
        <motion.h3
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-lg font-medium text-text-primary mb-2"
        >
          {title}
        </motion.h3>
        
        {description && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-text-muted max-w-md leading-relaxed mb-6"
          >
            {description}
          </motion.p>
        )}
        
        {action && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            {action}
          </motion.div>
        )}
      </div>
    </CognitiveSurface>
  );
}

// ============================================================================
// PROGRESS BAR
// ============================================================================

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showValue?: boolean;
  intent?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function ProgressBar({ 
  value, 
  max = 100,
  label,
  showValue = false,
  intent = 'primary',
  size = 'md'
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const intentClass = `intent-${intent}`;
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
    xl: 'h-4'
  };

  return (
    <div className="space-y-3">
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && (
            <span className="text-text-secondary font-light text-sm">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-text-muted font-mono px-2 py-1 border border-intent-neutral/20 rounded text-sm">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      
      <div className="relative">
        <div 
          className={cn(
            'relative overflow-hidden bg-surface-glass/[0.1]',
            sizeClasses[size]
          )}
          style={{
            clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)',
          }}
        >
          <motion.div
            className="absolute inset-y-0 left-0"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            <div className={cn("absolute inset-0", `bg-${intentClass}`)} />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STATUS INDICATOR COMPONENT
// ============================================================================

interface StatusIndicatorComponentProps {
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning';
  message?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const statusIcons = {
  idle: Circle,
  loading: Loader2,
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle
};

export function StatusIndicatorComponent({
  status,
  message,
  dismissible = false,
  onDismiss
}: StatusIndicatorComponentProps) {
  const Icon = statusIcons[status];
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    if (dismissible) {
      setIsVisible(false);
      onDismiss?.();
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="relative flex items-center gap-3 px-4 py-3 border backdrop-blur-glass"
        style={{
          clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
        }}
      >
        <Icon className={cn(
          "w-5 h-5",
          status === 'loading' && 'animate-spin'
        )} />
        
        {message && (
          <span className="text-sm font-light flex-1">
            {message}
          </span>
        )}
        
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="w-5 h-5 flex items-center justify-center text-text-ghost hover:text-text-secondary"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
