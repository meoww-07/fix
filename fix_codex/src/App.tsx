import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Code2,
  FileCode2,
  KeyRound,
  Loader2,
  Play,
  Route,
  Trophy,
} from "lucide-react";
import { extractLogicFingerprint, extractStyleFingerprint } from "./lib/fingerprint";
import type {
  AIExplanation,
  AISettings,
  AnalysisResult,
  FailedSubmission,
  LogicFingerprint,
  StyleFingerprint,
} from "./lib/types";

const defaultSettings: AISettings = {
  provider: "gemini",
  apiKey: "",
  geminiApiKey: "",
  openaiApiKey: "",
  claudeApiKey: "",
  model: "gemini-2.5-flash-lite",
  ollamaUrl: "http://localhost:11434/api/generate",
};

const pipelineSteps = [
  "Step 1: checks the current page is a Codeforces Wrong Answer submission.",
  "Step 2: content script scrapes failed code, language, verdict, contest ID, problem index, and URL.",
  "Step 3: background fetches or opens the problem statement page and cleans it.",
  "Step 4: background first reads already-open accepted submission tabs, then falls back to status/source pages.",
  "Step 5: extracts the failed code's logic fingerprint.",
  "Step 6: extracts the failed code's style fingerprint.",
  "Step 7: filters candidates by logical similarity.",
  "Step 8: ranks candidates using 60% logic, 25% token overlap, and 15% style.",
  "Step 9: selects the top 3 logically closest accepted submissions.",
  "Step 10: sends the failed code, problem statement, and top 3 matches to the selected AI provider.",
  "Step 11: displays failed code, matched accepted code, and explanation.",
];

const ANALYSIS_STATE_KEY = "verdictiq.latestAnalysis";
type StoredAnalysisState = {
  status: "idle" | "running" | "complete" | "error";
  result?: AnalysisResult;
  error?: string;
  updatedAt: number;
};

