import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import ENHANCED_SYSTEM_PROMPT from "./ENHANCED_SYSTEM_PROMPT.ts";
import { callGeminiFlash } from "./geminiFlash.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "X-AI-Model, X-AI-Provider",
};

// Configuration des modèles avec fallback automatique
interface ModelConfig {
  name: string;
  provider: "groq" | "deepseek" | "lovable" | "geminiFlash" | "poe" | "ollama";
  endpoint: string;
  maxTokens: number;
  priority: number;
}

const MODELS: ModelConfig[] = [
  // Poe - Modèles premium accessibles via API
  {
    name: "Claude-3.5-Sonnet",
    provider: "poe",
    endpoint: "https://api.poe.com/v1/chat/completions",
    maxTokens: 8192,
    priority: 1,
  },
  {
    name: "GPT-4o",
    provider: "poe",
    endpoint: "https://api.poe.com/v1/chat/completions",
    maxTokens: 8192,
    priority: 2,
  },
  {
    name: "Claude-3-Opus",
    provider: "poe",
    endpoint: "https://api.poe.com/v1/chat/completions",
    maxTokens: 8192,
    priority: 3,
  },
  // Groq - essayer d'abord un modèle léger (souvent moins limité)
  {
    name: "llama-3.1-8b-instant",
    provider: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    maxTokens: 8192,
    priority: 4,
  },
  {
    name: "llama-3.3-70b-versatile",
    provider: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    maxTokens: 8000,
    priority: 5,
  },
  // DeepSeek - fallback payant
  {
    name: "deepseek-chat",
    provider: "deepseek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    maxTokens: 8192,
    priority: 6,
  },
  // Lovable AI - fallback gratuit avec quota
  {
    name: "google/gemini-3-flash-preview",
    provider: "lovable",
    endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
    maxTokens: 8192,
    priority: 7,
  },
  // Gemini Flash - fallback via Vertex AI
  {
    name: "gemini-2.5-flash-lite",
    provider: "geminiFlash",
    endpoint: "",
    maxTokens: 8192,
    priority: 8,
  },
  // Ollama - fallback final pour Electron (localhost)
  {
    name: "llama3.2",
    provider: "ollama",
    endpoint: "http://localhost:11434/api/generate",
    maxTokens: 4096,
    priority: 9,
  },
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getApiKey(
  provider: "groq" | "deepseek" | "lovable" | "geminiFlash" | "poe" | "ollama"
): string | undefined {
  if (provider === "groq") {
    return Deno.env.get("GROQ_API_KEY");
  }
  if (provider === "deepseek") {
    return Deno.env.get("DEEPSEEK_API_KEY");
  }
  if (provider === "lovable") {
    return Deno.env.get("LOVABLE_API_KEY");
  }
  if (provider === "poe") {
    return Deno.env.get("POE_API_KEY");
  }
  // Ollama n'a pas besoin de clé API
  if (provider === "ollama") {
    return "no-key-needed";
  }
  // GeminiFlash utilise GOOGLE_APPLICATION_CREDENTIALS
  return undefined;
}

/**
 * Crée un stream SSE à partir d'une réponse texte
 */
function createSSEStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      // Simuler un stream SSE avec le texte complet
      const words = text.split(" ");
      let buffer = "";

      for (let i = 0; i < words.length; i++) {
        buffer += (i > 0 ? " " : "") + words[i];

        // Envoyer par chunks pour simuler le streaming
        if (i % 5 === 0 || i === words.length - 1) {
          const chunk = JSON.stringify({
            choices: [
              {
                delta: { content: buffer },
                finish_reason: null,
              },
            ],
          });

          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          buffer = "";
        }
      }

      // Message de fin
      const finalChunk = JSON.stringify({
        choices: [
          {
            delta: {},
            finish_reason: "stop",
          },
        ],
      });

      controller.enqueue(encoder.encode(`data: ${finalChunk}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

async function tryModel(
  model: ModelConfig,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<{
  success: boolean;
  response?: Response;
  error?: string;
  status?: number;
  isRateLimit?: boolean;
}> {
  // Cas spécial pour Ollama (localhost)
  if (model.provider === "ollama") {
    console.log(`[Try] Ollama/${model.name}`);
    
    try {
      // Combiner system prompt et messages
      const fullPrompt = messages.map(m => 
        m.role === 'user' ? `User: ${m.content}` : `Assistant: ${m.content}`
      ).join('\n');
      
      const response = await fetch(model.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model.name,
          prompt: `${systemPrompt}\n\n${fullPrompt}`,
          stream: false,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`[Error] Ollama/${model.name}:`, err);
        return { 
          success: false, 
          error: `HTTP ${response.status}`, 
          status: response.status 
        };
      }

      const data = await response.json();
      const text = data.response || "";
      
      console.log(`[OK] Ollama/${model.name}`);
      
      // Créer un stream SSE à partir de la réponse
      const stream = createSSEStream(text);
      
      return {
        success: true,
        response: new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        }),
      };
    } catch (error) {
      console.error(`[Error] Ollama/${model.name}:`, error);
      return { 
        success: false, 
        error: String(error), 
        status: 500 
      };
    }
  }

  // Cas spécial pour GeminiFlash
  if (model.provider === "geminiFlash") {
    console.log(`[Try] GeminiFlash/${model.name}`);

    try {
      const geminiResponse = await callGeminiFlash(model.name, {
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      });

      if (!geminiResponse.success) {
        console.error(
          `[Error] GeminiFlash/${model.name}:`,
          geminiResponse.error
        );
        return {
          success: false,
          error: geminiResponse.error,
          status: geminiResponse.status,
        };
      }

      console.log(`[OK] GeminiFlash/${model.name}`);

      // Créer une vraie Response avec un stream SSE
      const stream = createSSEStream(geminiResponse.text || "");

      return {
        success: true,
        response: new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        }),
      };
    } catch (error) {
      console.error(`[Error] GeminiFlash/${model.name}:`, error);
      return {
        success: false,
        error: String(error),
        status: 500,
      };
    }
  }

  // Cas standard pour les autres providers (Groq, DeepSeek, Lovable, Poe)
  const apiKey = getApiKey(model.provider);

  if (!apiKey) {
    console.warn(`[${model.provider}] API key not configured`);
    return {
      success: false,
      error: `${model.provider} API key missing`,
      status: 500,
    };
  }

  console.log(`[Try] ${model.provider}/${model.name}`);

  try {
    const response = await fetch(model.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json",
      },
      body: JSON.stringify({
        model: model.name,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        temperature: 0.7,
        max_tokens: Math.min(2048, model.maxTokens),
      }),
    });

    if (response.status === 429) {
      console.warn(`[429] ${model.provider}/${model.name} rate limited`);
      return {
        success: false,
        error: "Rate limit",
        isRateLimit: true,
        status: 429,
      };
    }

    if (!response.ok) {
      const err = await response.text();
      console.error(`[${response.status}] ${model.provider}/${model.name}:`, err);
      return {
        success: false,
        error: `HTTP ${response.status}`,
        status: response.status,
      };
    }

    console.log(`[OK] ${model.provider}/${model.name}`);
    return { success: true, response };
  } catch (error) {
    console.error(`[Error] ${model.provider}/${model.name}:`, error);
    return { success: false, error: String(error), status: 500 };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt } = await req.json();
    const prompt = systemPrompt || ENHANCED_SYSTEM_PROMPT;

    let lastError = "";
    let lastStatus = 503;
    let lastProvider: string | undefined;
    let lastModel: string | undefined;

    for (const model of MODELS) {
      // Retry avec backoff uniquement sur 429
      const first = await tryModel(model, messages, prompt);
      const result = first.isRateLimit
        ? await (async () => {
            await sleep(650);
            return tryModel(model, messages, prompt);
          })()
        : first;

      if (result.success && result.response) {
        return new Response(result.response.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-AI-Model": model.name,
            "X-AI-Provider": model.provider,
          },
        });
      }

      lastError = result.error || "Unknown";
      lastStatus = result.status ?? 503;
      lastProvider = model.provider;
      lastModel = model.name;

      if (!result.isRateLimit) {
        await sleep(300);
      }
    }

    return new Response(
      JSON.stringify({
        error: "All models unavailable",
        details: lastError,
        last: { provider: lastProvider, model: lastModel, status: lastStatus },
      }),
      {
        status: lastStatus === 402 || lastStatus === 429 ? lastStatus : 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Fatal]:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});