// ═══════════════════════════════════════════════════════════════
// COGNITIVE TTS HOOK
// Hook React pour gérer la synthèse vocale cognitive
// Lit automatiquement les "pensées" de l'IA
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { speakText, COGNITIVE_VOICES } from '@/lib/googleTTS';

interface CognitiveTTSState {
  isEnabled: boolean;
  isSpeaking: boolean;
  currentText: string | null;
  error: string | null;
  volume: number; // 0 to 1
  speed: number; // 0.25 to 4.0
  pitch: number; // -20 to 20
  voice: keyof typeof COGNITIVE_VOICES;
}

interface CognitiveTTSOptions {
  autoPlay?: boolean; // Auto-play thoughts
  maxLength?: number; // Max characters to speak
  skipIfSpeaking?: boolean; // Skip new text if already speaking
}

const DEFAULT_OPTIONS: CognitiveTTSOptions = {
  autoPlay: true,
  maxLength: 500,
  skipIfSpeaking: true,
};

export function useCognitiveTTS(options: CognitiveTTSOptions = DEFAULT_OPTIONS) {
  const [state, setState] = useState<CognitiveTTSState>({
    isEnabled: true,
    isSpeaking: false,
    currentText: null,
    error: null,
    volume: 1.0,
    speed: 1, // Légèrement plus rapide pour un effet "AI"
    pitch: 0.0,
    voice: 'neural_female',
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speakQueueRef = useRef<string[]>([]);

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
      const success = await speakText(text, {
        voice: COGNITIVE_VOICES[state.voice],
        speed: state.speed,
        pitch: state.pitch,
      });

      if (!success) {
        setState(prev => ({ ...prev, error: 'TTS synthesis failed' }));
      }
    } catch (error) {
      console.error('[CognitiveTTS] Error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    } finally {
      setState(prev => ({ ...prev, isSpeaking: false, currentText: null }));
      
      // Process next in queue
      setTimeout(processQueue, 100);
    }
  }, [state.isEnabled, state.isSpeaking, state.voice, state.speed, state.pitch]);

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
      console.log('[CognitiveTTS] Skipping - already speaking');
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
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
      }
      return { ...prev, isEnabled: newEnabled };
    });
  }, []);

  /**
   * Set voice
   */
  const setVoice = useCallback((voice: keyof typeof COGNITIVE_VOICES) => {
    setState(prev => ({ ...prev, voice }));
  }, []);

  /**
   * Set speed
   */
  const setSpeed = useCallback((speed: number) => {
    const clampedSpeed = Math.max(0.25, Math.min(4.0, speed));
    setState(prev => ({ ...prev, speed: clampedSpeed }));
  }, []);

  /**
   * Set pitch
   */
  const setPitch = useCallback((pitch: number) => {
    const clampedPitch = Math.max(-20, Math.min(20, pitch));
    setState(prev => ({ ...prev, pitch: clampedPitch }));
  }, []);

  /**
   * Set volume (note: volume control is browser-based, not in TTS API)
   */
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setState(prev => ({ ...prev, volume: clampedVolume }));
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
    setSpeed,
    setPitch,
    setVolume,
  };
}
