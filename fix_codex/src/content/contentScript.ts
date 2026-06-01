import type { FailedSubmission, ProblemStatement } from "../lib/types";

type DetectionResult = { ok: boolean; reason: string };
type SourceResult = {
  submissionId: string;
  userHandle: string;
  language: string;
  code: string;
  codeLength: number;
  sourceUrl: string;
};
type AcceptedMeta = {
  submissionId: string;
  userHandle: string;
  language: string;
  sourceUrl: string;
};

function cleanText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function languageFromRow(row: Element | null) {
  const cells = Array.from(row?.querySelectorAll("td") ?? []).map((cell) => cleanText(cell.textContent ?? ""));
  return (
    cells.find((cell) => /GNU C\+\+|C\+\+\d+|Clang\+\+|PyPy|Python|Java|Kotlin|C#|Go|Rust/i.test(cell)) ??
    "Unknown language"
  );
}

function detectWrongAnswerPage(): DetectionResult {
  const url = window.location.href;
  const text = document.body.innerText;

  if (!location.hostname.includes("codeforces.com")) return { ok: false, reason: "This is not a Codeforces page." };
  if (!/\/submission\/\d+/i.test(url)) return { ok: false, reason: "Open a Codeforces submission page." };
  if (!/Wrong answer|WRONG_ANSWER/i.test(text)) return { ok: false, reason: "This submission does not look like a Wrong Answer." };
  if (!document.querySelector("#program-source-text")) return { ok: false, reason: "Could not find submitted source code." };

  return { ok: true, reason: "Wrong Answer submission detected." };
}

function scrapeFailedCode(): FailedSubmission {
  const url = window.location.href;
  const text = document.body.innerText;
  const sourceElement = document.querySelector<HTMLElement>("#program-source-text");
  const code = sourceElement?.innerText?.trim() || sourceElement?.textContent?.trim() || "";
  const problemLink = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href*='/problem/']")).find((link) =>
    /\/(contest|problemset)\/\d+\/problem\/[A-Z0-9]+/i.test(link.href)
  );
  const problemMatch = problemLink?.href.match(/\/(?:contest|problemset)\/(\d+)\/problem\/([A-Z0-9]+)/i);
  const submissionMatch =
    url.match(/\/contest\/(\d+)\/submission\/(\d+)/i) ??
    url.match(/\/problemset\/submission\/(\d+)\/(\d+)/i);
  const currentRow = Array.from(document.querySelectorAll("table.status-frame-datatable tr")).find((row) =>
    row.textContent?.includes(submissionMatch?.[2] ?? "")
  );
  const verdictMatch = text.match(/Wrong answer(?:\s+on\s+test\s+\d+)?|WRONG_ANSWER|Accepted|Runtime error|Time limit exceeded/i);

  return {
    url,
    contestId: problemMatch?.[1] ?? submissionMatch?.[1] ?? "",
    problemIndex: problemMatch?.[2] ?? "",
    submissionId: submissionMatch?.[2] ?? "",
    verdict: verdictMatch?.[0] ?? "Unknown verdict",
    language: languageFromRow(currentRow ?? null),
    code,
  };
}

function scrapeAcceptedMeta(limit = 30): AcceptedMeta[] {
  const rows = Array.from(document.querySelectorAll("table.status-frame-datatable tr"));
  const seen = new Set<string>();
  const accepted: AcceptedMeta[] = [];

  for (const row of rows) {
    const rowText = cleanText(row.textContent ?? "");
    if (!/\b(Accepted|OK)\b/.test(rowText)) continue;

    const sourceLink = Array.from(row.querySelectorAll<HTMLAnchorElement>("a[href*='/submission/']")).find((link) =>
      /\/submission\/\d+/i.test(link.href)
    );
    const submissionId = sourceLink?.href.match(/\/submission\/(\d+)/i)?.[1];
    if (!sourceLink || !submissionId || seen.has(submissionId)) continue;

    seen.add(submissionId);
    accepted.push({
      submissionId,
      userHandle: row.querySelector<HTMLAnchorElement>("a[href*='/profile/']")?.textContent?.trim() ?? "unknown",
      language: languageFromRow(row),
      sourceUrl: sourceLink.href,
    });

    if (accepted.length >= limit) break;
  }

  return accepted;
}

function scrapeCurrentSubmissionSource(): SourceResult {
  const url = window.location.href;
  const sourceElement = document.querySelector<HTMLElement>("#program-source-text");
  const code = sourceElement?.innerText?.trim() || sourceElement?.textContent?.trim() || "";
  const submissionMatch = url.match(/\/submission\/(\d+)/i);
  const row = document.querySelector("table.status-frame-datatable tr");

  return {
    submissionId: submissionMatch?.[1] ?? "",
    userHandle: document.querySelector<HTMLAnchorElement>("a[href*='/profile/']")?.textContent?.trim() ?? "unknown",
    language: languageFromRow(row ?? null),
    code,
    codeLength: code.length,
    sourceUrl: url,
  };
}

function scrapeProblemStatementFromPage(): ProblemStatement {
  const statement = document.querySelector(".problem-statement");
  const title = cleanText(statement?.querySelector(".title")?.textContent ?? document.title);
  const inputFormat = cleanText(statement?.querySelector(".input-specification")?.textContent ?? "");
  const outputFormat = cleanText(statement?.querySelector(".output-specification")?.textContent ?? "");
  const examples = Array.from(statement?.querySelectorAll(".sample-tests .input, .sample-tests .output") ?? []).map((node) =>
    cleanText(node.textContent ?? "")
  );
  const notes = cleanText(statement?.querySelector(".note")?.textContent ?? "");
  const rawText = cleanText(statement?.textContent ?? document.body.innerText);

  return {
    title,
    statement: rawText,
    inputFormat,
    outputFormat,
    examples,
    notes,
    rawText,
    url: window.location.href,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const request = message as { type?: string; limit?: number };

  if (request.type === "PING") {
    sendResponse({ ok: true, page: window.location.href });
    return;
  }

  if (request.type === "DETECT_WRONG_ANSWER_PAGE") {
    sendResponse(detectWrongAnswerPage());
    return;
  }

  if (request.type === "SCRAPE_FAILED_CODE") {
    sendResponse(scrapeFailedCode());
    return;
  }

  if (request.type === "SCRAPE_ACCEPTED_META") {
    sendResponse(scrapeAcceptedMeta(request.limit ?? 30));
    return;
  }

  if (request.type === "SCRAPE_SUBMISSION_SOURCE") {
    sendResponse(scrapeCurrentSubmissionSource());
    return;
  }

  if (request.type === "SCRAPE_PROBLEM_STATEMENT") {
    sendResponse(scrapeProblemStatementFromPage());
  }
});
