import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration des modèles avec fallback automatique
const MODELS = [
  { 
    name: "llama-3.3-70b-versatile", 
    provider: "groq",
    maxTokens: 8000,
    priority: 1,
    rateLimit: { requests: 30, window: 60000 } // 30 req/min
  },
  { 
    name: "llama-3.1-70b-versatile", 
    provider: "groq",
    maxTokens: 8000,
    priority: 2,
    rateLimit: { requests: 30, window: 60000 }
  },
  { 
    name: "mixtral-8x7b-32768", 
    provider: "groq",
    maxTokens: 32768,
    priority: 3,
    rateLimit: { requests: 30, window: 60000 }
  },
  { 
    name: "gemma2-9b-it", 
    provider: "groq",
    maxTokens: 8192,
    priority: 4,
    rateLimit: { requests: 30, window: 60000 }
  },
];

// Système de prompt amélioré pour le schéma cognitif
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
4. **TOUJOURS** adapter les blocs au contexte de la requête

---

📦 BLOCS UI DISPONIBLES:

**Texte & Titres**
- { "type": "text", "content": "...", "variant": "body|heading|label|caption|code" }

**Listes Interactives**
- { "type": "list", "items": [...], "variant": "bullet|numbered|tags", "selectable": true/false }
  → selectable: true = l'utilisateur peut cliquer pour sélectionner

**Boutons d'Action** (auto-submit instantané)
- { "type": "button", "label": "...", "actionId": "unique-id", "variant": "primary|secondary|ghost|danger" }

**Champs de Saisie**
- { "type": "input", "id": "...", "placeholder": "...", "label": "...", "inputType": "text|textarea|number|email|password" }

**Choix Multiples** (auto-submit instantané)
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

---

🎨 STRATÉGIES DE DESIGN PAR TYPE DE REQUÊTE:

**Questions simples** → Texte + éventuellement liste
**Requêtes de choix** → Heading + Choice avec options
**Données structurées** → Card + KeyValue ou Grid
**Actions** → Stack avec Button
**Processus** → Status + Progress
**Erreurs** → Status error + description
**Vide** → Empty state avec action

---

📝 EXEMPLES CONCRETS:

Requête: "liste des continents"
{
  "thought": "Liste simple avec sélection possible",
  "response": {
    "type": "schema",
    "schema": {
      "blocks": [
        { "type": "text", "content": "Continents du Monde", "variant": "heading" },
        { "type": "list", "items": ["Afrique", "Amérique", "Asie", "Europe", "Océanie", "Antarctique"], "variant": "bullet", "selectable": true }
      ]
    }
  }
}

Requête: "crée un formulaire de contact"
{
  "thought": "Formulaire structuré avec validation",
  "response": {
    "type": "schema",
    "schema": {
      "blocks": [
        { "type": "text", "content": "Formulaire de Contact", "variant": "heading" },
        { "type": "card", "variant": "framed", "children": [
          { "type": "input", "id": "name", "label": "Nom complet", "placeholder": "Jean Dupont", "inputType": "text" },
          { "type": "input", "id": "email", "label": "Email", "placeholder": "email@example.com", "inputType": "email" },
          { "type": "input", "id": "message", "label": "Message", "placeholder": "Votre message...", "inputType": "textarea" },
          { "type": "divider" },
          { "type": "button", "label": "Envoyer", "actionId": "submit-form", "variant": "primary" }
        ]}
      ]
    }
  }
}

Requête: "compare React vs Vue"
{
  "thought": "Comparaison structurée en grille",
  "response": {
    "type": "schema",
    "schema": {
      "blocks": [
        { "type": "text", "content": "React vs Vue.js", "variant": "heading" },
        { "type": "grid", "columns": 2, "gap": "md", "children": [
          { "type": "card", "title": "React", "variant": "default", "children": [
            { "type": "badge", "text": "Meta", "variant": "info" },
            { "type": "keyValue", "pairs": [
              { "key": "Type", "value": "Bibliothèque" },
              { "key": "Langage", "value": "JSX" },
              { "key": "Popularité", "value": "⭐⭐⭐⭐⭐" }
            ]}
          ]},
          { "type": "card", "title": "Vue.js", "variant": "default", "children": [
            { "type": "badge", "text": "Evan You", "variant": "success" },
            { "type": "keyValue", "pairs": [
              { "key": "Type", "value": "Framework" },
              { "key": "Langage", "value": "Templates" },
              { "key": "Popularité", "value": "⭐⭐⭐⭐" }
            ]}
          ]}
        ]}
      ]
    }
  }
}

