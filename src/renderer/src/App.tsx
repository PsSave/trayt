import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProviderUsage } from '../../shared/usage'
import { ProviderRow } from './ProviderRow'

const POLL_INTERVAL_MS = 60_000
// Must match body's `padding` in styles.css — the window height we report to
// main needs to cover the card plus the body padding wrapping it.
const BODY_PADDING_Y = 28

function formatTime(iso: string | null): string {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function App(): JSX.Element {
  const [providers, setProviders] = useState<ProviderUsage[] | null>(null)
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null)
  const [shown, setShown] = useState<{ n: number; anchor: 'top' | 'bottom' }>({
    n: 0,
    anchor: 'bottom'
  })
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  const refresh = useCallback(() => {
    window.trayt.getUsage().then((result) => {
      setProviders(result)
      setLastCheckedAt(new Date().toISOString())
    })
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refresh])

  useEffect(
    () =>
      window.trayt.onShown(({ anchor }) => {
        setShown((prev) => ({ n: prev.n + 1, anchor }))
        refresh()
      }),
    [refresh]
  )

  // The card is re-mounted (via `key`) on every show to replay its entrance
  // animation, so the ResizeObserver has to be re-attached each time too —
  // a callback ref handles that naturally.
  const cardRef = useCallback((node: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect()
    if (!node) return

    // Send a measurement right away — the ResizeObserver's first callback is
    // async and the window's initial height is just a guess until then.
    window.trayt.resize(Math.ceil(node.offsetHeight) + BODY_PADDING_Y)

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      // borderBoxSize includes the card's own 18px padding; contentRect does
      // not, which under-reports the height by 2×18px and re-clips the card.
      const borderBox = entry.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight
      window.trayt.resize(Math.ceil(borderBox) + BODY_PADDING_Y)
    })
    observer.observe(node)
    resizeObserverRef.current = observer
  }, [])

  return (
    <div className="card-shell" key={shown.n} data-anchor={shown.anchor} ref={cardRef}>
      {providers === null ? (
        <p className="loading">Lendo…</p>
      ) : (
        // Hide providers that are stubbed out (status 'unsupported', e.g.
        // Codex CLI today) instead of showing a dimmed placeholder row for
        // something that doesn't exist yet — it reappears on its own once a
        // real implementation returns any other status.
        providers
          .filter((p) => p.usage.status !== 'unsupported')
          .map((p) => <ProviderRow key={p.id} provider={p} />)
      )}
      <footer className="card-footer">
        <span className="mono">lido {formatTime(lastCheckedAt)}</span>
        <button className="refresh" onClick={refresh}>
          atualizar
        </button>
      </footer>
    </div>
  )
}
