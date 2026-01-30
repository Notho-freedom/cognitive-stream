import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

const PROJECT_ID = "congnitive-stream";       // <-- ton projet GCP
const LOCATION = "us-central1";
const MODEL_ID = "gemini-2.5-flash-lite";

async function testGeminiVertex() {
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.token}`,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: "Explain how AI works in a few words" }],
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("❌ HTTP Error", res.status);
    console.log(await res.text());
    return;
  }

  const data = await res.json();
  console.log("✅ Réponse :\n");
  console.log(data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data));
}

testGeminiVertex();
