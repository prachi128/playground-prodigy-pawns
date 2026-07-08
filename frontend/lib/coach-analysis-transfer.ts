/** Session transfer from Coach teaching board → Analysis page. */

export const COACH_ANALYSIS_TRANSFER_KEY = 'coach-analysis-pending-position';

export interface CoachAnalysisTransferPayload {
  fen: string;
  label?: string;
  at: number;
}

export function savePositionForAnalysis(fen: string, label?: string): void {
  if (typeof sessionStorage === 'undefined') return;
  const payload: CoachAnalysisTransferPayload = { fen, label, at: Date.now() };
  sessionStorage.setItem(COACH_ANALYSIS_TRANSFER_KEY, JSON.stringify(payload));
}

export function consumePositionForAnalysis(): CoachAnalysisTransferPayload | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(COACH_ANALYSIS_TRANSFER_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(COACH_ANALYSIS_TRANSFER_KEY);
  try {
    return JSON.parse(raw) as CoachAnalysisTransferPayload;
  } catch {
    return null;
  }
}
