import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useCognitiveForm } from '../CognitiveFormContext';
import type { InputBlock, ActionPayload } from '../types';

interface CogInputProps extends Omit<InputBlock, 'type'> {
  className?: string;
  onAction?: (action: ActionPayload) => void;
}

export function CogInput({ 
  id, 
  placeholder = 'Entrez votre texte...', 
  inputType = 'text',
  defaultValue = '',
  label,
  className,
  onAction 
}: CogInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  
  // Access form context if available
  const formContext = useCognitiveForm();

  // Register initial value and sync with form context
  useEffect(() => {
    if (formContext && id) {
      formContext.setFieldValue(id, value);
    }
  }, [formContext, id, value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (formContext && id) {
        formContext.removeField(id);
      }
    };
  }, [formContext, id]);

  const handleChange = (val: string) => {
    setValue(val);
    
    // Update form context (main storage)
    if (formContext && id) {
      formContext.setFieldValue(id, val);
    }
    
    // Also notify parent for real-time updates if needed
    // But don't require confirmation - value is stored in context
  };

  const handleSubmit = () => {
    // Submit on Enter key - send current value as standalone action
    if (formContext) {
      // Use form context to build action with all form data
      const action = formContext.buildActionWithFormData(id, {
        actionType: 'input-submit',
        triggeredBy: id,
      });
      onAction?.(action);
    } else {
      // Fallback: standalone submit
      onAction?.({ 
        id, 
        payload: { 
          actionType: 'input-submit',
          value, 
        } 
      });
    }
  };

  const InputElement = inputType === 'textarea' ? 'textarea' : 'input';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('relative', className)}
    >
      {label && (
        <label className="block text-xs text-intent-primary uppercase tracking-[0.2em] mb-2 font-medium">
          {label}
        </label>
      )}
      
      <div className="relative">
        <InputElement
          type={inputType !== 'textarea' ? inputType : undefined}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && inputType !== 'textarea' && handleSubmit()}
          placeholder={placeholder}
          rows={inputType === 'textarea' ? 4 : undefined}
          className={cn(
            'w-full bg-surface-raised/30 border text-text-primary placeholder:text-text-ghost/50',
            'text-sm font-light tracking-wide px-4 py-3 outline-none transition-all duration-200',
            'focus:bg-surface-raised/50',
            inputType === 'textarea' && 'resize-none',
            focused ? 'border-intent-primary/60' : 'border-intent-neutral/20',
          )}
          style={{
            clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
          }}
        />
        
        {/* Focus glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
            boxShadow: focused ? '0 0 20px hsl(var(--intent-primary) / 0.15)' : 'none',
          }}
          animate={{ opacity: focused ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />
        
        {/* Tech decoration */}
        <div className="absolute top-1 right-3 flex gap-0.5">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 h-1 bg-intent-primary/40 rounded-full"
              animate={focused ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.2 }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