---

⚡ RÈGLES D'INTERACTION:

1. **Listes sélectionnables** → L'utilisateur clique, puis tape un message pour contextualiser
2. **Boutons** → Action instantanée envoyée à l'IA
3. **Choix (choice)** → Sélection instantanée envoyée à l'IA
4. **Inputs** → onChange = manuel, onSubmit (Enter) = auto

---

🧠 INTELLIGENCE CONTEXTUELLE:

- Adapter la complexité des blocs à la requête
- Utiliser des cards pour regrouper l'information
- Préférer les listes interactives pour les énumérations
- Utiliser les badges pour les métadonnées
- Ajouter des dividers pour séparer les sections
- Utiliser keyValue pour les propriétés techniques
- Fournir des actions pertinentes (boutons) quand approprié

---

🚨 GESTION DES ERREURS:

Si la requête est ambiguë ou impossible:
{
  "thought": "Requête nécessite clarification",
  "response": {
    "type": "schema",
    "schema": {
      "blocks": [
        { "type": "status", "state": "warning", "message": "Je n'ai pas bien compris votre demande" },
        { "type": "text", "content": "Pouvez-vous préciser ce que vous souhaitez ?", "variant": "body" }
      ]
    }
  }
}

---

MAINTENANT, RÉPONDS À LA REQUÊTE UTILISATEUR EN SUIVANT CES RÈGLES.`;

// Historique des tentatives par conversation (simple in-memory cache)
const conversationAttempts = new Map<string, { modelIndex: number; lastAttempt: number }>();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt, conversationId } = await req.json();
    
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    // Déterminer le modèle à utiliser (avec fallback automatique)
    const convId = conversationId || "default";
    const attempts = conversationAttempts.get(convId) || { modelIndex: 0, lastAttempt: 0 };
    
    // Reset après 5 minutes sans activité
    const now = Date.now();
    if (now - attempts.lastAttempt > 300000) {
      attempts.modelIndex = 0;
    }

    // Fonction de tentative avec un modèle spécifique
    async function tryWithModel(modelIndex: number): Promise<Response> {
      const model = MODELS[modelIndex];
      
      console.log(`[Model Attempt] Using ${model.name} (priority ${model.priority})`);

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model.name,
          messages: [
            { 
              role: "system", 
              content: systemPrompt || ENHANCED_SYSTEM_PROMPT
            },
            ...messages,
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: Math.min(2048, model.maxTokens),
          top_p: 0.9,
          frequency_penalty: 0.3,
          presence_penalty: 0.2,
        }),
      });

      // Gérer le rate limit
      if (response.status === 429) {
        console.warn(`[Rate Limit] ${model.name} - Switching to fallback`);
        
        // Passer au modèle suivant
        if (modelIndex < MODELS.length - 1) {
          attempts.modelIndex = modelIndex + 1;
          attempts.lastAttempt = now;
          conversationAttempts.set(convId, attempts);
          
          return await tryWithModel(modelIndex + 1);
        } else {
          // Tous les modèles épuisés
          throw new Error("All models rate limited. Please retry in a few minutes.");
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API Error] ${model.name}:`, response.status, errorText);
        
        // Tenter le modèle suivant en cas d'erreur
        if (modelIndex < MODELS.length - 1) {
          console.log(`[Fallback] Trying next model...`);
          return await tryWithModel(modelIndex + 1);
        }
        
        throw new Error(`AI service error: ${response.status}`);
      }

      // Succès - mettre à jour les stats
      attempts.lastAttempt = now;
      conversationAttempts.set(convId, attempts);

      // Ajouter des headers personnalisés pour indiquer le modèle utilisé
      const customHeaders = {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-AI-Model": model.name,
        "X-Model-Priority": model.priority.toString(),
      };

      return new Response(response.body, { headers: customHeaders });
    }

    // Démarrer avec le modèle actuel de la conversation
    return await tryWithModel(attempts.modelIndex);

  } catch (error) {
    console.error("[Chat Error]:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});