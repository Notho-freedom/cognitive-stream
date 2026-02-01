// geminiFlash.ts - Version corrigée pour Deno (Supabase Edge Functions)

const PROJECT_ID = Deno.env.get("GCP_PROJECT_ID") || "congnitive-stream";
const LOCATION = "us-central1";

interface GeminiMessage {
  role: string;
  content: string;
}

export interface GeminiRequest {
  messages: GeminiMessage[];
}

interface GeminiResponse {
  success: boolean;
  data?: any;
  text?: string;
  error?: string;
  status?: number;
}

/**
 * Récupère un access token Google Cloud via les credentials du service account
 */
async function getGoogleAccessToken(): Promise<string> {
  try {
    // Récupérer les credentials depuis l'environnement
    const credentialsJson = Deno.env.get("GOOGLE_APPLICATION_CREDENTIALS");
    
    if (!credentialsJson) {
      throw new Error("GOOGLE_APPLICATION_CREDENTIALS not found in environment");
    }

    const credentials = JSON.parse(credentialsJson);
    
    // Créer le JWT pour l'authentification
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

    // Encoder en base64url
    const base64url = (str: string) =>
      btoa(str)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    // Signer avec la clé privée
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

    // Échanger le JWT contre un access token
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
    console.error("[GoogleAuth] Error:", error);
    throw error;
  }
}

/**
 * Convertit les messages au format Gemini
 */
function convertMessagesToGeminiFormat(messages: GeminiMessage[]) {
  return messages.map((m) => {
    // Gemini utilise "user" et "model" au lieu de "system" et "assistant"
    let role = m.role;
    if (role === "assistant") role = "model";
    if (role === "system") {
      // Le system prompt doit être fusionné avec le premier message user
      return null;
    }
    
    return {
      role,
      parts: [{ text: m.content }],
    };
  }).filter(Boolean); // Retirer les nulls
}

/**
 * Fusionne le system prompt avec le premier message user
 */
function mergeSystemPrompt(messages: GeminiMessage[]): GeminiMessage[] {
  const systemMsg = messages.find((m) => m.role === "system");
  const userMessages = messages.filter((m) => m.role !== "system");

  if (!systemMsg) return userMessages;

  // Fusionner le system prompt avec le premier message user
  if (userMessages.length > 0 && userMessages[0].role === "user") {
    userMessages[0] = {
      ...userMessages[0],
      content: `${systemMsg.content}\n\n${userMessages[0].content}`,
    };
  }

  return userMessages;
}

/**
 * Crée un stream SSE à partir du texte de réponse Gemini
 */
function createSSEStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      // Format SSE compatible avec votre client
      const sseChunk = `data: ${JSON.stringify({
        choices: [
          {
            delta: { content: text },
            finish_reason: "stop",
          },
        ],
      })}\n\n`;

      controller.enqueue(encoder.encode(sseChunk));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

/**
 * Appelle l'API Gemini via Vertex AI
 */
export async function callGeminiFlash(
  modelId: string = "gemini-2.5-flash-lite",
  request: GeminiRequest
): Promise<GeminiResponse> {
  try {
    console.log(`[GeminiFlash] Calling ${modelId}...`);

    // Obtenir le token d'accès
    const accessToken = await getGoogleAccessToken();

    // Fusionner le system prompt et convertir les messages
    const mergedMessages = mergeSystemPrompt(request.messages);
    const geminiContents = convertMessagesToGeminiFormat(mergedMessages);

    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${modelId}:generateContent`;

    console.log(`[GeminiFlash] URL: ${url}`);
    console.log(`[GeminiFlash] Messages count: ${geminiContents.length}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GeminiFlash] HTTP ${response.status}:`, errorText);
      return {
        success: false,
        status: response.status,
        error: errorText,
      };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("[GeminiFlash] No text in response:", data);
      return {
        success: false,
        status: 500,
        error: "No text content in Gemini response",
      };
    }

    console.log(`[GeminiFlash] Success! Response length: ${text.length}`);

    return {
      success: true,
      data,
      text,
    };
  } catch (error) {
    console.error("[GeminiFlash] Error:", error);
    return {
      success: false,
      error: String(error),
      status: 500,
    };
  }
}