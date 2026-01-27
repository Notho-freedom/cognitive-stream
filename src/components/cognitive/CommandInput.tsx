import React, { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, ArrowRight, Zap, Database, Settings, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FuturisticFrame } from './FuturisticFrame';
import { StateIndicator, IndicatorMode } from './StateIndicator';
import type { ResponseState } from './ResponseCard';

// Types
export interface CommandSuggestion {
  id: string;
  label: string;
  category: string;
  icon?: React.ReactNode;
  action?: () => void;
  keywords?: string[];
}

interface CommandInputProps {
  suggestions?: CommandSuggestion[];
  placeholder?: string;
  onSubmit?: (query: string) => void;
  onSelect?: (suggestion: CommandSuggestion) => void;
  maxResults?: number;
  className?: string;
  state?: ResponseState;
  showAction?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
} 

// Default suggestions
const DEFAULT_SUGGESTIONS: CommandSuggestion[] = [
  { id: 'analyze', label: 'Analyser les données', category: 'Actions', icon: <Zap size={14} />, keywords: ['scan', 'data'] },
  { id: 'connect', label: 'Connexion réseau neural', category: 'Système', icon: <Database size={14} />, keywords: ['network', 'link'] },
  { id: 'config', label: 'Configuration système', category: 'Système', icon: <Settings size={14} />, keywords: ['settings', 'param'] },
  { id: 'report', label: 'Générer un rapport', category: 'Actions', icon: <FileText size={14} />, keywords: ['export', 'doc'] },
  { id: 'status', label: 'État du système', category: 'Info', icon: <Zap size={14} />, keywords: ['health', 'check'] },
];

const stateToIndicator: Record<ResponseState, IndicatorMode> = {
  idle: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  responding: 'responding',
  complete: 'success'
};

const stateLabels: Record<ResponseState, string> = {
  idle: 'EN ATTENTE',
  listening: 'ÉCOUTE ACTIVE',
  thinking: 'TRAITEMENT...',
  responding: 'COMMANDE',
  complete: 'TERMINÉ'
};

