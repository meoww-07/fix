import { explainDiff } from "../lib/ai";
import { scrapeProblemStatement } from "../lib/codeforces";
import { extractLogicFingerprint, extractStyleFingerprint } from "../lib/fingerprint";
import { hybridSearch } from "../lib/matcher";
import type {
  AcceptedSubmission,
  AISettings,
  AnalysisResult,
  FailedSubmission,
  ProblemStatement,
} from "../lib/types";

type DetectionResult = { ok: boolean; reason: string; pageType?: "submission" | "problem" };
type AcceptedMeta = {
  submissionId: string;
  userHandle: string;
  language: string;
  sourceUrl: string;
};
type ProblemPageContext = {
  contestId: string;
  problemIndex: string;
  problemUrl: string;
  viewerHandle: string;
  problemStatement: ProblemStatement;
};
type CodeforcesStatusApiResponse = {
  status: string;
  result?: Array<{
    id: number;
    creationTimeSeconds?: number;
    programmingLanguage?: string;
    verdict?: string;
    author?: {
      members?: Array<{ handle?: string }>;
      participantType?: string;
    };
    problem?: {
      contestId?: number;
      index?: string;
    };
  }>;
  comment?: string;
};
type RawAcceptedSource = {
  submissionId: string;
  userHandle: string;
  language: string;
  code: string;
  codeLength: number;
  sourceUrl: string;
};
type AnalyzeMessage = {
  type: "ANALYZE_CURRENT_TAB";
  settings: AISettings;
};
type StoredAnalysisState = {
  status: "idle" | "running" | "complete" | "error";
  result?: AnalysisResult;
  error?: string;
  updatedAt: number;
};

const ANALYSIS_STATE_KEY = "upsol.latestAnalysis";

function languageFamily(language: string) {
  const value = language.toLowerCase();
  if (value.includes("c++") || value.includes("gcc") || value.includes("clang")) return "cpp";
  if (value.includes("python") || value.includes("pypy")) return "python";
  if (value.includes("java")) return "java";
  if (value.includes("kotlin")) return "kotlin";
  if (value.includes("rust")) return "rust";
  if (value.includes("go")) return "go";
  if (value.includes("c#")) return "csharp";
  return value.split(/\s+/)[0] || "unknown";
}

async function queryActiveTab() {
  const tabs = await new Promise<Array<{ id?: number; url?: string }>>((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, resolve);
  });
  const tabId = tabs[0]?.id;
  if (!tabId) throw new Error("No active tab found.");
  return tabId;
}

async function queryCodeforcesSubmissionTabs() {
  return await new Promise<Array<{ id?: number; url?: string }>>((resolve) => {
    chrome.tabs.query({ url: "https://codeforces.com/*/submission/*" }, resolve);
  });
}

async function ensureContentScript(tabId: number) {
  try {
    const ping = await chrome.tabs.sendMessage<{ ok?: boolean }>(tabId, { type: "PING" });
    if (ping?.ok) return;
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["contentScript.js"] });
  }
}

async function sendToTab<T>(tabId: number, message: unknown) {
  await ensureContentScript(tabId);
  return chrome.tabs.sendMessage<T>(tabId, message);
}

async function waitForTabComplete(tabId: number) {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error(`Temporary tab ${tabId} did not finish loading.`));
    }, 20000);
    const listener = (updatedTabId: number, changeInfo: { status?: string }) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function scrapeTemporaryTab<T>(url: string, message: unknown) {
  const tab = await chrome.tabs.create({ url, active: false });
  const tabId = tab.id;
  if (!tabId) throw new Error(`Could not open temporary tab for ${url}`);

  try {
    await waitForTabComplete(tabId);
    await new Promise((resolve) => setTimeout(resolve, 450));
    return await sendToTab<T>(tabId, message);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "unknown error";
    throw new Error(`Could not scrape ${url}: ${messageText}`);
  } finally {
    await chrome.tabs.remove(tabId).catch(() => undefined);
  }
}

async function saveAnalysisState(state: Omit<StoredAnalysisState, "updatedAt">) {
  await chrome.storage.local.set({
    [ANALYSIS_STATE_KEY]: {
      ...state,
      updatedAt: Date.now(),
    },
  });
}

async function getProblemStatement(failed: FailedSubmission): Promise<ProblemStatement> {
  try {
    return await scrapeProblemStatement(failed.contestId, failed.problemIndex);
  } catch {
    const problemUrl = `https://codeforces.com/problemset/problem/${failed.contestId}/${failed.problemIndex}`;
    return scrapeTemporaryTab<ProblemStatement>(problemUrl, { type: "SCRAPE_PROBLEM_STATEMENT" });
  }
}

