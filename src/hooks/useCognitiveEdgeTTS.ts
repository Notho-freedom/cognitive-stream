// ═══════════════════════════════════════════════════════════════
// COGNITIVE EDGE TTS HOOK
// Hook React pour gérer la synthèse vocale avec Edge TTS
// Gratuit, illimité, streaming, haute qualité
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  speakText, 
  COGNITIVE_EDGE_VOICES,
  checkServiceStatus,
  getVoicesForText,
  type EdgeTTSVoice 
} from '@/lib/edgeTTS';

interface CognitiveEdgeTTSState {
  isEnabled: boolean;
  isSpeaking: boolean;
  currentText: string | null;
  error: string | null;
  voice: keyof typeof COGNITIVE_EDGE_VOICES;
  serviceOnline: boolean;
  autoDetectLanguage: boolean;
}

interface CognitiveEdgeTTSOptions {
  autoPlay?: boolean;
  maxLength?: number;
  skipIfSpeaking?: boolean;
  autoDetectLanguage?: boolean; // Auto-détection de langue du texte
}

const DEFAULT_OPTIONS: CognitiveEdgeTTSOptions = {
  autoPlay: true,
  maxLength: 500,
  skipIfSpeaking: true,
  autoDetectLanguage: true,
};

export function useCognitiveEdgeTTS(options: CognitiveEdgeTTSOptions = DEFAULT_OPTIONS) {
  const [state, setState] = useState<CognitiveEdgeTTSState>({
    isEnabled: true,
    isSpeaking: false,
    currentText: null,
    error: null,
    voice: 'french_female',
    serviceOnline: true,
    autoDetectLanguage: options.autoDetectLanguage || false,
  });

  const speakQueueRef = useRef<string[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Vérifier le status du service au montage
   */
  useEffect(() => {
    checkServiceStatus().then(isOnline => {
      setState(prev => ({ ...prev, serviceOnline: isOnline }));
      if (!isOnline) {
        console.warn('[EdgeTTS] Service offline');
      }
    });
  }, []);

  /**
   * Process next item in queue
   */
  const processQueue = useCallback(async () => {
    if (state.isSpeaking || speakQueueRef.current.length === 0) return;
    if (!state.isEnabled) {
      speakQueueRef.current = [];
      return;
    }

    const text = speakQueueRef.current.shift();
    if (!text) return;

    setState(prev => ({ ...prev, isSpeaking: true, currentText: text, error: null }));

    try {
      let voiceToUse: string = COGNITIVE_EDGE_VOICES[state.voice];

      // Auto-détection de langue si activée
      if (state.autoDetectLanguage) {
        console.log('[EdgeTTS] Auto-detecting language...');
        const voicesForText = await getVoicesForText(text);
        if (voicesForText) {
          // Priorité : voix féminine
          const detectedVoice = voicesForText.female_voices[0]?.ShortName 
            || voicesForText.male_voices[0]?.ShortName;
          
          if (detectedVoice) {
            console.log(`[EdgeTTS] Using auto-detected voice: ${detectedVoice}`);
            voiceToUse = detectedVoice;
          }
        }
      }

      const success = await speakText(text, voiceToUse);

      if (!success) {
        setState(prev => ({ ...prev, error: 'TTS synthesis failed' }));
      }
    } catch (error) {
      console.error('[EdgeTTS] Error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    } finally {
      setState(prev => ({ ...prev, isSpeaking: false, currentText: null }));
      
      // Process next in queue
      setTimeout(processQueue, 100);
    }
  }, [state.isEnabled, state.isSpeaking, state.voice, state.autoDetectLanguage]);

  /**
   * Speak a thought (add to queue)
   */
  const speakThought = useCallback((text: string) => {
    if (!state.isEnabled) return;
    if (!text || text.trim().length === 0) return;

    // Truncate if too long
    const maxLen = options.maxLength || DEFAULT_OPTIONS.maxLength!;
    let cleanText = text.trim();
    if (cleanText.length > maxLen) {
      cleanText = cleanText.substring(0, maxLen) + '...';
    }

    // Skip if already speaking and option set
    if (state.isSpeaking && options.skipIfSpeaking) {
      console.log('[EdgeTTS] Skipping - already speaking');
      return;
    }

    // Add to queue
    speakQueueRef.current.push(cleanText);
    
    // Start processing if not already
    if (!state.isSpeaking) {
      processQueue();
    }
  }, [state.isEnabled, state.isSpeaking, options.maxLength, options.skipIfSpeaking, processQueue]);

  /**
   * Stop current speech
   */
  const stop = useCallback(() => {
    speakQueueRef.current = [];
    setState(prev => ({ ...prev, isSpeaking: false, currentText: null }));
    
    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }, []);

  /**
   * Clear queue
   */
  const clearQueue = useCallback(() => {
    speakQueueRef.current = [];
  }, []);

  /**
   * Toggle TTS enabled/disabled
   */
  const toggle = useCallback(() => {
    setState(prev => {
      const newEnabled = !prev.isEnabled;
      if (!newEnabled) {
        speakQueueRef.current = [];
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        }
      }
      return { ...prev, isEnabled: newEnabled };
    });
  }, []);

  /**
   * Set voice
   */
  const setVoice = useCallback((voice: keyof typeof COGNITIVE_EDGE_VOICES) => {
    setState(prev => ({ ...prev, voice }));
  }, []);

  /**
   * Toggle auto-detect language
   */
  const toggleAutoDetect = useCallback(() => {
    setState(prev => {
      console.log(`[EdgeTTS] Auto-detect language: ${!prev.autoDetectLanguage ? 'ON' : 'OFF'}`);
      return { ...prev, autoDetectLanguage: !prev.autoDetectLanguage };
    });
  }, []);

  /**
   * Refresh service status
   */
  const refreshServiceStatus = useCallback(async () => {
    const isOnline = await checkServiceStatus();
    setState(prev => ({ ...prev, serviceOnline: isOnline }));
    return isOnline;
  }, []);

  return {
    ...state,
    queueLength: speakQueueRef.current.length,
    
    // Actions
    speakThought,
    stop,
    clearQueue,
    toggle,
    
    // Settings
    setVoice,
    toggleAutoDetect,
    refreshServiceStatus,
    
    // Available voices
    availableVoices: COGNITIVE_EDGE_VOICES,
    
    // Info
    ttsProvider: 'Edge TTS (Microsoft)',
  };
}
