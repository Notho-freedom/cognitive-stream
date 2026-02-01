import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import ENHANCED_SYSTEM_PROMPT from "./ENHANCED_SYSTEM_PROMPT.ts";

// ═══════════════════════════════════════════════════════════════
// CLOUD FUNCTION - LOVABLE AI ONLY
// Cette fonction ne contient plus que Lovable AI Gateway
// Tous les autres providers sont gérés côté client
// ═══════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "X-AI-Model, X-AI-Provider",
};

const LOVABLE_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_MODEL = "google/gemini-3-flash-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt } = await req.json();
    const prompt = systemPrompt || ENHANCED_SYSTEM_PROMPT;
    
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Lovable AI] Calling ${LOVABLE_MODEL}`);

    const response = await fetch(LOVABLE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: LOVABLE_MODEL,
        messages: [{ role: "system", content: prompt }, ...messages],
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (response.status === 429) {
      console.warn("[Lovable AI] Rate limited");
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", code: 429 }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (response.status === 402) {
      console.warn("[Lovable AI] Payment required");
      return new Response(
        JSON.stringify({ error: "Payment required", code: 402 }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Lovable AI] Error ${response.status}:`, errorText);
      return new Response(
        JSON.stringify({ error: `AI error: ${response.status}`, details: errorText }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Lovable AI] Success with ${LOVABLE_MODEL}`);

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-AI-Model": LOVABLE_MODEL,
        "X-AI-Provider": "lovable-ai",
      },
    });

  } catch (error) {
    console.error("[Fatal]:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
