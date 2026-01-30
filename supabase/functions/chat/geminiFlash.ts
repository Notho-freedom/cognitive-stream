// geminiFlash.ts
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";
import "https://deno.land/std@0.168.0/dotenv/load.ts";


const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

const PROJECT_ID = "cognitive-stream"; // ton projet GCP
const LOCATION = "us-central1";

export interface GeminiRequest {
  messages: Array<{ role: string; content: string; }>;
}

export async function callGeminiFlash(
  modelId: string = "gemini-2.5-flash-lite",
  request: GeminiRequest
) {
  try {
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${modelId}:generateContent`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.token}`,
      },
      body: JSON.stringify({
        contents: request.messages.map((m) => ({
          role: m.role,
          parts: [{ text: m.content }],
        })),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, status: res.status, error: err };
    }

    const data = await res.json();
    return {
      success: true,
      data,
      text: data.candidates?.[0]?.content?.parts?.[0]?.text,
    };
  } catch (error) {
    return { success: false, error: String(error), status: 500 };
  }
}
