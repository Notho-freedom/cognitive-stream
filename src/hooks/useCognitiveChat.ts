import { useState, useCallback, useRef, useEffect } from 'react';
import type { CognitiveUISchema, ActionPayload } from '@/components/cognitive/dynamic/types';
import type { CognitiveNotification, NotificationPriority } from '@/components/cognitive/NotificationQueue';
import { 
  parseSystemActions, 
  executeSystemAction, 
  formatActionResultForAI, 
  formatActionResult 
} from '@/lib/systemActions';
import { 
  isElectronEnvironment, 
  isOllamaAvailable, 
  callOllamaLocal, 
  getSystemContext 
} from '@/lib/ollamaLocal';
import generateUnifiedSystemPrompt from '@/lib/UNIFIED_SYSTEM_PROMPT';

// ═══════════════════════════════════════════════════════════════
// COGNITIVE CHAT HOOK WITH INTELLIGENT FEEDBACK LOOP
// L'IA reçoit les résultats des commandes et adapte son schéma
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
  isLocalFallback: boolean;
  environmentMode: 'web' | 'electron';
}

type NotificationPushFn = (notification: Omit<CognitiveNotification, 'id' | 'timestamp'>) => string;

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

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
    isLocalFallback: false,
    environmentMode,
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

  const parseAndUpdateResponse = useCallback((fullContent: string, provider: string, isLocal: boolean) => {
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
      aiProvider: provider,
      isLocalFallback: isLocal,
    };
  }, [notify]);

  const tryLocalOllama = useCallback(async (
    allMessages: Message[]
  ): Promise<{ success: boolean; fullContent: string; error?: string }> => {
    if (!isElectronEnvironment()) {
      return { success: false, fullContent: '', error: 'Not in Electron' };
    }

    const ollamaReady = await isOllamaAvailable();
    if (!ollamaReady) {
      return { success: false, fullContent: '', error: 'Ollama not available' };
    }

    notify('Fallback vers IA locale (Ollama)...', 'info', 'medium');
    
    const systemContext = await getSystemContext();
    
    let fullContent = '';
    const result = await callOllamaLocal(
      allMessages.map(m => ({ ...m, role: m.role as 'user' | 'assistant' })),
      (chunk) => {
        fullContent += chunk;
      },
      systemContext
    );

    if (result.success) {
      notify(`IA locale: ${result.model}`, 'success', 'low');
    }

    return {
      success: result.success,
      fullContent: result.fullResponse,
      error: result.error,
    };
  }, [notify]);

  /**
   * NOUVEAU: Fonction pour exécuter les commandes système et renvoyer
   * les résultats à l'IA pour qu'elle construise un schéma adapté
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
    
    // Exécuter chaque commande et collecter les résultats structurés
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
    
    // Les commandes ont été exécutées, on doit redemander à l'IA
    // de construire un schéma basé sur les résultats
    return {
      hasSystemActions: true,
      systemResults: results,
      shouldRequestNewSchema: true,
    };
  }, [environmentMode, notify]);

  /**
   * NOUVEAU: Demande à l'IA de construire un schéma basé sur les résultats système
   */
  const requestSchemaFromResults = useCallback(async (
    systemResults: Array<{ action: string; success: boolean; output: string; data?: unknown }>,
    originalMessages: Message[],
    systemPrompt: string
  ): Promise<string> => {
    // Construire un message système avec les résultats
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


    const messagesWithResults = [...originalMessages, resultsMessage];
    
    let fullContent = '';
    let aiProvider: string | null = null;
    
    try {
      // Appeler l'IA avec les résultats
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: messagesWithResults,
          systemPrompt,
        }),
      });

      aiProvider = response.headers.get('X-AI-Provider') || null;

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                fullContent += content;
              }
            } catch {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to request schema from results:', error);
    }
    
    return fullContent;
  }, []);

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
    }));

    let fullContent = '';
    let aiProvider: string | null = null;
    let isLocalFallback = false;
    let cloudFailed = false;

    try {
      // === ÉTAPE 1: Première requête à l'IA ===
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          systemPrompt,
        }),
      });

      aiProvider = response.headers.get('X-AI-Provider') || null;

      if (!response.ok) {
        cloudFailed = true;
      } else if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                fullContent += content;
              }
            } catch {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }
      }
    } catch (error) {
      cloudFailed = true;
    }

    // === ÉTAPE 2: Fallback local si échec cloud ===
    if (cloudFailed && environmentMode === 'electron') {
      const localResult = await tryLocalOllama(allMessages);
      
      if (localResult.success) {
        fullContent = localResult.fullContent;
        aiProvider = 'ollama-local';
        isLocalFallback = true;
      } else {
        const errorMsg = `Tous les modèles IA indisponibles`;
        notify(errorMsg, 'error', 'critical');
        setState(prev => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          error: errorMsg,
        }));
        return;
      }
    } else if (cloudFailed) {
      const errorMsg = 'Service IA temporairement indisponible';
      notify(errorMsg, 'error', 'high');
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        error: errorMsg,
      }));
      return;
    }

    const assistantMessage: Message = { role: 'assistant', content: fullContent };

    // === ÉTAPE 3: BOUCLE DE FEEDBACK - Exécuter les commandes système ===
    const feedbackResult = await executeSystemActionsWithFeedback(
      fullContent,
      [...allMessages, assistantMessage]
    );

    let finalSchema = null;
    let finalThought = null;

    if (feedbackResult.shouldRequestNewSchema && feedbackResult.systemResults.length > 0) {
      // === ÉTAPE 4: Redemander à l'IA de construire un schéma avec les résultats ===
      notify('Construction du schéma avec les résultats...', 'info', 'medium');
      
      const schemaResponse = await requestSchemaFromResults(
        feedbackResult.systemResults,
        [...allMessages, assistantMessage],
        systemPrompt
      );
      
      // Parser le nouveau schéma
      const parsed = parseAndUpdateResponse(schemaResponse, aiProvider || 'unknown', isLocalFallback);
      finalSchema = parsed.schema;
      finalThought = parsed.thought;
      
      // Ajouter la réponse de schéma aux messages
      const schemaMessage: Message = { role: 'assistant', content: schemaResponse };
      
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, schemaMessage],
        thought: finalThought,
        schema: finalSchema,
        aiProvider: parsed.aiProvider,
        isLocalFallback: parsed.isLocalFallback,
        isLoading: false,
        isStreaming: false,
        systemResults: feedbackResult.systemResults,
      }));
    } else {
      // Pas de commandes système ou pas besoin de nouveau schéma
      const parsed = parseAndUpdateResponse(fullContent, aiProvider || 'unknown', isLocalFallback);
      
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        thought: parsed.thought,
        schema: parsed.schema,
        aiProvider: parsed.aiProvider,
        isLocalFallback: parsed.isLocalFallback,
        isLoading: false,
        isStreaming: false,
        systemResults: feedbackResult.systemResults,
      }));
    }
  }, [
    state.messages, 
    notify, 
    tryLocalOllama, 
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
      isLocalFallback: false,
      environmentMode,
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