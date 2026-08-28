import type { AgentProvider } from './types'
import { claudeCodeProvider } from './claude-code'
import { codexProvider } from './codex'

export const providers: AgentProvider[] = [claudeCodeProvider, codexProvider]
