export type ExplorerVirtualPath = 'virtual:this-pc' | 'virtual:network';
export type ExplorerLoadStatus = 'ready' | 'loading' | 'partial' | 'stale' | 'timeout' | 'error';
export type ExplorerCacheSource = 'memory' | 'disk' | 'redis' | 'live';

export interface FileEntity {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory' | 'virtual';
  size: number;
  extension?: string;
  mimeType?: string;
  createdAt?: number;
  updatedAt?: number;
  accessedAt?: number;
  isHidden: boolean;
  isReadonly?: boolean;
  permissions?: string;
  icon?: string;
  iconKey?: string;
  iconPath?: string;
  kind?:
    | 'file'
    | 'directory'
    | 'drive'
    | 'network-mount'
    | 'local-service'
    | 'quick-access'
    | 'virtual-location';
  targetPath?: string;
  subtitle?: string;
  description?: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
}

export interface DriveInfo {
  mount: string;
  label?: string;
  total: number;
  used: number;
  usage: number;
  fsType?: string;
}

export interface NetworkInterface {
  iface: string;
  ip4?: string;
  ip6?: string;
  mac?: string;
  rx: number;
  tx: number;
}

export type ViewMode = 'grid' | 'list' | 'details';
export type SortField = 'name' | 'size' | 'date' | 'type';
export type SortOrder = 'asc' | 'desc';

export interface ExplorerState {
  currentPath: string;
  files: FileEntity[];
  selected: string[];
  viewMode: ViewMode;
  sort: { field: SortField; order: SortOrder };
  history: { back: string[]; forward: string[] };
  showHidden: boolean;
  showPreview: boolean;
  previewFile: FileEntity | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  drives: DriveInfo[];
}

export interface NetworkMountInfo {
  name?: string;
  root?: string;
  displayRoot?: string;
  used?: number;
  free?: number;
}

export interface LocalServiceInfo {
  address?: string;
  port: number;
  pid?: number;
  processName?: string | null;
  url?: string;
}

export interface ExplorerSectionState {
  status: ExplorerLoadStatus;
  source?: ExplorerCacheSource;
  lastUpdatedAt?: number;
  error?: string | null;
}

export interface ExplorerContextAction {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

export const QUICK_ACCESS_PATHS = {
  home: 'virtual:this-pc' as ExplorerVirtualPath,
  thisPc: 'virtual:this-pc' as ExplorerVirtualPath,
  network: 'virtual:network' as ExplorerVirtualPath,
  desktop: '~/Desktop',
  documents: '~/Documents',
  downloads: '~/Downloads',
  pictures: '~/Pictures',
  music: '~/Music',
  videos: '~/Videos',
} as const;

export const MIME_MAP: Record<string, string> = {
  txt: 'text/plain', md: 'text/markdown', json: 'application/json',
  js: 'text/javascript', ts: 'text/typescript', jsx: 'text/jsx', tsx: 'text/tsx',
  html: 'text/html', css: 'text/css', xml: 'text/xml', csv: 'text/csv',
  py: 'text/x-python', sh: 'text/x-shellscript', yml: 'text/yaml', yaml: 'text/yaml',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
  mp4: 'video/mp4', webm: 'video/webm', avi: 'video/x-msvideo',
  pdf: 'application/pdf', zip: 'application/zip', tar: 'application/x-tar',
  gz: 'application/gzip', exe: 'application/x-executable',
};

export function getMimeType(filename: string): string | undefined {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? MIME_MAP[ext] : undefined;
}

export function isTextFile(filename: string): boolean {
  const mime = getMimeType(filename);
  return mime?.startsWith('text/') || mime === 'application/json' || false;
}

export function isImageFile(filename: string): boolean {
  const mime = getMimeType(filename);
  return mime?.startsWith('image/') || false;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function isVirtualExplorerPath(path: string): path is ExplorerVirtualPath {
  return path === 'virtual:this-pc' || path === 'virtual:network';
}
