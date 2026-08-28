/**
 * Types shared between main, preload and renderer. Kept dependency-free
 * (no electron/node imports) so they can be included in every tsconfig project.
 */
export interface UsageSnapshot {
  status: 'ok' | 'not_installed' | 'unsupported' | 'error'
  message?: string
  tokensToday?: Record<string, number>
  sessionsToday?: number
  messagesToday?: number
  lastActivityAt?: string
}

export interface ProviderUsage {
  id: string
  name: string
  usage: UsageSnapshot
}
