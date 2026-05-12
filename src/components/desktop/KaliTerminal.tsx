import { useState, useRef, useEffect, useCallback } from 'react';
import { fileSystem } from '@/data/mockFileSystem';
import { cn } from '@/lib/utils';

interface Props {
  onClose?: () => void;
}

interface Line {
  kind: 'cmd' | 'out' | 'err';
  text: string;
  prompt?: string;
}

const USER = 'cog';
const HOST = 'kali';

/**
 * Kali-style terminal that fills its parent (no internal close chrome).
 * The hosting window provides the title bar.
 */
export function KaliTerminal({ onClose }: Props) {
  const [cwdId, setCwdId] = useState('root');
  const [lines, setLines] = useState<Line[]>([
    { kind: 'out', text: '┌──(cog㉿kali)-[~]' },
    { kind: 'out', text: '└─$ Bienvenue dans le terminal cognitif. Tapez "help".' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cwdName = fileSystem[cwdId]?.name
    ? `~/${fileSystem[cwdId].name}`
    : '~';

  const promptPrefix = `┌──(${USER}㉿${HOST})-[${cwdName}]`;
  const promptLine = '└─$';

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const exec = useCallback((raw: string) => {
    const cmd = raw.trim();
    const append = (text: string, kind: Line['kind'] = 'out') =>
      setLines(prev => [...prev, { kind, text }]);

    setLines(prev => [
      ...prev,
      { kind: 'out', text: promptPrefix },
      { kind: 'cmd', text: raw, prompt: promptLine },
    ]);
    if (!cmd) return;

    setHistory(prev => [...prev, cmd]);
    setHistIdx(-1);

    const [head, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(' ');

    switch (head) {
      case 'help':
        append('Commandes : help, ls, cd, pwd, mkdir, clear, echo, whoami, uname, neofetch, exit');
        break;
      case 'whoami':
        append(USER);
        break;
      case 'uname':
        append('Linux kali 6.6.0-cognitive #1 SMP x86_64 GNU/Linux');
        break;
      case 'neofetch':
        ['  __  __        ', ' |  \\/  |  Cognitive Kali', ' | |\\/| |  ─────────────', ` | |  | |  user: ${USER}@${HOST}`, ' |_|  |_|  shell: cog-sh 1.0', '            uptime: ∞'].forEach(l => append(l));
        break;
      case 'pwd':
        append(cwdName);
        break;
      case 'ls':
      case 'dir': {
        const folder = fileSystem[cwdId];
        if (!folder?.children?.length) { append('(dossier vide)'); break; }
        folder.children.forEach(cid => {
          const f = fileSystem[cid];
          if (!f) return;
          append(f.type === 'folder' ? `\x1b[1;34m${f.name}\x1b[0m` : f.name);
        });
        break;
      }
      case 'cd': {
        if (!arg || arg === '~') { setCwdId('root'); break; }
        if (arg === '..') {
          const parent = fileSystem[cwdId]?.parentId;
          if (parent) setCwdId(parent);
          else append('cd: déjà à la racine', 'err');
          break;
        }
        const folder = fileSystem[cwdId];
        const child = folder?.children?.find(cid => fileSystem[cid]?.name.toLowerCase() === arg.toLowerCase());
        if (child && fileSystem[child].type === 'folder') setCwdId(child);
        else append(`cd: ${arg}: dossier introuvable`, 'err');
        break;
      }
      case 'mkdir':
        if (!arg) { append('mkdir: nom requis', 'err'); break; }
        append(`mkdir: ${arg} (mock)`);
        break;
      case 'clear':
      case 'cls':
        setLines([]);
        break;
      case 'echo':
        append(arg);
        break;
      case 'exit':
        onClose?.();
        break;
      default:
        append(`bash: ${head}: commande introuvable`, 'err');
    }
  }, [cwdId, cwdName, promptPrefix, onClose]);

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
      if (next >= history.length) { setHistIdx(-1); setInput(''); }
      else { setHistIdx(next); setInput(history[next]); }
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <div
      ref={scrollRef}
      onClick={() => inputRef.current?.focus()}
      className="h-full w-full overflow-y-auto px-3 py-2 cursor-text font-mono text-[12px] leading-[1.45] allow-select"
      style={{ background: 'hsl(220 25% 3.5%)', color: 'hsl(0 0% 90%)' }}
    >
      {lines.map((l, i) => (
        <div key={i} className={cn('whitespace-pre-wrap break-all', l.kind === 'err' && 'text-red-400')}>
          {l.kind === 'cmd' ? (
            <>
              <span className="text-emerald-400">{l.prompt}</span>
              <span className="text-foreground/90"> {l.text}</span>
            </>
          ) : (
            <span className={cn(l.kind === 'err' ? '' : l.text.startsWith('┌') || l.text.startsWith('└') ? 'text-emerald-400' : 'text-foreground/85')}>
              {l.text}
            </span>
          )}
        </div>
      ))}
      <div className="text-emerald-400">{promptPrefix}</div>
      <div className="flex items-center">
        <span className="text-emerald-400 shrink-0">{promptLine}&nbsp;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent outline-none font-mono text-[12px] text-foreground allow-select"
        />
      </div>
    </div>
  );
}
