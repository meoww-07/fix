import type { FailedSubmission, MatchedSubmission, ProblemStatement } from "./types";

function compactProblem(problem: ProblemStatement) {
  return `Title:
${problem.title}

Statement:
${problem.statement.slice(0, 4500)}

Input format:
${problem.inputFormat.slice(0, 1500)}

Output format:
${problem.outputFormat.slice(0, 1500)}

Examples:
${problem.examples.slice(0, 6).join("\n\n").slice(0, 2500)}

Notes:
${problem.notes.slice(0, 1500)}`;
}

export function buildDebugPrompt(
  failed: FailedSubmission,
  problem: ProblemStatement,
  matches: MatchedSubmission[]
) {
  const acceptedBlocks = matches
    .map(
      (match, index) => `MATCH ${index + 1}
Submission: ${match.sourceUrl}
Language: ${match.language}
Scores: total=${match.totalScore.toFixed(2)}, logic=${match.logicalScore.toFixed(2)}, token=${match.tokenScore.toFixed(2)}, style=${match.styleScore.toFixed(2)}
Reason: ${match.reason}
Logic tags: ${match.logicFingerprint.approachTags.join(", ") || "none"}
Data structures: ${match.logicFingerprint.dataStructures.join(", ") || "none"}
Control flow: ${match.logicFingerprint.controlFlowShape.join(", ") || "none"}
State variables: ${match.logicFingerprint.stateVariables.join(", ") || "none"}
Edge signals: ${match.logicFingerprint.edgeCaseSignals.join(", ") || "none"}
Code:
\`\`\`
${match.code.slice(0, 10000)}
\`\`\``
    )
    .join("\n\n");

  return `You are upSol, a strict logic-first Codeforces Wrong Answer debugger.

Your task:
Find why the FAILED submission got WA by comparing it against the TOP MATCHED ACCEPTED submissions.
The user is a beginner/intermediate competitive programmer. Explain the smallest logic mistake, not a full rewrite.

Hard rules:
1. Use only the failed code, problem statement, and accepted submissions below.
2. Do not invent a different algorithm unless it is clearly used by an accepted submission.
3. Match logic before style. Variable names and formatting are secondary.
4. Identify the user's intended algorithm first.
5. Compare the failed code against the closest accepted code at the level of conditions, state updates, loops, and edge cases.
6. Prefer a minimal fix that preserves the user's approach.
7. If you cannot infer an exact counterexample, give a counterexample pattern, not a fake exact input.
8. Do not provide a full replacement solution unless the user's approach is unrecoverable.
9. Keep explanations concrete and tied to code blocks/conditions.
10. Return only valid JSON. No Markdown outside JSON.

Failed submission:
URL: ${failed.url}
Verdict: ${failed.verdict}
Language: ${failed.language}
Problem: ${failed.contestId}${failed.problemIndex}

Problem statement:
${compactProblem(problem)}

Failed code:
\`\`\`
${failed.code.slice(0, 12000)}
\`\`\`

Top logically matched accepted submissions:
${acceptedBlocks}

Analyze in this order internally:
1. What is the problem asking?
2. What algorithm/reasoning is the failed code attempting?
3. Which accepted match is logically closest?
4. What condition, loop invariant, state update, or edge-case differs?
5. Why does that difference cause WA?
6. What is the smallest fix?

Return exactly this JSON object:
{
  "summary": "2-3 sentence explanation of the WA cause.",
  "intendedAlgorithm": "What the failed code is trying to do.",
  "acceptedAlgorithm": "What the closest accepted submission does logically.",
  "bugLocation": "Specific condition/loop/state update/block in the failed code.",
  "failingLogic": "Why the failed code's logic is wrong.",
  "logicDivergence": "The exact difference between failed code and accepted code.",
  "matchedSolutionReason": "Why the top accepted match is relevant.",
  "counterexample": "Small exact input if you are confident; otherwise empty string.",
  "counterexamplePattern": "Pattern of cases that break the failed logic.",
  "suggestedFix": "Minimal logic-level fix, preserving the user's approach.",
  "patchGuidance": "Concrete implementation guidance without rewriting the full solution.",
  "confidence": "high | medium | low"
}`;
}
