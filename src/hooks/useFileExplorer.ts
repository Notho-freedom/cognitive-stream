import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSystemBridge } from '@/hooks/useSystemBridge';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { useFileSelection } from '@/hooks/useFileSelection';
import type {
  FileEntity,
  ViewMode,
  SortField,
  SortOrder,
  DriveInfo,
  NetworkMountInfo,
  LocalServiceInfo,
  ExplorerSectionState,
  ExplorerLoadStatus,
} from '@/types/explorer.types';
import {
  getFileExtension,
  getMimeType,
  QUICK_ACCESS_PATHS,
  isVirtualExplorerPath,
} from '@/types/explorer.types';

const DIRECTORY_CACHE_TTL = 4000;
const VIRTUAL_CACHE_TTL = 2000;

const directoryCache = new Map<string, { timestamp: number; files: FileEntity[] }>();
const virtualCache = new Map<string, { timestamp: number; files: FileEntity[] }>();

const DEFAULT_SECTION_STATE: ExplorerSectionState = {
  status: 'loading',
};

function joinExplorerPath(basePath: string, nextSegment: string) {
  if (!basePath) return nextSegment;
  const separator = basePath.includes('\\') || /^[A-Za-z]:/.test(basePath) ? '\\' : '/';
  const normalizedBase = basePath.endsWith('\\') || basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  return `${normalizedBase}${separator}${nextSegment}`;
}

function getParentDirectory(filePath: string) {
  const normalized = filePath.replace(/[\\/]+$/, '');
  const lastSeparatorIndex = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
  return lastSeparatorIndex >= 0 ? normalized.slice(0, lastSeparatorIndex) : '';
}

function dirItemToEntity(item: {
  name?: string;
  path?: string;
  isDirectory?: boolean;
  size?: number;
  modified?: Date | string | null;
}): FileEntity {
  const name: string = item.name ?? '';
  const extension = item.isDirectory ? undefined : getFileExtension(name);
  return {
    id: item.path ?? name,
    name,
    path: item.path ?? '',
    type: item.isDirectory ? 'directory' : 'file',
    kind: item.isDirectory ? 'directory' : 'file',
    size: item.size ?? 0,
    extension,
    mimeType: item.isDirectory ? undefined : getMimeType(name),
    updatedAt: item.modified ? new Date(item.modified).getTime() : undefined,
    isHidden: name.startsWith('.'),
    iconKey: item.path ?? name,
    iconPath: item.path ?? '',
    subtitle: item.isDirectory ? 'Dossier' : extension?.toUpperCase() || 'Fichier',
  };
}

function createQuickAccessEntities(): FileEntity[] {
  return [
    { id: 'qa-home', name: 'Ce PC', path: QUICK_ACCESS_PATHS.thisPc, targetPath: QUICK_ACCESS_PATHS.thisPc, type: 'virtual', kind: 'quick-access', size: 0, isHidden: false, subtitle: 'Page d’accueil' },
    { id: 'qa-network', name: 'Réseau', path: QUICK_ACCESS_PATHS.network, targetPath: QUICK_ACCESS_PATHS.network, type: 'virtual', kind: 'network-mount', size: 0, isHidden: false, subtitle: 'Ressources & serveurs locaux' },
    { id: 'qa-desktop', name: 'Bureau', path: QUICK_ACCESS_PATHS.desktop, targetPath: QUICK_ACCESS_PATHS.desktop, type: 'directory', kind: 'quick-access', size: 0, isHidden: false, iconPath: QUICK_ACCESS_PATHS.desktop, subtitle: 'Accès rapide' },
    { id: 'qa-documents', name: 'Documents', path: QUICK_ACCESS_PATHS.documents, targetPath: QUICK_ACCESS_PATHS.documents, type: 'directory', kind: 'quick-access', size: 0, isHidden: false, iconPath: QUICK_ACCESS_PATHS.documents, subtitle: 'Accès rapide' },
    { id: 'qa-downloads', name: 'Téléchargements', path: QUICK_ACCESS_PATHS.downloads, targetPath: QUICK_ACCESS_PATHS.downloads, type: 'directory', kind: 'quick-access', size: 0, isHidden: false, iconPath: QUICK_ACCESS_PATHS.downloads, subtitle: 'Accès rapide' },
  ];
}

