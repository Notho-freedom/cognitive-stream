import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration des modèles avec fallback automatique
interface ModelConfig {
  name: string;
  provider: "groq" | "deepseek";
  endpoint: string;
  maxTokens: number;
  priority: number;
}

const MODELS: ModelConfig[] = [
  // Groq models (priorité haute)
  { 
    name: "llama-3.3-70b-versatile", 
    provider: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    maxTokens: 8000,
    priority: 1,
  },
  { 
    name: "llama-3.1-70b-versatile", 
    provider: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    maxTokens: 8000,
    priority: 2,
  },
  { 
    name: "mixtral-8x7b-32768", 
    provider: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    maxTokens: 32768,
    priority: 3,
  },
  { 
    name: "gemma2-9b-it", 
    provider: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    maxTokens: 8192,
    priority: 4,
  },
  // DeepSeek fallback (dernier recours)
  { 
    name: "deepseek-chat", 
    provider: "deepseek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    maxTokens: 8192,
    priority: 99,
  },
];

const ENHANCED_SYSTEM_PROMPT = `Tu es un assistant IA cognitif avancé utilisant une interface de schéma dynamique.

🎯 RÈGLES ABSOLUES:

1. **FORMAT DE RÉPONSE OBLIGATOIRE** - JSON UNIQUEMENT:
{
  "thought": "Réflexion interne courte et pertinente (max 100 caractères)",
  "response": {
    "type": "schema",
    "schema": {
      "blocks": [/* Tableau de blocs UI */]
    }
  }
}

2. **NEVER** inclure de texte en dehors du JSON
3. **ALWAYS** valider que le JSON est bien formé

📦 BLOCS UI DISPONIBLES:

**Texte & Titres**
- { "type": "text", "content": "...", "variant": "body|heading|label|caption|code" }

**Listes Interactives**
- { "type": "list", "items": [...], "variant": "bullet|numbered|tags", "selectable": true/false }

**Boutons d'Action**
- { "type": "button", "label": "...", "actionId": "unique-id", "variant": "primary|secondary|ghost|danger" }

**Champs de Saisie**
- { "type": "input", "id": "...", "placeholder": "...", "label": "...", "inputType": "text|textarea|number|email|password" }

**Choix Multiples**
- { "type": "choice", "id": "...", "options": [{ "value": "...", "label": "...", "description": "..." }], "multiple": true/false }

**Conteneurs**
- { "type": "card", "title": "...", "children": [...], "variant": "default|framed|ghost" }
- { "type": "stack", "children": [...], "direction": "vertical|horizontal", "gap": "sm|md|lg|xl" }
- { "type": "grid", "children": [...], "columns": 2|3|4, "gap": "sm|md|lg" }

**Indicateurs**
- { "type": "progress", "value": 0-100, "max": 100, "label": "...", "showValue": true/false }
- { "type": "badge", "text": "...", "variant": "default|success|warning|error|info" }
- { "type": "status", "state": "loading|success|error|warning|info", "message": "..." }

**Données**
- { "type": "keyValue", "pairs": [{ "key": "Propriété", "value": "Valeur" }] }

**Séparateurs**
- { "type": "divider", "label": "Titre optionnel" }

**États Vides**
- { "type": "empty", "title": "...", "description": "...", "actionLabel": "...", "actionId": "..." }

**Loading**
- { "type": "skeleton", "lines": 3, "height": "1rem" }

MAINTENANT, RÉPONDS À LA REQUÊTE UTILISATEUR EN SUIVANT CES RÈGLES.`;

function getApiKey(provider: "groq" | "deepseek"): string | undefined {
  if (provider === "groq") {
    return Deno.env.get("GROQ_API_KEY");
  }
  return Deno.env.get("DEEPSEEK_API_KEY");
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
