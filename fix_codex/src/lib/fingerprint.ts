import type { LogicFingerprint, StyleFingerprint } from "./types";

function unique(values: string[]) {
  return [...new Set(values)];
}

export function tokenizeCode(code: string) {
  return code
    .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, " ")
    .match(/[A-Za-z_][A-Za-z0-9_]*|==|!=|<=|>=|\+\+|--|&&|\|\||[+\-*/%<>]=?/g)
    ?.map((token) => token.toLowerCase()) ?? [];
}

export function extractLogicFingerprint(code: string): LogicFingerprint {
  const lower = code.toLowerCase();
  const approachTags: string[] = [];
  const dataStructures: string[] = [];
  const controlFlowShape: string[] = [];
  const stateVariables: string[] = [];
  const conditionPatterns: string[] = [];
  const edgeCaseSignals: string[] = [];

  if (/\bsort\s*\(/.test(code)) approachTags.push("sorting");
  if (/\b(binary_search|lower_bound|upper_bound)\s*\(/.test(code) || /\b(mid|low|high)\b/i.test(code)) {
    approachTags.push("binary search");
  }
  if (/\b(l|left)\b[\s\S]{0,80}\b(r|right)\b/i.test(code) && /while\s*\(/.test(code)) {
    approachTags.push("two pointers");
  }
  if (/\bdp\b|memo|vector\s*<[^>]+>\s*dp|dp\s*\[/.test(lower)) approachTags.push("dynamic programming");
  if (/\bdfs\b|\bbfs\b|queue\s*</.test(lower)) approachTags.push("graph traversal");
  if (/prefix|pref|suffix|sum\s*\[/.test(lower)) approachTags.push("prefix/suffix sums");
  if (/priority_queue|heap/.test(lower)) approachTags.push("heap greedy");
  if (/min\s*\(|max\s*\(|ans\s*=|res\s*=|best\s*=/.test(code)) approachTags.push("greedy/state optimization");
  if (/%|\/\s*10|\bmod\b/.test(lower)) approachTags.push("modular/digit logic");

  if (/vector|array|\[[^\]]*\]/.test(lower)) dataStructures.push("array/vector");
  if (/map|unordered_map/.test(lower)) dataStructures.push("map/hash map");
  if (/\bset\b|unordered_set/.test(lower)) dataStructures.push("set/hash set");
  if (/queue|deque/.test(lower)) dataStructures.push("queue/deque");
  if (/stack/.test(lower)) dataStructures.push("stack");
  if (/priority_queue/.test(lower)) dataStructures.push("priority queue");
  if (/pair\s*</.test(lower)) dataStructures.push("pair");

  if (/for\s*\(/.test(code)) controlFlowShape.push("for loops");
  if (/while\s*\(/.test(code)) controlFlowShape.push("while loops");
  if (/for\s*\([^)]*\)[\s\S]{0,250}for\s*\(/.test(code)) controlFlowShape.push("nested loops");
  if (/if\s*\([^)]*\)[\s\S]{0,180}else/.test(code)) controlFlowShape.push("if/else branches");
  if (/return\s+[^;]+;/.test(code)) controlFlowShape.push("early returns");
  if (/\b[a-zA-Z_]\w*\s*\([^;{}]*\)\s*{/.test(code)) controlFlowShape.push("helper functions");
  if (/\b[a-zA-Z_]\w*\s*\([^)]*\)[\s;]*$/.test(code)) controlFlowShape.push("recursion possible");

  const stateMatches = code.match(/\b(ans|res|best|cnt|count|sum|mx|mn|minn|maxx|cur|dp|freq)\w*\b/gi) ?? [];
  stateVariables.push(...unique(stateMatches.map((value) => value.toLowerCase())).slice(0, 10));

  const conditions = code.match(/if\s*\(([^)]{1,120})\)|while\s*\(([^)]{1,120})\)/g) ?? [];
  conditionPatterns.push(...conditions.slice(0, 8).map((value) => value.replace(/\s+/g, " ")));

  if (/<=|>=|==|!=/.test(code)) edgeCaseSignals.push("equality/boundary checks");
  if (/\b0\b|\b1\b/.test(code)) edgeCaseSignals.push("zero/one case handling");
  if (/long long|int64|ll\b/.test(code)) edgeCaseSignals.push("large number handling");
  if (/t\s*;|while\s*\(\s*t--\s*\)|for\s*\([^;]*(tc|test)/i.test(code)) edgeCaseSignals.push("multiple test cases");
  if (/n\s*==\s*1|n\s*<=\s*1|empty\s*\(/i.test(code)) edgeCaseSignals.push("small input checks");

  const complexityHint = approachTags.includes("sorting")
    ? "likely O(n log n)"
    : controlFlowShape.includes("nested loops")
      ? "likely O(n^2)"
      : controlFlowShape.some((value) => value.includes("loops"))
        ? "likely O(n)"
        : "unknown";

  return {
    approachTags: unique(approachTags),
    dataStructures: unique(dataStructures),
    controlFlowShape: unique(controlFlowShape),
    stateVariables: unique(stateVariables),
    conditionPatterns: unique(conditionPatterns),
    complexityHint,
    edgeCaseSignals: unique(edgeCaseSignals),
  };
}

export function extractStyleFingerprint(code: string, language = "Unknown"): StyleFingerprint {
  const lines = code.split("\n").filter((line) => line.trim());
  const avgLineLength = lines.length
    ? Math.round(lines.reduce((total, line) => total + line.length, 0) / lines.length)
    : 0;
  const snake = (code.match(/\b[a-z]+_[a-z0-9_]+\b/g) ?? []).length;
  const camel = (code.match(/\b[a-z]+[A-Z][a-zA-Z0-9]*\b/g) ?? []).length;
  const stlUsage = unique(code.match(/\b(vector|map|set|queue|stack|priority_queue|pair|sort|lower_bound|upper_bound)\b/g) ?? []);

  return {
    language,
    lineCount: lines.length,
    avgLineLength,
    loopType: code.includes("while") && code.includes("for") ? "mixed" : code.includes("while") ? "while-heavy" : "for-heavy",
    namingConvention: snake > camel ? "snake_case" : camel > snake ? "camelCase" : "short/compact",
    stlUsage,
    usesRecursion: /return\s+\w+\s*\(/.test(code),
    verbosity: lines.length > 120 ? "verbose" : lines.length > 45 ? "medium" : "compact",
  };
}
