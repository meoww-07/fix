import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Code2,
  Moon,
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
  deepseekApiKey: "",
  kimiApiKey: "",
  model: "gemini-2.5-flash-lite",
  ollamaUrl: "http://localhost:11434/api/generate",
};

const pipelineSteps = [
  "Detects the current Codeforces Wrong Answer submission.",
  "Reads the failed submission source and problem reference.",
  "Collects the problem statement and readable accepted submissions.",
  "Ranks accepted code by logic, token overlap, and style.",
  "Builds a focused fix explanation.",
];

const ANALYSIS_STATE_KEY = "upsol.latestAnalysis";
const SETTINGS_KEY = "upsol.settings";
const hasChromeRuntime = () => typeof chrome !== "undefined" && Boolean(chrome.runtime?.sendMessage);
const hasChromeStorage = () => typeof chrome !== "undefined" && Boolean(chrome.storage?.local);

const providerDefaultModels: Record<AISettings["provider"], string> = {
  gemini: "gemini-2.5-flash-lite",
  openai: "gpt-4o-mini",
  claude: "claude-3-5-haiku-latest",
  deepseek: "deepseek-v4-flash",
  kimi: "kimi-k2.6",
  ollama: "qwen2.5-coder:7b",
  none: "",
};

const CUSTOM_MODEL_VALUE = "__custom__";

const modelPresets: Partial<Record<AISettings["provider"], string[]>> = {
  gemini: ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro"],
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
  claude: ["claude-3-5-haiku-latest", "claude-3-5-sonnet-latest", "claude-sonnet-4-5"],
  deepseek: ["deepseek-v4-flash", "deepseek-v4-pro"],
  kimi: ["kimi-k2.6", "kimi-k2.5"],
  ollama: ["qwen2.5-coder:7b", "qwen2.5-coder:1.5b", "qwen2.5-coder:14b", "deepseek-coder-v2:16b"],
};

type StoredAnalysisState = {
  status: "idle" | "running" | "complete" | "error";
  result?: AnalysisResult;
  error?: string;
  updatedAt: number;
};

