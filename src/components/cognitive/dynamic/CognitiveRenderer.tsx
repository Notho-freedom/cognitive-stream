import { cn } from '@/lib/utils';
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
    
    default:
      console.warn('Unknown block type:', (block as any).type);
      return null;
  }
}

export function CognitiveRenderer({ schema, onAction, className }: CognitiveRendererProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {schema.blocks.map((block, i) => renderBlock(block, onAction, i))}
    </div>
  );
}
