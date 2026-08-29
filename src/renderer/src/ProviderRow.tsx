import type { ProviderUsage, QuotaWindow } from '../../shared/usage'
import claudeSymbol from '../../../resources/Claude_AI_symbol.svg.webp'

const STATUS_LABEL: Partial<Record<ProviderUsage['usage']['status'], string>> = {
  not_installed: 'não instalado',
  unsupported: 'em breve',
  error: 'erro na leitura'
}

// Severity (warn/critical) always wins regardless of which window it is —
// only the "everything's fine" color differs, so the two bars stay visually
// distinct without the color losing its warning meaning.
function barColor(percentUsed: number, okColor: string): string {
  if (percentUsed >= 85) return 'var(--severity-critical)'
  if (percentUsed >= 60) return 'var(--severity-warn)'
  return okColor
}

/**
 * `resetsLabel` is an absolute date/time string (see src/shared/usage.ts) —
 * we deliberately don't try to turn it into a countdown. This only catches
 * the case where a future data source already hands us something short
 * like "51 min"; otherwise the full label goes in the tooltip instead.
 */
function extractShortReset(label: string): string | null {
  const match = label.match(/^(\d+\s*(?:min|mins|minutos?|h|hr|hrs|hours?))\b/i)
  return match ? match[1] : null
}

function QuotaBar({
  label,
  quota,
  okColor
}: {
  label: string
  quota: QuotaWindow
  okColor: string
}): JSX.Element {
  return (
    <div>
      <div className="quota-line">
        <span>{label}</span>
        <span className="mono">{quota.percentUsed}%</span>
      </div>
      <div className="quota-track" title={quota.resetsLabel}>
        <div
          className="quota-fill"
          style={{
            width: `${Math.min(quota.percentUsed, 100)}%`,
            background: barColor(quota.percentUsed, okColor)
          }}
        />
      </div>
    </div>
  )
}

export function ProviderRow({ provider }: { provider: ProviderUsage }): JSX.Element {
  const { usage } = provider

  if (usage.status !== 'ok') {
    return (
      <div className="provider-row is-dimmed" title={usage.message}>
        <div className="provider-header">
          <span className="provider-icon is-dot" />
          <span className="provider-name">{provider.name}</span>
        </div>
        <div className="quota-track is-empty" />
        <span className="provider-note">{STATUS_LABEL[usage.status] ?? usage.status}</span>
      </div>
    )
  }

  const isLive = usage.source === 'live' && usage.session && usage.week
  const shortReset = isLive ? extractShortReset(usage.session!.resetsLabel) : null

  return (
    <div className="provider-row">
      <div className="provider-header">
        {provider.id === 'claude-code' ? (
          <img className="provider-icon" src={claudeSymbol} width={15} height={15} alt="" />
        ) : (
          <span className="provider-icon is-dot" />
        )}
        <span className="provider-name">{provider.name}</span>
        {shortReset && <span className="provider-resets mono">{shortReset}</span>}
      </div>
      {isLive ? (
        <>
          <QuotaBar label="5 h" quota={usage.session!} okColor="var(--severity-ok)" />
          <QuotaBar label="semana" quota={usage.week!} okColor="var(--severity-ok-week)" />
        </>
      ) : (
        <span className="provider-note">sem dados de quota — só histórico local</span>
      )}
    </div>
  )
}
