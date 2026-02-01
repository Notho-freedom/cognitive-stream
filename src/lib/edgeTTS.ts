// ═══════════════════════════════════════════════════════════════
// EDGE TTS SERVICE
// Service de synthèse vocale via edge-tts (low-tts.onrender.com)
// Gratuit, illimité, haute qualité, streaming
// ═══════════════════════════════════════════════════════════════

const BASE_URL = 'https://low-tts.onrender.com';

export interface EdgeTTSVoice {
  Name: string;
  ShortName: string;
  Gender: 'Male' | 'Female';
  Locale: string;
}

export interface EdgeTTSRequest {
  text: string;
  voice?: string; // Default: fr-FR-DeniseNeural
}

export interface VoicesByLanguage {
  male_voices: EdgeTTSVoice[];
  female_voices: EdgeTTSVoice[];
}

// ═══════════════════════════════════════════════════════════════
// VOIX RECOMMANDÉES POUR L'IA COGNITIVE
// ═══════════════════════════════════════════════════════════════

export const COGNITIVE_EDGE_VOICES = {
  // Voix françaises premium
  french_female: 'fr-FR-DeniseNeural',
  french_female_alt: 'fr-FR-EloiseNeural',
  french_male: 'fr-FR-HenriNeural',
  french_male_alt: 'fr-FR-AlainNeural',
  
  // Voix anglaises (si besoin)
  english_female: 'en-US-JennyNeural',
  english_male: 'en-US-GuyNeural',
} as const;

// ═══════════════════════════════════════════════════════════════
// API METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Synthétise du texte en audio et retourne l'URL blob
 */
export async function synthesizeSpeech(request: EdgeTTSRequest): Promise<{
  success: boolean;
  audioUrl?: string;
  usedVoice?: string;
  error?: string;
}> {
  try {
    console.log(`[EdgeTTS] Synthesizing: "${request.text.substring(0, 50)}..."`);
    console.log(`[EdgeTTS] Voice: ${request.voice || 'default (fr-FR-DeniseNeural)'}`);

    const response = await fetch(`${BASE_URL}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: request.text,
        voice: request.voice || COGNITIVE_EDGE_VOICES.french_female,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EdgeTTS] HTTP ${response.status}:`, errorText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    // Récupérer la voix utilisée depuis le header
    const usedVoice = response.headers.get('X-Used-Voice') || request.voice;

    // Convertir le streaming audio en blob
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    console.log(`[EdgeTTS] Success! Voice used: ${usedVoice}`);

    return {
      success: true,
      audioUrl,
      usedVoice,
    };
  } catch (error) {
    console.error('[EdgeTTS] Error:', error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Joue l'audio synthétisé
 */
export async function playAudio(audioUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };

      audio.play().catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Fonction utilitaire : synthétise ET joue le texte
 */
export async function speakText(
  text: string,
  voice?: string
): Promise<boolean> {
  try {
    const result = await synthesizeSpeech({ text, voice });

    if (!result.success || !result.audioUrl) {
      console.error('[EdgeTTS] Synthesis failed:', result.error);
      return false;
    }

    await playAudio(result.audioUrl);
    return true;
  } catch (error) {
    console.error('[EdgeTTS] Speak error:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILITY METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Récupère toutes les voix disponibles
 */
export async function getAvailableVoices(): Promise<EdgeTTSVoice[]> {
  try {
    const response = await fetch(`${BASE_URL}/api/voices`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[EdgeTTS] Failed to fetch voices:', error);
    return [];
  }
}

/**
 * Vérifie si une voix est disponible
 */
export async function checkVoice(voiceName: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/check-voice/${voiceName}`);
    
    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.available === true;
  } catch (error) {
    console.error('[EdgeTTS] Failed to check voice:', error);
    return false;
  }
}

/**
 * Détecte la langue du texte et retourne les voix associées
 */
export async function getVoicesForText(text: string): Promise<VoicesByLanguage | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/voices-by-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Failed to detect language: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[EdgeTTS] Failed to get voices for text:', error);
    return null;
  }
}

/**
 * Récupère les voix pour une langue donnée
 */
export async function getVoicesByLanguage(languageCode: string): Promise<VoicesByLanguage | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/voices-by-language/${languageCode}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch voices for language: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[EdgeTTS] Failed to get voices by language:', error);
    return null;
  }
}

/**
 * Vérifie le status du service
 */
export async function checkServiceStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/status`);
    
    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === 'OK';
  } catch (error) {
    console.error('[EdgeTTS] Service check failed:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// PRESETS OPTIMISÉS
// ═══════════════════════════════════════════════════════════════

export interface SpeakOptions {
  voice?: keyof typeof COGNITIVE_EDGE_VOICES | string;
  autoDetect?: boolean; // Auto-détecter la langue du texte
}

/**
 * Parle avec auto-détection de langue (optionnel)
 */
export async function speakWithOptions(
  text: string,
  options: SpeakOptions = {}
): Promise<boolean> {
  try {
    let voiceToUse: string | undefined;

    // Auto-détection de langue si activée
    if (options.autoDetect) {
      const voicesForText = await getVoicesForText(text);
      if (voicesForText) {
        // Prendre la première voix féminine, ou la première disponible
        voiceToUse = voicesForText.female_voices[0]?.ShortName 
          || voicesForText.male_voices[0]?.ShortName;
        console.log(`[EdgeTTS] Auto-detected voice: ${voiceToUse}`);
      }
    }

    // Sinon utiliser la voix spécifiée
    if (!voiceToUse && options.voice) {
      voiceToUse = typeof options.voice === 'string' 
        ? options.voice 
        : COGNITIVE_EDGE_VOICES[options.voice];
    }

    return await speakText(text, voiceToUse);
  } catch (error) {
    console.error('[EdgeTTS] Speak with options error:', error);
    return false;
  }
}
