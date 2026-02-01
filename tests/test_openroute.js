// test-openrouter-direct.js

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const models = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "deepseek/deepseek-r1-0528:free",
  "mistralai/mistral-nemo:free",
  "mistralai/mixtral-8x7b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-3-4b-instruct:free",
  "mistralai/devstral-2512:free",
  "qwen/qwen-3-coder:free",
];

async function testOpenRouter(model, messages) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer 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`,
      'HTTP-Referer': 'https://example.com', // Remplacez par votre site
      'X-Title': 'Test Script',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false, // Pour simplifier, on ne stream pas
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function main() {
  const messages = [
    { role: 'user', content: 'Bonjour, peux-tu me dire bonjour en français ?' }
  ];

  for (const model of models) {
    console.log(`Testing model: ${model}`);
    try {
      const result = await testOpenRouter(model, messages);
      console.log(`Success: ${result.choices[0].message.content}`);
    } catch (error) {
      console.error(`Error with model ${model}:`, error.message);
    }
    console.log('---');
  }
}

main();