export function App() {
  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [statusMessage, setStatusMessage] = useState("Open a Codeforces Wrong Answer submission page, then analyze.");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (!hasChromeStorage()) {
      setSettingsLoaded(true);
      return;
    }

    chrome.storage.local
      .get<Record<string, StoredAnalysisState | AISettings | undefined>>([ANALYSIS_STATE_KEY, SETTINGS_KEY])
      .then((stored) => {
        const savedSettings = stored[SETTINGS_KEY] as AISettings | undefined;
        if (savedSettings) setSettings({ ...defaultSettings, ...savedSettings });

        const state = stored[ANALYSIS_STATE_KEY] as StoredAnalysisState | undefined;
        if (!state) return;
        if (state.status === "complete" && state.result) {
          setResult(state.result);
          setError("");
          setStatusMessage("Analysis complete. Review the failed submission, explanation, and closest accepted matches.");
        }
        if (state.status === "error" && state.error) {
          setError(state.error);
          setStatusMessage("Analysis stopped before the pipeline could finish.");
        }
      })
      .catch(() => undefined)
      .finally(() => setSettingsLoaded(true));
  }, []);

  useEffect(() => {
    if (!settingsLoaded || !hasChromeStorage()) return;
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }).catch(() => undefined);
  }, [settings, settingsLoaded]);

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
    if (result?.explanationSkipped) return { label: "Code and matches ready", tone: "success" };
    if (result?.explanation) return { label: "Explanation ready", tone: "success" };
    if (result) return { label: "Matches ready", tone: "success" };
    return { label: "Waiting", tone: "neutral" };
  }, [error, result]);

  async function analyzeCurrentPage() {
    setIsLoading(true);
    setError("");
    setResult(null);
    setStatusMessage("Looking for your latest wrong submission and nearby accepted logic...");

    try {
      if (!hasChromeRuntime()) {
        throw new Error("upSol needs to run as the installed Chrome extension to read the current Codeforces tab.");
      }

      const response = await chrome.runtime.sendMessage<{ ok: boolean; result?: AnalysisResult; error?: string }>({
        type: "ANALYZE_CURRENT_TAB",
        settings,
      });

      if (!response.ok || !response.result) {
        throw new Error(response.error ?? "Analysis failed.");
      }

      setResult(response.result);
      setStatusMessage("Analysis complete. Review the failed submission, explanation, and closest accepted matches.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown analysis error.");
      setStatusMessage("Analysis stopped before the pipeline could finish.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="sm-app" data-theme={theme} data-vibe="terminal">
      <div className="sm-panel sm-scroll">
        <header className="sm-toolbar">
          <div className="sm-brand">
            <span className="sm-brand-dot" />
            <span className="sm-brand-name">up<em>Sol</em></span>
          </div>

          <span className="sm-mode-label">Terminal</span>

          <button
            className="sm-theme-btn"
            type="button"
            title="Toggle theme"
            onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
          >
            <Moon size={15} aria-hidden="true" />
          </button>
        </header>

        <div className="sm-content">
          <section className="sm-section sm-intro">
            <div className="sm-sec-head">
              <span className="sm-sec-icon sm-sec-icon--accent"><JengaIcon /></span>
              <h2 className="sm-sec-title">Wrong-answer repair desk</h2>
              <span className="sm-sec-tag">upSol</span>
            </div>
            <p className="sm-note-body">Start from a Codeforces Wrong Answer submission page. upSol reads your failed code, compares accepted logic, and explains the fix.</p>
          </section>

          <button className="sm-run-btn" type="button" onClick={analyzeCurrentPage} disabled={isLoading}>
            {isLoading ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            Analyze page
          </button>

          {error && (
            <section className="sm-alert sm-alert--fail">
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{error}</span>
            </section>
          )}

          <section className={`sm-alert sm-alert--${status.tone}`}>
            {status.tone === "success" ? <CheckCircle2 size={18} aria-hidden="true" /> : <Route size={18} aria-hidden="true" />}
            <div>
              <strong>{status.label}</strong>
              <span>{statusMessage}</span>
            </div>
          </section>

          <section className="sm-note sm-note--plain">
            <p className="sm-note-body">If Codeforces blocks source scraping, open 1-3 accepted submission source pages in tabs first. upSol will use those as candidates.</p>
          </section>

          <section className="sm-section settings-panel">
        <div className="sm-sec-head">
          <span className="sm-sec-icon sm-sec-icon--accent"><KeyRound size={15} aria-hidden="true" /></span>
          <h2 className="sm-sec-title">AI Settings</h2>
        </div>
        <label>
          Provider
          <select
            value={settings.provider}
            onChange={(event) => {
              const provider = event.target.value as AISettings["provider"];
              setSettings({ ...settings, provider, model: providerDefaultModels[provider] });
            }}
          >
            <option value="gemini">Gemini API key setup</option>
            <option value="openai">OpenAI API key</option>
            <option value="claude">Claude API key</option>
            <option value="deepseek">DeepSeek API key</option>
            <option value="kimi">Kimi API key</option>
            <option value="ollama">Ollama local setup</option>
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
            <ModelPicker settings={settings} setSettings={setSettings} />
            <p className="hint">You can change the model name here, or keep gemini-2.5-flash-lite.</p>
            <div className="setup-guide">
              <strong>How to set up the API key</strong>
              <ol>
                <li>Open <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio API keys</a>.</li>
                <li>Sign in with Google.</li>
                <li>Click Create API key, then copy the generated key.</li>
                <li>Paste it in the Gemini API key box above.</li>
                <li>Open a Codeforces Wrong Answer submission page and click Analyze page.</li>
              </ol>
              <p>Keep the key private. Do not commit it to GitHub or share screenshots that show it.</p>
            </div>
          </>
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
            <ModelPicker settings={settings} setSettings={setSettings} />
            <p className="hint">You can change the model name here, or keep gpt-4o-mini.</p>
            <div className="setup-guide">
              <strong>How to set up the OpenAI API key</strong>
              <ol>
                <li>Open <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">OpenAI API keys</a>.</li>
                <li>Sign in with your OpenAI account.</li>
                <li>Click Create new secret key, then copy the key immediately.</li>
                <li>Paste it in the OpenAI API key box above.</li>
                <li>Open a Codeforces Wrong Answer submission page and click Analyze page.</li>
              </ol>
              <p>Secret keys are only shown once. Keep the key private and do not commit it to GitHub.</p>
            </div>
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
            <ModelPicker settings={settings} setSettings={setSettings} />
            <p className="hint">You can change the model name here, or keep claude-3-5-haiku-latest.</p>
            <div className="setup-guide">
              <strong>How to set up the Claude API key</strong>
              <ol>
                <li>Open <a href="https://platform.claude.com/" target="_blank" rel="noreferrer">Claude Console</a>.</li>
                <li>Sign in and create or select a project.</li>
                <li>Create an API key in the console, then copy it.</li>
                <li>Paste it in the Claude API key box above.</li>
                <li>Open a Codeforces Wrong Answer submission page and click Analyze page.</li>
              </ol>
              <p>Keep the key private. Do not commit it to GitHub or share screenshots that show it.</p>
            </div>
          </>
        )}
        {settings.provider === "deepseek" && (
          <>
            <label>
              DeepSeek API key
              <input
                type="password"
                value={settings.deepseekApiKey}
                onChange={(event) => setSettings({ ...settings, deepseekApiKey: event.target.value, apiKey: event.target.value })}
                placeholder="sk-..."
              />
            </label>
            <ModelPicker settings={settings} setSettings={setSettings} />
            <p className="hint">You can change the model name here. Use deepseek-v4-flash for speed or deepseek-v4-pro for stronger reasoning.</p>
            <div className="setup-guide">
              <strong>How to set up the DeepSeek API key</strong>
              <ol>
                <li>Open <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer">DeepSeek API keys</a>.</li>
                <li>Sign in with your DeepSeek account.</li>
                <li>Create an API key, then copy it.</li>
                <li>Paste it in the DeepSeek API key box above.</li>
                <li>Open a Codeforces Wrong Answer submission page and click Analyze page.</li>
              </ol>
              <p>DeepSeek uses an OpenAI-compatible API. Keep the key private and do not commit it to GitHub.</p>
            </div>
          </>
        )}
        {settings.provider === "kimi" && (
          <>
            <label>
              Kimi API key
              <input
                type="password"
                value={settings.kimiApiKey}
                onChange={(event) => setSettings({ ...settings, kimiApiKey: event.target.value, apiKey: event.target.value })}
                placeholder="sk-..."
              />
            </label>
            <ModelPicker settings={settings} setSettings={setSettings} />
            <p className="hint">You can change the model name here. Kimi currently recommends kimi-k2.6 for continued support.</p>
            <div className="setup-guide">
              <strong>How to set up the Kimi API key</strong>
              <ol>
                <li>Open <a href="https://platform.kimi.ai/" target="_blank" rel="noreferrer">Kimi API Platform</a>.</li>
                <li>Sign in with your Moonshot/Kimi account.</li>
                <li>Create an API key, then copy it.</li>
                <li>Paste it in the Kimi API key box above.</li>
                <li>Open a Codeforces Wrong Answer submission page and click Analyze page.</li>
              </ol>
              <p>Kimi uses an OpenAI-compatible API. Keep the key private and do not commit it to GitHub.</p>
            </div>
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
            <ModelPicker settings={settings} setSettings={setSettings} />
            <p className="hint">
              Keep Ollama running locally. Recommended 7B model: qwen2.5-coder:7b.
              If you see 403, allow Chrome extension origins with OLLAMA_ORIGINS.
            </p>
            <div className="setup-guide">
              <strong>How to set up Ollama</strong>
              <ol>
                <li>Install Ollama from <a href="https://ollama.com/download/windows" target="_blank" rel="noreferrer">Ollama for Windows</a>.</li>
                <li>Open PowerShell and run <code>ollama run qwen2.5-coder:7b</code>.</li>
                <li>Keep Ollama running at <code>http://localhost:11434/api/generate</code>.</li>
                <li>Paste that URL above if it is not already filled in.</li>
                <li>Open a Codeforces Wrong Answer submission page and click Analyze page.</li>
              </ol>
              <p>Ollama runs locally on your computer. Larger models need more RAM/CPU/GPU power.</p>
            </div>
          </>
        )}
        {settings.provider === "none" && (
          <div className="setup-guide">
            <strong>How No AI mode works</strong>
            <ol>
              <li>Select No AI mode.</li>
              <li>Open a Codeforces Wrong Answer submission page.</li>
              <li>Click Analyze page.</li>
              <li>Review the fetched wrong code and closest accepted matches.</li>
              <li>No AI explanation will be generated.</li>
            </ol>
            <p>No API key is needed. upSol only fetches code, detects logic signals, and ranks accepted matches.</p>
          </div>
        )}
      </section>

      <section className="sm-section">
        <div className="sm-sec-head">
          <span className="sm-sec-icon sm-sec-icon--accent"><Route size={15} aria-hidden="true" /></span>
          <h2 className="sm-sec-title">Pipeline</h2>
        </div>
        <ol className="step-list">
          {pipelineSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      {result && (
        <>
          <SubmissionSummary failed={result.failedSubmission} />
          {result.explanationSkipped && (
            <section className="sm-note sm-note--plain">
              <p className="sm-note-body">
                {result.explanationError
                  ? `upSol fetched code and logic matches, but the AI explanation failed: ${result.explanationError}`
                  : "upSol fetched code and logic matches only. No AI explanation was generated."}
              </p>
            </section>
          )}
          <ExplanationView explanation={result.explanation} />
          <MatchesView result={result} />
          <FingerprintView logic={failedLogic} style={failedStyle} />
          <CodeView failed={result.failedSubmission} />
        </>
      )}
        </div>
      </div>
    </main>
  );
}

function ModelPicker({
  settings,
  setSettings,
}: {
  settings: AISettings;
  setSettings: (settings: AISettings) => void;
}) {
  const presets = modelPresets[settings.provider] ?? [];

  if (!presets.length) {
    return null;
  }

  const isPreset = presets.includes(settings.model);
  const selectValue = isPreset ? settings.model : CUSTOM_MODEL_VALUE;
  const placeholder = providerDefaultModels[settings.provider] || "model-name";

  return (
    <>
      <label>
        Model
        <select
          value={selectValue}
          onChange={(event) => {
            const value = event.target.value;
            setSettings({
              ...settings,
              model: value === CUSTOM_MODEL_VALUE ? "" : value,
            });
          }}
        >
          {presets.map((model) => (
            <option value={model} key={model}>{model}</option>
          ))}
          <option value={CUSTOM_MODEL_VALUE}>Custom model</option>
        </select>
      </label>

      {selectValue === CUSTOM_MODEL_VALUE && (
        <label>
          Custom model
          <input
            value={settings.model}
            onChange={(event) => setSettings({ ...settings, model: event.target.value })}
            placeholder={placeholder}
          />
        </label>
      )}
    </>
  );
}

function JengaIcon() {
  return (
    <svg viewBox="0 0 24 24" height="24" width="24" aria-hidden="true">
      <path d="M1.583 18h2s1 0 1 1v2s0 1 -1 1h-2s-1 0 -1 -1v-2s0 -1 1 -1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
      <path d="M10.583 18h3s1 0 1 1v2s0 1 -1 1h-3s-1 0 -1 -1v-2s0 -1 1 -1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
      <path d="M5.583 10h3s1 0 1 1v2s0 1 -1 1h-3s-1 0 -1 -1v-2s0 -1 1 -1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
      <path d="M5.583 2h3s1 0 1 1v2s0 1 -1 1h-3s-1 0 -1 -1V3s0 -1 1 -1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
      <path d="M10.583 2h3s1 0 1 1v2s0 1 -1 1h-3s-1 0 -1 -1V3s0 -1 1 -1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
      <path d="M1.583 14h12s1 0 1 1v2s0 1 -1 1h-12s-1 0 -1 -1v-2s0 -1 1 -1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
      <path d="M14.583 9.66V7a1 1 0 0 0 -1 -1h-12a1 1 0 0 0 -1 1v2a1 1 0 0 0 1 1h12.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
      <path d="M23.011 20.22a1 1 0 0 0 0.211 -1.4L16.4 9.565a1 1 0 0 0 -1.4 -0.211l-1.61 1.187a1 1 0 0 0 -0.211 1.4L20 21.2a1 1 0 0 0 1.4 0.211Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
    </svg>
  );
}

function SubmissionSummary({ failed }: { failed: FailedSubmission }) {
  return (
    <section className="sm-section">
      <div className="sm-sec-head">
        <span className="sm-sec-icon sm-sec-icon--fail"><FileCode2 size={15} aria-hidden="true" /></span>
        <h2 className="sm-sec-title">Failed Submission</h2>
        <span className="sm-badge-failed"><span className="sm-dot" />FAILED</span>
      </div>
      <div className="sm-verdict-card">
        <div className="sm-label">Verdict</div>
        <div className="sm-verdict-value">{failed.verdict}</div>
      </div>
      <dl className="sm-meta-grid">
        <div className="sm-meta-item"><dt className="sm-label">Language</dt><dd className="sm-meta-value">{failed.language}</dd></div>
        <div className="sm-meta-item"><dt className="sm-label">Contest</dt><dd className="sm-meta-value">{failed.contestId}</dd></div>
        <div className="sm-meta-item"><dt className="sm-label">Problem</dt><dd className="sm-meta-value">{failed.problemIndex}</dd></div>
        <div className="sm-meta-item"><dt className="sm-label">Submission</dt><dd className="sm-meta-value">{failed.submissionId}</dd></div>
        <div className="sm-meta-item"><dt className="sm-label">Lines</dt><dd className="sm-meta-value">{failed.code.split("\n").length}</dd></div>
      </dl>
    </section>
  );
}

function FingerprintView({ logic, style }: { logic: LogicFingerprint | null; style: StyleFingerprint | null }) {
  return (
    <section className="sm-section">
      <div className="sm-sec-head">
        <span className="sm-sec-icon sm-sec-icon--accent"><Brain size={15} aria-hidden="true" /></span>
        <h2 className="sm-sec-title">User Fingerprints</h2>
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
    <section className="sm-section">
      <div className="sm-sec-head">
        <span className="sm-sec-icon sm-sec-icon--accent"><Trophy size={15} aria-hidden="true" /></span>
        <h2 className="sm-sec-title">Closest Accepted</h2>
        <span className="sm-sec-tag">{result.matchedSubmissions.length} found</span>
      </div>
      <div className="sm-matches">
        {result.matchedSubmissions.map((match, index) => (
          <article className="sm-match-card" key={match.submissionId}>
            <div className="sm-match-header">
              <ScoreRing value={match.totalScore} />
              <div className="sm-match-info">
                <div className="sm-match-title-row">
                  <span className="sm-match-rank">#{index + 1}</span>
                  <span className="sm-match-sub">Submission {match.submissionId}</span>
                </div>
                <div className="sm-match-meta">{match.language} · <span className="sm-author">{match.userHandle}</span></div>
                <div className="sm-match-qual">
                  <span className="sm-dot" style={{ background: match.totalScore >= 0.4 ? "#e8973a" : "#ff5fa8" }} />
                  {match.totalScore >= 0.4 ? "Partial" : "Weak"} match
                </div>
              </div>
            </div>
            <div className="sm-bars">
              <MetricBar label="Logic" value={match.logicalScore} tone="pink" />
              <MetricBar label="Token" value={match.tokenScore} tone="orange" />
              <MetricBar label="Style" value={match.styleScore} tone="lime" />
            </div>
            <div className="sm-logic-block">
              <div className="sm-logic-label">Accepted logic</div>
              <p className="sm-logic-body">{describeAcceptedLogic(match)}</p>
              {!match.isFallback && (
                <details className="match-code">
                  <summary className="sm-toggle-btn">Show accepted code</summary>
                  <pre className="sm-code-block sm-scroll">{match.code}</pre>
                </details>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ScoreRing({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  const circumference = 163.36;
  const offset = circumference - (circumference * percent) / 100;
  const color = percent >= 55 ? "#cbe94a" : percent >= 40 ? "#e8973a" : "#ff5fa8";
  return (
    <div className="sm-ring-wrap">
      <svg width="60" height="60" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--track)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="sm-ring-center">
        <span className="sm-ring-total">{percent}</span>
        <span className="sm-ring-label">Total</span>
      </div>
    </div>
  );
}

function MetricBar({ label, value, tone }: { label: string; value: number; tone: "pink" | "orange" | "lime" }) {
  return (
    <div>
      <div className="sm-bar-head">
        <span className="sm-bar-label">{label}</span>
        <span className="sm-bar-value" style={{ color: tone === "pink" ? "#ff5fa8" : tone === "orange" ? "#e8973a" : "#cbe94a" }}>
          {Math.round(value * 100)}%
        </span>
      </div>
      <div className="sm-bar-track">
        <div
          className="sm-bar-fill"
          style={{
            width: `${Math.round(value * 100)}%`,
            background: tone === "pink" ? "#ff5fa8" : tone === "orange" ? "#e8973a" : "#cbe94a",
          }}
        />
      </div>
    </div>
  );
}

function describeAcceptedLogic(match: AnalysisResult["matchedSubmissions"][number]) {
  const tags = match.logicFingerprint.approachTags;
  const structures = match.logicFingerprint.dataStructures;
  const flow = match.logicFingerprint.controlFlowShape;
  const edges = match.logicFingerprint.edgeCaseSignals;

  const parts: string[] = [];

  if (tags.includes("modular/digit logic")) {
    parts.push("It uses modular arithmetic or digit-style operations.");
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

  if (!parts.length) {
    parts.push("Only weak structural signals were detected for this candidate.");
  }

  parts.push(`Logic similarity score: ${(match.logicalScore * 100).toFixed(0)}%.`);

  return parts.join(" ");
}

function ExplanationView({ explanation }: { explanation: AIExplanation | null }) {
  if (!explanation) return null;

  return (
    <section className="sm-section">
      <div className="sm-sec-head">
        <span className="sm-sec-icon sm-sec-icon--accent"><Brain size={15} aria-hidden="true" /></span>
        <h2 className="sm-sec-title">Explanation</h2>
        <span className="sm-sec-tag">logic-first</span>
      </div>
      <div className="sm-notes">
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
      </div>
    </section>
  );
}

function CodeView({ failed }: { failed: FailedSubmission }) {
  return (
    <section className="sm-section code-panel">
      <div className="sm-sec-head">
        <span className="sm-sec-icon sm-sec-icon--fail"><Code2 size={15} aria-hidden="true" /></span>
        <h2 className="sm-sec-title">Failed Code</h2>
      </div>
      <pre className="sm-code-block sm-scroll">{failed.code}</pre>
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

function ExplainBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="sm-note">
      <span className="sm-note-bar" />
      <div className="sm-note-head">
        <span className="sm-note-title">{label}</span>
        <span className="sm-note-tag">info</span>
      </div>
      <p className="sm-note-body">{value}</p>
    </div>
  );
}
