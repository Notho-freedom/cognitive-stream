const { contextBridge, ipcRenderer } = require('electron');

// ═══════════════════════════════════════════════════════════════
// COGNITIVE SYSTEM BRIDGE
// Expose system capabilities to the renderer process
// ═══════════════════════════════════════════════════════════════

contextBridge.exposeInMainWorld('cognitiveBridge', {
  // ─────────────────────────────────────────────────────────────
  // Command Execution
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Execute a shell command and wait for completion
   * @param {string} command - The command to execute
   * @param {object} options - { cwd, timeout }
   * @returns {Promise<{ success, stdout, stderr, exitCode, duration }>}
   */
  exec: (command, options) => ipcRenderer.invoke('system:exec', command, options),
  
  /**
   * Spawn a long-running process with streaming output
   * @param {string} command - The command to spawn
   * @param {string[]} args - Command arguments
   * @param {object} options - { cwd }
   * @returns {Promise<{ success, stdout, stderr, exitCode, duration, pid }>}
   */
  spawn: (command, args, options) => ipcRenderer.invoke('system:spawn', command, args, options),
  
  /**
   * Subscribe to streaming output from spawned processes
   * @param {function} callback - Called with { type: 'stdout'|'stderr', data, pid }
   */
  onOutput: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('system:output', handler);
    return () => ipcRenderer.removeListener('system:output', handler);
  },

  // ─────────────────────────────────────────────────────────────
  // File System Operations
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Read file contents
   * @param {string} path - File path (supports ~ for home directory)
   * @returns {Promise<{ success, content, path, size, modified } | { success: false, error }>}
   */
  readFile: (path) => ipcRenderer.invoke('fs:read', path),
  
  /**
   * Write content to file
   * @param {string} path - File path
   * @param {string} content - Content to write
   * @returns {Promise<{ success, path, bytesWritten } | { success: false, error }>}
   */
  writeFile: (path, content) => ipcRenderer.invoke('fs:write', path, content),
  
  /**
   * List directory contents
   * @param {string} path - Directory path
   * @param {object} options - { showHidden }
   * @returns {Promise<{ success, path, items } | { success: false, error }>}
   */
  listDir: (path, options) => ipcRenderer.invoke('fs:list', path, options),
  
  /**
   * Check if path exists
   * @param {string} path - Path to check
   * @returns {Promise<{ exists, path }>}
   */
  exists: (path) => ipcRenderer.invoke('fs:exists', path),
  
  /**
   * Delete file or directory
   * @param {string} path - Path to delete
   * @param {object} options - { recursive }
   * @returns {Promise<{ success, path } | { success: false, error }>}
   */
  delete: (path, options) => ipcRenderer.invoke('fs:delete', path, options),

  // ─────────────────────────────────────────────────────────────
  // System Information
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Get system information
   * @returns {Promise<{ platform, arch, hostname, username, homedir, cpus, memory, uptime }>}
   */
  getSystemInfo: () => ipcRenderer.invoke('system:info'),

  // ─────────────────────────────────────────────────────────────
  // Window Controls
  // ─────────────────────────────────────────────────────────────
  
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // ─────────────────────────────────────────────────────────────
  // Environment Detection
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Check if running in Electron
   */
  isElectron: true,
});

console.log('[CognitiveBridge] System bridge initialized');
