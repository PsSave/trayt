import { spawn } from 'node:child_process'
import type { AgentProvider, QuotaWindow, UsageSnapshot } from './types'

const APP_SERVER_TIMEOUT_MS = 15_000

interface JsonRpcMessage {
  id?: number
  result?: unknown
  error?: { message?: string }
}

interface RawRateLimitWindow {
  usedPercent?: unknown
  resetsAt?: unknown
}

function parseQuotaWindow(raw: unknown): QuotaWindow | null {
  const window = raw as RawRateLimitWindow | null | undefined
  if (!window || typeof window.usedPercent !== 'number') return null

  return {
    percentUsed: window.usedPercent,
    resetsLabel: typeof window.resetsAt === 'number' ? formatResetsLabel(window.resetsAt) : 'unknown'
  }
}

function formatResetsLabel(epochSeconds: number): string {
  const date = new Date(epochSeconds * 1000)
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const datePart = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone }).format(date)
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone
  })
    .format(date)
    .replace(' ', '')
    .toLowerCase()
  return `${datePart}, ${timePart} (${timeZone})`
}

/**
 * Codex CLI has no `/usage`-equivalent print-mode command (checked `--help` on every
 * subcommand: no `status`/`usage`, and `codex exec` only runs agent turns). But
 * `codex app-server` — its JSON-RPC-over-stdio protocol, normally used by IDE
 * extensions — exposes `account/rateLimits/read`, which returns the same live 5-hour
 * and weekly rate-limit windows (`usedPercent`, `resetsAt` unix seconds) the
 * interactive TUI's status line reads from. Confirmed live against a real ChatGPT-plan
 * login: `primary` is the 5h window (300 min), `secondary` is the weekly window
 * (10080 min). No model call involved — this only reads account state — and the
 * app-server process exits with us; nothing is left running. See docs/ARCHITECTURE.md.
 */
async function getUsageFromAppServer(): Promise<UsageSnapshot | null> {
  return new Promise((resolve) => {
    const child = spawn('codex', ['app-server'], { stdio: ['pipe', 'pipe', 'pipe'] })

    let settled = false
    const finish = (result: UsageSnapshot | null): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.kill()
      resolve(result)
    }

    const timer = setTimeout(() => finish(null), APP_SERVER_TIMEOUT_MS)

    child.on('error', () => finish(null))

    const send = (payload: Record<string, unknown>): void => {
      child.stdin.write(`${JSON.stringify(payload)}\n`)
    }

    let buffer = ''
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf-8')
      let newlineIndex: number
      while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIndex)
        buffer = buffer.slice(newlineIndex + 1)
        if (!line.trim()) continue

        let message: JsonRpcMessage
        try {
          message = JSON.parse(line)
        } catch {
          continue
        }

        if (message.id === 1) {
          send({ jsonrpc: '2.0', id: 2, method: 'account/rateLimits/read', params: null })
        } else if (message.id === 2) {
          const result = message.result as { rateLimits?: { primary?: unknown; secondary?: unknown } } | undefined
          const session = parseQuotaWindow(result?.rateLimits?.primary)
          const week = parseQuotaWindow(result?.rateLimits?.secondary)
          if (!session || !week) {
            finish(null)
            continue
          }
          finish({ status: 'ok', source: 'live', session, week, lastCheckedAt: new Date().toISOString() })
        }
      }
    })

    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { clientInfo: { name: 'trayt', title: 'trayt', version: '0.1.0' } }
    })
  })
}

export const codexProvider: AgentProvider = {
  id: 'codex-cli',
  name: 'Codex CLI',

  async getUsage(): Promise<UsageSnapshot> {
    const live = await getUsageFromAppServer()
    if (live) return live

    return {
      status: 'not_installed',
      message:
        'Could not read live usage via "codex app-server" (account/rateLimits/read). Is Codex CLI installed and logged in?'
    }
  }
}
