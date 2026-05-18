/** Client-facing analysis fetch lifecycle (mirrors UI concerns only). */
export type AnalysisUiPhase =
  | 'idle'
  | 'loading'
  | 'success'
  | 'partial'
  | 'empty'
  | 'error'
  | 'ai_unavailable';
