import { buildDebugPrompt } from "./promptBuilder";
import type { AIExplanation, AISettings, FailedSubmission, MatchedSubmission, ProblemStatement } from "./types";

export function parseExplanation(text: string): AIExplanation {
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] ?? text;

  try {
    //AI models return text, but this extension wants a structured object with specific fields
    const parsed = JSON.parse(jsonText) as Partial<AIExplanation>;
    return {
      summary: parsed.summary ?? text,
      intendedAlgorithm: parsed.intendedAlgorithm ?? "",
      acceptedAlgorithm: parsed.acceptedAlgorithm ?? "",
      bugLocation: parsed.bugLocation ?? "",
      failingLogic: parsed.failingLogic ?? "",
      logicDivergence: parsed.logicDivergence ?? "",
      matchedSolutionReason: parsed.matchedSolutionReason ?? "",
      counterexample: parsed.counterexample ?? "",
      suggestedFix: parsed.suggestedFix ?? "",
      patchGuidance: parsed.patchGuidance ?? "",
      counterexamplePattern: parsed.counterexamplePattern ?? "",
      confidence: parsed.confidence ?? "unknown",
    };
  } catch {
    return {
      summary: text,
      intendedAlgorithm: "",
      acceptedAlgorithm: "",
      bugLocation: "",
      failingLogic: "",
      logicDivergence: "",
      matchedSolutionReason: "",
      counterexample: "",
      suggestedFix: "",
      patchGuidance: "",
      counterexamplePattern: "",
      confidence: "unknown",
    };
  }
}

export async function explainDiff(
  failed: FailedSubmission,
  problem: ProblemStatement,
  matches: MatchedSubmission[],
  settings: AISettings
): Promise<AIExplanation | null> {
  if (settings.provider === "none") {
    return null;
  }

  const prompt = buildDebugPrompt(failed, problem, matches);

  if (settings.provider === "openai" || settings.provider === "deepseek" || settings.provider === "kimi") {
    const providerConfig = {
      openai: {
        apiKey: settings.openaiApiKey || settings.apiKey,
        missingKeyMessage: "OpenAI API key is missing.",
        endpoint: "https://api.openai.com/v1/chat/completions",
        defaultModel: "gpt-4o-mini",
        label: "OpenAI",
      },
      deepseek: {
        apiKey: settings.deepseekApiKey || settings.apiKey,
        missingKeyMessage: "DeepSeek API key is missing.",
        endpoint: "https://api.deepseek.com/chat/completions",
        defaultModel: "deepseek-v4-flash",
        label: "DeepSeek",
      },
      kimi: {
        apiKey: settings.kimiApiKey || settings.apiKey,
        missingKeyMessage: "Kimi API key is missing.",
        endpoint: "https://api.moonshot.ai/v1/chat/completions",
        defaultModel: "kimi-k2.6",
        label: "Kimi",
      },
    }[settings.provider];

    const apiKey = providerConfig.apiKey.trim();
    if (!apiKey) {
      throw new Error(providerConfig.missingKeyMessage);
    }

    const response = await fetch(providerConfig.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model || providerConfig.defaultModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`${providerConfig.label} request failed: ${response.status}${body ? ` - ${body.slice(0, 180)}` : ""}`);
    }

    const data = await response.json();
    return parseExplanation(data.choices?.[0]?.message?.content ?? "");
  }

  if (settings.provider === "gemini") {
    const apiKey = (settings.geminiApiKey || settings.apiKey).trim();
    if (!apiKey) {
      throw new Error("Gemini API key is missing.");
    }

    const model = settings.model || "gemini-2.5-flash-lite";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Gemini request failed: ${response.status}${body ? ` - ${body.slice(0, 180)}` : ""}`);
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("") ?? "";

    return parseExplanation(text);
  }

  if (settings.provider === "claude") {
    const apiKey = (settings.claudeApiKey || settings.apiKey).trim();
    if (!apiKey) {
      throw new Error("Claude API key is missing.");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: settings.model || "claude-3-5-haiku-latest",
        max_tokens: 1400,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Claude request failed: ${response.status}${body ? ` - ${body.slice(0, 180)}` : ""}`);
    }

    const data = await response.json();
    const text =
      data.content
        ?.map((part: { type?: string; text?: string }) => (part.type === "text" ? part.text ?? "" : ""))
        .join("") ?? "";

    return parseExplanation(text);
  }

  let response: Response;

  try {
    response = await fetch(settings.ollamaUrl || "http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.model || "qwen2.5-coder:7b",
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
        },
      }),
    });
  } catch {
    throw new Error(
      "Could not connect to Ollama. Start Ollama and run: ollama run qwen2.5-coder:7b"
    );
  }

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Ollama returned 403. Allow Chrome extension origins, restart Ollama, then retry: set OLLAMA_ORIGINS=chrome-extension://*"
      );
    }

    throw new Error(
      `Ollama request failed: ${response.status}. Make sure the model is installed with: ollama run ${settings.model || "qwen2.5-coder:7b"}`
    );
  }

  const data = await response.json();
  return parseExplanation(data.response ?? "");
}
