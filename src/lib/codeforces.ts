import { extractLogicFingerprint, extractStyleFingerprint } from "./fingerprint";
import type { AcceptedSubmission, FailedSubmission, ProblemStatement } from "./types";

function parseHtml(html: string) {
  return new DOMParser().parseFromString(html, "text/html");
}

function cleanText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function languageFromText(text: string) {
  return (
    text.match(
      /(GNU C\+\+[^,\n]*|C\+\+\d+[^,\n]*|Clang\+\+[^,\n]*|PyPy[^,\n]*|Python[^,\n]*|Java[^,\n]*|Kotlin[^,\n]*|C#[^,\n]*|Go(?:\s|$)[^,\n]*|Rust[^,\n]*)/i
    )?.[0]?.trim() ?? "Unknown language"
  );
}

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

export function detectWrongAnswerPage(): { ok: boolean; reason: string } {
  const url = window.location.href;
  const text = document.body.innerText;

  if (!location.hostname.includes("codeforces.com")) {
    return { ok: false, reason: "This is not a Codeforces page." };
  }

  if (!/\/submission\/\d+/i.test(url)) {
    return { ok: false, reason: "Open a Codeforces submission page." };
  }

  if (!/Wrong answer|WRONG_ANSWER/i.test(text)) {
    return { ok: false, reason: "This submission does not look like a Wrong Answer." };
  }

  if (!document.querySelector("#program-source-text")) {
    return { ok: false, reason: "Could not find the submitted source code." };
  }

  return { ok: true, reason: "Wrong Answer submission detected." };
}

export function scrapeFailedCode(): FailedSubmission {
  const url = window.location.href;
  const text = document.body.innerText;
  const sourceElement = document.querySelector<HTMLElement>("#program-source-text");
  const code = sourceElement?.innerText?.trim() || sourceElement?.textContent?.trim() || "";
  const problemLink = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href*='/problem/']")).find((link) =>
    /\/(contest|problemset)\/\d+\/problem\/[A-Z0-9]+/i.test(link.href)
  );
  const problemUrl = problemLink?.href ?? "";
  const problemMatch = problemUrl.match(/\/(?:contest|problemset)\/(\d+)\/problem\/([A-Z0-9]+)/i);
  const submissionMatch =
    url.match(/\/contest\/(\d+)\/submission\/(\d+)/i) ??
    url.match(/\/problemset\/submission\/(\d+)\/(\d+)/i);
  const verdictMatch = text.match(/Wrong answer(?:\s+on\s+test\s+\d+)?|WRONG_ANSWER|Accepted|Runtime error|Time limit exceeded/i);
  const currentRow = Array.from(document.querySelectorAll("table.status-frame-datatable tr")).find((row) =>
    row.textContent?.includes(submissionMatch?.[2] ?? "")
  );
  const cells = Array.from(currentRow?.querySelectorAll("td") ?? []).map((cell) => cleanText(cell.textContent ?? ""));
  const tableLanguage = cells.find((cell) => /GNU C\+\+|C\+\+\d+|Clang\+\+|PyPy|Python|Java|Kotlin|C#|Go|Rust/i.test(cell));

  return {
    url,
    contestId: problemMatch?.[1] ?? submissionMatch?.[1] ?? "",
    problemIndex: problemMatch?.[2] ?? "",
    submissionId: submissionMatch?.[2] ?? "",
    verdict: verdictMatch?.[0] ?? "Unknown verdict",
    language: tableLanguage ?? languageFromText(text),
    code,
  };
}

export type RawAcceptedSubmission = {
  submissionId: string;
  userHandle: string;
  language: string;
  code: string;
  codeLength: number;
  sourceUrl: string;
};

export async function scrapeProblemStatement(contestId: string, problemIndex: string): Promise<ProblemStatement> {
  const url = `https://codeforces.com/problemset/problem/${contestId}/${problemIndex}`;
  const html = await fetch(url, { credentials: "include" }).then((response) => {
    if (!response.ok) throw new Error(`Problem page fetch failed: ${response.status}`);
    return response.text();
  });
  const doc = parseHtml(html);
  const statement = doc.querySelector(".problem-statement");
  const title = cleanText(statement?.querySelector(".title")?.textContent ?? `Problem ${contestId}${problemIndex}`);
  const inputFormat = cleanText(statement?.querySelector(".input-specification")?.textContent ?? "");
  const outputFormat = cleanText(statement?.querySelector(".output-specification")?.textContent ?? "");
  const examples = Array.from(statement?.querySelectorAll(".sample-tests .input, .sample-tests .output") ?? []).map((node) =>
    cleanText(node.textContent ?? "")
  );
  const notes = cleanText(statement?.querySelector(".note")?.textContent ?? "");
  const rawText = cleanText(statement?.textContent ?? "");

  return {
    title,
    statement: rawText,
    inputFormat,
    outputFormat,
    examples,
    notes,
    rawText,
    url,
  };
}

