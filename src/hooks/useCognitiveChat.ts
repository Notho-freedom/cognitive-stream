import { useState, useCallback, useRef, useEffect } from 'react';
import type { CognitiveUISchema, ActionPayload } from '@/components/cognitive/dynamic/types';
import type { CognitiveNotification, NotificationPriority } from '@/components/cognitive/NotificationQueue';
import { 
  parseSystemActions, 
  executeSystemAction, 
  formatActionResultForAI, 
  formatActionResult 
} from '@/lib/systemActions';
import { orchestrateAI, isElectronEnvironment } from '@/lib/ai';
import type { AIMessage, OrchestratorResult } from '@/lib/ai';
import generateUnifiedSystemPrompt from '@/lib/UNIFIED_SYSTEM_PROMPT';

// ═══════════════════════════════════════════════════════════════
// COGNITIVE CHAT HOOK WITH AI ORCHESTRATOR
// Utilise l'orchestrateur pour gérer les providers IA en cascade
// ═══════════════════════════════════════════════════════════════

type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'alert';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface SystemExecutionResult {
  action: string;
  success: boolean;
  output: string;
  data?: unknown;
}

interface CognitiveChatState {
  messages: Message[];
  schema: CognitiveUISchema | null;
  thought: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  isExecutingSystem: boolean;
  systemResults: SystemExecutionResult[];
  error: string | null;
  pendingAction: ActionPayload | null;
  aiProvider: string | null;
  aiModel: string | null;
  isLocalFallback: boolean;
  environmentMode: 'web' | 'electron';
  triedProviders: string[];
}

type NotificationPushFn = (notification: Omit<CognitiveNotification, 'id' | 'timestamp'>) => string;

