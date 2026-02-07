import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionType = typeof window.SpeechRecognition;

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0?: { transcript?: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface VoiceInputOptions {
  onFinalTranscript: (text: string) => void;
  language?: string;
}

interface VoiceInputState {
  isSupported: boolean;
  isEnabled: boolean;
  isListening: boolean;
  lastTranscript: string;
  error: string | null;
}

export function useVoiceInput({ onFinalTranscript, language = 'fr-FR' }: VoiceInputOptions) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [state, setState] = useState<VoiceInputState>({
    isSupported: false,
    isEnabled: false,
    isListening: false,
    lastTranscript: '',
    error: null,
  });

  useEffect(() => {
    const Recognition = ((window as unknown as { webkitSpeechRecognition?: SpeechRecognitionType }).webkitSpeechRecognition || window.SpeechRecognition) as
      | SpeechRecognitionConstructor
      | undefined;
    if (!Recognition) {
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, error: null }));
    };
    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
    };
    recognition.onerror = (event) => {
      setState(prev => ({
        ...prev,
        error: event.error || 'Speech recognition error',
        isListening: false,
      }));
    };
    recognition.onresult = (event) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0]?.transcript || '';
        }
      }

      if (finalTranscript.trim()) {
        const cleaned = finalTranscript.trim();
        setState(prev => ({ ...prev, lastTranscript: cleaned }));
        onFinalTranscript(cleaned);
      }
    };

    recognitionRef.current = recognition;
    setState(prev => ({ ...prev, isSupported: true }));

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [language, onFinalTranscript]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setState(prev => ({ ...prev, isEnabled: true }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unable to start voice input',
      }));
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setState(prev => ({ ...prev, isEnabled: false, isListening: false }));
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    if (value) {
      start();
    } else {
      stop();
    }
  }, [start, stop]);

  return {
    ...state,
    start,
    stop,
    setEnabled,
  };
}
