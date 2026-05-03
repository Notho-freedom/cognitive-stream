import { useState, useRef, useEffect, useCallback } from 'react';
import { TerminalSquare, X, Minus } from 'lucide-react';
import { fileSystem } from '@/data/mockFileSystem';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  cwd: string;
  cwdName: string;
  onClose: () => void;
  onCd: (folderId: string) => void;
  onMkdir: (name: string) => void;
}

interface Line {
  kind: 'cmd' | 'out' | 'err';
  text: string;
  prompt?: string;
}

const PROMPT_COLOR = 'text-emerald-400';

export function TerminalPanel({ open, cwd, cwdName, onClose, onCd, onMkdir }: Props) {
  const [lines, setLines] = useState<Line[]>([
    { kind: 'out', text: 'PowerShell 7.4.0 — Cognitive Stream Terminal' },
    { kind: 'out', text: "Type 'help' to list commands." },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const promptText = `PS ${cwdName}>`;

  const exec = useCallback(
    (raw: string) => {
      const cmd = raw.trim();
      const append = (text: string, kind: Line['kind'] = 'out') =>
        setLines((prev) => [...prev, { kind, text }]);

      setLines((prev) => [...prev, { kind: 'cmd', text: raw, prompt: promptText }]);
      if (!cmd) return;

      setHistory((prev) => [...prev, cmd]);
      setHistIdx(-1);

      const [head, ...rest] = cmd.split(/\s+/);
      const arg = rest.join(' ');

      switch (head) {
        case 'help':
          append('Commandes disponibles:');
          append('  cd <dossier>      changer de dossier');
          append('  ls, dir           lister le contenu');
          append('  pwd               afficher le chemin');
          append('  mkdir <nom>       créer un dossier');
          append('  clear, cls        effacer le terminal');
          append('  echo <texte>      afficher un texte');
          append('  git status|log|branch   commandes Git (mock)');
          append('  npm run <task>    exécuter une tâche (mock)');
          append('  exit              fermer le terminal');
          break;
        case 'pwd':
          append(cwdName);
          break;
        case 'ls':
        case 'dir': {
          const folder = fileSystem[cwd];
          if (!folder?.children?.length) {
            append('(dossier vide)');
            break;
          }
          folder.children.forEach((cid) => {
            const f = fileSystem[cid];
            if (!f) return;
            const flag = f.type === 'folder' ? 'd' : '-';
            append(`${flag}  ${f.name}`);
          });
          break;
        }
        case 'cd': {
          if (!arg) {
            append(cwdName);
            break;
          }
          if (arg === '..') {
            const parent = fileSystem[cwd]?.parentId;
            if (parent) onCd(parent);
            else append('cd: déjà à la racine', 'err');
            break;
          }
          const folder = fileSystem[cwd];
          const child = folder?.children?.find((cid) => fileSystem[cid]?.name.toLowerCase() === arg.toLowerCase());
          if (child && fileSystem[child].type === 'folder') {
            onCd(child);
          } else {
            append(`cd: dossier introuvable : ${arg}`, 'err');
          }
          break;
        }
        case 'mkdir':
          if (!arg) {
            append('mkdir: nom requis', 'err');
            break;
          }
          onMkdir(arg);
          append(`Dossier créé : ${arg}`);
          break;
        case 'clear':
        case 'cls':
          setLines([]);
          break;
        case 'echo':
          append(arg);
          break;
        case 'git': {
          const sub = rest[0];
          if (sub === 'status') {
            append('On branch main');
            append('Your branch is up to date.');
            append('');
            append('Changes not staged for commit:');
            append('  modified:   src/components/explorer/ExplorerTab.tsx', 'err');
            append('  modified:   src/lib/sounds.ts', 'err');
            append('Untracked files:');
            append('  src/hooks/useDragDrop.ts', 'err');
          } else if (sub === 'log') {
            ['a3f9c21 feat: add multi-tab navigation',
             '5d8e012 refactor: extract sidebar sections',
             'b21c4f8 fix: hover flicker on sidebar items'].forEach((l) => append(l));
          } else if (sub === 'branch') {
            append('* main');
            append('  develop');
            append('  feature/split-view');
          } else {
            append(`git: '${sub || ''}' is not a git command (mock)`, 'err');
          }
          break;
        }
        case 'npm':
          if (rest[0] === 'run') {
            append(`> ${rest[1] || ''}`);
            append('Build completed in 1.42s');
          } else {
            append('npm: only "run" is mocked', 'err');
          }
          break;
        case 'exit':
          onClose();
          break;
        default:
          append(`'${head}' n'est pas reconnu comme commande interne ou externe.`, 'err');
      }
    },
    [cwd, cwdName, promptText, onCd, onMkdir, onClose]
  );

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      exec(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setInput(history[next] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx < 0) return;
      const next = histIdx + 1;
      if (next >= history.length) {
        setHistIdx(-1);
        setInput('');
      } else {
        setHistIdx(next);
        setInput(history[next]);
      }
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setLines([]);
    }
  };

  if (!open) return null;

  return (
    <div className="border-t border-border/40 bg-[hsl(var(--background))] flex flex-col h-48 shrink-0">
      <div className="flex items-center gap-2 px-3 h-7 bg-[hsl(var(--explorer-surface))] border-b border-border/30 shrink-0">
        <TerminalSquare size={12} className="text-emerald-400/70" />
        <span className="text-[11px] font-mono text-muted-foreground">
          PowerShell · <span className="text-foreground/80">{cwdName}</span>
        </span>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-[hsl(var(--explorer-hover))]"
          title="Réduire (Ctrl+`)"
        >
          <Minus size={11} />
        </button>
        <button
          onClick={onClose}
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-red-500/20 hover:text-red-400"
          title="Fermer"
        >
          <X size={11} />
        </button>
      </div>
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-[1.4] cursor-text"
      >
        {lines.map((l, i) => (
          <div key={i} className={cn('whitespace-pre-wrap break-all', l.kind === 'err' && 'text-red-400/90')}>
            {l.kind === 'cmd' ? (
              <>
                <span className={PROMPT_COLOR}>{l.prompt} </span>
                <span className="text-foreground">{l.text}</span>
              </>
            ) : (
              <span className={l.kind === 'err' ? '' : 'text-muted-foreground'}>{l.text}</span>
            )}
          </div>
        ))}
        <div className="flex items-center">
          <span className={cn(PROMPT_COLOR, 'shrink-0')}>{promptText}&nbsp;</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent outline-none text-foreground font-mono text-[11px] allow-select"
          />
        </div>
      </div>
    </div>
  );
}