export const CommandInput = forwardRef<HTMLDivElement, CommandInputProps>(
  ({
    suggestions = DEFAULT_SUGGESTIONS,
    placeholder = 'Commande ou recherche...',
    onSubmit,
    onSelect,
    maxResults = 5,
    className,
    state = 'responding',
    showAction = true,
    actionLabel = 'Envoyer',
    onAction,
    onDismiss,
  }, ref) => {
    const id = useId();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDismiss = useCallback(() => {
      setIsOpen(false);
      onDismiss?.();
    }, [onDismiss]);

    const handleAction = useCallback(() => {
      if (onAction) {
        onAction();
      } else if (query.trim()) {
        onSubmit?.(query.trim());
      }
      setIsOpen(false);
    }, [onAction, onSubmit, query]);

    // Filter suggestions based on query
    const filteredSuggestions = useMemo(() => {
      if (!query.trim()) return suggestions.slice(0, maxResults);

      const lower = query.toLowerCase();
      return suggestions
        .filter(
          (s) =>
            s.label.toLowerCase().includes(lower) ||
            s.category.toLowerCase().includes(lower) ||
            s.keywords?.some((k) => k.toLowerCase().includes(lower))
        )
        .slice(0, maxResults);
    }, [query, suggestions, maxResults]);

    // Ensure selectedIndex is within bounds
    useEffect(() => {
      setSelectedIndex((i) => Math.max(0, Math.min(i, Math.max(0, filteredSuggestions.length - 1))));
    }, [filteredSuggestions.length]);

    // Keyboard shortcut to open
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
      if (isOpen) {
        setTimeout(() => inputRef.current?.focus(), 100);
        setQuery('');
        setSelectedIndex(0);
      }
    }, [isOpen]);

    const handleSelect = useCallback(
      (suggestion: CommandSuggestion) => {
        suggestion.action?.();
        onSelect?.(suggestion);
        setIsOpen(false);
      },
      [onSelect]
    );

    const handleInputKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredSuggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const sel = filteredSuggestions[selectedIndex];
          if (sel) {
            handleSelect(sel);
          } else if (query.trim()) {
            onSubmit?.(query);
            setIsOpen(false);
          }
        }
      },
      [filteredSuggestions, selectedIndex, query, onSubmit, handleSelect]
    );

    return (
      <>
        {/* Trigger hint */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed bottom-6 left-6 z-40">
          <div className="flex items-center gap-2 text-[10px] font-mono text-text-ghost/50">
            <kbd className="px-1.5 py-0.5 border border-intent-neutral/30 rounded text-text-ghost/70">
              <Command size={10} className="inline mr-1" />K
            </kbd>
            <span>Commande</span>
          </div>
        </motion.div>

        {/* Overlay */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
              />

              {/* Command Panel */}
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${id}-label`}
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={cn('fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-xl', className)}
              >
                {/* Frame container */}
                <div className="relative">

                  {/* Main content with clip-path */}
                  <FuturisticFrame variant="primary" animated={state === 'thinking' || state === 'responding'}>
                    <div className="p-6">
                      <span id={`${id}-label`} className="sr-only">{stateLabels[state]}</span>
                      {/* Header bar */}
                      <div className="flex items-center justify-between mb-5 pb-4 border-b border-intent-primary/20">
                        <div className="flex items-center gap-3">
                          {/* Status indicator */}
                          <div className="relative">
                            <StateIndicator mode={stateToIndicator[state]} size="sm" />
                          </div>

                          {/* State label */}
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-intent-primary font-medium">
                              {stateLabels[state]}
                            </span>
                            <span className="text-[9px] text-text-ghost tracking-wider">COMMAND.ENGINE.v1</span>
                          </div>
                        </div>

                        {/* Tech decoration - right side */}
                        <div className="flex items-center gap-3">
                          <motion.div className="relative w-2 h-2" animate={{
                        scale: [1, 1.2, 1]
                      }} transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}>
                            <div className="absolute inset-0 rounded-full bg-intent-primary/60" />
                            <motion.div className="absolute inset-0 rounded-full bg-intent-primary" animate={{
                          opacity: [0.4, 1, 0.4],
                          scale: [0.8, 1, 0.8]
                        }} transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }} />
                          </motion.div>

                          <motion.span className="text-[8px] text-text-ghost font-mono" animate={{
                        opacity: [0.5, 1, 0.5]
                      }} transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}>
                            SYS.OK
                          </motion.span>
                        </div>
                      </div>

                      {/* Content area */}
                      <div className="min-h-[60px] mb-5">
                        {/* Scan line animation */}
                        <motion.div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-intent-primary to-transparent opacity-60" initial={{ y: 0 }} animate={{ y: [0, 300, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />

                        {/* Input area */}
                        <div className="relative flex items-center gap-3 p-4 border-b border-intent-neutral/20">
                          <Search size={18} className="text-intent-primary flex-shrink-0" />
                          <input id={`${id}-input`} ref={inputRef} type="text" role="combobox" aria-expanded={isOpen} aria-controls={`${id}-listbox`} aria-activedescendant={filteredSuggestions[selectedIndex]?.id ?? undefined} value={query} onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }} onKeyDown={handleInputKeyDown} placeholder={placeholder} className="flex-1 bg-transparent text-text-primary text-sm font-light placeholder:text-text-ghost/50 outline-none" />

                          {/* Live indicator */}
                          <motion.div className="w-2 h-2 rounded-full bg-intent-primary" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                        </div>

                        {/* Suggestions */}
                        <div id={`${id}-listbox`} role="listbox" className="p-2 max-h-[300px] overflow-y-auto">
                          {filteredSuggestions.length > 0 ? (
                            <div className="space-y-1">
                              {filteredSuggestions.map((suggestion, index) => (
                                <motion.button key={suggestion.id} id={suggestion.id} role="option" aria-selected={index === selectedIndex} onClick={() => handleSelect(suggestion)} className={cn('w-full flex items-center gap-3 p-3 rounded transition-colors text-left', index === selectedIndex ? 'bg-intent-primary/10 border-l-2 border-intent-primary' : 'hover:bg-intent-neutral/10 border-l-2 border-transparent')} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} onMouseEnter={() => setSelectedIndex(index)}>
                                  <div className={cn('flex-shrink-0', index === selectedIndex ? 'text-intent-primary' : 'text-text-ghost')}>{suggestion.icon || <ArrowRight size={14} />}</div>
                                  <div className="flex-1 min-w-0"><p className={cn('text-sm truncate', index === selectedIndex ? 'text-text-primary' : 'text-text-secondary')}>{suggestion.label}</p></div>
                                  <span className="text-[9px] font-mono uppercase tracking-wider text-text-ghost px-2 py-0.5 border border-intent-neutral/20">{suggestion.category}</span>
                                  {index === selectedIndex && <motion.div layoutId="cmd-selection" className="w-1 h-1 rounded-full bg-intent-primary" />}
                                </motion.button>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-center"><p className="text-xs text-text-ghost">Aucun résultat pour "{query}"</p><p className="text-[10px] text-text-ghost/50 mt-1">Appuyez sur Entrée pour rechercher</p></div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <AnimatePresence>
                        {showAction && query.trim() && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.2, duration: 0.3 }} className="flex justify-end gap-3 pt-4 border-t border-intent-primary/10">
                            <button onClick={handleDismiss} className="group relative px-4 py-2 text-xs uppercase tracking-wider text-text-ghost hover:text-text-secondary transition-colors"><span className="relative z-10">Annuler</span><div className="absolute inset-0 bg-intent-neutral/10 opacity-0 group-hover:opacity-100 transition-opacity" style={{ clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)' }} /></button>
                            <button onClick={handleAction} className="group relative px-6 py-2 text-xs uppercase tracking-wider text-text-primary font-medium"><span className="relative z-10">{actionLabel}</span><div className="absolute inset-0 bg-intent-primary/20 group-hover:bg-intent-primary/30 transition-colors" style={{ clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)' }} /><div className="absolute inset-0 border border-intent-primary/50" style={{ clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)' }} /><div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-intent-primary" /><div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-intent-primary" /></button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Bottom data bar */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-intent-primary/10">
                        <div className="flex items-center gap-4 text-[8px] text-text-ghost font-mono tracking-wide">
                          <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>ID:0x7F3A</motion.span>
                          <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}>LAT:12ms</motion.span>
                          <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}>MEM:2.4MB</motion.span>
                        </div>
                        <div className="flex items-center gap-1">{[...Array(5)].map((_, i) => <motion.div key={i} className="w-1 h-1 bg-intent-primary" animate={{ opacity: [0.2, i < 3 ? 1 : 0.5, 0.2], scale: [1, 1.2, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }} />)}</div>
                      </div>
                    </div>
                  </FuturisticFrame>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }
);

CommandInput.displayName = 'CommandInput';

