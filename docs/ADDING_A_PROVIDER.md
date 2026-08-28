# Adding a provider

A provider is one file implementing `AgentProvider` (see `src/main/providers/types.ts`), plus one line registering it. Use `src/main/providers/claude-code.ts` as the reference implementation.

## Steps

1. **Find the local data source.** Look for a cache/log/state file the tool already writes on disk — under its config dir (`~/.<tool>/`, `%APPDATA%\<tool>\` on Windows), or session transcripts it logs for its own use. Prefer a file the tool *already* maintains over parsing raw request logs yourself — less to keep in sync if the tool's internal format changes.
2. **Create `src/main/providers/<id>.ts`** exporting an object matching `AgentProvider`:
   - `id`: stable kebab-case string.
   - `name`: display name shown in the UI.
   - `getUsage()`: read the file, parse it, return a `UsageSnapshot`. Wrap file reads/parsing in try/catch — return `{ status: 'not_installed', message }` if the file doesn't exist (tool not installed, or never run), `{ status: 'error', message }` on a parse failure. Never throw.
3. **Register it** in `src/main/providers/registry.ts` by adding it to the `providers` array.
4. **Document what you found**, even if the provider isn't complete — a PR that documents *where* Codex CLI (or any other tool) stores its data, even with a stub `status: 'unsupported'` implementation, is a useful contribution on its own.

## On "time until reset" / remaining quota

If you find that a tool *does* expose remaining-quota or reset-time data locally (or via an authenticated endpoint the tool itself uses), that's exactly the gap called out in [ARCHITECTURE.md](ARCHITECTURE.md) — highly welcome. Add optional fields to `UsageSnapshot` (`src/main/providers/types.ts`) rather than inventing a second interface, and document the source precisely (file path / endpoint, and how you confirmed it reflects the account's actual plan limit — not a guessed constant) in your PR description.

## Testing your provider

`npm run dev` launches the app with your provider live — click the tray icon to see your card render. If your data source needs sample data you don't have (e.g. you're implementing Codex CLI on a machine that only has Claude Code installed), fixture a representative JSON file under a `__fixtures__/` folder next to your provider and point at it behind an env var switch (e.g. `TRAYT_MOCK_CODEX`) rather than committing real personal usage data.
