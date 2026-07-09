export type FailedSubmission = {
  url: string;
  contestId: string;
  problemIndex: string;
  submissionId: string;
  verdict: string;
  language: string;
  code: string;
};

export type ProblemStatement = {
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  examples: string[];
  notes: string;
  rawText: string;
  url: string;
};

export type AcceptedSubmission = {
  submissionId: string;
  userHandle: string;
  language: string;
  code: string;
  codeLength: number;
  sourceUrl: string;
  logicFingerprint: LogicFingerprint;
  styleFingerprint: StyleFingerprint;
  isFallback?: boolean;
};

export type LogicFingerprint = {
  approachTags: string[];
  dataStructures: string[];
  controlFlowShape: string[];
  stateVariables: string[];
  conditionPatterns: string[];
  complexityHint: string;
  edgeCaseSignals: string[];
};

export type StyleFingerprint = {
  language: string;
  lineCount: number;
  avgLineLength: number;
  loopType: string;
  namingConvention: string;
  stlUsage: string[];
  usesRecursion: boolean;
  verbosity: string;
};

export type MatchedSubmission = AcceptedSubmission & {
  totalScore: number;
  logicalScore: number;
  tokenScore: number;
  styleScore: number;
  reason: string;
};

export type AIExplanation = {
  summary: string;
  intendedAlgorithm: string;
  acceptedAlgorithm: string;
  bugLocation: string;
  failingLogic: string;
  logicDivergence: string;
  matchedSolutionReason: string;
  counterexample: string;
  suggestedFix: string;
  patchGuidance: string;
  counterexamplePattern: string;
  confidence: string;
};

export type AnalysisResult = {
  failedSubmission: FailedSubmission;
  problemStatement: ProblemStatement;
  acceptedSubmissions: AcceptedSubmission[];
  matchedSubmissions: MatchedSubmission[];
  explanation: AIExplanation | null;
  explanationSkipped?: boolean;
};

export type AISettings = {
  provider: "gemini" | "openai" | "claude" | "deepseek" | "kimi" | "none" | "ollama";
  apiKey: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  claudeApiKey?: string;
  deepseekApiKey?: string;
  kimiApiKey?: string;
  model: string;
  ollamaUrl: string;
};
