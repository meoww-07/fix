import { tokenizeCode } from "./fingerprint";
import type { AcceptedSubmission, FailedSubmission, LogicFingerprint, MatchedSubmission, StyleFingerprint } from "./types";

function overlapScore(a: string[], b: string[]) {
  const left = new Set(a);
  const right = new Set(b);
  const union = new Set([...left, ...right]);
  if (!union.size) return 0;
  let overlap = 0;
  left.forEach((value) => {
    if (right.has(value)) overlap += 1;
  });
  return overlap / union.size;
}

export function scoreByLogicalSimilarity(user: LogicFingerprint, candidate: LogicFingerprint) {
  const approach = overlapScore(user.approachTags, candidate.approachTags);
  const structures = overlapScore(user.dataStructures, candidate.dataStructures);
  const flow = overlapScore(user.controlFlowShape, candidate.controlFlowShape);
  const state = overlapScore(user.stateVariables, candidate.stateVariables);
  const edge = overlapScore(user.edgeCaseSignals, candidate.edgeCaseSignals);
  const complexity = user.complexityHint === candidate.complexityHint ? 1 : 0;

  return approach * 0.32 + structures * 0.18 + flow * 0.18 + state * 0.12 + edge * 0.12 + complexity * 0.08;
}

export function scoreByTokenSimilarity(userCode: string, candidateCode: string) {
  return overlapScore(tokenizeCode(userCode), tokenizeCode(candidateCode));
}

export function scoreByStyleSimilarity(user: StyleFingerprint, candidate: StyleFingerprint) {
  const language = user.language === candidate.language ? 1 : 0;
  const loop = user.loopType === candidate.loopType ? 1 : 0;
  const naming = user.namingConvention === candidate.namingConvention ? 1 : 0;
  const recursion = user.usesRecursion === candidate.usesRecursion ? 1 : 0;
  const verbosity = user.verbosity === candidate.verbosity ? 1 : 0;
  const stl = overlapScore(user.stlUsage, candidate.stlUsage);
  const lineDistance = Math.abs(user.lineCount - candidate.lineCount);
  const lineSimilarity = Math.max(0, 1 - lineDistance / Math.max(user.lineCount, candidate.lineCount, 1));

  return language * 0.18 + loop * 0.15 + naming * 0.12 + recursion * 0.1 + verbosity * 0.12 + stl * 0.2 + lineSimilarity * 0.13;
}

export function filterByLogic(user: LogicFingerprint, candidates: AcceptedSubmission[]) {
  return candidates.filter((candidate) => {
    const score = scoreByLogicalSimilarity(user, candidate.logicFingerprint);
    return score >= 0.08 || candidates.length <= 5;
  });
}

export function hybridSearch(
  failed: FailedSubmission,
  userLogic: LogicFingerprint,
  userStyle: StyleFingerprint,
  candidates: AcceptedSubmission[]
): MatchedSubmission[] {
  const filtered = filterByLogic(userLogic, candidates);

  return filtered
    .map((candidate) => {
      const logicalScore = scoreByLogicalSimilarity(userLogic, candidate.logicFingerprint);
      const tokenScore = scoreByTokenSimilarity(failed.code, candidate.code);
      const styleScore = scoreByStyleSimilarity(userStyle, candidate.styleFingerprint);
      const totalScore = logicalScore * 0.6 + tokenScore * 0.25 + styleScore * 0.15;
      const sharedApproaches = candidate.logicFingerprint.approachTags.filter((tag) => userLogic.approachTags.includes(tag));
      const reason = sharedApproaches.length
        ? `Shares ${sharedApproaches.join(", ")} with the failed code.`
        : "Kept as a weaker fallback because no close logic tags were detected.";

      return {
        ...candidate,
        totalScore,
        logicalScore,
        tokenScore,
        styleScore,
        reason,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
}

export function buildBM25Index() {
  return {
    note: "BM25 is planned for the later-stage search pipeline. MVP uses token overlap.",
  };
}
