// ═══════════════════════════════════════════════════════════════
// INTELLIGENT SYSTEM FEEDBACK LOOP
// Permet à l'IA de recevoir les résultats des commandes système
// et de construire un schéma adapté au résultat
// ═══════════════════════════════════════════════════════════════

export interface SystemAction {
  type: 'exec' | 'spawn' | 'read' | 'write' | 'list' | 'delete' | 'exists';
  payload: Record<string, unknown>;
}

export interface SystemActionResult {
  success: boolean;
  action: SystemAction;
  result: unknown;
  duration: number;
  timestamp: number;
}

/**
 * Parse une demande utilisateur pour extraire les actions système
 * Format: ```system:exec\n<command>\n```
 */
export function parseSystemActions(text: string): SystemAction[] {
  const actions: SystemAction[] = [];
  
  const patterns = [
    { regex: /```system:exec\n([\s\S]*?)```/g, type: 'exec' as const },
    { regex: /```system:read\n([\s\S]*?)```/g, type: 'read' as const },
    { regex: /```system:write:([^\n]+)\n([\s\S]*?)```/g, type: 'write' as const },
    { regex: /```system:list\n([\s\S]*?)```/g, type: 'list' as const },
  ];
  
  for (const { regex, type } of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (type === 'write') {
        actions.push({
          type,
          payload: {
            path: match[1].trim(),
            content: match[2],
          },
        });
      } else if (type === 'exec') {
        actions.push({
          type,
          payload: {
            command: match[1].trim(),
          },
        });
      } else if (type === 'read' || type === 'list') {
        actions.push({
          type,
          payload: {
            path: match[1].trim(),
          },
        });
      }
    }
  }
  
  return actions;
}

/**
 * Exécute une action système via le bridge Electron
 */
export async function executeSystemAction(action: SystemAction): Promise<SystemActionResult> {
  const startTime = Date.now();
  
  if (!window.cognitiveBridge) {
    return {
      success: false,
      action,
      result: { error: 'System bridge not available' },
      duration: 0,
      timestamp: startTime,
    };
  }
  
  try {
    let result: unknown;
    
    switch (action.type) {
      case 'exec':
        result = await window.cognitiveBridge.exec(action.payload.command as string);
        break;
        
      case 'spawn':
        result = await window.cognitiveBridge.spawn(
          action.payload.command as string,
          action.payload.args as string[] | undefined
        );
        break;
        
      case 'read':
        result = await window.cognitiveBridge.readFile(action.payload.path as string);
        break;
        
      case 'write':
        result = await window.cognitiveBridge.writeFile(
          action.payload.path as string,
          action.payload.content as string
        );
        break;
        
      case 'list':
        result = await window.cognitiveBridge.listDir(
          action.payload.path as string,
          action.payload.options as { showHidden?: boolean } | undefined
        );
        break;
        
      case 'delete':
        result = await window.cognitiveBridge.delete(
          action.payload.path as string,
          action.payload.options as { recursive?: boolean } | undefined
        );
        break;
        
      case 'exists':
        result = await window.cognitiveBridge.exists(action.payload.path as string);
        break;
        
      default:
        result = { error: `Unknown action type: ${action.type}` };
    }
    
    const typedResult = result as { success?: boolean };
    
    return {
      success: typedResult.success !== false,
      action,
      result,
      duration: Date.now() - startTime,
      timestamp: startTime,
    };
  } catch (error) {
    return {
      success: false,
      action,
      result: { error: error instanceof Error ? error.message : 'Unknown error' },
      duration: Date.now() - startTime,
      timestamp: startTime,
    };
  }
}

/**
 * Formate le résultat d'une action de manière structurée pour l'IA
 * NOUVEAU: Retourne un objet JSON que l'IA peut parser facilement
 */
export function formatActionResultForAI(result: SystemActionResult): {
  type: string;
  success: boolean;
  data: unknown;
  summary: string;
} {
  const { action, success, duration } = result;
  
  switch (action.type) {
    case 'exec':
    case 'spawn': {
      const execResult = result.result as { 
        stdout?: string; 
        stderr?: string; 
        exitCode?: number 
      };
      return {
        type: 'command_execution',
        success,
        data: {
          command: action.payload.command,
          stdout: execResult.stdout || '',
          stderr: execResult.stderr || '',
          exitCode: execResult.exitCode || 0,
          duration,
        },
        summary: `Command "${action.payload.command}" ${success ? 'executed successfully' : 'failed'} (exit: ${execResult.exitCode || 0})`,
      };
    }
    
    case 'read': {
      const readResult = result.result as { 
        content?: string; 
        size?: number;
        path?: string;
      };
      return {
        type: 'file_read',
        success,
        data: {
          path: action.payload.path,
          content: readResult.content || '',
          size: readResult.size || 0,
          duration,
        },
        summary: `File "${action.payload.path}" ${success ? `read successfully (${readResult.size} bytes)` : 'failed to read'}`,
      };
    }
    
    case 'write': {
      const writeResult = result.result as { 
        bytesWritten?: number;
        path?: string;
      };
      return {
        type: 'file_write',
        success,
        data: {
          path: action.payload.path,
          bytesWritten: writeResult.bytesWritten || 0,
          duration,
        },
        summary: `File "${action.payload.path}" ${success ? `written successfully (${writeResult.bytesWritten} bytes)` : 'failed to write'}`,
      };
    }
    
    case 'list': {
      const listResult = result.result as { 
        items?: Array<{
          name: string;
          isDirectory: boolean;
          isFile: boolean;
          size: number;
        }>;
        path?: string;
      };
      return {
        type: 'directory_list',
        success,
        data: {
          path: action.payload.path,
          items: listResult.items || [],
          count: listResult.items?.length || 0,
          duration,
        },
        summary: `Directory "${action.payload.path}" ${success ? `listed successfully (${listResult.items?.length || 0} items)` : 'failed to list'}`,
      };
    }
    
    default:
      return {
        type: 'unknown',
        success,
        data: result.result,
        summary: `Action completed in ${duration}ms`,
      };
  }
}

/**
 * Formate le résultat pour affichage humain (fallback)
 */
export function formatActionResult(result: SystemActionResult): string {
  const formatted = formatActionResultForAI(result);
  return formatted.summary;
}