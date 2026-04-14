import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { FileEntity, ExplorerSectionState } from '@/types/explorer.types';
import { ExplorerItemIcon } from './ExplorerItemIcon';
import { useExplorerIcons } from '@/hooks/useExplorerIcons';

interface FileExplorerHomeContentProps {
  currentPath: string;
  files: FileEntity[];
  selected: string[];
  driveState: ExplorerSectionState;
  networkMountState: ExplorerSectionState;
  localServiceState: ExplorerSectionState;
  onSelect: (id: string, multi?: boolean, range?: boolean) => void;
  onOpen: (entity: FileEntity) => void;
}

export function FileExplorerHomeContent({
  currentPath,
  files,
  selected,
  driveState,
  networkMountState,
  localServiceState,
  onSelect,
  onOpen,
}: FileExplorerHomeContentProps) {
  const icons = useExplorerIcons(files);
  const sections = buildSections(currentPath, files, {
    drives: driveState,
    networkMounts: networkMountState,
    localServices: localServiceState,
  });

  return (
    <div className="space-y-6 p-4">
      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.28em] text-text-ghost/65">{section.title}</div>
            <div className="flex items-center gap-2 text-[10px] text-text-ghost/45">
              <span>{section.items.length} éléments</span>
              <span className="uppercase tracking-[0.18em] text-text-ghost/40">{section.state.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {section.items.length === 0 && (
              <div className="col-span-full rounded-[1rem] border border-intent-primary/10 bg-surface-deep/30 px-4 py-5 text-[11px] text-text-ghost/60">
                {section.state.status === 'timeout'
                  ? 'Chargement partiel: la source système a dépassé le délai.'
                  : section.state.status === 'stale'
                    ? 'Affichage du dernier état connu en attendant une mise à jour.'
                    : section.state.status === 'loading'
                      ? 'Chargement en arrière-plan...'
                      : 'Aucune donnée disponible pour le moment.'}
              </div>
            )}
            {section.items.map((item) => (
              <motion.button
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'group flex items-center gap-3 rounded-[1rem] border p-3 text-left transition-colors',
                  selected.includes(item.id)
                    ? 'border-intent-primary/50 bg-intent-primary/12'
                    : 'border-intent-primary/10 bg-surface-deep/40 hover:border-intent-primary/30 hover:bg-intent-primary/8',
                )}
                onClick={(event) => onSelect(item.id, event.ctrlKey || event.metaKey, event.shiftKey)}
                onDoubleClick={() => onOpen(item)}
              >
                <ExplorerItemIcon entity={item} iconUrl={icons[item.iconKey || item.id]} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-text-primary">{item.name}</div>
                  {item.subtitle && <div className="truncate text-[10px] text-text-ghost/60">{item.subtitle}</div>}
                  {item.description && <div className="mt-1 line-clamp-2 text-[10px] text-text-ghost/45">{item.description}</div>}
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function buildSections(
  currentPath: string,
  files: FileEntity[],
  states: {
    drives: ExplorerSectionState;
    networkMounts: ExplorerSectionState;
    localServices: ExplorerSectionState;
  },
) {
  if (currentPath === 'virtual:this-pc') {
    return [
      { title: 'Accès rapides', items: files.filter((item) => item.kind === 'quick-access'), state: { status: 'ready' } },
      { title: 'Disques', items: files.filter((item) => item.kind === 'drive'), state: states.drives },
      { title: 'Réseau monté', items: files.filter((item) => item.kind === 'network-mount'), state: states.networkMounts },
    ];
  }

  if (currentPath === 'virtual:network') {
    return [
      { title: 'Ressources réseau', items: files.filter((item) => item.kind === 'network-mount'), state: states.networkMounts },
      { title: 'Serveurs locaux', items: files.filter((item) => item.kind === 'local-service'), state: states.localServices },
    ];
  }

  return [{ title: 'Contenu', items: files, state: { status: 'ready' } }];
}
