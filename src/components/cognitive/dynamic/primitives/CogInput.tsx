// CogInput.tsx
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { InputBlock, ActionCallback } from '../types';
import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { Search, Command } from 'lucide-react';
import { AnimatedContainer, CognitiveSurface, PulseIndicator } from '../utils/components';

interface CogInputProps extends Omit<InputBlock, 'type'> {
  onAction?: ActionCallback;
}

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
  xl: 'px-6 py-4 text-lg',
};

export function CogInput({ 
  placeholder = '',
  value: initialValue = '',
  inputType = 'text',
  intent = 'primary',
  size = 'md',
  action,
  onChange,
  onAction,
  className 
}: CogInputProps) {
  const [value, setValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    if (onChange && onAction) {
      onAction({
        ...onChange,
        payload: { ...onChange.payload, value: newValue }
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && action && onAction) {
      onAction({
        ...action,
        payload: { ...action.payload, value }
      });
    }
  };

  return (
    <AnimatedContainer className={cn('relative group', className)}>
      <CognitiveSurface 
        intent={intent} 
        hover 
        border 
        glow={isFocused}
        className="overflow-hidden"
      >
        <div className="relative z-10 flex items-center">
          {/* Optional icon */}
          {inputType === 'search' && (
            <Search className="w-4 h-4 text-intent-primary/60 ml-4 mr-2 flex-shrink-0" />
          )}
          
          {/* Input field */}
          <input
            ref={inputRef}
            type={inputType}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={cn(
              'relative z-20 w-full bg-transparent outline-none',
              'font-light text-text-primary placeholder:text-text-ghost/50',
              'selection:bg-intent-primary/30 selection:text-text-primary',
              sizeStyles[size],
              inputType === 'search' ? 'pl-2' : 'px-4'
            )}
          />
          
          {/* Live typing indicator */}
          {value.length > 0 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <PulseIndicator size="sm" intent={intent} />
            </div>
          )}
        </div>
      </CognitiveSurface>

      {/* Character counter */}
      {inputType === 'text' && value.length > 0 && (
        <div className="absolute -bottom-6 right-0 text-[9px] text-text-ghost font-mono">
          {value.length} chars
        </div>
      )}
    </AnimatedContainer>
  );
}