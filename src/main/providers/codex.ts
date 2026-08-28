import type { AgentProvider, UsageSnapshot } from './types'

/**
 * Placeholder provider. We have not yet confirmed where Codex CLI stores local
 * usage/session data on Linux/Windows (no local install was available to inspect
 * while scaffolding this project). If you have Codex CLI installed, see
 * docs/ADDING_A_PROVIDER.md — finding and documenting this path is a great first
 * contribution.
 */
export const codexProvider: AgentProvider = {
  id: 'codex-cli',
  name: 'Codex CLI',

  async getUsage(): Promise<UsageSnapshot> {
    return {
      status: 'unsupported',
      message: 'Codex CLI data source not implemented yet — contributions welcome, see docs/ADDING_A_PROVIDER.md.'
    }
  }
}
