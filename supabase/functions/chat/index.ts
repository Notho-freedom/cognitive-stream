import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import ENHANCED_SYSTEM_PROMPT from "./ENHANCED_SYSTEM_PROMPT.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration des modèles avec fallback automatique
interface ModelConfig {
  name: string;
  provider: "groq" | "deepseek" | "lovable";
  endpoint: string;
  maxTokens: number;
  priority: number;
}

const MODELS: ModelConfig[] = [
  // Groq - priorité haute (gratuit mais rate limité)
  { 
    name: "llama-3.3-70b-versatile", 
    provider: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    maxTokens: 8000,
    priority: 1,
  },
  // DeepSeek - fallback payant
  { 
    name: "deepseek-chat", 
    provider: "deepseek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    maxTokens: 8192,
    priority: 2,
  },
  // Lovable AI - fallback final (gratuit avec quota)
  { 
    name: "google/gemini-3-flash-preview", 
    provider: "lovable",
    endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
    maxTokens: 8192,
    priority: 99,
  },
];

function getApiKey(provider: "groq" | "deepseek" | "lovable"): string | undefined {
  if (provider === "groq") {
    return Deno.env.get("GROQ_API_KEY");
  }
  if (provider === "deepseek") {
    return Deno.env.get("DEEPSEEK_API_KEY");
  }
  return Deno.env.get("LOVABLE_API_KEY");
}

async function tryModel(
  model: ModelConfig,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<{ success: boolean; response?: Response; error?: string; isRateLimit?: boolean }> {
  const apiKey = getApiKey(model.provider);
  
  if (!apiKey) {
    console.warn(`[${model.provider}] API key not configured`);
    return { success: false, error: `${model.provider} API key missing` };
  }

  console.log(`[Try] ${model.provider}/${model.name}`);

  try {
    const response = await fetch(model.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.name,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: Math.min(2048, model.maxTokens),
      }),
    });

    if (response.status === 429) {
      console.warn(`[429] ${model.provider}/${model.name} rate limited`);
      return { success: false, error: "Rate limit", isRateLimit: true };
    }

    if (!response.ok) {
      const err = await response.text();
      console.error(`[${response.status}] ${model.provider}/${model.name}:`, err);
      return { success: false, error: `HTTP ${response.status}` };
    }

    console.log(`[OK] ${model.provider}/${model.name}`);
    return { success: true, response };

  } catch (error) {
    console.error(`[Error] ${model.provider}/${model.name}:`, error);
    return { success: false, error: String(error) };
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

    for (const model of MODELS) {
      const result = await tryModel(model, messages, prompt);

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
      
      if (!result.isRateLimit) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    return new Response(
      JSON.stringify({ error: "All models unavailable", details: lastError }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Fatal]:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
