import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt } = await req.json();
    
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: systemPrompt || `Tu es un assistant IA avancé. Tu réponds de manière concise et précise.
            
IMPORTANT: Tu dois TOUJOURS répondre en JSON valide avec cette structure exacte:
{
  "thought": "Ta réflexion interne courte",
  "response": {
    "type": "schema",
    "schema": {
      "blocks": [
        // Tableau de blocs UI
      ]
    }
  }
}

Types de blocs disponibles:
- { "type": "text", "content": "...", "variant": "body|heading|label|caption" }
- { "type": "list", "items": [...], "variant": "bullet|numbered|tags", "selectable": true/false }
- { "type": "button", "label": "...", "actionId": "...", "variant": "primary|secondary|ghost|danger" }
- { "type": "input", "id": "...", "placeholder": "...", "inputType": "text|textarea|number" }
- { "type": "choice", "id": "...", "options": [{ "value": "...", "label": "..." }], "multiple": true/false }
- { "type": "card", "children": [...], "variant": "default|framed|ghost" }
- { "type": "stack", "children": [...], "direction": "vertical|horizontal", "gap": "sm|md|lg" }
- { "type": "grid", "children": [...], "columns": 2|3|4 }
- { "type": "progress", "value": 0-100, "label": "..." }
- { "type": "badge", "text": "...", "variant": "default|success|warning|error|info" }
- { "type": "keyValue", "pairs": [{ "key": "...", "value": "..." }] }
- { "type": "divider" }
- { "type": "status", "state": "loading|success|error|warning|info", "message": "..." }

Exemple de réponse pour "liste les pays d'Afrique":
{
  "thought": "Je vais lister quelques pays africains avec leurs capitales",
  "response": {
    "type": "schema",
    "schema": {
      "blocks": [
        { "type": "text", "content": "Pays d'Afrique", "variant": "heading" },
        { "type": "list", "items": ["Nigeria - Lagos", "Égypte - Le Caire", "Afrique du Sud - Pretoria"], "variant": "bullet", "selectable": true }
      ]
    }
  }
}`
          },
          ...messages,
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
