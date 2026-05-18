/** Canonical domain contracts for QueueLens (server + client). */

export type ModerationTarget = {
  id: string;
  type: 'post' | 'comment';
  subredditName: string;
  authorName: string | null;
  title?: string;
  bodyText: string;
  permalink?: string;
  createdAt?: string;
  reportReason?: string | null;
};

export type ContextItem = {
  id?: string;
  text: string;
  sourceLabel?: string;
};

export type SubredditRule = {
  id: string;
  title: string;
  description: string;
};

export type UnavailableContextNote = {
  domain: string;
  reason: string;
};

export type ContextBundle = {
  target: ModerationTarget;
  parentContext: ContextItem[];
  recentUserActivity: ContextItem[];
  subredditRules: SubredditRule[];
  ruleSource: 'live' | 'demo_fallback';
  unavailableContext: UnavailableContextNote[];
};

export type DeterministicSignal = {
  id: string;
  label: string;
  severity: 'info' | 'low' | 'medium' | 'high';
  matchedText?: string;
  reason: string;
};

export type EvidenceItem = {
  snippet: string;
  source: 'reported_content' | 'parent_context' | 'user_history' | 'subreddit_rule' | 'deterministic_signal';
  reason: string;
};

export type AIAnalysis = {
  summary: string;
  possibleRuleMatches: string[];
  reviewPriority: 'low' | 'medium' | 'high';
  suggestedAction: 'approve' | 'remove' | 'escalate' | 'needs_manual_review';
  confidence: 'low' | 'medium' | 'high';
  evidence: EvidenceItem[];
  moderatorNoteDraft?: string;
};

export type AIAnalysisInput = {
  contextBundle: ContextBundle;
  deterministicSignals: DeterministicSignal[];
  outputContract: 'QueueLensAIAnalysisV1';
};

export type AIAnalysisResponse = {
  raw: unknown;
  parsed?: AIAnalysis;
  error?: string;
};

export type ValidatedAnalysisResult = {
  status: 'success' | 'partial' | 'error';
  contextBundle: ContextBundle;
  deterministicSignals: DeterministicSignal[];
  aiAnalysis?: AIAnalysis;
  evidenceFallbackUsed: boolean;
  validationWarnings: string[];
  safeFallbackMessage?: string;
};