function createDriveEntities(drives: DriveInfo[]): FileEntity[] {
  return drives.map((drive) => ({
    id: `drive:${drive.mount}`,
    name: drive.label || drive.mount,
    path: drive.mount,
    targetPath: drive.mount,
    type: 'directory',
    kind: 'drive',
    size: drive.total,
    updatedAt: undefined,
    isHidden: false,
    iconKey: `drive:${drive.mount}`,
    iconPath: drive.mount,
    subtitle: `${Math.round(drive.usage)}% utilisé`,
    description: `${drive.fsType || 'Disque'} • ${drive.mount}`,
    meta: {
      used: drive.used,
      total: drive.total,
      usage: drive.usage,
    },
  }));
}

function createNetworkMountEntities(mounts: NetworkMountInfo[]): FileEntity[] {
  return mounts.map((mount, index) => {
    const targetPath = mount.displayRoot || mount.root || mount.name || `network:${index}`;
    return {
      id: `network-mount:${targetPath}`,
      name: mount.name || mount.displayRoot || mount.root || 'Ressource réseau',
      path: targetPath,
      targetPath,
      type: 'directory',
      kind: 'network-mount',
      size: (mount.used || 0) + (mount.free || 0),
      isHidden: false,
      iconKey: `network-mount:${targetPath}`,
      iconPath: mount.root || mount.displayRoot || undefined,
      subtitle: mount.displayRoot || mount.root || 'Montage réseau',
      meta: {
        used: mount.used ?? 0,
        free: mount.free ?? 0,
      },
    };
  });
}

function createLocalServiceEntities(services: LocalServiceInfo[]): FileEntity[] {
  return services.map((service) => ({
    id: `service:${service.port}`,
    name: service.processName || `localhost:${service.port}`,
    path: `service:${service.port}`,
    targetPath: service.url || `http://localhost:${service.port}`,
    type: 'virtual',
    kind: 'local-service',
    size: 0,
    isHidden: false,
    subtitle: `localhost:${service.port}`,
    description: `PID ${service.pid ?? '—'} • ${service.address || 'localhost'}`,
    meta: {
      pid: service.pid ?? 0,
      port: service.port,
    },
  }));
}

function sortEntities(files: FileEntity[], sortField: SortField, sortOrder: SortOrder) {
  const list = [...files];
  list.sort((a, b) => {
    if (a.type !== b.type) {
      if (a.type === 'directory') return -1;
      if (b.type === 'directory') return 1;
    }

    let cmp = 0;
    switch (sortField) {
      case 'name':
        cmp = a.name.localeCompare(b.name, 'fr-FR');
        break;
      case 'size':
        cmp = a.size - b.size;
        break;
      case 'date':
        cmp = (a.updatedAt ?? 0) - (b.updatedAt ?? 0);
        break;
      case 'type':
        cmp = (a.extension ?? a.kind ?? '').localeCompare(b.extension ?? b.kind ?? '', 'fr-FR');
        break;
    }

    return sortOrder === 'asc' ? cmp : -cmp;
  });
  return list;
}