async function getAcceptedMeta(failed: FailedSubmission) {
  const fromApi = await getAcceptedMetaFromApi(failed);
  if (fromApi.length) return fromApi;

  const urls: string[] = [];

  for (let page = 1; page <= 8; page += 1) {
    urls.push(`https://codeforces.com/contest/${failed.contestId}/status/${failed.problemIndex}/page/${page}?order=BY_ARRIVED_DESC`);
    urls.push(`https://codeforces.com/problemset/status/${failed.contestId}/problem/${failed.problemIndex}/page/${page}?order=BY_ARRIVED_DESC`);
  }

  const allMeta: AcceptedMeta[] = [];
  const seen = new Set<string>();

  for (const url of urls) {
    try {
      const meta = await scrapeTemporaryTab<AcceptedMeta[]>(url, { type: "SCRAPE_ACCEPTED_META", limit: 40 });
      for (const item of meta) {
        if (seen.has(item.submissionId)) continue;
        seen.add(item.submissionId);
        allMeta.push(item);
      }

      if (allMeta.length >= 80) break;
    } catch (error) {
      console.warn(error);
      // Try next Codeforces status URL shape.
    }
  }

  return allMeta;
}

async function getAcceptedMetaFromApi(failed: FailedSubmission): Promise<AcceptedMeta[]> {
  const apiUrl = `https://codeforces.com/api/contest.status?contestId=${failed.contestId}&from=1&count=200`;

  try {
    const data = await fetch(apiUrl).then(async (response) => {
      if (!response.ok) throw new Error(`Codeforces API failed: ${response.status}`);
      return (await response.json()) as CodeforcesStatusApiResponse;
    });

    if (data.status !== "OK" || !data.result) return [];

    const seen = new Set<string>();
    const accepted: AcceptedMeta[] = [];

    for (const submission of data.result) {
      const problemMatches =
        String(submission.problem?.contestId ?? failed.contestId) === failed.contestId &&
        submission.problem?.index?.toUpperCase() === failed.problemIndex.toUpperCase();

      if (!problemMatches || submission.verdict !== "OK") continue;

      const submissionId = String(submission.id);
      if (seen.has(submissionId)) continue;
      seen.add(submissionId);

      accepted.push({
        submissionId,
        userHandle: submission.author?.members?.[0]?.handle ?? submission.author?.participantType ?? "unknown",
        language: submission.programmingLanguage ?? "Unknown language",
        sourceUrl: `https://codeforces.com/contest/${failed.contestId}/submission/${submissionId}`,
      });

      if (accepted.length >= 80) break;
    }

    return accepted;
  } catch (error) {
    console.warn(error);
    return [];
  }
}

async function getAcceptedSources(failed: FailedSubmission) {
  const openedSources = await getAcceptedSourcesFromOpenTabs(failed);
  if (openedSources.length >= 1) return openedSources.slice(0, 3);

  const meta = await getAcceptedMeta(failed);
  if (!meta.length) {
    throw new Error(
      `No accepted rows were found on Codeforces status pages for ${failed.contestId}${failed.problemIndex}.`
    );
  }
  const userFamily = languageFamily(failed.language);
  const sameLanguage = meta.filter((item) => languageFamily(item.language) === userFamily);

  if (userFamily !== "unknown" && !sameLanguage.length) {
    throw new Error(
      `Accepted rows were found, but none matched the failed submission language family (${failed.language}).`
    );
  }

  const candidates = (userFamily === "unknown" ? meta : sameLanguage).slice(0, 60);
  const sources: AcceptedSubmission[] = [];

  for (const item of candidates) {
    try {
      const raw = await scrapeTemporaryTab<RawAcceptedSource>(item.sourceUrl, { type: "SCRAPE_SUBMISSION_SOURCE" });
      if (!raw.code) continue;

      sources.push({
        ...raw,
        userHandle: raw.userHandle || item.userHandle,
        language: raw.language === "Unknown language" ? item.language : raw.language,
        logicFingerprint: extractLogicFingerprint(raw.code),
        styleFingerprint: extractStyleFingerprint(raw.code, raw.language === "Unknown language" ? item.language : raw.language),
      });

      if (sources.length >= 3) break;
    } catch (error) {
      console.warn(error);
      // Individual accepted source pages can be hidden or rate-limited. Continue with readable ones.
    }
  }

  return sources.filter((source) => userFamily === "unknown" || languageFamily(source.language) === userFamily);
}

async function getAcceptedSourcesFromOpenTabs(failed: FailedSubmission) {
  const tabs = await queryCodeforcesSubmissionTabs();
  const sources: AcceptedSubmission[] = [];
  const userFamily = languageFamily(failed.language);
  const failedSubmissionId = failed.submissionId;

  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue;
    if (failedSubmissionId && tab.url.includes(`/submission/${failedSubmissionId}`)) continue;
    if (!tab.url.includes(`/contest/${failed.contestId}/submission/`)) continue;

    try {
      const raw = await sendToTab<RawAcceptedSource>(tab.id, { type: "SCRAPE_SUBMISSION_SOURCE" });
      if (!raw.code) continue;
      const language = raw.language === "Unknown language" ? failed.language : raw.language;
      if (userFamily !== "unknown" && languageFamily(language) !== userFamily) continue;

      sources.push({
        ...raw,
        language,
        logicFingerprint: extractLogicFingerprint(raw.code),
        styleFingerprint: extractStyleFingerprint(raw.code, language),
      });

      if (sources.length >= 3) break;
    } catch (error) {
      console.warn(error);
    }
  }

  return sources;
}

