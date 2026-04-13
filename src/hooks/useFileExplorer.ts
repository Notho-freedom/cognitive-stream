import { useCallback, useEffect, useState } from 'react';
import { useSystemBridge } from '@/hooks/useSystemBridge';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { useFileSelection } from '@/hooks/useFileSelection';
import type {
  FileEntity, ViewMode, SortField, SortOrder, DriveInfo,
} from '@/types/explorer.types';
import { getFileExtension, getMimeType } from '@/types/explorer.types';

function dirItemToEntity(item: any): FileEntity {
  const name: string = item.name ?? '';
  return {
    id: item.path ?? name,
    name,
    path: item.path ?? '',
    type: item.isDirectory ? 'directory' : 'file',
    size: item.size ?? 0,
    extension: item.isDirectory ? undefined : getFileExtension(name),
    mimeType: item.isDirectory ? undefined : getMimeType(name),
    updatedAt: item.modified ? new Date(item.modified).getTime() : undefined,
    isHidden: name.startsWith('.'),
  };
}

export function useFileExplorer(initialPath?: string) {
  const bridge = useSystemBridge();
  const homedir = bridge.systemInfo?.homedir ?? '~';
  const nav = useNavigationHistory(initialPath ?? homedir);

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
  const [clipboard, setClipboard] = useState<{ paths: string[]; cut: boolean } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  const selection = useFileSelection(files);

  // Sort + filter files
  const sortedFiles = (() => {
    let list = showHidden ? files : files.filter(f => !f.isHidden);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      // Dirs always first
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'size': cmp = a.size - b.size; break;
        case 'date': cmp = (a.updatedAt ?? 0) - (b.updatedAt ?? 0); break;
        case 'type': cmp = (a.extension ?? '').localeCompare(b.extension ?? ''); break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  })();

  // Load directory
  const loadDir = useCallback(async (dirPath: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await bridge.listDir(dirPath, { showHidden: true });
      if (!result.success) throw new Error(result.error ?? 'Failed to list directory');
      const entities = (result.items ?? []).map(dirItemToEntity);
      setFiles(entities);
      selection.clear();
      setPreviewFile(null);
      setPreviewContent(null);
    } catch (err: any) {
      setError(err.message);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [bridge, selection]);

  // React to nav changes
  useEffect(() => {
    if (bridge.isAvailable) loadDir(nav.currentPath);
  }, [nav.currentPath, bridge.isAvailable]);

  // Load drives
  useEffect(() => {
    if (!bridge.isAvailable) return;
    bridge.getSystemMetrics().then(m => {
      if (m.disk) {
        setDrives(m.disk.map(d => ({
          mount: d.mount,
          total: d.total,
          used: d.used,
          usage: d.usage,
          fsType: d.fsType,
        })));
      }
    });
  }, [bridge.isAvailable]);

  // Navigate into a directory
  const navigateTo = useCallback((path: string) => nav.navigate(path), [nav]);

  // Open file or dir
  const open = useCallback(async (entity: FileEntity) => {
    if (entity.type === 'directory') {
      navigateTo(entity.path);
    } else {
      // Open with system default
      const platform = bridge.systemInfo?.platform;
      if (platform === 'win32') await bridge.exec(`Start-Process -FilePath "${entity.path}"`);
      else if (platform === 'darwin') await bridge.exec(`open "${entity.path}"`);
      else await bridge.exec(`xdg-open "${entity.path}"`);
    }
  }, [navigateTo, bridge]);

  // Preview a file
  const preview = useCallback(async (entity: FileEntity) => {
    setPreviewFile(entity);
    if (entity.type === 'file' && entity.size < 100 * 1024) {
      const mime = entity.mimeType ?? '';
      if (mime.startsWith('text/') || mime === 'application/json') {
        const result = await bridge.readFile(entity.path);
        setPreviewContent(result.success ? (result.content ?? null) : null);
        return;
      }
    }
    setPreviewContent(null);
  }, [bridge]);

  // Create folder
  const createFolder = useCallback(async (name: string) => {
    const fullPath = `${nav.currentPath}/${name}`;
    const result = await bridge.exec(`mkdir "${fullPath}"`);
    if (result.success) await loadDir(nav.currentPath);
    return result.success;
  }, [nav.currentPath, bridge, loadDir]);

  // Rename
  const rename = useCallback(async (oldPath: string, newName: string) => {
    const dir = oldPath.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
    const newPath = `${dir}/${newName}`;
    const platform = bridge.systemInfo?.platform;
    let cmd: string;
    if (platform === 'win32') {
      cmd = `Rename-Item -Path "${oldPath}" -NewName "${newName}"`;
    } else {
      cmd = `mv "${oldPath}" "${newPath}"`;
    }
    const result = await bridge.exec(cmd);
    if (result.success) await loadDir(nav.currentPath);
    return result.success;
  }, [bridge, nav.currentPath, loadDir]);

  // Delete
  const deleteSelected = useCallback(async () => {
    for (const id of selection.selected) {
      const file = files.find(f => f.id === id);
      if (!file) continue;
      await bridge.delete(file.path, { recursive: file.type === 'directory' });
    }
    await loadDir(nav.currentPath);
  }, [selection.selected, files, bridge, nav.currentPath, loadDir]);

  // Copy/Cut/Paste
  const copy = useCallback(() => {
    const paths = selection.selected.map(id => files.find(f => f.id === id)?.path).filter(Boolean) as string[];
    setClipboard({ paths, cut: false });
  }, [selection.selected, files]);

  const cut = useCallback(() => {
    const paths = selection.selected.map(id => files.find(f => f.id === id)?.path).filter(Boolean) as string[];
    setClipboard({ paths, cut: true });
  }, [selection.selected, files]);

  const paste = useCallback(async () => {
    if (!clipboard) return;
    const platform = bridge.systemInfo?.platform;
    for (const src of clipboard.paths) {
      const name = src.replace(/\\/g, '/').split('/').pop() ?? 'file';
      const dest = `${nav.currentPath}/${name}`;
      if (clipboard.cut) {
        if (platform === 'win32') await bridge.exec(`Move-Item -Path "${src}" -Destination "${dest}"`);
        else await bridge.exec(`mv "${src}" "${dest}"`);
      } else {
        if (platform === 'win32') await bridge.exec(`Copy-Item -Path "${src}" -Destination "${dest}" -Recurse`);
        else await bridge.exec(`cp -r "${src}" "${dest}"`);
      }
    }
    if (clipboard.cut) setClipboard(null);
    await loadDir(nav.currentPath);
  }, [clipboard, bridge, nav.currentPath, loadDir]);

  const refresh = useCallback(() => loadDir(nav.currentPath), [nav.currentPath, loadDir]);

  const setSort = useCallback((field: SortField) => {
    setSortField(prev => {
      if (prev === field) {
        setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
        return prev;
      }
      setSortOrder('asc');
      return field;
    });
  }, []);

  return {
    // State
    currentPath: nav.currentPath,
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
    clipboard,
    renaming,
    platform: bridge.systemInfo?.platform ?? 'linux',
    hostname: bridge.systemInfo?.hostname ?? 'localhost',

    // Navigation
    navigateTo,
    goBack: nav.goBack,
    goForward: nav.goForward,
    goUp: nav.goUp,
    canGoBack: nav.canGoBack,
    canGoForward: nav.canGoForward,

    // Selection
    ...selection,

    // File operations
    open,
    preview,
    createFolder,
    rename,
    deleteSelected,
    copy,
    cut,
    paste,
    refresh,

    // UI controls
    setViewMode,
    setSort,
    setShowHidden: () => setShowHidden(p => !p),
    setShowPreview: () => setShowPreview(p => !p),
    setSearchQuery,
    setRenaming,
  };
}
