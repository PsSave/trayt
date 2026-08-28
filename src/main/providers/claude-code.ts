import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { AgentProvider, UsageSnapshot } from './types'

const execFileAsync = promisify(execFile)
const CLI_TIMEOUT_MS = 15_000
const STATS_CACHE_PATH = join(homedir(), '.claude', 'stats-cache.json')

/**
 * `claude -p "/usage"` runs the same slash command the interactive REPL uses,
 * headlessly, and prints real account data (not a local estimate):
 *
 *   Current session: 8% used · resets Aug 28, 11:50pm (America/Sao_Paulo)
 *   Current week (all models): 30% used · resets Aug 30, 8am (America/Sao_Paulo)
 *
 * This is the actual rolling 5-hour and weekly usage windows Anthropic enforces —
 * not something we compute or guess. See docs/ARCHITECTURE.md.
 */
function parseUsageOutput(output: string): Pick<UsageSnapshot, 'session' | 'week'> | null {
  const sessionMatch = output.match(/Current session:\s*(\d+)%\s*used\s*[·-]\s*resets\s*(.+)/i)
  const weekMatch = output.match(/Current week[^:]*:\s*(\d+)%\s*used\s*[·-]\s*resets\s*(.+)/i)
  if (!sessionMatch || !weekMatch) return null

  return {
    session: { percentUsed: Number(sessionMatch[1]), resetsLabel: sessionMatch[2].trim() },
    week: { percentUsed: Number(weekMatch[1]), resetsLabel: weekMatch[2].trim() }
  }
}

async function getUsageFromCli(): Promise<UsageSnapshot | null> {
  let stdout: string
  try {
    ;({ stdout } = await execFileAsync('claude', ['-p', '/usage'], { timeout: CLI_TIMEOUT_MS }))
  } catch {
    // Not installed, not logged in, timed out, or an unrecognized CLI version —
    // any of these fall back to the local stats-cache estimate below.
    return null
  }

  const parsed = parseUsageOutput(stdout)
  if (!parsed) return null

  return { status: 'ok', source: 'live', ...parsed, lastCheckedAt: new Date().toISOString() }
}

interface ClaudeStatsCache {
  dailyActivity?: Array<{ date: string; messageCount: number; sessionCount: number }>
  dailyModelTokens?: Array<{ date: string; tokensByModel: Record<string, number> }>
}

function todayLocalISODate(): string {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

async function getUsageFromStatsCache(): Promise<UsageSnapshot> {
  let raw: string
  try {
    raw = await readFile(STATS_CACHE_PATH, 'utf-8')
  } catch {
    return {
      status: 'not_installed',
      message: `Could not run "claude -p /usage", and no stats cache found at ${STATS_CACHE_PATH}. Is Claude Code installed and on PATH?`
    }
  }

  let cache: ClaudeStatsCache
  try {
    cache = JSON.parse(raw)
  } catch {
    return { status: 'error', message: 'stats-cache.json is not valid JSON.' }
  }

  const today = todayLocalISODate()
  const activity = cache.dailyActivity?.find((d) => d.date === today)
  const tokens = cache.dailyModelTokens?.find((d) => d.date === today)

  return {
    status: 'ok',
    source: 'local-estimate',
    tokensToday: tokens?.tokensByModel ?? {},
    sessionsToday: activity?.sessionCount ?? 0,
    messagesToday: activity?.messageCount ?? 0,
    lastCheckedAt: new Date().toISOString()
  }
}

export const claudeCodeProvider: AgentProvider = {
  id: 'claude-code',
  name: 'Claude Code',

  async getUsage(): Promise<UsageSnapshot> {
    return (await getUsageFromCli()) ?? getUsageFromStatsCache()
  }
}
