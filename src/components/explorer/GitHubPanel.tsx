import { useState, useMemo } from 'react';
import { GitBranch, Star, GitPullRequest, GitCommit, Search, GitFork, AlertCircle, Eye, Clock, Lock, Globe, Download } from 'lucide-react';
import { useI18n } from '@/i18n/LanguageContext';
import { useSound } from '@/hooks/useSound';
import { HDIcon } from './icons/HDIcon';
import { FileIcon } from './FileIcon';
import { fileSystem } from '@/data/mockFileSystem';
import { cn } from '@/lib/utils';

interface Repo {
  id: string;
  name: string;
  owner: string;
  description: string;
  branch: string;
  stars: number;
  forks: number;
  watchers: number;
  prs: number;
  issues: number;
  ahead: number;
  behind: number;
  language: string;
  langColor: string;
  visibility: 'public' | 'private';
  lastCommit: { sha: string; message: string; author: string; when: string };
  folderId?: string;
}

const repos: Repo[] = [
  {
    id: 'r1', name: 'explorer', owner: 'cogni-stream',
    description: 'Next-gen file explorer with AI-powered search and fluid UX.',
    branch: 'main', stars: 1240, forks: 87, watchers: 42, prs: 3, issues: 12,
    ahead: 2, behind: 0, language: 'TypeScript', langColor: 'hsl(208 70% 55%)',
    visibility: 'public', folderId: 'd-p1',
    lastCommit: { sha: 'a3f9c21', message: 'feat: add multi-tab navigation', author: 'alex', when: '2h ago' },
  },
  {
    id: 'r2', name: 'api', owner: 'cogni-stream',
    description: 'Backend services — FastAPI + PostgreSQL.',
    branch: 'develop', stars: 312, forks: 24, watchers: 15, prs: 1, issues: 5,
    ahead: 5, behind: 1, language: 'Python', langColor: 'hsl(45 80% 55%)',
    visibility: 'private', folderId: 'd-p2',
    lastCommit: { sha: '7b2e144', message: 'fix: rate limiter race condition', author: 'maria', when: '5h ago' },
  },
  {
    id: 'r3', name: 'mobile', owner: 'cogni-stream',
    description: 'Flutter app — iOS + Android.',
    branch: 'feature/auth', stars: 89, forks: 11, watchers: 8, prs: 0, issues: 3,
    ahead: 0, behind: 3, language: 'Dart', langColor: 'hsl(195 75% 55%)',
    visibility: 'public', folderId: 'd-p3',
    lastCommit: { sha: 'c4d8f02', message: 'wip: biometric auth flow', author: 'kenji', when: '1d ago' },
  },
  {
    id: 'r4', name: 'devops', owner: 'cogni-stream',
    description: 'Infrastructure as code — Terraform + Ansible playbooks.',
    branch: 'main', stars: 47, forks: 6, watchers: 4, prs: 2, issues: 1,
    ahead: 0, behind: 0, language: 'Shell', langColor: 'hsl(120 50% 55%)',
    visibility: 'private', folderId: 'd-p4',
    lastCommit: { sha: 'e1a05b6', message: 'chore: bump terraform 1.8', author: 'alex', when: '3d ago' },
  },
];

const GH_LOGO = 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/github.svg';

interface Props {
  onNavigate: (id: string) => void;
}

