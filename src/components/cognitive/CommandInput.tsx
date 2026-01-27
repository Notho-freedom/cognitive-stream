import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, ArrowRight, Zap, Database, Settings, FileText } from 'lucide-react';

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
}

// Default suggestions
const DEFAULT_SUGGESTIONS: CommandSuggestion[] = [
  { id: 'analyze', label: 'Analyser les données', category: 'Actions', icon: <Zap size={14} />, keywords: ['scan', 'data'] },
  { id: 'connect', label: 'Connexion réseau neural', category: 'Système', icon: <Database size={14} />, keywords: ['network', 'link'] },
  { id: 'config', label: 'Configuration système', category: 'Système', icon: <Settings size={14} />, keywords: ['settings', 'param'] },
  { id: 'report', label: 'Générer un rapport', category: 'Actions', icon: <FileText size={14} />, keywords: ['export', 'doc'] },
  { id: 'status', label: 'État du système', category: 'Info', icon: <Zap size={14} />, keywords: ['health', 'check'] },
];

export function CommandInput({
  suggestions = DEFAULT_SUGGESTIONS,
  placeholder = "Commande ou recherche...",
  onSubmit,
  onSelect,
}: CommandInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on query
  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) return suggestions.slice(0, 5);
    
    const lower = query.toLowerCase();
    return suggestions.filter(s => 
      s.label.toLowerCase().includes(lower) ||
      s.category.toLowerCase().includes(lower) ||
      s.keywords?.some(k => k.toLowerCase().includes(lower))
    ).slice(0, 5);
  }, [query, suggestions]);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
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

  // Navigation within suggestions
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuggestions[selectedIndex]) {
        handleSelect(filteredSuggestions[selectedIndex]);
      } else if (query.trim()) {
        onSubmit?.(query);
        setIsOpen(false);
      }
    }
  }, [filteredSuggestions, selectedIndex, query, onSubmit]);

  const handleSelect = (suggestion: CommandSuggestion) => {
    suggestion.action?.();
    onSelect?.(suggestion);
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed bottom-6 left-6 z-40"
      >
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
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ 
                type: 'spring', 
                stiffness: 400, 
                damping: 30 
              }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-xl"
            >
              {/* Frame container */}
              <div className="relative">
                {/* Angular corner decorations */}
                <div className="absolute top-0 left-0 w-5 h-5 border-l border-t border-intent-primary/40" 
                  style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} 
                />
                <div className="absolute top-0 right-0 w-5 h-5 border-r border-t border-intent-primary/40" 
                  style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }} 
                />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-l border-b border-intent-secondary/40" 
                  style={{ clipPath: 'polygon(0 100%, 100% 100%, 0 0)' }} 
                />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-r border-b border-intent-secondary/40" 
                  style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} 
                />

                {/* Main content with clip-path */}
                <div
                  className="relative bg-surface-glass/90 backdrop-blur-glass border border-intent-primary/20 overflow-hidden"
                  style={{
                    clipPath: 'polygon(20px 0%, calc(100% - 20px) 0%, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0% calc(100% - 20px), 0% 20px)',
                  }}
                >
                  {/* Scan line animation */}
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-intent-primary to-transparent opacity-60"
                    initial={{ y: 0 }}
                    animate={{ y: [0, 300, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  />

                  {/* Input area */}
                  <div className="relative flex items-center gap-3 p-4 border-b border-intent-neutral/20">
                    <Search size={18} className="text-intent-primary flex-shrink-0" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setSelectedIndex(0);
                      }}
                      onKeyDown={handleInputKeyDown}
                      placeholder={placeholder}
                      className="flex-1 bg-transparent text-text-primary text-sm font-light placeholder:text-text-ghost/50 outline-none"
                    />
                    
                    {/* Live indicator */}
                    <motion.div
                      className="w-2 h-2 rounded-full bg-intent-primary"
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>

                  {/* Suggestions */}
                  <div className="p-2 max-h-[300px] overflow-y-auto">
                    {filteredSuggestions.length > 0 ? (
                      <div className="space-y-1">
                        {filteredSuggestions.map((suggestion, index) => (
                          <motion.button
                            key={suggestion.id}
                            onClick={() => handleSelect(suggestion)}
                            className={`w-full flex items-center gap-3 p-3 rounded transition-colors text-left ${
                              index === selectedIndex 
                                ? 'bg-intent-primary/10 border-l-2 border-intent-primary' 
                                : 'hover:bg-intent-neutral/10 border-l-2 border-transparent'
                            }`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onMouseEnter={() => setSelectedIndex(index)}
                          >
                            {/* Icon */}
                            <div className={`flex-shrink-0 ${index === selectedIndex ? 'text-intent-primary' : 'text-text-ghost'}`}>
                              {suggestion.icon || <ArrowRight size={14} />}
                            </div>

                            {/* Label & Category */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${index === selectedIndex ? 'text-text-primary' : 'text-text-secondary'}`}>
                                {suggestion.label}
                              </p>
                            </div>

                            {/* Category badge */}
                            <span className="text-[9px] font-mono uppercase tracking-wider text-text-ghost px-2 py-0.5 border border-intent-neutral/20">
                              {suggestion.category}
                            </span>

                            {/* Selection indicator */}
                            {index === selectedIndex && (
                              <motion.div
                                layoutId="cmd-selection"
                                className="w-1 h-1 rounded-full bg-intent-primary"
                              />
                            )}
                          </motion.button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-xs text-text-ghost">Aucun résultat pour "{query}"</p>
                        <p className="text-[10px] text-text-ghost/50 mt-1">Appuyez sur Entrée pour rechercher</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between p-3 border-t border-intent-neutral/20 text-[9px] font-mono text-text-ghost/50">
                    <div className="flex items-center gap-4">
                      <span>
                        <kbd className="px-1 border border-intent-neutral/30 rounded mr-1">↑↓</kbd>
                        Navigation
                      </span>
                      <span>
                        <kbd className="px-1 border border-intent-neutral/30 rounded mr-1">↵</kbd>
                        Sélectionner
                      </span>
                    </div>
                    <span>
                      <kbd className="px-1 border border-intent-neutral/30 rounded mr-1">ESC</kbd>
                      Fermer
                    </span>
                  </div>

                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-6 h-6">
                    <motion.div 
                      className="absolute top-2 left-2 w-2 h-[1px] bg-intent-primary"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <motion.div 
                      className="absolute top-2 left-2 w-[1px] h-2 bg-intent-primary"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    />
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6">
                    <motion.div 
                      className="absolute bottom-2 right-2 w-2 h-[1px] bg-intent-secondary"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    />
                    <motion.div 
                      className="absolute bottom-2 right-2 w-[1px] h-2 bg-intent-secondary"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
