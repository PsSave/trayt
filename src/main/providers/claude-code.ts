import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { AgentProvider, UsageSnapshot } from './types'

const STATS_CACHE_PATH = join(homedir(), '.claude', 'stats-cache.json')

interface ClaudeStatsCache {
  dailyActivity?: Array<{ date: string; messageCount: number; sessionCount: number }>
  dailyModelTokens?: Array<{ date: string; tokensByModel: Record<string, number> }>
}

function todayLocalISODate(): string {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

export const claudeCodeProvider: AgentProvider = {
  id: 'claude-code',
  name: 'Claude Code',

  async getUsage(): Promise<UsageSnapshot> {
    let raw: string
    try {
      raw = await readFile(STATS_CACHE_PATH, 'utf-8')
    } catch {
      return {
        status: 'not_installed',
        message: `No stats cache found at ${STATS_CACHE_PATH}. Run Claude Code at least once.`
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
      tokensToday: tokens?.tokensByModel ?? {},
      sessionsToday: activity?.sessionCount ?? 0,
      messagesToday: activity?.messageCount ?? 0
    }
  }
}
