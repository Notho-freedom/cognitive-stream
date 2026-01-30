import { cn } from '@/lib/utils';
import { CognitiveFormProvider } from './CognitiveFormContext';
import type { CognitiveUISchema, CognitiveBlock, ActionPayload } from './types';
import {
  CogText,
  CogList,
  CogButton,
  CogInput,
  CogChoice,
  CogCard,
  CogStack,
  CogGrid,
  CogProgress,
  CogBadge,
  CogKeyValue,
  CogDivider,
  CogStatus,
  CogSkeleton,
  CogEmpty,
  CogImage,
  CogCode,
  CogTable,
  CogTabs,
  CogAccordion,
  CogAlert,
  CogTimer,
  CogRating,
  CogSlider,
} from './primitives';

interface CognitiveRendererProps {
  schema: CognitiveUISchema;
  onAction?: (action: ActionPayload) => void;
  className?: string;
}

function renderBlock(block: CognitiveBlock, onAction?: (action: ActionPayload) => void, key?: string | number): React.ReactNode {
  const blockKey = key ?? block.id ?? Math.random().toString(36);

  switch (block.type) {
    case 'text':
      return <CogText key={blockKey} {...block} />;
    
    case 'list':
      return <CogList key={blockKey} {...block} onAction={onAction} />;
    
    case 'button':
      return <CogButton key={blockKey} {...block} onAction={onAction} />;
    
    case 'input':
      return <CogInput key={blockKey} {...block} onAction={onAction} />;
    
    case 'choice':
      return <CogChoice key={blockKey} {...block} onAction={onAction} />;
    
    case 'card':
      return (
        <CogCard key={blockKey} id={block.id} variant={block.variant} title={block.title} onAction={onAction}>
          {block.children.map((child, i) => renderBlock(child, onAction, i))}
        </CogCard>
      );
    
    case 'stack':
      return (
        <CogStack key={blockKey} direction={block.direction} gap={block.gap} align={block.align}>
          {block.children.map((child, i) => renderBlock(child, onAction, i))}
        </CogStack>
      );
    
    case 'grid':
      return (
        <CogGrid key={blockKey} columns={block.columns} gap={block.gap}>
          {block.children.map((child, i) => renderBlock(child, onAction, i))}
        </CogGrid>
      );
    
    case 'progress':
      return <CogProgress key={blockKey} {...block} />;
    
    case 'badge':
      return <CogBadge key={blockKey} {...block} />;
    
    case 'keyValue':
      return <CogKeyValue key={blockKey} {...block} />;
    
    case 'divider':
      return <CogDivider key={blockKey} {...block} />;
    
    case 'status':
      return <CogStatus key={blockKey} {...block} />;
    
    case 'skeleton':
      return <CogSkeleton key={blockKey} {...block} />;
    
    case 'empty':
      return <CogEmpty key={blockKey} {...block} onAction={onAction} />;
    
    case 'image':
      return <CogImage key={blockKey} {...block} onAction={onAction} />;
    
    case 'code':
      return <CogCode key={blockKey} {...block} />;
    
    case 'table':
      return <CogTable key={blockKey} {...block} onAction={onAction} />;
    
    case 'tabs':
      return (
        <CogTabs
          key={blockKey}
          {...block}
          onAction={onAction}
          renderBlock={(child, action, i) => renderBlock(child, action, i)}
        />
      );
    
    case 'accordion':
      return (
        <CogAccordion
          key={blockKey}
          {...block}
          onAction={onAction}
          renderBlock={(child, action, i) => renderBlock(child, action, i)}
        />
      );
    
    case 'alert':
      return <CogAlert key={blockKey} {...block} onAction={onAction} />;
    
    case 'timer':
      return <CogTimer key={blockKey} {...block} onAction={onAction} />;
    
    case 'rating':
      return <CogRating key={blockKey} {...block} onAction={onAction} />;
    
    case 'slider':
      return <CogSlider key={blockKey} {...block} onAction={onAction} />;
    
    default:
      console.warn('Unknown block type:', (block as any).type);
      return null;
  }
}

/**
 * CognitiveRenderer renders a schema of UI blocks with shared form state
 * 
 * All interactive components (inputs, choices, lists) register their values
 * in a shared FormContext. When a button is clicked, it collects ALL values
 * and sends them together as a single action payload.
 * 
 * This solves the problem of losing form data when clicking submit buttons.
 */
export function CognitiveRenderer({ schema, onAction, className }: CognitiveRendererProps) {
  return (
    <CognitiveFormProvider onAction={onAction}>
      <div className={cn('space-y-4', className)}>
        {schema.blocks.map((block, i) => renderBlock(block, onAction, i))}
      </div>
    </CognitiveFormProvider>
  );
}