export function GitHubPanel({ onNavigate }: Props) {
  const { t } = useI18n();
  const { play, playHover } = useSound();
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => repos.filter(r => `${r.owner}/${r.name} ${r.description}`.toLowerCase().includes(search.toLowerCase())),
    [search]
  );
  const activeRepo = activeRepoId ? repos.find(r => r.id === activeRepoId) : null;

  // ── Repo detail view ──
  if (activeRepo) {
    return <RepoDetail repo={activeRepo} onBack={() => { play('close'); setActiveRepoId(null); }} onOpenLocal={() => {
      if (activeRepo.folderId && fileSystem[activeRepo.folderId]) { play('open'); onNavigate(activeRepo.folderId); }
    }} />;
  }

  // ── List view ──
  const totalStars = repos.reduce((s, r) => s + r.stars, 0);
  const totalPrs = repos.reduce((s, r) => s + r.prs, 0);

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/30">
        <div className="flex items-center gap-3 mb-4">
          <HDIcon src={GH_LOGO} size={32} alt="GitHub" fallbackEmoji="🐙" />
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-normal text-foreground">{t('github.title')}</h2>
            <p className="text-[11px] text-muted-foreground font-light">{t('github.subtitle')}</p>
          </div>
          <div className="flex gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Star size={11} className="text-amber-400/70" /> {totalStars.toLocaleString()}</span>
            <span className="flex items-center gap-1"><GitPullRequest size={11} className="text-emerald-400/70" /> {totalPrs} PRs</span>
            <span className="flex items-center gap-1"><GitBranch size={11} className="text-primary/70" /> {repos.length} repos</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer les dépôts…"
            className="w-full h-7 pl-7 pr-2 text-[12px] font-light bg-[hsl(var(--muted))] border border-border/30 rounded outline-none focus:border-primary/40 transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="p-3 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
        {filtered.map(r => (
          <button
            key={r.id}
            onClick={() => { play('click'); setActiveRepoId(r.id); }}
            onMouseEnter={playHover}
            className="group text-left flex flex-col gap-2 p-3 rounded-md border border-border/40 bg-[hsl(var(--explorer-surface))] hover:border-primary/30 transition-all"
          >
            <div className="flex items-start gap-2">
              <HDIcon src={GH_LOGO} size={16} alt="" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-mono text-muted-foreground">{r.owner}/</span>
                  <span className="text-[12px] font-mono text-foreground font-normal truncate">{r.name}</span>
                  <span className={cn(
                    'text-[9px] uppercase tracking-wider px-1.5 py-px rounded font-mono',
                    r.visibility === 'private' ? 'border border-amber-400/30 text-amber-400/80' : 'border border-border/40 text-muted-foreground'
                  )}>{r.visibility}</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-light line-clamp-1 mt-0.5">{r.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1"><GitBranch size={10} /> {r.branch}</span>
              <span className="flex items-center gap-1"><Star size={10} /> {r.stars}</span>
              <span className="flex items-center gap-1"><GitFork size={10} /> {r.forks}</span>
              {r.prs > 0 && <span className="flex items-center gap-1 text-amber-400/80"><GitPullRequest size={10} /> {r.prs}</span>}
              {r.ahead > 0 && <span className="flex items-center gap-1 text-emerald-400/80">↑{r.ahead}</span>}
              {r.behind > 0 && <span className="flex items-center gap-1 text-red-400/80">↓{r.behind}</span>}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
              <span className="w-2 h-2 rounded-full" style={{ background: r.langColor }} />
              <span>{r.language}</span>
              <span className="mx-1">·</span>
              <Clock size={9} />
              <span>{r.lastCommit.when}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Repo detail view ──
function RepoDetail({ repo, onBack, onOpenLocal }: { repo: Repo; onBack: () => void; onOpenLocal: () => void }) {
  const { play } = useSound();
  const [currentBranch, setCurrentBranch] = useState(repo.branch);

  // Mock file tree (would come from real GitHub API in production)
  const tree: { name: string; type: 'dir' | 'file'; ext?: string; size?: string }[] = [
    { name: '.github', type: 'dir' },
    { name: 'src', type: 'dir' },
    { name: 'public', type: 'dir' },
    { name: 'tests', type: 'dir' },
    { name: '.gitignore', type: 'file', size: '1.2 KB' },
    { name: 'package.json', type: 'file', ext: 'json', size: '3.4 KB' },
    { name: 'README.md', type: 'file', ext: 'md', size: '8.1 KB' },
    { name: 'tsconfig.json', type: 'file', ext: 'json', size: '0.6 KB' },
    { name: 'LICENSE', type: 'file', size: '1.1 KB' },
  ];

  // Mock recent commits
  const commits = [
    { sha: 'a3f9c21', msg: 'feat: add multi-tab navigation', author: 'alex',  when: '2h ago' },
    { sha: '5d8e012', msg: 'refactor: extract sidebar sections', author: 'maria', when: '6h ago' },
    { sha: 'b21c4f8', msg: 'fix: hover flicker on sidebar items', author: 'alex',  when: '1d ago' },
    { sha: '9a0e3d7', msg: 'chore: bump deps', author: 'kenji', when: '2d ago' },
    { sha: '4c1f2b9', msg: 'docs: add architecture diagram', author: 'maria', when: '3d ago' },
  ];

  const branches = ['main', 'develop', 'feature/auth', 'feature/split-view', 'release/v2'];

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="border-b border-border/30 bg-[hsl(var(--explorer-surface))]">
        <div className="px-6 pt-4 pb-3">
          <button
            onClick={onBack}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-3 font-mono"
          >
            ← retour aux dépôts
          </button>

          <div className="flex items-start gap-3">
            <HDIcon src={GH_LOGO} size={36} alt="" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[14px] font-mono text-muted-foreground">{repo.owner}/</span>
                <span className="text-[14px] font-mono text-foreground font-normal">{repo.name}</span>
                <span className={cn(
                  'text-[9px] uppercase tracking-wider px-1.5 py-px rounded font-mono flex items-center gap-1',
                  repo.visibility === 'private' ? 'border border-amber-400/30 text-amber-400/80' : 'border border-border/40 text-muted-foreground'
                )}>
                  {repo.visibility === 'private' ? <Lock size={8} /> : <Globe size={8} />}
                  {repo.visibility}
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground font-light mt-1">{repo.description}</p>
            </div>

            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => { play('click'); }}
                className="h-7 px-2.5 flex items-center gap-1.5 text-[11px] rounded border border-border/40 hover:border-primary/40 hover:bg-[hsl(var(--explorer-hover))] transition-colors"
              >
                <Star size={11} /> Star
              </button>
              <button
                onClick={onOpenLocal}
                className="h-7 px-2.5 flex items-center gap-1.5 text-[11px] rounded bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors"
              >
                <Download size={11} /> Ouvrir local
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-5 mt-3 text-[11px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1"><Star size={11} className="text-amber-400/70" /> {repo.stars.toLocaleString()}</span>
            <span className="flex items-center gap-1"><GitFork size={11} /> {repo.forks}</span>
            <span className="flex items-center gap-1"><Eye size={11} /> {repo.watchers}</span>
            <span className="flex items-center gap-1"><GitPullRequest size={11} className="text-emerald-400/70" /> {repo.prs} PRs</span>
            <span className="flex items-center gap-1"><AlertCircle size={11} className="text-red-400/70" /> {repo.issues} issues</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: repo.langColor }} />
              {repo.language}
            </span>
          </div>
        </div>

        {/* Branch + sync indicators */}
        <div className="px-6 py-2 border-t border-border/30 flex items-center gap-3 text-[11px] text-muted-foreground bg-[hsl(var(--background))]">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[hsl(var(--muted))] font-mono">
            <GitBranch size={10} /> {currentBranch}
          </div>
          <span className="text-muted-foreground/50">·</span>
          <span className="font-mono">{branches.length} branches</span>
          {repo.ahead > 0 && <span className="text-emerald-400/80 font-mono">↑{repo.ahead} ahead</span>}
          {repo.behind > 0 && <span className="text-red-400/80 font-mono">↓{repo.behind} behind</span>}
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 p-4">
        {/* File tree */}
        <div className="lg:col-span-2 rounded-md border border-border/40 bg-[hsl(var(--explorer-surface))] overflow-hidden">
          <div className="px-3 py-2 border-b border-border/30 flex items-center gap-2 text-[11px] text-muted-foreground">
            <GitCommit size={11} />
            <span className="font-mono text-foreground/80">{repo.lastCommit.sha}</span>
            <span className="truncate">{repo.lastCommit.message}</span>
            <span className="ml-auto shrink-0 font-mono text-[10px]">{repo.lastCommit.when}</span>
          </div>
          <div>
            {tree.map((node, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-light hover:bg-[hsl(var(--explorer-hover))] cursor-pointer border-b border-border/20 last:border-0"
              >
                <FileIcon
                  type={node.type === 'dir' ? 'folder' : (node.ext === 'json' ? 'code' : node.ext === 'md' ? 'text' : 'unknown')}
                  extension={node.ext}
                  name={node.name}
                  size={14}
                />
                <span className={cn('font-mono', node.type === 'dir' && 'text-primary/80')}>{node.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground/60 font-mono">{node.size || ''}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side panels */}
        <div className="space-y-3">
          {/* Recent commits */}
          <div className="rounded-md border border-border/40 bg-[hsl(var(--explorer-surface))] overflow-hidden">
            <div className="px-3 py-2 border-b border-border/30 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Commits récents</div>
            <div>
              {commits.map(c => (
                <div key={c.sha} className="px-3 py-2 text-[11px] border-b border-border/20 last:border-0 hover:bg-[hsl(var(--explorer-hover))] cursor-pointer">
                  <div className="text-foreground/90 truncate font-light">{c.msg}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground font-mono">
                    <span className="text-primary/70">{c.sha}</span>
                    <span>·</span>
                    <span>{c.author}</span>
                    <span className="ml-auto">{c.when}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Branches */}
          <div className="rounded-md border border-border/40 bg-[hsl(var(--explorer-surface))] overflow-hidden">
            <div className="px-3 py-2 border-b border-border/30 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Branches</div>
            <div>
              {branches.map(b => (
                <button
                  key={b}
                  onClick={() => { play('click'); setCurrentBranch(b); }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono border-b border-border/20 last:border-0 hover:bg-[hsl(var(--explorer-hover))] cursor-pointer w-full text-left',
                    b === currentBranch && 'text-primary'
                  )}
                >
                  <GitBranch size={10} />
                  <span>{b}</span>
                  {b === currentBranch && <span className="ml-auto text-[9px] uppercase tracking-wider">current</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
