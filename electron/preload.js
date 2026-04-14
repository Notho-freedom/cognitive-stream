const { contextBridge, ipcRenderer } = require('electron');

// ═══════════════════════════════════════════════════════════════
// COGNITIVE SYSTEM BRIDGE
// Expose system capabilities to the renderer process
// ═══════════════════════════════════════════════════════════════

contextBridge.exposeInMainWorld('cognitiveBridge', {
  // ─────────────────────────────────────────────────────────────
  // Command Execution
  // ─────────────────────────────────────────────────────────────
  exec: (command, options) => ipcRenderer.invoke('system:exec', command, options),
  spawn: (command, args, options) => ipcRenderer.invoke('system:spawn', command, args, options),
  onOutput: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('system:output', handler);
    return () => ipcRenderer.removeListener('system:output', handler);
  },

  // ─────────────────────────────────────────────────────────────
  // File System Operations
  // ─────────────────────────────────────────────────────────────
  readFile: (path) => ipcRenderer.invoke('fs:read', path),
  writeFile: (path, content) => ipcRenderer.invoke('fs:write', path, content),
  listDir: (path, options) => ipcRenderer.invoke('fs:list', path, options),
  exists: (path) => ipcRenderer.invoke('fs:exists', path),
  delete: (path, options) => ipcRenderer.invoke('fs:delete', path, options),
  rename: (oldPath, newPath) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
  mkdir: (path) => ipcRenderer.invoke('fs:mkdir', path),
  stat: (path) => ipcRenderer.invoke('fs:stat', path),
  copy: (src, dest) => ipcRenderer.invoke('fs:copy', src, dest),
  move: (src, dest) => ipcRenderer.invoke('fs:move', src, dest),
  search: (dir, query, options) => ipcRenderer.invoke('fs:search', dir, query, options),
  getDrives: () => ipcRenderer.invoke('fs:drives'),
  invalidateExplorerDirCache: (dirPath) => ipcRenderer.invoke('explorer:invalidate-dir-cache', dirPath),
  watchDir: (dirPath, callback) => {
    let watchedPath = dirPath;
    const watchRequest = ipcRenderer.invoke('fs:watch-dir', dirPath).then((result) => {
      if (result?.success && result.path) {
        watchedPath = result.path;
      }
      return result;
    });
    const handler = (event, payload) => {
      if (payload?.path === watchedPath) {
        callback(payload);
      }
    };
    ipcRenderer.on('fs:watch-event', handler);
    return async () => {
      ipcRenderer.removeListener('fs:watch-event', handler);
      const result = await watchRequest.catch(() => ({ path: watchedPath }));
      await ipcRenderer.invoke('fs:unwatch-dir', result?.path || watchedPath);
    };
  },

  // ─────────────────────────────────────────────────────────────
  // System Information
  // ─────────────────────────────────────────────────────────────
  getSystemInfo: () => ipcRenderer.invoke('system:info'),
  getSystemMetrics: () => ipcRenderer.invoke('system:metrics'),
  getFileIcon: (path) => ipcRenderer.invoke('system:icon', path),
  getFileIcons: (entries) => ipcRenderer.invoke('system:icons', entries),
  resolveShortcut: (path) => ipcRenderer.invoke('system:shortcut', path),
  getExplorerSettings: () => ipcRenderer.invoke('explorer:get-settings'),
  setExplorerSettings: (settings) => ipcRenderer.invoke('explorer:set-settings', settings),
  getNetworkMounts: () => ipcRenderer.invoke('system:network-mounts'),
  getListeningServices: () => ipcRenderer.invoke('system:listening-services'),
  notifyExplorerReady: () => ipcRenderer.send('explorer:renderer-ready'),
  onExplorerOpenRequest: (callback) => {
    const handler = (event, payload) => callback(payload);
    ipcRenderer.on('explorer:open-request', handler);
    return () => ipcRenderer.removeListener('explorer:open-request', handler);
  },

  // ─────────────────────────────────────────────────────────────
  // Window Controls
  // ─────────────────────────────────────────────────────────────
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // ─────────────────────────────────────────────────────────────
  // Widget Desktop Mode - Click-through passthrough
  // ─────────────────────────────────────────────────────────────
  widgetMouseEnter: () => ipcRenderer.send('widget:mouse-enter'),
  widgetMouseLeave: () => ipcRenderer.send('widget:mouse-leave'),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('widget:set-always-on-top', value),

  // ─────────────────────────────────────────────────────────────
  // Environment Detection
  // ─────────────────────────────────────────────────────────────
  isElectron: true,
});

console.log('[CognitiveBridge] System bridge initialized — Widget mode enabled');
