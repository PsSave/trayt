import type { UsageSnapshot } from '../../shared/usage'

export type { UsageSnapshot }

/**
 * Contract every agent provider must implement to show up in the tray.
 * See docs/ADDING_A_PROVIDER.md for a walkthrough of writing a new one.
 */
export interface AgentProvider {
  /** Stable identifier, e.g. 'claude-code'. Used as a React key and in logs. */
  id: string
  /** Display name, e.g. 'Claude Code'. */
  name: string
  /** Reads whatever local state is available and returns a snapshot. Must not throw. */
  getUsage(): Promise<UsageSnapshot>
}
