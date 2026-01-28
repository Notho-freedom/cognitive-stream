/**
 * 🧠 COGNITIVE UI RENDERER
 * 
 * Moteur de rendu dynamique qui transforme un schéma JSON en composants React.
 * Point d'entrée unique pour l'IA - elle décrit l'UI en JSON, le renderer construit.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  CognitiveUISchema, 
  CognitiveBlock, 
  ActionCallback,
  CognitiveAction 
} from './types';
import {
  CogText,
  CogList,
  CogKeyValue,
  CogProgress,
  CogBadge,
  CogButton,
  CogInput,
  CogChoice,
  CogCard,
  CogStack,
  CogGrid,
  CogDivider,
  CogStatus,
  CogSkeleton,
  CogEmpty,
} from './primitives';

interface CognitiveRendererProps {
  /** Schéma JSON décrivant l'UI */
  schema: CognitiveUISchema;
  /** Callback appelé lors de toute action utilisateur */
  onAction?: (action: CognitiveAction) => void;
  /** Classes CSS additionnelles */
  className?: string;
  /** Activer les animations */
  animated?: boolean;
}

/**
 * Composant principal qui rend une UI complète à partir d'un schéma JSON
 */
export function CognitiveRenderer({ 
  schema, 
  onAction,
  className,
  animated = true 
}: CognitiveRendererProps) {
  const handleAction: ActionCallback = (action) => {
    onAction?.(action);
  };

  return (
    <motion.div
      initial={animated ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('space-y-4', className)}
    >
      <AnimatePresence mode="sync">
        {schema.blocks.map((block, index) => (
          <motion.div
            key={block.id || `block-${index}`}
            initial={animated ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            {renderBlock(block, handleAction)}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Fonction de rendu récursive pour chaque type de bloc
 */
export function renderBlock(
  block: CognitiveBlock, 
  onAction?: ActionCallback
): React.ReactNode {
  switch (block.type) {
    case 'text':
      return <CogText {...block} />;
    case 'list':
      return <CogList {...block} onAction={onAction} />;
    case 'keyvalue':
      return <CogKeyValue {...block} />;
    case 'progress':
      return <CogProgress {...block} />;
    case 'badge':
      return <CogBadge {...block} />;
    case 'button':
      return <CogButton {...block} onAction={onAction} />;
    case 'input':
      return <CogInput {...block} onAction={onAction} />;
    case 'choice':
      return <CogChoice {...block} onAction={onAction} />;
    case 'card':
      return <CogCard {...block} onAction={onAction} renderBlock={renderBlock} />;
    case 'stack':
      return <CogStack {...block} onAction={onAction} renderBlock={renderBlock} />;
    case 'grid':
      return <CogGrid {...block} onAction={onAction} renderBlock={renderBlock} />;
    case 'divider':
      return <CogDivider {...block} />;
    case 'spacer':
      return <div className={cn('h-4', block.className)} />;
    case 'status':
      return <CogStatus {...block} />;
    case 'skeleton':
      return <CogSkeleton {...block} />;
    case 'empty':
      return <CogEmpty {...block} onAction={onAction} />;
    default:
      console.warn(`Unknown block type: ${(block as any).type}`);
      return null;
  }
}

export default CognitiveRenderer;