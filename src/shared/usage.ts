/**
 * Types shared between main, preload and renderer. Kept dependency-free
 * (no electron/node imports) so they can be included in every tsconfig project.
 */
export interface QuotaWindow {
  /** 0-100 */
  percentUsed: number
  /** Human-readable reset time exactly as the source tool reports it, e.g. "Aug 28, 11:50pm (America/Sao_Paulo)". Not parsed into a Date: format/timezone label isn't guaranteed stable across tool versions. */
  resetsLabel: string
}

export interface UsageSnapshot {
  status: 'ok' | 'not_installed' | 'unsupported' | 'error'
  message?: string
  /** 'live' = read straight from the account just now. 'local-estimate' = derived from a local history cache, used only when a live read isn't available. */
  source?: 'live' | 'local-estimate'
  /** Rolling short-term window (e.g. Claude Code's 5-hour session window). Only set when source is 'live'. */
  session?: QuotaWindow
  /** Longer-term window (e.g. weekly cap). Only set when source is 'live'. */
  week?: QuotaWindow
  /** Only set when source is 'local-estimate': tokens used today per model, from local history. */
  tokensToday?: Record<string, number>
  sessionsToday?: number
  messagesToday?: number
  lastCheckedAt?: string
}

export interface ProviderUsage {
  id: string
  name: string
  usage: UsageSnapshot
}
