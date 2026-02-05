// ═══════════════════════════════════════════════════════════════
// FILESYSTEM AGENT
// Agent spécialisé pour les opérations fichiers (Electron only)
// ═══════════════════════════════════════════════════════════════

import type { Agent, AgentResult, CognitiveTask } from '../types';

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

interface FSParams {
  action?: 'read' | 'write' | 'list' | 'exists' | 'delete' | 'search'; // Optional - prefer task.action
  path: string;
  content?: string;
  options?: {
    recursive?: boolean;
    showHidden?: boolean;
    pattern?: string;
  };
}

interface FSResult {
  action: string;
  path: string;
  success: boolean;
  data?: {
    content?: string;
    items?: Array<{
      name: string;
      path: string;
      isDirectory: boolean;
      isFile: boolean;
      size: number;
    }>;
    exists?: boolean;
    bytesWritten?: number;
    matches?: string[];
  };
  error?: string;
}

// ──────────────────────────────────────────────────────────────
// AGENT IMPLEMENTATION
// ──────────────────────────────────────────────────────────────

export class FileSystemAgent implements Agent<FSParams, FSResult> {
  name = 'filesystem' as const;
  description = 'Agent pour opérations fichiers système';

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && !!window.cognitiveBridge?.isElectron;
  }

  async execute(task: CognitiveTask<FSParams, FSResult>): Promise<AgentResult<FSResult>> {
    const startTime = Date.now();
    const { path, content, options } = task.params;
    
    // UNIFIED ACTION CONTRACT: use task.action first, fallback to params.action for legacy
    const action = (task.action as FSParams['action']) || task.params.action;
    
    if (!action) {
      return {
        success: false,
        error: 'No action specified for FileSystemAgent',
        duration: Date.now() - startTime,
      };
    }
    
    // Log legacy usage for debugging
    if (task.params.action && !task.action) {
      console.warn('[FileSystemAgent] Legacy action format used (params.action). Migrate to task.action.');
    }

    if (!window.cognitiveBridge) {
      return {
        success: false,
        error: 'System bridge not available (requires Electron)',
        duration: Date.now() - startTime,
      };
    }

    try {
      let result: FSResult;

      switch (action) {
        case 'read': {
          const readResult = await window.cognitiveBridge.readFile(path);
          result = {
            action: 'read',
            path,
            success: readResult.success,
            data: readResult.success ? { content: readResult.content } : undefined,
            error: readResult.error,
          };
          break;
        }

        case 'write': {
          if (!content) {
            return {
              success: false,
              error: 'Content required for write action',
              duration: Date.now() - startTime,
            };
          }
          const writeResult = await window.cognitiveBridge.writeFile(path, content);
          result = {
            action: 'write',
            path,
            success: writeResult.success,
            data: writeResult.success ? { bytesWritten: writeResult.bytesWritten } : undefined,
            error: writeResult.error,
          };
          break;
        }

        case 'list': {
          const listResult = await window.cognitiveBridge.listDir(path, {
            showHidden: options?.showHidden,
          });
          result = {
            action: 'list',
            path,
            success: listResult.success,
            data: listResult.success ? {
              items: listResult.items?.map(item => ({
                name: item.name,
                path: item.path,
                isDirectory: item.isDirectory,
                isFile: item.isFile,
                size: item.size,
              })),
            } : undefined,
            error: listResult.error,
          };
          break;
        }

        case 'exists': {
          const existsResult = await window.cognitiveBridge.exists(path);
          result = {
            action: 'exists',
            path,
            success: true,
            data: { exists: existsResult.exists },
          };
          break;
        }

        case 'delete': {
          const deleteResult = await window.cognitiveBridge.delete(path, {
            recursive: options?.recursive,
          });
          result = {
            action: 'delete',
            path,
            success: deleteResult.success,
            error: deleteResult.error,
          };
          break;
        }

        case 'search': {
          // Search implementation via grep ou scan
          if (!options?.pattern) {
            return {
              success: false,
              error: 'Pattern required for search action',
              duration: Date.now() - startTime,
            };
          }
          
          // Utiliser grep via exec
          const grepResult = await window.cognitiveBridge.exec(
            `grep -r "${options.pattern}" "${path}" 2>/dev/null | head -50`
          );
          
          result = {
            action: 'search',
            path,
            success: grepResult.success,
            data: {
              matches: grepResult.stdout.split('\n').filter(line => line.trim()),
            },
            error: grepResult.stderr || undefined,
          };
          break;
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
            duration: Date.now() - startTime,
          };
      }

      return {
        success: result.success,
        data: result,
        duration: Date.now() - startTime,
        metadata: { action, path },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }
}

// Export factory
export function createFileSystemAgent(): Agent<FSParams, FSResult> {
  return new FileSystemAgent();
}