export function useFileExplorer(initialPath?: string) {
  const bridge = useSystemBridge();
  const nav = useNavigationHistory(initialPath ?? QUICK_ACCESS_PATHS.home);

  const [files, setFiles] = useState<FileEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showHidden, setShowHidden] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileEntity | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [networkMounts, setNetworkMounts] = useState<NetworkMountInfo[]>([]);
  const [localServices, setLocalServices] = useState<LocalServiceInfo[]>([]);
  const [driveState, setDriveState] = useState<ExplorerSectionState>(DEFAULT_SECTION_STATE);
  const [networkMountState, setNetworkMountState] = useState<ExplorerSectionState>(DEFAULT_SECTION_STATE);
  const [localServiceState, setLocalServiceState] = useState<ExplorerSectionState>(DEFAULT_SECTION_STATE);
  const [clipboard, setClipboard] = useState<{ paths: string[]; cut: boolean } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  const selection = useFileSelection(files);

  const refreshDrives = useCallback(async () => {
    if (!bridge.isAvailable) return;
    const driveSnapshot = await bridge.getDrives();
    const driveItems = driveSnapshot.success ? driveSnapshot.data : [];

    setDriveState({
      status: (driveSnapshot.status ?? 'error') as ExplorerLoadStatus,
      source: (driveSnapshot as any).source,
      lastUpdatedAt: (driveSnapshot as any).lastUpdatedAt,
      error: (driveSnapshot as any).error,
    });
    setDrives(driveItems.map((disk) => ({
      mount: disk.mount,
      total: disk.total,
      used: disk.used,
      usage: disk.usage,
      fsType: disk.fsType,
      label: disk.label || disk.mount,
    })));
  }, [bridge]);

  const refreshNetworkSnapshot = useCallback(async () => {
    if (!bridge.isAvailable) return;
    const [mountResult, serviceResult] = await Promise.all([
      bridge.getNetworkMounts(),
      bridge.getListeningServices(),
    ]);

    setNetworkMountState({
      status: (mountResult.status ?? 'error') as ExplorerLoadStatus,
      source: (mountResult as any).source,
      lastUpdatedAt: (mountResult as any).lastUpdatedAt,
      error: (mountResult as any).error,
    });
    setLocalServiceState({
      status: (serviceResult.status ?? 'error') as ExplorerLoadStatus,
      source: (serviceResult as any).source,
      lastUpdatedAt: (serviceResult as any).lastUpdatedAt,
      error: (serviceResult as any).error,
    });
    setNetworkMounts(mountResult.data || []);
    setLocalServices(serviceResult.data || []);
  }, [bridge]);

  useEffect(() => {
    void refreshDrives();
    void refreshNetworkSnapshot();
  }, [refreshDrives, refreshNetworkSnapshot]);

  const buildVirtualFiles = useCallback((virtualPath: string) => {
    if (virtualPath === QUICK_ACCESS_PATHS.thisPc) {
      return [
        ...createQuickAccessEntities(),
        ...createDriveEntities(drives),
        ...createNetworkMountEntities(networkMounts),
      ];
    }

    if (virtualPath === QUICK_ACCESS_PATHS.network) {
      return [
        ...createNetworkMountEntities(networkMounts),
        ...createLocalServiceEntities(localServices),
      ];
    }

    return [];
  }, [drives, localServices, networkMounts]);

  const loadVirtualLocation = useCallback(async (virtualPath: string, force = false) => {
    const cached = virtualCache.get(virtualPath);
    const isFresh = cached && Date.now() - cached.timestamp < VIRTUAL_CACHE_TTL;

    if (!force && isFresh && cached) {
      setFiles(cached.files);
      setError(null);
      setPreviewFile(null);
      setPreviewContent(null);
      selection.clear();
      return;
    }

    const items = buildVirtualFiles(virtualPath);
    virtualCache.set(virtualPath, { timestamp: Date.now(), files: items });
    setFiles(items);
    setError(null);
    setPreviewFile(null);
    setPreviewContent(null);
    selection.clear();
  }, [buildVirtualFiles, selection]);

  const loadRealDirectory = useCallback(async (dirPath: string, force = false) => {
    const cached = directoryCache.get(dirPath);
    const isFresh = cached && Date.now() - cached.timestamp < DIRECTORY_CACHE_TTL;

    if (!force && isFresh && cached) {
      setFiles(cached.files);
      setError(null);
      setPreviewFile(null);
      setPreviewContent(null);
      selection.clear();
      setIsLoading(false);
    } else if (cached?.files?.length) {
      setFiles(cached.files);
      setError(null);
      setPreviewFile(null);
      setPreviewContent(null);
      selection.clear();
      setIsLoading(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await bridge.listDir(dirPath, { showHidden: true });
      if (!result.success) throw new Error(result.error ?? 'Failed to list directory');
      const entities = (result.items ?? []).map(dirItemToEntity);
      directoryCache.set(dirPath, {
        timestamp: Date.now(),
        files: entities,
      });
      setFiles(entities);
      setError(null);
      setPreviewFile(null);
      setPreviewContent(null);
      selection.clear();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load directory';
      if (cached?.files) {
        setFiles(cached.files);
      } else {
        setFiles([]);
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [bridge, selection]);

  const loadLocation = useCallback(async (targetPath: string, force = false) => {
    if (isVirtualExplorerPath(targetPath)) {
      await loadVirtualLocation(targetPath, force);
      void refreshDrives();
      void refreshNetworkSnapshot();
      return;
    }

    await loadRealDirectory(targetPath, force);
  }, [loadRealDirectory, loadVirtualLocation, refreshDrives, refreshNetworkSnapshot]);

  useEffect(() => {
    if (!bridge.isAvailable) return;
    void loadLocation(nav.currentPath);
  }, [bridge.isAvailable, loadLocation, nav.currentPath]);

  useEffect(() => {
    if (!bridge.isAvailable || isVirtualExplorerPath(nav.currentPath)) return;

    let debounceTimer: number | null = null;
    const unsubscribe = bridge.watchDir(nav.currentPath, () => {
      directoryCache.delete(nav.currentPath);
      void bridge.invalidateExplorerDirCache(nav.currentPath);
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        void loadRealDirectory(nav.currentPath, true);
      }, 150);
    });

    return () => {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
      }
      unsubscribe?.();
    };
  }, [bridge, loadRealDirectory, nav.currentPath]);

  useEffect(() => {
    if (!isVirtualExplorerPath(nav.currentPath)) return;

    const items = buildVirtualFiles(nav.currentPath);
    virtualCache.set(nav.currentPath, { timestamp: Date.now(), files: items });
    setFiles(items);
    setIsLoading(false);
    setError(null);
  }, [buildVirtualFiles, nav.currentPath]);

  const sortedFiles = useMemo(() => {
    let list = showHidden ? files : files.filter((file) => !file.isHidden);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter((file) => {
        const haystack = [file.name, file.subtitle, file.description].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(query);
      });
    }
    return sortEntities(list, sortField, sortOrder);
  }, [files, searchQuery, showHidden, sortField, sortOrder]);

  const navigateTo = useCallback((targetPath: string) => nav.navigate(targetPath), [nav]);

  const open = useCallback(async (entity: FileEntity) => {
    const targetPath = entity.targetPath || entity.path;

    if (entity.kind === 'local-service' && targetPath) {
      const platform = bridge.systemInfo?.platform;
      if (platform === 'win32') await bridge.exec(`Start-Process -FilePath "${targetPath}"`);
      else if (platform === 'darwin') await bridge.exec(`open "${targetPath}"`);
      else await bridge.exec(`xdg-open "${targetPath}"`);
      return;
    }

    if (entity.type === 'directory' || entity.type === 'virtual') {
      navigateTo(targetPath);
      return;
    }

    const platform = bridge.systemInfo?.platform;
    if (platform === 'win32') await bridge.exec(`Start-Process -FilePath "${entity.path}"`);
    else if (platform === 'darwin') await bridge.exec(`open "${entity.path}"`);
    else await bridge.exec(`xdg-open "${entity.path}"`);
  }, [bridge, navigateTo]);

  const preview = useCallback(async (entity: FileEntity) => {
    setPreviewFile(entity);
    if (entity.type !== 'file' || entity.size >= 100 * 1024) {
      setPreviewContent(null);
      return;
    }

    const mime = entity.mimeType ?? '';
    if (mime.startsWith('text/') || mime === 'application/json') {
      const result = await bridge.readFile(entity.path);
      setPreviewContent(result.success ? (result.content ?? null) : null);
      return;
    }

    setPreviewContent(null);
  }, [bridge]);

  const createFolder = useCallback(async (name: string) => {
    if (isVirtualExplorerPath(nav.currentPath)) return false;
    const fullPath = joinExplorerPath(nav.currentPath, name);
    const result = await bridge.mkdir(fullPath);
    if (result.success) await loadLocation(nav.currentPath, true);
    return result.success;
  }, [bridge, loadLocation, nav.currentPath]);

  const rename = useCallback(async (oldPath: string, newName: string) => {
    if (isVirtualExplorerPath(nav.currentPath)) return false;
    const nextPath = joinExplorerPath(getParentDirectory(oldPath), newName);
    const result = await bridge.rename(oldPath, nextPath);
    if (result.success) await loadLocation(nav.currentPath, true);
    return result.success;
  }, [bridge, loadLocation, nav.currentPath]);

  const deleteSelected = useCallback(async () => {
    if (isVirtualExplorerPath(nav.currentPath)) return;
    for (const id of selection.selected) {
      const file = files.find((entity) => entity.id === id);
      if (!file) continue;
      await bridge.delete(file.path, { recursive: file.type === 'directory' });
    }
    await loadLocation(nav.currentPath, true);
  }, [bridge, files, loadLocation, nav.currentPath, selection.selected]);

  const copy = useCallback(() => {
    const paths = selection.selected
      .map((id) => files.find((file) => file.id === id)?.path)
      .filter(Boolean) as string[];
    setClipboard({ paths, cut: false });
  }, [files, selection.selected]);

  const cut = useCallback(() => {
    const paths = selection.selected
      .map((id) => files.find((file) => file.id === id)?.path)
      .filter(Boolean) as string[];
    setClipboard({ paths, cut: true });
  }, [files, selection.selected]);

  const paste = useCallback(async () => {
    if (!clipboard || isVirtualExplorerPath(nav.currentPath)) return false;
    let hadFailure = false;

    for (const src of clipboard.paths) {
      const name = src.replace(/\\/g, '/').split('/').pop() ?? 'file';
      const dest = joinExplorerPath(nav.currentPath, name);
      if (clipboard.cut) {
        const result = await bridge.move(src, dest);
        hadFailure = hadFailure || !result.success;
      } else {
        const result = await bridge.copy(src, dest);
        hadFailure = hadFailure || !result.success;
      }
    }

    if (clipboard.cut && !hadFailure) setClipboard(null);
    await loadLocation(nav.currentPath, true);
    return !hadFailure;
  }, [bridge, clipboard, loadLocation, nav.currentPath]);

  const refresh = useCallback(async () => {
    await loadLocation(nav.currentPath, true);
  }, [loadLocation, nav.currentPath]);

  const setSort = useCallback((field: SortField) => {
    setSortField((previousField) => {
      if (previousField === field) {
        setSortOrder((previousOrder) => previousOrder === 'asc' ? 'desc' : 'asc');
        return previousField;
      }
      setSortOrder('asc');
      return field;
    });
  }, []);

  const currentDrive = drives.find((drive) => nav.currentPath.startsWith(drive.mount));
  const isVirtualView = isVirtualExplorerPath(nav.currentPath);

  return {
    currentPath: nav.currentPath,
    currentDrive,
    isVirtualView,
    files: sortedFiles,
    allFiles: files,
    isLoading,
    error,
    viewMode,
    sortField,
    sortOrder,
    showHidden,
    showPreview,
    previewFile,
    previewContent,
    searchQuery,
    drives,
    networkMounts,
    localServices,
    driveState,
    networkMountState,
    localServiceState,
    clipboard,
    renaming,
    platform: bridge.systemInfo?.platform ?? 'linux',
    hostname: bridge.systemInfo?.hostname ?? 'localhost',

    navigateTo,
    goBack: nav.goBack,
    goForward: nav.goForward,
    goUp: nav.goUp,
    canGoBack: nav.canGoBack,
    canGoForward: nav.canGoForward,

    ...selection,

    open,
    preview,
    createFolder,
    rename,
    deleteSelected,
    copy,
    cut,
    paste,
    refresh,

    setViewMode,
    setSort,
    setShowHidden: () => setShowHidden((previous) => !previous),
    setShowPreview: () => setShowPreview((previous) => !previous),
    setSearchQuery,
    setRenaming,
  };
}
