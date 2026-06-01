import { buildDebugPrompt } from "./promptBuilder";
import type { AIExplanation, AISettings, FailedSubmission, MatchedSubmission, ProblemStatement } from "./types";

function fallbackExplanation(matches: MatchedSubmission[]): AIExplanation {
  const best = matches[0];
  if (best?.isFallback) {
    return {
      summary: "Codeforces did not expose accepted source code to the extension, so this run could not compare against real accepted submissions.",
      intendedAlgorithm: "",
      acceptedAlgorithm: "",
      bugLocation: "Accepted-code matching is unavailable for this page/run.",
      failingLogic: "The failed code was scraped successfully, but the accepted-submission collector returned no readable source pages.",
      logicDivergence: "",
      matchedSolutionReason: "The displayed match is a fallback anchor, not a real accepted solution.",
      counterexample: "",
      suggestedFix: "Stay logged in to Codeforces, reload the extension, and try again. If accepted code is still blocked, use ChatGPT/Ollama mode with the problem statement and failed code only.",
      patchGuidance: "",
      counterexamplePattern: "Needs AI reasoning or readable accepted submissions.",
      confidence: "low",
    };
  }

  return {
    summary: "AI explanation was not requested. The extension completed logic-first matching and selected the closest accepted submissions.",
    intendedAlgorithm: "",
    acceptedAlgorithm: "",
    bugLocation: "Enable OpenAI or Ollama settings to get a line/block-level explanation.",
    failingLogic: best ? `Best current match: ${best.reason}` : "No accepted submissions were collected.",
    logicDivergence: "",
    matchedSolutionReason: best
      ? `Top match scored ${(best.totalScore * 100).toFixed(0)}% overall, with ${(best.logicalScore * 100).toFixed(0)}% logical similarity.`
      : "No match available.",
    counterexample: "",
    suggestedFix: "Review the top matched accepted code and compare the condition branches, state updates, and edge-case handling.",
    patchGuidance: "",
    counterexamplePattern: "AI provider required for counterexample-pattern inference.",
    confidence: best ? "medium" : "low",
  };
}

function parseExplanation(text: string): AIExplanation {
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] ?? text;

  try {
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
): Promise<AIExplanation> {
  if (settings.provider === "none") {
    return fallbackExplanation(matches);
  }

  const prompt = buildDebugPrompt(failed, problem, matches);

  if (settings.provider === "openai") {
    const apiKey = (settings.openaiApiKey || settings.apiKey).trim();
    if (!apiKey) {
      throw new Error("OpenAI API key is missing.");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status}`);
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
    throw new Error("Claude provider is selected, but Claude API integration has not been implemented yet.");
  }

  if (settings.provider === "nano") {
    throw new Error("Chrome Gemini Nano provider is selected, but built-in AI integration has not been implemented yet.");
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