export function App() {
  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [steps, setSteps] = useState<string[]>(["Open a Codeforces Wrong Answer submission, then click Analyze."]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    chrome.storage.local
      .get<Record<string, StoredAnalysisState | undefined>>(ANALYSIS_STATE_KEY)
      .then((stored) => {
        const state = stored[ANALYSIS_STATE_KEY];
        if (!state) return;
        if (state.status === "complete" && state.result) {
          setResult(state.result);
          setError("");
          setSteps(pipelineSteps);
        }
        if (state.status === "error" && state.error) {
          setError(state.error);
        }
      })
      .catch(() => undefined);
  }, []);

  const failedLogic = useMemo(
    () => (result?.failedSubmission.code ? extractLogicFingerprint(result.failedSubmission.code) : null),
    [result?.failedSubmission.code]
  );
  const failedStyle = useMemo(
    () =>
      result?.failedSubmission.code
        ? extractStyleFingerprint(result.failedSubmission.code, result.failedSubmission.language)
        : null,
    [result?.failedSubmission.code, result?.failedSubmission.language]
  );

  const status = useMemo(() => {
    if (error) return { label: "Analysis failed", tone: "warning" };
    if (result?.explanation) return { label: "Explanation ready", tone: "success" };
    if (result) return { label: "Matches ready", tone: "success" };
    return { label: "Waiting", tone: "neutral" };
  }, [error, result]);

  async function analyzeCurrentPage() {
    setIsLoading(true);
    setError("");
    setResult(null);
    setSteps(["Running PDF pipeline in background service worker..."]);

    try {
      const response = await chrome.runtime.sendMessage<{ ok: boolean; result?: AnalysisResult; error?: string }>({
        type: "ANALYZE_CURRENT_TAB",
        settings,
      });

      if (!response.ok || !response.result) {
        throw new Error(response.error ?? "Analysis failed.");
      }

      setResult(response.result);
      setSteps(pipelineSteps);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown analysis error.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="brand-mark">
          <Brain size={25} aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">VerdictIQ</p>
          <h1>Logic-first WA debugger</h1>
          <p>Scrape the failed submission, rank accepted C++ code, then explain the break.</p>
        </div>
      </section>

      <section className="notice neutral">
        <span>
          If Codeforces bot verification blocks scraping, open 1-3 accepted submission source pages in separate tabs first.
          VerdictIQ will read those open tabs as the top-candidate pool.
        </span>
      </section>

      <section className="panel settings-panel">
        <div className="panel-title">
          <KeyRound size={17} aria-hidden="true" />
          <span>AI Settings</span>
        </div>
        <label>
          Provider
          <select
            value={settings.provider}
            onChange={(event) => setSettings({ ...settings, provider: event.target.value as AISettings["provider"] })}
          >
            <option value="gemini">Gemini API key free setup</option>
            <option value="nano">Chrome Gemini Nano built-in</option>
            <option value="openai">OpenAI API key</option>
            <option value="claude">Claude API key</option>
            <option value="none">No AI mode</option>
          </select>
        </label>
        {settings.provider === "gemini" && (
          <>
            <label>
              Gemini API key
              <input
                type="password"
                value={settings.geminiApiKey}
                onChange={(event) => setSettings({ ...settings, geminiApiKey: event.target.value, apiKey: event.target.value })}
                placeholder="Paste Gemini API key"
              />
            </label>
            <label>
              Model
              <input
                value={settings.model}
                onChange={(event) => setSettings({ ...settings, model: event.target.value })}
                placeholder="gemini-2.5-flash-lite"
              />
            </label>
            <p className="hint">Recommended MVP option. User enters their own Gemini key once.</p>
          </>
        )}
        {settings.provider === "nano" && (
          <p className="hint">
            Uses Chrome built-in Gemini Nano when available. No API key, but support and quality depend on the user's Chrome/device.
          </p>
        )}
        {settings.provider === "openai" && (
          <>
            <label>
              OpenAI API key
              <input
                type="password"
                value={settings.openaiApiKey}
                onChange={(event) => setSettings({ ...settings, openaiApiKey: event.target.value, apiKey: event.target.value })}
                placeholder="sk-..."
              />
            </label>
            <label>
              Model
              <input
                value={settings.model}
                onChange={(event) => setSettings({ ...settings, model: event.target.value })}
              />
            </label>
          </>
        )}
        {settings.provider === "claude" && (
          <>
            <label>
              Claude API key
              <input
                type="password"
                value={settings.claudeApiKey}
                onChange={(event) => setSettings({ ...settings, claudeApiKey: event.target.value, apiKey: event.target.value })}
                placeholder="sk-ant-..."
              />
            </label>
            <label>
              Model
              <input
                value={settings.model}
                onChange={(event) => setSettings({ ...settings, model: event.target.value })}
                placeholder="claude-3-5-haiku-latest"
              />
            </label>
          </>
        )}
        {settings.provider === "ollama" && (
          <>
            <label>
              Ollama URL
              <input
                value={settings.ollamaUrl}
                onChange={(event) => setSettings({ ...settings, ollamaUrl: event.target.value })}
              />
            </label>
            <label>
              Model
              <input
                value={settings.model}
                onChange={(event) => setSettings({ ...settings, model: event.target.value })}
                placeholder="qwen2.5-coder:1.5b"
              />
            </label>
            <p className="hint">
              Keep Ollama running locally. Recommended 7B model: qwen2.5-coder:7b.
              If you see 403, allow Chrome extension origins with OLLAMA_ORIGINS.
            </p>
          </>
        )}
      </section>

      <button className="analyze-button" type="button" onClick={analyzeCurrentPage} disabled={isLoading}>
        {isLoading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        Analyze Current Page
      </button>

      {error && (
        <section className="notice warning">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{error}</span>
        </section>
      )}

      <section className={`status-card ${status.tone}`}>
        {status.tone === "success" ? <CheckCircle2 size={19} aria-hidden="true" /> : <Route size={19} aria-hidden="true" />}
        <div>
          <strong>{status.label}</strong>
          <span>{steps[steps.length - 1] ?? "Ready"}</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <Route size={17} aria-hidden="true" />
          <span>Pipeline</span>
        </div>
        <ol className="step-list">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      {result && (
        <>
          <SubmissionSummary failed={result.failedSubmission} />
          <ExplanationView explanation={result.explanation} />
          <MatchesView result={result} />
          <FingerprintView logic={failedLogic} style={failedStyle} />
          <CodeView failed={result.failedSubmission} />
        </>
      )}
    </main>
  );
}

function SubmissionSummary({ failed }: { failed: FailedSubmission }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <FileCode2 size={17} aria-hidden="true" />
        <span>Failed Submission</span>
      </div>
      <dl className="facts">
        <div><dt>Verdict</dt><dd>{failed.verdict}</dd></div>
        <div><dt>Language</dt><dd>{failed.language}</dd></div>
        <div><dt>Contest</dt><dd>{failed.contestId}</dd></div>
        <div><dt>Problem</dt><dd>{failed.problemIndex}</dd></div>
        <div><dt>Submission</dt><dd>{failed.submissionId}</dd></div>
        <div><dt>Lines</dt><dd>{failed.code.split("\n").length}</dd></div>
      </dl>
    </section>
  );
}

function FingerprintView({ logic, style }: { logic: LogicFingerprint | null; style: StyleFingerprint | null }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <Brain size={17} aria-hidden="true" />
        <span>User Fingerprints</span>
      </div>
      <TagGroup label="Approach" values={logic?.approachTags} />
      <TagGroup label="Data structures" values={logic?.dataStructures} />
      <TagGroup label="Control flow" values={logic?.controlFlowShape} />
      <TagGroup label="Edge signals" values={logic?.edgeCaseSignals} />
      <p className="hint">Complexity: {logic?.complexityHint ?? "unknown"}</p>
      <p className="hint">
        Style: {style?.loopType}, {style?.namingConvention}, {style?.verbosity}, {style?.lineCount ?? 0} lines
      </p>
    </section>
  );
}

