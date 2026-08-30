import type { ProviderUsage, QuotaWindow } from '../../shared/usage'
import claudeSymbol from '../../../resources/Claude_AI_symbol.svg.webp'

// Inlined from resources/codex.svg (not loaded as an <img> like the Claude icon)
// so `fill="currentColor"` picks up the surrounding text color instead of
// rendering as whatever flat color the SVG file itself would carry.
function CodexIcon(): JSX.Element {
  return (
    <svg
      className="provider-icon"
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
    >
      <path
        clipRule="evenodd"
        d="M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z"
      />
    </svg>
  )
}

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
        ) : provider.id === 'codex-cli' ? (
          <CodexIcon />
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
