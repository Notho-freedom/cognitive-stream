import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import ENHANCED_SYSTEM_PROMPT from "./ENHANCED_SYSTEM_PROMPT.ts";
import { callGeminiFlash } from "./geminiFlash.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Configuration des modèles avec fallback automatique
interface ModelConfig {
  name: string;
  provider: "groq" | "deepseek" | "lovable" | "geminiFlash";
  endpoint: string;
  maxTokens: number;
  priority: number;
}

const MODELS: ModelConfig[] = [
  // Groq - essayer d'abord un modèle léger (souvent moins limité), puis un modèle plus lourd.
  {
    name: "llama-3.1-8b-instant",
    provider: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    maxTokens: 8192,
    priority: 1,
  },
  {
    name: "llama-3.3-70b-versatile",
    provider: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    maxTokens: 8000,
    priority: 2,
  },
  // DeepSeek - fallback payant
  { 
    name: "deepseek-chat", 
    provider: "deepseek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    maxTokens: 8192,
    priority: 3,
  },
  // Lovable AI - fallback final (gratuit avec quota)
  { 
    name: "google/gemini-3-flash-preview", 
    provider: "lovable",
    endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
    maxTokens: 8192,
    priority: 99,
  },  
  {
    name: "gemini-2.5-flash-lite",
    provider: "geminiFlash",
    endpoint: "", // pas utilisé, on appelle directement le module
    maxTokens: 8192,
    priority: 100,
  },
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getApiKey(provider: "groq" | "deepseek" | "lovable" | "geminiFlash"): string | undefined {
  if (provider === "groq") {
    return Deno.env.get("GROQ_API_KEY");
  }
  if (provider === "deepseek") {
    return Deno.env.get("DEEPSEEK_API_KEY");
  }
  return Deno.env.get("LOVABLE_API_KEY");
}

function streamFromString(str: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const chunk = encoder.encode(str);
      // On transforme en ArrayBuffer standard
      controller.enqueue(new Uint8Array(chunk.buffer.slice(0)));
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

if (model.provider === "geminiFlash") {
  console.log(`[Try] GeminiFlash/${model.name}`);
  const response = await callGeminiFlash(model.name, {
    messages: [
      { role: "system", content: systemPrompt },
      ...messages
    ]
  });

  if (!response.success) {
    console.error(`[Error] GeminiFlash/${model.name}:`, response.error);
    return { success: false, error: response.error, status: response.status };
  }

  console.log(`[OK] GeminiFlash/${model.name}`);

  return {
    success: true,
    response: { body: streamFromString(JSON.stringify(response.data)) }
  };
}


  const apiKey = getApiKey(model.provider);
  
  if (!apiKey) {
    console.warn(`[${model.provider}] API key not configured`);
    return { success: false, error: `${model.provider} API key missing`, status: 500 };
  }

  console.log(`[Try] ${model.provider}/${model.name}`);

  try {
    const response = await fetch(model.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "text/event-stream, application/json",
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
      return { success: false, error: "Rate limit", isRateLimit: true, status: 429 };
    }

    if (!response.ok) {
      const err = await response.text();
      console.error(`[${response.status}] ${model.provider}/${model.name}:`, err);
      return { success: false, error: `HTTP ${response.status}`, status: response.status };
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
      // Petit retry/backoff uniquement sur 429 (utile quand Groq est temporairement limité)
      const first = await tryModel(model, messages, prompt);
      const result =
        first.isRateLimit
          ? (await (async () => {
              await sleep(650);
              return tryModel(model, messages, prompt);
            })())
          : first;

      if (result.success && result.response) {
        return new Response(result.response.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
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
        // Si on finit sur un 402/429, autant le propager au client pour un message utile.
        status: lastStatus === 402 || lastStatus === 429 ? lastStatus : 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("[Fatal]:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
