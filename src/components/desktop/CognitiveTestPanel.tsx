import { memo } from 'react';
import { useNotifications } from '@/components/cognitive/NotificationQueue';
import { cn } from '@/lib/utils';
import type { CognitiveUISchema } from '@/components/cognitive/dynamic/types';

interface Props {
  onPushSchema: (schema: CognitiveUISchema) => void;
  onPushError: (msg: string) => void;
  onPushThought: (text: string) => void;
  onOpenExplorer?: (path?: string) => void;
}

const SIMPLE_TEXT_SCHEMA: CognitiveUISchema = {
  metadata: { title: 'Réponse de test' },
  blocks: [
    { type: 'text', content: 'Ceci est une réponse de test générée localement pour valider le rendu cognitif.' },
  ],
};

const RICH_SCHEMA: CognitiveUISchema = {
  metadata: { title: 'Démo composants' },
  blocks: [
    { type: 'text', content: 'Voici une carte enrichie avec plusieurs primitives GX.' },
    { type: 'badge', content: 'NOUVEAU', variant: 'primary' } as any,
    {
      type: 'list',
      items: [
        { label: 'Système opérationnel', value: 'OK' },
        { label: 'Bureau immersif', value: 'ACTIF' },
        { label: 'Cache icônes', value: 'PERSISTANT' },
      ],
    } as any,
    {
      type: 'stack',
      direction: 'row',
      children: [
        { type: 'button', label: 'Action 1', action: { type: 'noop' } } as any,
        { type: 'button', label: 'Action 2', variant: 'secondary', action: { type: 'noop' } } as any,
      ],
    } as any,
  ],
};

export const CognitiveTestPanel = memo(function CognitiveTestPanel({
  onPushSchema,
  onPushError,
  onPushThought,
  onOpenExplorer,
}: Props) {
  const { push: notifyPush } = useNotifications();

  return (
    <div className="space-y-3">
      <Section title="Notifications">
        <Btn onClick={() => notifyPush({ message: 'Notification basse priorité', priority: 'low' })}>
          Info
        </Btn>
        <Btn variant="success" onClick={() => notifyPush({ message: 'Opération réussie', priority: 'medium' })}>
          Succès
        </Btn>
        <Btn variant="warning" onClick={() => notifyPush({ message: 'Avertissement test', priority: 'high' })}>
          Warning
        </Btn>
        <Btn variant="error" onClick={() => notifyPush({ message: 'Erreur critique simulée', priority: 'critical' })}>
          Critical
        </Btn>
      </Section>

      <Section title="Cartes flottantes">
        <Btn onClick={() => onPushSchema(SIMPLE_TEXT_SCHEMA)}>Texte simple</Btn>
        <Btn onClick={() => onPushSchema(RICH_SCHEMA)}>Réponse riche</Btn>
        <Btn variant="error" onClick={() => onPushError('Erreur de test simulée')}>Erreur</Btn>
        <Btn onClick={() => onPushThought('Pensée cognitive : analyse en cours…')}>Pensée</Btn>
      </Section>

      <Section title="Système">
        <Btn onClick={() => notifyPush({ message: 'Explorateur en cours de développement', priority: 'low' })}>Info système</Btn>
      </Section>
    </div>
  );
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-intent-primary/10 p-2 space-y-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-text-ghost">{title}</div>
      <div className="grid grid-cols-2 gap-1.5">{children}</div>
    </div>
  );
}

function Btn({
  children, onClick, variant = 'default',
}: { children: React.ReactNode; onClick: () => void; variant?: 'default' | 'success' | 'warning' | 'error' }) {
  const colors = {
    default: 'text-intent-primary border-intent-primary/40 hover:bg-intent-primary/10',
    success: 'text-intent-success border-intent-success/40 hover:bg-intent-success/10',
    warning: 'text-intent-focus border-intent-focus/40 hover:bg-intent-focus/10',
    error: 'text-intent-warning border-intent-warning/40 hover:bg-intent-warning/10',
  }[variant];
  return (
    <button
      onClick={onClick}
      className={cn('px-2 py-1.5 text-[9px] uppercase tracking-wider border transition-colors', colors)}
      style={{ clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)' }}
    >
      {children}
    </button>
  );
}
