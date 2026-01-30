import { useCallback, useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════
// SYSTEM BRIDGE HOOK
// Interface React pour interagir avec le système via Electron
// ═══════════════════════════════════════════════════════════════

interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  command?: string;
}

interface SpawnResult extends ExecResult {
  pid?: number;
}

interface FileReadResult {
  success: boolean;
  content?: string;
  path: string;
  size?: number;
  modified?: Date;
  error?: string;
}

interface FileWriteResult {
  success: boolean;
  path: string;
  bytesWritten?: number;
  error?: string;
}

interface DirListResult {
  success: boolean;
  path: string;
  items?: DirItem[];
  error?: string;
}

interface DirItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  modified: Date | null;
}

interface SystemInfo {
  platform: string;
  arch: string;
  hostname: string;
  username: string;
  homedir: string;
  tmpdir: string;
  cpus: number;
  memory: {
    total: number;
    free: number;
  };
  uptime: number;
}

interface OutputEvent {
  type: 'stdout' | 'stderr';
  data: string;
  pid?: number;
}

interface CognitiveBridge {
  exec: (command: string, options?: { cwd?: string; timeout?: number }) => Promise<ExecResult>;
  spawn: (command: string, args?: string[], options?: { cwd?: string }) => Promise<SpawnResult>;
  onOutput: (callback: (event: OutputEvent) => void) => () => void;
  readFile: (path: string) => Promise<FileReadResult>;
  writeFile: (path: string, content: string) => Promise<FileWriteResult>;
  listDir: (path: string, options?: { showHidden?: boolean }) => Promise<DirListResult>;
  exists: (path: string) => Promise<{ exists: boolean; path: string }>;
  delete: (path: string, options?: { recursive?: boolean }) => Promise<{ success: boolean; path: string; error?: string }>;
  getSystemInfo: () => Promise<SystemInfo>;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isElectron: boolean;
}

declare global {
  interface Window {
    cognitiveBridge?: CognitiveBridge;
  }
}

export function useSystemBridge() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [outputBuffer, setOutputBuffer] = useState<OutputEvent[]>([]);

  // Check if bridge is available
  useEffect(() => {
    const available = !!window.cognitiveBridge?.isElectron;
    setIsAvailable(available);
    
    if (available) {
      // Get system info on mount
      window.cognitiveBridge?.getSystemInfo().then(setSystemInfo);
      
      // Subscribe to output stream
      const unsubscribe = window.cognitiveBridge?.onOutput((event) => {
        setOutputBuffer(prev => [...prev.slice(-100), event]); // Keep last 100
      });
      
      return unsubscribe;
    }
  }, []);

  // Execute command
  const exec = useCallback(async (command: string, options?: { cwd?: string; timeout?: number }): Promise<ExecResult> => {
    if (!window.cognitiveBridge) {
      return {
        success: false,
        stdout: '',
        stderr: 'System bridge not available. Running in browser mode.',
        exitCode: -1,
        duration: 0,
        command,
      };
    }
    return window.cognitiveBridge.exec(command, options);
  }, []);

  // Spawn process
  const spawn = useCallback(async (command: string, args?: string[], options?: { cwd?: string }): Promise<SpawnResult> => {
    if (!window.cognitiveBridge) {
      return {
        success: false,
        stdout: '',
        stderr: 'System bridge not available. Running in browser mode.',
        exitCode: -1,
        duration: 0,
      };
    }
    return window.cognitiveBridge.spawn(command, args, options);
  }, []);

  // Read file
  const readFile = useCallback(async (path: string): Promise<FileReadResult> => {
    if (!window.cognitiveBridge) {
      return {
        success: false,
        path,
        error: 'System bridge not available. Running in browser mode.',
      };
    }
    return window.cognitiveBridge.readFile(path);
  }, []);

  // Write file
  const writeFile = useCallback(async (path: string, content: string): Promise<FileWriteResult> => {
    if (!window.cognitiveBridge) {
      return {
        success: false,
        path,
        error: 'System bridge not available. Running in browser mode.',
      };
    }
    return window.cognitiveBridge.writeFile(path, content);
  }, []);

  // List directory
  const listDir = useCallback(async (path: string, options?: { showHidden?: boolean }): Promise<DirListResult> => {
    if (!window.cognitiveBridge) {
      return {
        success: false,
        path,
        error: 'System bridge not available. Running in browser mode.',
      };
    }
    return window.cognitiveBridge.listDir(path, options);
  }, []);

  // Check existence
  const exists = useCallback(async (path: string): Promise<{ exists: boolean; path: string }> => {
    if (!window.cognitiveBridge) {
      return { exists: false, path };
    }
    return window.cognitiveBridge.exists(path);
  }, []);

  // Delete file/directory
  const deleteItem = useCallback(async (path: string, options?: { recursive?: boolean }) => {
    if (!window.cognitiveBridge) {
      return {
        success: false,
        path,
        error: 'System bridge not available. Running in browser mode.',
      };
    }
    return window.cognitiveBridge.delete(path, options);
  }, []);

  // Window controls
  const windowControls = {
    minimize: () => window.cognitiveBridge?.minimize(),
    maximize: () => window.cognitiveBridge?.maximize(),
    close: () => window.cognitiveBridge?.close(),
  };

  // Clear output buffer
  const clearOutput = useCallback(() => {
    setOutputBuffer([]);
  }, []);

  return {
    isAvailable,
    systemInfo,
    outputBuffer,
    clearOutput,
    
    // Commands
    exec,
    spawn,
    
    // File system
    readFile,
    writeFile,
    listDir,
    exists,
    delete: deleteItem,
    
    // Window
    window: windowControls,
  };
}

export type { ExecResult, SpawnResult, FileReadResult, FileWriteResult, DirListResult, DirItem, SystemInfo, OutputEvent };