function MatchesView({ result }: { result: AnalysisResult }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <Trophy size={17} aria-hidden="true" />
        <span>Top 3 Logic Matches</span>
      </div>
      <div className="matches">
        {result.matchedSubmissions.map((match, index) => (
          <article className="match-card" key={match.submissionId}>
            <strong>#{index + 1} Submission {match.submissionId}</strong>
            <span>{match.language} by {match.userHandle}</span>
            <p>{match.isFallback ? "Fallback only: accepted source code was not readable from Codeforces." : match.reason}</p>
            <div className="logic-summary">
              <strong>Accepted logic</strong>
              <p>{describeAcceptedLogic(match)}</p>
            </div>
            <div className="score-grid">
              <Score label="Total" value={match.totalScore} />
              <Score label="Logic" value={match.logicalScore} />
              <Score label="Token" value={match.tokenScore} />
              <Score label="Style" value={match.styleScore} />
            </div>
            {!match.isFallback && (
              <details className="match-code">
                <summary>Show accepted code</summary>
                <pre>{match.code}</pre>
              </details>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function describeAcceptedLogic(match: AnalysisResult["matchedSubmissions"][number]) {
  const tags = match.logicFingerprint.approachTags;
  const structures = match.logicFingerprint.dataStructures;
  const flow = match.logicFingerprint.controlFlowShape;
  const edges = match.logicFingerprint.edgeCaseSignals;

  const parts: string[] = [];

  if (tags.includes("modular/digit logic")) {
    parts.push("It repeatedly reduces a number by summing its digits until the value becomes a single digit.");
  }
  if (tags.includes("sorting")) {
    parts.push("It sorts the input first, then relies on the sorted order for the main decision logic.");
  }
  if (tags.includes("two pointers")) {
    parts.push("It moves two pointers through the data and updates them based on comparisons.");
  }
  if (tags.includes("dynamic programming")) {
    parts.push("It stores intermediate states in a DP/memo table and builds the answer from previous states.");
  }
  if (tags.includes("graph traversal")) {
    parts.push("It explores graph states with DFS/BFS-style traversal.");
  }
  if (tags.includes("prefix/suffix sums")) {
    parts.push("It precomputes cumulative sums so range/state checks are fast.");
  }
  if (tags.includes("greedy/state optimization")) {
    parts.push("It maintains an answer/state variable and updates it whenever a better local choice is found.");
  }

  if (!parts.length && flow.length) {
    parts.push(`It mainly uses ${flow.join(", ")} to transform the input into the answer.`);
  }

  if (structures.length) {
    parts.push(`Key structures detected: ${structures.join(", ")}.`);
  }

  if (edges.length) {
    parts.push(`Important edge handling: ${edges.join(", ")}.`);
  }

  parts.push(`This candidate scored ${(match.logicalScore * 100).toFixed(0)}% on logic similarity.`);

  return parts.join(" ");
}

function ExplanationView({ explanation }: { explanation: AIExplanation | null }) {
  if (!explanation) return null;

  return (
    <section className="panel">
      <div className="panel-title">
        <Brain size={17} aria-hidden="true" />
        <span>Explanation</span>
      </div>
      <ExplainBlock label="Summary" value={explanation.summary} />
      <ExplainBlock label="Intended algorithm" value={explanation.intendedAlgorithm} />
      <ExplainBlock label="Accepted algorithm" value={explanation.acceptedAlgorithm} />
      <ExplainBlock label="Bug location" value={explanation.bugLocation} />
      <ExplainBlock label="Failing logic" value={explanation.failingLogic} />
      <ExplainBlock label="Logic divergence" value={explanation.logicDivergence} />
      <ExplainBlock label="Matched solution reason" value={explanation.matchedSolutionReason} />
      <ExplainBlock label="Counterexample" value={explanation.counterexample} />
      <ExplainBlock label="Suggested fix" value={explanation.suggestedFix} />
      <ExplainBlock label="Patch guidance" value={explanation.patchGuidance} />
      <ExplainBlock label="Counterexample pattern" value={explanation.counterexamplePattern} />
      <p className="hint">Confidence: {explanation.confidence}</p>
    </section>
  );
}

function CodeView({ failed }: { failed: FailedSubmission }) {
  return (
    <section className="panel code-panel">
      <div className="panel-title">
        <Code2 size={17} aria-hidden="true" />
        <span>Failed Code</span>
      </div>
      <pre>{failed.code}</pre>
    </section>
  );
}

function TagGroup({ label, values }: { label: string; values?: string[] }) {
  return (
    <div className="tag-row">
      <span className="tag-label">{label}</span>
      <div className="tags">
        {values?.length ? values.map((value) => <span key={value}>{value}</span>) : <span>not detected</span>}
      </div>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <b>{label}</b>
      {(value * 100).toFixed(0)}%
    </span>
  );
}

function ExplainBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="explain-block">
      <strong>{label}</strong>
      <p>{value}</p>
    </div>
  );
}
