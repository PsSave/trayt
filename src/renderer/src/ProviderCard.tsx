import type { ProviderUsage } from '../../shared/usage'

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function ProviderCard({ provider }: { provider: ProviderUsage }): JSX.Element {
  const { usage } = provider

  if (usage.status !== 'ok') {
    return (
      <section className="card card-muted">
        <h2>{provider.name}</h2>
        <p className="card-note">{usage.message ?? usage.status}</p>
      </section>
    )
  }

  const totalTokens = Object.values(usage.tokensToday ?? {}).reduce((a, b) => a + b, 0)

  return (
    <section className="card">
      <h2>{provider.name}</h2>
      <div className="card-stats">
        <div className="stat">
          <span className="stat-value">{formatTokens(totalTokens)}</span>
          <span className="stat-label">tokens today</span>
        </div>
        <div className="stat">
          <span className="stat-value">{usage.sessionsToday ?? 0}</span>
          <span className="stat-label">sessions</span>
        </div>
        <div className="stat">
          <span className="stat-value">{usage.messagesToday ?? 0}</span>
          <span className="stat-label">messages</span>
        </div>
      </div>
    </section>
  )
}
