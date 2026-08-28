import type { ProviderUsage, QuotaWindow } from '../../shared/usage'

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function QuotaBar({ label, quota }: { label: string; quota: QuotaWindow }): JSX.Element {
  return (
    <div className="quota">
      <div className="quota-header">
        <span>{label}</span>
        <span className="quota-percent">{quota.percentUsed}%</span>
      </div>
      <div className="quota-track">
        <div className="quota-fill" style={{ width: `${Math.min(quota.percentUsed, 100)}%` }} />
      </div>
      <span className="quota-resets">resets {quota.resetsLabel}</span>
    </div>
  )
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

  if (usage.source === 'live' && usage.session && usage.week) {
    return (
      <section className="card">
        <h2>{provider.name}</h2>
        <QuotaBar label="Current session" quota={usage.session} />
        <QuotaBar label="Current week" quota={usage.week} />
      </section>
    )
  }

  const totalTokens = Object.values(usage.tokensToday ?? {}).reduce((a, b) => a + b, 0)

  return (
    <section className="card">
      <h2>{provider.name}</h2>
      <p className="card-note">Estimated from local history — live account data unavailable.</p>
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