export function useCognitiveChat(notificationPush?: NotificationPushFn) {
  const [environmentMode] = useState<'web' | 'electron'>(() => 
    isElectronEnvironment() ? 'electron' : 'web'
  );

  const [state, setState] = useState<CognitiveChatState>({
    messages: [],
    schema: null,
    thought: null,
    isLoading: false,
    isStreaming: false,
    isExecutingSystem: false,
    systemResults: [],
    error: null,
    pendingAction: null,
    aiProvider: null,
    aiModel: null,
    isLocalFallback: false,
    environmentMode,
    triedProviders: [],
  });

  const notifyRef = useRef(notificationPush);
  useEffect(() => {
    notifyRef.current = notificationPush;
  }, [notificationPush]);

  const notify = useCallback((
    message: string,
    type: NotificationType = 'info',
    priority: NotificationPriority = 'medium',
    options?: { action?: { label: string; onClick: () => void } }
  ) => {
    if (notifyRef.current) {
      const mappedPriority: NotificationPriority = 
        type === 'error' ? 'critical' :
        type === 'warning' ? 'high' :
        type === 'alert' ? 'high' :
        type === 'success' ? 'medium' :
        priority;
      
      notifyRef.current({
        message,
        priority: mappedPriority,
        dismissible: true,
        ...options,
      });
    }
  }, []);

  const generateSystemPrompt = useCallback(async () => {
    if (environmentMode === 'electron' && window.cognitiveBridge) {
      const systemInfo = await window.cognitiveBridge.getSystemInfo();
      return generateUnifiedSystemPrompt({
        canExecuteCommands: true,
        canReadFiles: true,
        canWriteFiles: true,
        canListDirectories: true,
        platform: systemInfo.platform,
        arch: systemInfo.arch,
        homedir: systemInfo.homedir,
      });
    } else {
      return generateUnifiedSystemPrompt({
        canExecuteCommands: false,
        canReadFiles: false,
        canWriteFiles: false,
        canListDirectories: false,
      });
    }
  }, [environmentMode]);

  const parseAndUpdateResponse = useCallback((fullContent: string, result: OrchestratorResult) => {
    let parsedResponse: { thought?: string; response?: { type: string; schema: CognitiveUISchema } } | null = null;
    
    try {
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      notify('Erreur lors de l\'analyse de la réponse', 'warning', 'medium');
    }

    return {
      thought: parsedResponse?.thought || null,
      schema: parsedResponse?.response?.schema || null,
      aiProvider: result.provider,
      aiModel: result.model,
      isLocalFallback: result.provider === 'ollama-local',
      triedProviders: result.triedProviders,
    };
  }, [notify]);

  /**
   * Exécute les commandes système et renvoie les résultats à l'IA
   */
  const executeSystemActionsWithFeedback = useCallback(async (
    aiResponse: string,
    allMessages: Message[]
  ): Promise<{
    hasSystemActions: boolean;
    systemResults: Array<{ action: string; success: boolean; output: string; data?: unknown }>;
    shouldRequestNewSchema: boolean;
  }> => {
    const systemActions = parseSystemActions(aiResponse);
    
    if (systemActions.length === 0) {
      return {
        hasSystemActions: false,
        systemResults: [],
        shouldRequestNewSchema: false,
      };
    }

    // Vérifier si on peut exécuter (Electron seulement)
    if (environmentMode !== 'electron' || !window.cognitiveBridge) {
      notify('Commandes système détectées mais non disponibles en mode web', 'warning', 'high');
      return {
        hasSystemActions: true,
        systemResults: [],
        shouldRequestNewSchema: false,
      };
    }

    setState(prev => ({ ...prev, isExecutingSystem: true }));
    notify('Exécution des commandes système...', 'alert', 'medium');
    
    const results: Array<{ action: string; success: boolean; output: string; data?: unknown }> = [];
    
    for (const sysAction of systemActions) {
      const result = await executeSystemAction(sysAction);
      const formattedForAI = formatActionResultForAI(result);
      
      results.push({
        action: sysAction.type,
        success: result.success,
        output: formatActionResult(result),
        data: formattedForAI.data,
      });
      
      if (!result.success) {
        notify(`Échec: ${sysAction.type}`, 'error', 'high');
      }
    }
    
    notify(`${results.length} commande(s) exécutée(s)`, 'success', 'medium');
    
    setState(prev => ({ ...prev, isExecutingSystem: false, systemResults: results }));
    
    return {
      hasSystemActions: true,
      systemResults: results,
      shouldRequestNewSchema: true,
    };
  }, [environmentMode, notify]);

  /**
   * Demande à l'IA de construire un schéma basé sur les résultats système
   */
  const requestSchemaFromResults = useCallback(async (
    systemResults: Array<{ action: string; success: boolean; output: string; data?: unknown }>,
    originalMessages: Message[],
    systemPrompt: string
  ): Promise<OrchestratorResult> => {
    const resultsMessage: Message = {
      role: 'user',
      content: `
SYSTEM COMMAND EXECUTION LOGS

IMPORTANT:
- Everything below is PLAIN TEXT.
- This is NOT JSON.
- Do NOT attempt to parse, fix, or reinterpret the content.
- Treat it strictly as execution logs.

==================== BEGIN LOGS ====================

${systemResults.map((r, i) => `
[COMMAND ${i + 1}]

ACTION:
${r.action}

STATUS:
${r.success ? 'SUCCESS' : 'FAILURE'}

OUTPUT:
${r.output && r.output.trim() ? r.output : '(no output)'}

DATA (STRINGIFIED TEXT, NOT JSON):
${JSON.stringify(r.data)}

`).join('\n----------------------------------------\n')}

==================== END LOGS ====================

TASK:

You have received system execution logs.
Design a UI SCHEMA that displays these results clearly and structurally.

REQUIREMENTS:
- Return ONLY a valid JSON object
- Use the standard UI schema format
- Do NOT include explanations
- Do NOT repeat the logs
- Choose appropriate UI components (cards, lists, tables, status indicators)
`,
    };

    const messagesWithResults: AIMessage[] = [
      ...originalMessages.map(m => ({ role: m.role, content: m.content })),
      { role: resultsMessage.role, content: resultsMessage.content },
    ];

    let fullContent = '';
    
    const result = await orchestrateAI(
      messagesWithResults,
      systemPrompt,
      (chunk) => {
        fullContent += chunk;
      },
      {
        enableLocalFallback: environmentMode === 'electron',
        onProviderChange: (provider, model) => {
          console.log(`[Schema] Using ${provider}/${model}`);
        },
      }
    );

    return {
      ...result,
      fullContent,
    };
  }, [environmentMode]);

  const sendMessage = useCallback(async (input: string, action?: ActionPayload) => {
    const systemPrompt = await generateSystemPrompt();
    
    let messageContent = input;
    
    if (action) {
      messageContent = JSON.stringify({
        text: input,
        action: {
          id: action.id,
          payload: action.payload,
        }
      });
    }
    
    const userMessage: Message = { role: 'user', content: messageContent };
    const allMessages = [...state.messages, userMessage];
    
    setState(prev => ({
      ...prev,
      messages: allMessages,
      isLoading: true,
      isStreaming: true,
      error: null,
      schema: null,
      thought: null,
      pendingAction: null,
      isLocalFallback: false,
      triedProviders: [],
    }));

    let fullContent = '';

    // === UTILISATION DE L'ORCHESTRATEUR ===
    const result = await orchestrateAI(
      allMessages.map(m => ({ role: m.role, content: m.content })),
      systemPrompt,
      (chunk) => {
        fullContent += chunk;
        // Mise à jour progressive du streaming
        setState(prev => ({
          ...prev,
          thought: fullContent.length < 200 ? fullContent : null,
        }));
      },
      {
        enableLocalFallback: environmentMode === 'electron',
        onProviderChange: (provider, model) => {
          notify(`Provider: ${provider} (${model})`, 'info', 'low');
          setState(prev => ({ 
            ...prev, 
            aiProvider: provider, 
            aiModel: model,
            isLocalFallback: provider === 'ollama-local',
          }));
        },
        onProviderError: (provider, error) => {
          console.warn(`[Orchestrator] ${provider} failed: ${error}`);
        },
      }
    );

    if (!result.success) {
      const errorMsg = result.error || 'Tous les providers IA indisponibles';
      notify(errorMsg, 'error', 'critical');
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        error: errorMsg,
        triedProviders: result.triedProviders,
      }));
      return;
    }

    const assistantMessage: Message = { role: 'assistant', content: result.fullContent };

    // === BOUCLE DE FEEDBACK - Exécuter les commandes système ===
    const feedbackResult = await executeSystemActionsWithFeedback(
      result.fullContent,
      [...allMessages, assistantMessage]
    );

    let finalSchema = null;
    let finalThought = null;

    if (feedbackResult.shouldRequestNewSchema && feedbackResult.systemResults.length > 0) {
      notify('Construction du schéma avec les résultats...', 'info', 'medium');
      
      const schemaResult = await requestSchemaFromResults(
        feedbackResult.systemResults,
        [...allMessages, assistantMessage],
        systemPrompt
      );
      
      const parsed = parseAndUpdateResponse(schemaResult.fullContent, schemaResult);
      finalSchema = parsed.schema;
      finalThought = parsed.thought;
      
      const schemaMessage: Message = { role: 'assistant', content: schemaResult.fullContent };
      
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, schemaMessage],
        thought: finalThought,
        schema: finalSchema,
        aiProvider: parsed.aiProvider,
        aiModel: parsed.aiModel,
        isLocalFallback: parsed.isLocalFallback,
        isLoading: false,
        isStreaming: false,
        systemResults: feedbackResult.systemResults,
        triedProviders: parsed.triedProviders,
      }));
    } else {
      const parsed = parseAndUpdateResponse(result.fullContent, result);
      
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        thought: parsed.thought,
        schema: parsed.schema,
        aiProvider: parsed.aiProvider,
        aiModel: parsed.aiModel,
        isLocalFallback: parsed.isLocalFallback,
        isLoading: false,
        isStreaming: false,
        systemResults: feedbackResult.systemResults,
        triedProviders: parsed.triedProviders,
      }));
    }
  }, [
    state.messages, 
    notify, 
    parseAndUpdateResponse, 
    generateSystemPrompt, 
    environmentMode,
    executeSystemActionsWithFeedback,
    requestSchemaFromResults
  ]);

  const handleAction = useCallback((action: ActionPayload) => {
    console.log('Action received:', action);
    
    const actionType = action.payload.actionType as string;
    const formData = action.payload.formData as Record<string, unknown> | undefined;
    
    if (formData && Object.keys(formData).length > 0) {
      console.log('Form data collected:', formData);
    }
    
    if (actionType === 'button-click' || actionType === 'form-submit') {
      let actionMessage = `Action: ${action.id}`;
      if (formData && Object.keys(formData).length > 0) {
        actionMessage += ` avec données: ${JSON.stringify(formData)}`;
      }
      sendMessage(actionMessage, action);
      return;
    }
    
    if (actionType === 'input-submit') {
      const actionMessage = `Soumission: ${action.id} - ${JSON.stringify(action.payload)}`;
      sendMessage(actionMessage, action);
      return;
    }
    
    if (actionType === 'timer-complete') {
      notify('Timer terminé!', 'alert', 'high', {
        action: {
          label: 'Redémarrer',
          onClick: () => sendMessage(`Redémarrer le timer ${action.id}`, action),
        },
      });
      return;
    }
    
    if (actionType === 'table-row-select') {
      sendMessage(`Sélection table: ligne ${action.payload.rowIndex}`, action);
      return;
    }
    
    if (actionType === 'alert-action') {
      const alertVariant = action.payload.variant as string || 'info';
      const alertMessage = action.payload.message as string || 'Alerte';
      const notifPriority: NotificationPriority = 
        alertVariant === 'error' ? 'critical' :
        alertVariant === 'warning' ? 'high' :
        alertVariant === 'success' ? 'medium' : 'high';
      
      notify(alertMessage, 'alert', notifPriority);
      sendMessage(`Action alerte: ${action.id}`, action);
      return;
    }
    
    if (actionType === 'list-select' || actionType === 'input-change') {
      setState(prev => ({
        ...prev,
        pendingAction: action,
      }));
    } else {
      const actionMessage = `Action: ${action.id} - ${JSON.stringify(action.payload)}`;
      sendMessage(actionMessage, action);
    }
  }, [sendMessage, notify]);

  const confirmAction = useCallback((customMessage?: string) => {
    if (!state.pendingAction) return;
    
    const message = customMessage || `Action: ${state.pendingAction.id}`;
    sendMessage(message, state.pendingAction);
  }, [state.pendingAction, sendMessage]);

  const reset = useCallback(() => {
    setState({
      messages: [],
      schema: null,
      thought: null,
      isLoading: false,
      isStreaming: false,
      isExecutingSystem: false,
      systemResults: [],
      error: null,
      pendingAction: null,
      aiProvider: null,
      aiModel: null,
      isLocalFallback: false,
      environmentMode,
      triedProviders: [],
    });
  }, [environmentMode]);

  return {
    ...state,
    sendMessage,
    handleAction,
    confirmAction,
    reset,
    pushAlert: notify,
  };
}
