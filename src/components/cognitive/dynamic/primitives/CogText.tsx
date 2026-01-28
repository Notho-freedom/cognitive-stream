import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TextBlock } from '../types';
import { useEffect, useState, useRef } from 'react';
import { Code, Hash, AlertCircle, Info } from 'lucide-react';

interface CogTextProps extends Omit<TextBlock, 'type'> {
  onComplete?: () => void;
}

const variantConfig: Record<NonNullable<TextBlock['variant']>, {
  tag: keyof JSX.IntrinsicElements;
  icon?: React.ElementType;
  size: string;
  weight: string;
  tracking: string;
  leading: string;
}> = {
  heading: {
    tag: 'h2',
    icon: Hash,
    size: 'text-lg',
    weight: 'font-medium',
    tracking: 'tracking-tight',
    leading: 'leading-tight',
  },
  subheading: {
    tag: 'h3',
    icon: Hash,
    size: 'text-sm',
    weight: 'font-medium',
    tracking: 'tracking-wide uppercase',
    leading: 'leading-snug',
  },
  body: {
    tag: 'p',
    icon: null,
    size: 'text-sm',
    weight: 'font-light',
    tracking: 'tracking-wide',
    leading: 'leading-relaxed',
  },
  caption: {
    tag: 'p',
    icon: Info,
    size: 'text-xs',
    weight: 'font-light',
    tracking: 'tracking-normal',
    leading: 'leading-normal',
  },
  code: {
    tag: 'code',
    icon: Code,
    size: 'text-xs',
    weight: 'font-mono',
    tracking: 'tracking-normal',
    leading: 'leading-normal',
  },
  label: {
    tag: 'span',
    icon: AlertCircle,
    size: 'text-[10px]',
    weight: 'font-medium',
    tracking: 'tracking-[0.2em] uppercase',
    leading: 'leading-none',
  },
};

const intentStyles: Record<string, { text: string; glow: string }> = {
  primary: { text: 'text-intent-primary', glow: 'shadow-glow-primary/10' },
  secondary: { text: 'text-intent-secondary', glow: 'shadow-glow-secondary/10' },
  neutral: { text: 'text-text-muted', glow: '' },
  success: { text: 'text-intent-success', glow: 'shadow-glow-success/10' },
  warning: { text: 'text-intent-warning', glow: 'shadow-glow-warning/10' },
  focus: { text: 'text-intent-focus', glow: 'shadow-glow-primary/10' },
};

export function CogText({ 
  content, 
  variant = 'body', 
  intent,
  streaming = false,
  onComplete,
  className 
}: CogTextProps) {
  const [displayedText, setDisplayedText] = useState(streaming ? '' : content);
  const [cursorVisible, setCursorVisible] = useState(streaming);
  const [isComplete, setIsComplete] = useState(!streaming);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const config = variantConfig[variant];
  const intentStyle = intent ? intentStyles[intent] : null;
  const Component = config.tag as any;
  const Icon = config.icon;

  useEffect(() => {
    if (!streaming) {
      setDisplayedText(content);
      setIsComplete(true);
      onComplete?.();
      return;
    }
    
    let index = 0;
    setIsComplete(false);
    
    const streamText = () => {
      if (index < content.length) {
        const char = content[index];
        setDisplayedText(prev => prev + char);
        index++;
        
        // Adaptive timing based on punctuation
        let delay = 30;
        if (['.', '!', '?'].includes(char)) delay = 150;
        else if ([',', ';', ':'].includes(char)) delay = 80;
        else if (char === ' ' && content[index - 2] === '.') delay = 100;
        
        setTimeout(streamText, delay);
      } else {
        setIsComplete(true);
        setCursorVisible(false);
        onComplete?.();
      }
    };
    
    const timeoutId = setTimeout(streamText, 100);
    return () => clearTimeout(timeoutId);
  }, [content, streaming, onComplete]);

  // Cursor blink
  useEffect(() => {
    if (!streaming || displayedText === content) {
      setCursorVisible(false);
      return;
    }
    
    const interval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 530);
    
    return () => clearInterval(interval);
  }, [streaming, displayedText, content]);

  // Auto-scroll for long streaming text
  useEffect(() => {
    if (streaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedText, streaming]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn('relative', className)}
      ref={containerRef}
    >
      {/* Text container with tech frame for code variant */}
      {variant === 'code' && (
        <div 
          className="absolute inset-0 bg-surface-glass/[0.06] border border-intent-primary/20 rounded"
          style={{
            clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
          }}
        />
      )}
      
      {/* Icon for certain variants */}
      {Icon && variant !== 'code' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="absolute -left-8 top-0.5"
        >
          <Icon className={cn(
            'w-4 h-4',
            intentStyle?.text || 'text-text-ghost'
          )} />
        </motion.div>
      )}
      
      {/* Text content */}
      <div className={cn('relative', variant === 'code' && 'px-3 py-2')}>
        <Component
          className={cn(
            config.size,
            config.weight,
            config.tracking,
            config.leading,
            intentStyle?.text || 'text-text-primary',
            intentStyle?.glow,
            'transition-colors duration-medium',
            variant === 'code' && 'font-mono'
          )}
        >
          {/* Character-by-character animation */}
          {displayedText.split('').map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.1,
                ease: [0.16, 1, 0.3, 1],
                delay: streaming ? i * 0.03 : 0,
              }}
              className={cn(
                'inline-block',
                variant === 'code' && 'text-intent-primary'
              )}
            >
              {char}
            </motion.span>
          ))}
          
          {/* Cursor */}
          <AnimatePresence>
            {cursorVisible && !isComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'inline-block align-middle ml-0.5',
                  variant === 'code' ? 'w-[2px] h-4' : 'w-0.5 h-5',
                  intentStyle?.text ? 'bg-current' : 'bg-intent-primary'
                )}
              />
            )}
          </AnimatePresence>
        </Component>
        
        {/* Streaming progress indicator */}
        {streaming && !isComplete && (
          <motion.div
            className="absolute -bottom-2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-intent-primary/40 to-transparent"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        
        {/* Completion indicator */}
        {streaming && isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="absolute -right-4 top-1/2 -translate-y-1/2"
          >
            <div className="w-2 h-2 rounded-full bg-intent-success/60" />
          </motion.div>
        )}
      </div>
      
      {/* Data info for streaming */}
      {streaming && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute -bottom-6 left-0 flex items-center gap-3 text-[8px] text-text-ghost font-mono"
        >
          <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
            CHARS:{displayedText.length}/{content.length}
          </motion.span>
          <motion.span 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: 0.5 }}
          >
            {isComplete ? 'COMPLETE' : 'STREAMING'}
          </motion.span>
          {!isComplete && (
            <motion.div
              className="flex gap-0.5"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-intent-primary" />
              ))}
            </motion.div>
          )}
        </motion.div>
      )}
      
      {/* Corner accents for code variant */}
      {variant === 'code' && (
        <>
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-intent-primary/40" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-intent-primary/40" />
        </>
      )}
      
      {/* Text selection highlight */}
      <div className="absolute inset-0 opacity-0 hover:opacity-10 bg-gradient-to-r from-intent-primary/20 to-transparent pointer-events-none transition-opacity" />
    </motion.div>
  );
}