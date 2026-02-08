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

  // ─────────────────────────────────────────────────────────────
  // System Information
  // ─────────────────────────────────────────────────────────────
  getSystemInfo: () => ipcRenderer.invoke('system:info'),
  getSystemMetrics: () => ipcRenderer.invoke('system:metrics'),
  getFileIcon: (path) => ipcRenderer.invoke('system:icon', path),
  resolveShortcut: (path) => ipcRenderer.invoke('system:shortcut', path),

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