function normalizeVerdict(verdict?: string) {
  if (!verdict) return "";
  return verdict.replace(/_/g, " ").toLowerCase();
}

async function getLatestWrongSubmissionFromProblemPage(context: ProblemPageContext): Promise<FailedSubmission> {
  if (!context.viewerHandle) {
    throw new Error(
      "This problem page was detected, but upSol could not find your Codeforces handle. Sign in to Codeforces, then try again from the problem page."
    );
  }

  const apiUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(context.viewerHandle)}&from=1&count=500`;
  const data = await fetch(apiUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Codeforces user status failed: ${response.status}`);
    return (await response.json()) as CodeforcesStatusApiResponse;
  });

  if (data.status !== "OK" || !data.result) {
    throw new Error(data.comment ?? "Codeforces did not return your recent submissions.");
  }

  const latestWrong = data.result
    .filter((submission) => {
      const problemMatches =
        String(submission.problem?.contestId ?? "") === context.contestId &&
        submission.problem?.index?.toUpperCase() === context.problemIndex.toUpperCase();
      return problemMatches && normalizeVerdict(submission.verdict).includes("wrong answer");
    })
    .sort((a, b) => (b.creationTimeSeconds ?? 0) - (a.creationTimeSeconds ?? 0))[0];

  if (!latestWrong) {
    throw new Error(
      `No recent Wrong Answer submission was found for ${context.contestId}${context.problemIndex} under ${context.viewerHandle}.`
    );
  }

  const sourceUrl = `https://codeforces.com/contest/${context.contestId}/submission/${latestWrong.id}`;
  const raw = await scrapeTemporaryTab<RawAcceptedSource>(sourceUrl, { type: "SCRAPE_SUBMISSION_SOURCE" });

  if (!raw.code) {
    throw new Error(`Found submission ${latestWrong.id}, but Codeforces did not expose its source code in this session.`);
  }

  return {
    url: sourceUrl,
    contestId: context.contestId,
    problemIndex: context.problemIndex,
    submissionId: String(latestWrong.id),
    verdict: latestWrong.verdict ? latestWrong.verdict.replace(/_/g, " ") : "Wrong answer",
    language: latestWrong.programmingLanguage ?? raw.language ?? "Unknown language",
    code: raw.code,
  };
}

async function analyzeCurrentTab(settings: AISettings): Promise<AnalysisResult> {
  await saveAnalysisState({ status: "running" });
  const tabId = await queryActiveTab();

  const detection = await sendToTab<DetectionResult>(tabId, { type: "DETECT_ANALYZABLE_PAGE" });
  if (!detection.ok) throw new Error(detection.reason);

  const problemContext =
    detection.pageType === "problem"
      ? await sendToTab<ProblemPageContext>(tabId, { type: "SCRAPE_PROBLEM_PAGE_CONTEXT" })
      : null;
  const failedSubmission =
    detection.pageType === "problem" && problemContext
      ? await getLatestWrongSubmissionFromProblemPage(problemContext)
      : await sendToTab<FailedSubmission>(tabId, { type: "SCRAPE_FAILED_CODE" });

  if (!failedSubmission.code) throw new Error("Failed source code was not found on the page.");
  if (!failedSubmission.contestId || !failedSubmission.problemIndex) {
    throw new Error("Could not detect contest ID or problem index from this submission.");
  }

  const problemStatement =
    problemContext?.problemStatement?.rawText || problemContext?.problemStatement?.statement
      ? problemContext.problemStatement
      : await getProblemStatement(failedSubmission);
  let acceptedSubmissions: AcceptedSubmission[] = [];
  try {
    acceptedSubmissions = await getAcceptedSources(failedSubmission);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown accepted-submission collector error.";
    throw new Error(`Step 4 failed: ${detail}`);
  }

  if (!acceptedSubmissions.length) {
    throw new Error(
      "No accepted source code could be collected. Codeforces blocked or hid the accepted submission source pages in this browser session."
    );
  }

  const userLogic = extractLogicFingerprint(failedSubmission.code);
  const userStyle = extractStyleFingerprint(failedSubmission.code, failedSubmission.language);
  const matchedSubmissions = hybridSearch(failedSubmission, userLogic, userStyle, acceptedSubmissions).slice(0, 3);
  const explanation = await explainDiff(failedSubmission, problemStatement, matchedSubmissions, settings);

  const result = {
    failedSubmission,
    problemStatement,
    acceptedSubmissions,
    matchedSubmissions,
    explanation,
  };

  await saveAnalysisState({ status: "complete", result });
  return result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const request = message as Partial<AnalyzeMessage>;

  if (request.type !== "ANALYZE_CURRENT_TAB") return;

  analyzeCurrentTab(request.settings as AISettings)
    .then((result) => sendResponse({ ok: true, result }))
    .catch(async (error) => {
      const message = error instanceof Error ? error.message : "Unknown analysis error.";
      await saveAnalysisState({ status: "error", error: message });
      sendResponse({ ok: false, error: message });
    });

  return true;
});
