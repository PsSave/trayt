import { useEffect, useState } from 'react'
import type { ProviderUsage } from '../../shared/usage'
import { ProviderCard } from './ProviderCard'

// getUsage() shells out to each agent's CLI (e.g. `claude -p "/usage"`), which
// itself counts as a request against that account's usage — poll gently.
const POLL_INTERVAL_MS = 5 * 60_000

export default function App(): JSX.Element {
  const [providers, setProviders] = useState<ProviderUsage[] | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchUsage = (): void => {
      window.trayt.getUsage().then((result) => {
        if (!cancelled) setProviders(result)
      })
    }

    fetchUsage()
    const interval = setInterval(fetchUsage, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">trayt</span>
        <span className="app-subtitle">agent usage today</span>
      </header>
      <main className="app-body">
        {providers === null && <p className="loading">Loading…</p>}
        {providers?.map((p) => (
          <ProviderCard key={p.id} provider={p} />
        ))}
      </main>
    </div>
  )
}