function submissionUrl(contestId: string, submissionId: string) {
  return `https://codeforces.com/contest/${contestId}/submission/${submissionId}`;
}

async function fetchAcceptedSource(contestId: string, submissionId: string, userHandle: string, language: string) {
  const sourceUrl = submissionUrl(contestId, submissionId);
  const html = await fetch(sourceUrl, { credentials: "include" }).then((response) => {
    if (!response.ok) throw new Error(`Submission ${submissionId} fetch failed: ${response.status}`);
    return response.text();
  });
  const doc = parseHtml(html);
  const code = doc.querySelector("#program-source-text")?.textContent?.trim() ?? "";

  return {
    submissionId,
    userHandle,
    language,
    code,
    codeLength: code.length,
    sourceUrl,
    logicFingerprint: extractLogicFingerprint(code),
    styleFingerprint: extractStyleFingerprint(code, language),
  };
}

export async function scrapeAcceptedSubmissions(
  contestId: string,
  problemIndex: string,
  userLanguage: string,
  limit = 20
): Promise<AcceptedSubmission[]> {
  const statusUrl = `https://codeforces.com/problemset/status/${contestId}/problem/${problemIndex}`;
  const html = await fetch(statusUrl, { credentials: "include" }).then((response) => {
    if (!response.ok) throw new Error(`Status page fetch failed: ${response.status}`);
    return response.text();
  });
  const doc = parseHtml(html);
  const rows = Array.from(doc.querySelectorAll("table.status-frame-datatable tr"));
  const seen = new Set<string>();
  const meta: Array<{ submissionId: string; userHandle: string; language: string }> = [];

  for (const row of rows) {
    const rowText = cleanText(row.textContent ?? "");
    if (!/\b(Accepted|OK)\b/.test(rowText)) continue;

    const sourceLink = Array.from(row.querySelectorAll<HTMLAnchorElement>("a[href*='/submission/']")).find((link) =>
      /\/submission\/\d+/i.test(link.href)
    );
    const match = sourceLink?.href.match(/\/submission\/(\d+)/i);
    const submissionId = match?.[1];
    if (!submissionId || seen.has(submissionId)) continue;

    const handleLink = row.querySelector<HTMLAnchorElement>("a[href*='/profile/']");
    const language =
      Array.from(row.querySelectorAll("td"))
        .map((cell) => cleanText(cell.textContent ?? ""))
        .find((cell) => /GNU C\+\+|Clang\+\+|PyPy|Python|Java|Kotlin|C#|Go|Rust/i.test(cell)) ?? "Unknown language";

    if (userLanguage !== "Unknown language" && language !== "Unknown language") {
      const userFamily = languageFamily(userLanguage);
      const candidateFamily = languageFamily(language);
      if (meta.length < Math.floor(limit / 2) && userFamily !== candidateFamily) continue;
    }

    seen.add(submissionId);
    meta.push({
      submissionId,
      userHandle: handleLink?.textContent?.trim() ?? "unknown",
      language,
    });

    if (meta.length >= limit) break;
  }

  const accepted: AcceptedSubmission[] = [];

  for (const item of meta) {
    try {
      const source = await fetchAcceptedSource(contestId, item.submissionId, item.userHandle, item.language);
      if (source.code) accepted.push(source);
    } catch {
      // Codeforces can block or hide individual source pages. Keep collecting what is available.
    }
  }

  return accepted;
}

export async function scrapeAcceptedSubmissionsInPageContext(): Promise<RawAcceptedSubmission[]> {
  function localCleanText(value: string) {
    return value.replace(/\u00a0/g, " ").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function localLanguageFamily(language: string) {
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

  function localParseHtml(html: string) {
    return new DOMParser().parseFromString(html, "text/html");
  }

  const failedUrl = window.location.href;
  const text = document.body.innerText;
  const problemLink = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href*='/problem/']")).find((link) =>
    /\/(contest|problemset)\/\d+\/problem\/[A-Z0-9]+/i.test(link.href)
  );
  const problemMatch = problemLink?.href.match(/\/(?:contest|problemset)\/(\d+)\/problem\/([A-Z0-9]+)/i);
  const submissionMatch =
    failedUrl.match(/\/contest\/(\d+)\/submission\/(\d+)/i) ??
    failedUrl.match(/\/problemset\/submission\/(\d+)\/(\d+)/i);
  const contestId = problemMatch?.[1] ?? submissionMatch?.[1] ?? "";
  const problemIndex = problemMatch?.[2] ?? "";
  const currentRow = Array.from(document.querySelectorAll("table.status-frame-datatable tr")).find((row) =>
    row.textContent?.includes(submissionMatch?.[2] ?? "")
  );
  const currentCells = Array.from(currentRow?.querySelectorAll("td") ?? []).map((cell) => localCleanText(cell.textContent ?? ""));
  const userLanguage =
    currentCells.find((cell) => /GNU C\+\+|C\+\+\d+|Clang\+\+|PyPy|Python|Java|Kotlin|C#|Go|Rust/i.test(cell)) ??
    text.match(/(GNU C\+\+[^,\n]*|C\+\+\d+[^,\n]*|Clang\+\+[^,\n]*|PyPy[^,\n]*|Python[^,\n]*|Java[^,\n]*|Kotlin[^,\n]*|C#[^,\n]*|Go(?:\s|$)[^,\n]*|Rust[^,\n]*)/i)?.[0] ??
    "Unknown language";

  if (!contestId || !problemIndex) return [];

  const statusUrls = [
    `https://codeforces.com/contest/${contestId}/status/${problemIndex}`,
    `https://codeforces.com/problemset/status/${contestId}/problem/${problemIndex}`,
  ];
  let statusDoc: Document | null = null;

  for (const url of statusUrls) {
    try {
      const html = await fetch(url, { credentials: "include" }).then((response) => response.text());
      const doc = localParseHtml(html);
      if (doc.querySelector("table.status-frame-datatable")) {
        statusDoc = doc;
        break;
      }
    } catch {
      // Try the next Codeforces status URL shape.
    }
  }

  if (!statusDoc) return [];

  const rows = Array.from(statusDoc.querySelectorAll("table.status-frame-datatable tr"));
  const seen = new Set<string>();
  const meta: Array<{ submissionId: string; userHandle: string; language: string }> = [];
  const userFamily = localLanguageFamily(userLanguage);

  for (const row of rows) {
    const rowText = localCleanText(row.textContent ?? "");
    if (!/\bAccepted\b/.test(rowText)) continue;

    const sourceLink = Array.from(row.querySelectorAll<HTMLAnchorElement>("a[href*='/submission/']")).find((link) =>
      /\/submission\/\d+/i.test(link.href)
    );
    const submissionId = sourceLink?.href.match(/\/submission\/(\d+)/i)?.[1];
    if (!submissionId || seen.has(submissionId)) continue;

    const cells = Array.from(row.querySelectorAll("td")).map((cell) => localCleanText(cell.textContent ?? ""));
    const language =
      cells.find((cell) => /GNU C\+\+|C\+\+\d+|Clang\+\+|PyPy|Python|Java|Kotlin|C#|Go|Rust/i.test(cell)) ?? "Unknown language";
    const candidateFamily = localLanguageFamily(language);
    if (meta.length < 10 && userFamily !== "unknown" && candidateFamily !== "unknown" && userFamily !== candidateFamily) continue;

    seen.add(submissionId);
    meta.push({
      submissionId,
      userHandle: row.querySelector<HTMLAnchorElement>("a[href*='/profile/']")?.textContent?.trim() ?? "unknown",
      language,
    });

    if (meta.length >= 20) break;
  }

  const accepted: RawAcceptedSubmission[] = [];

  for (const item of meta) {
    try {
      const sourceUrl = `https://codeforces.com/contest/${contestId}/submission/${item.submissionId}`;
      const html = await fetch(sourceUrl, { credentials: "include" }).then((response) => response.text());
      const doc = localParseHtml(html);
      const source = doc.querySelector<HTMLElement>("#program-source-text");
      const code = source?.innerText?.trim() || source?.textContent?.trim() || "";
      if (!code) continue;

      accepted.push({
        ...item,
        code,
        codeLength: code.length,
        sourceUrl,
      });
    } catch {
      // Skip submissions whose source page is not visible.
    }
  }

  return accepted;
}
