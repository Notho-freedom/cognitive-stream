// ═══════════════════════════════════════════════════════════════
// SYSTEM AGENT
// Agent pour exécution de commandes système (Electron only)
// ═══════════════════════════════════════════════════════════════

import type { Agent, AgentResult, CognitiveTask } from '../types';

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

interface SystemParams {
  action?: 'exec' | 'spawn' | 'info'; // Optional - prefer task.action
  command?: string;
  args?: string[];
  options?: {
    cwd?: string;
    timeout?: number;
  };
}

interface SystemResult {
  action: string;
  success: boolean;
  data?: {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    pid?: number;
    systemInfo?: {
      platform: string;
      arch: string;
      hostname: string;
      username: string;
      homedir: string;
      cpus: number;
      memory: { total: number; free: number };
      uptime: number;
    };
  };
  error?: string;
}

// ──────────────────────────────────────────────────────────────
// AGENT IMPLEMENTATION
// ──────────────────────────────────────────────────────────────

export class SystemAgent implements Agent<SystemParams, SystemResult> {
  name = 'system' as const;
  description = 'Agent pour commandes système shell';

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && !!window.cognitiveBridge?.isElectron;
  }

  async execute(task: CognitiveTask<SystemParams, SystemResult>): Promise<AgentResult<SystemResult>> {
    const startTime = Date.now();
    const { command, args, options } = task.params;
    
    // UNIFIED ACTION CONTRACT: use task.action first, fallback to params.action for legacy
    const action = (task.action as SystemParams['action']) || task.params.action;
    
    if (!action) {
      return {
        success: false,
        error: 'No action specified for SystemAgent',
        duration: Date.now() - startTime,
      };
    }
    
    // Log legacy usage for debugging
    if (task.params.action && !task.action) {
      console.warn('[SystemAgent] Legacy action format used (params.action). Migrate to task.action.');
    }

    if (!window.cognitiveBridge) {
      return {
        success: false,
        error: 'System bridge not available (requires Electron)',
        duration: Date.now() - startTime,
      };
    }

    try {
      let result: SystemResult;

      switch (action) {
        case 'exec': {
          if (!command) {
            return {
              success: false,
              error: 'Command required for exec action',
              duration: Date.now() - startTime,
            };
          }
          
          const execResult = await window.cognitiveBridge.exec(command, {
            cwd: options?.cwd,
            timeout: options?.timeout,
          });
          
          result = {
            action: 'exec',
            success: execResult.success,
            data: {
              stdout: execResult.stdout,
              stderr: execResult.stderr,
              exitCode: execResult.exitCode,
            },
            error: execResult.success ? undefined : execResult.stderr,
          };
          break;
        }

        case 'spawn': {
          if (!command) {
            return {
              success: false,
              error: 'Command required for spawn action',
              duration: Date.now() - startTime,
            };
          }
          
          const spawnResult = await window.cognitiveBridge.spawn(command, args, {
            cwd: options?.cwd,
          });
          
          result = {
            action: 'spawn',
            success: spawnResult.success,
            data: {
              stdout: spawnResult.stdout,
              stderr: spawnResult.stderr,
              exitCode: spawnResult.exitCode,
              pid: spawnResult.pid,
            },
            error: spawnResult.success ? undefined : spawnResult.stderr,
          };
          break;
        }

        case 'info': {
          const sysInfo = await window.cognitiveBridge.getSystemInfo();
          result = {
            action: 'info',
            success: true,
            data: {
              systemInfo: {
                platform: sysInfo.platform,
                arch: sysInfo.arch,
                hostname: sysInfo.hostname,
                username: sysInfo.username,
                homedir: sysInfo.homedir,
                cpus: sysInfo.cpus,
                memory: sysInfo.memory,
                uptime: sysInfo.uptime,
              },
            },
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
        metadata: { action, command },
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
export function createSystemAgent(): Agent<SystemParams, SystemResult> {
  return new SystemAgent();
}
