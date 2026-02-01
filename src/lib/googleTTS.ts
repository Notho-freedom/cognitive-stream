// ═══════════════════════════════════════════════════════════════
// GOOGLE TEXT-TO-SPEECH SERVICE
// Service de synthèse vocale via Google Cloud TTS
// ═══════════════════════════════════════════════════════════════

const PROJECT_ID = import.meta.env.VITE_GCP_PROJECT_ID || "cognitive-stream";
const LOCATION = "global";

interface TTSVoice {
  languageCode: string;
  name: string;
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
}

interface TTSRequest {
  text: string;
  voice?: TTSVoice;
  speed?: number; // 0.25 to 4.0
  pitch?: number; // -20.0 to 20.0
}

interface TTSResponse {
  success: boolean;
  audioContent?: string; // Base64 encoded audio
  error?: string;
}

// Voix disponibles (preset optimisé pour l'IA cognitive)
export const COGNITIVE_VOICES = {
  // Voix principale - Neural2 pour qualité optimale
  neural_female: {
    languageCode: 'fr-FR',
    name: 'fr-FR-Neural2-A',
    ssmlGender: 'FEMALE' as const,
  },
  neural_male: {
    languageCode: 'fr-FR',
    name: 'fr-FR-Neural2-B',
    ssmlGender: 'MALE' as const,
  },
  // Voix WaveNet (fallback de qualité)
  wavenet_female: {
    languageCode: 'fr-FR',
    name: 'fr-FR-Wavenet-A',
    ssmlGender: 'FEMALE' as const,
  },
  wavenet_male: {
    languageCode: 'fr-FR',
    name: 'fr-FR-Wavenet-B',
    ssmlGender: 'MALE' as const,
  },
  // Voix Standard (économique)
  standard_female: {
    languageCode: 'fr-FR',
    name: 'fr-FR-Standard-A',
    ssmlGender: 'FEMALE' as const,
  },
} as const;

/**
 * Configuration par défaut pour une voix d'IA cognitive
 */
const DEFAULT_CONFIG = {
  voice: COGNITIVE_VOICES.neural_female,
  speed: 1.0,
  pitch: 0.0,
};

/**
 * Récupère un access token Google Cloud
 */
async function getGoogleAccessToken(): Promise<string> {
  try {
    const credentialsJson = import.meta.env.VITE_GOOGLE_APPLICATION_CREDENTIALS;
    
    if (!credentialsJson) {
      throw new Error("VITE_GOOGLE_APPLICATION_CREDENTIALS not found");
    }

    const credentials = JSON.parse(credentialsJson);
    
    const header = {
      alg: "RS256",
      typ: "JWT",
      kid: credentials.private_key_id,
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    };

    const base64url = (str: string) =>
      btoa(str)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const privateKey = credentials.private_key;
    const pemKey = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\n/g, "");

    const binaryKey = Uint8Array.from(atob(pemKey), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(signatureInput)
    );

    const encodedSignature = base64url(
      String.fromCharCode(...new Uint8Array(signature))
    );
    const jwt = `${signatureInput}.${encodedSignature}`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error("[GoogleTTS Auth] Error:", error);
    throw error;
  }
}

/**
 * Synthétise du texte en audio via Google TTS
 */
export async function synthesizeSpeech(
  request: TTSRequest
): Promise<TTSResponse> {
  try {
    console.log(`[GoogleTTS] Synthesizing: "${request.text.substring(0, 50)}..."`);

    const accessToken = await getGoogleAccessToken();
    
    const voice = request.voice || DEFAULT_CONFIG.voice;
    const speed = request.speed || DEFAULT_CONFIG.speed;
    const pitch = request.pitch || DEFAULT_CONFIG.pitch;

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        input: { text: request.text },
        voice: {
          languageCode: voice.languageCode,
          name: voice.name,
          ssmlGender: voice.ssmlGender,
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: speed,
          pitch: pitch,
          // Effets audio pour un son plus "tech/AI"
          effectsProfileId: ["headphone-class-device"],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GoogleTTS] HTTP ${response.status}:`, errorText);
      return {
        success: false,
        error: errorText,
      };
    }

    const data = await response.json();
    const audioContent = data.audioContent;

    if (!audioContent) {
      console.error("[GoogleTTS] No audio content in response:", data);
      return {
        success: false,
        error: "No audio content in TTS response",
      };
    }

    console.log(`[GoogleTTS] Success! Audio length: ${audioContent.length}`);

    return {
      success: true,
      audioContent,
    };
  } catch (error) {
    console.error("[GoogleTTS] Error:", error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Joue l'audio synthétisé
 */
export async function playAudio(audioContent: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Convertir base64 en blob
      const binaryString = atob(audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      // Créer et jouer l'audio
      const audio = new Audio(url);
      
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      
      audio.onerror = (error) => {
        URL.revokeObjectURL(url);
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
  options?: Partial<TTSRequest>
): Promise<boolean> {
  try {
    const result = await synthesizeSpeech({
      text,
      ...options,
    });

    if (!result.success || !result.audioContent) {
      console.error("[GoogleTTS] Synthesis failed:", result.error);
      return false;
    }

    await playAudio(result.audioContent);
    return true;
  } catch (error) {
    console.error("[GoogleTTS] Speak error:", error);
    return false;
  }
}
