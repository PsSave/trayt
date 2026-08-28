# Adding a provider

A provider is one file implementing `AgentProvider` (see `src/main/providers/types.ts`), plus one line registering it. Use `src/main/providers/claude-code.ts` as the reference implementation.

## Steps

1. **Look for a headless status/usage command first.** This is how the Claude Code provider works (`src/main/providers/claude-code.ts`): Claude Code has an interactive `/usage` slash command, and it turns out `claude -p "/usage"` runs it non-interactively and prints real, live account data (percent of quota used, exact reset time) — no file parsing, no guessing. Before falling back to reading local files, check whether the tool you're adding has something similar: an interactive slash/status command, and a `-p`/`--print`/non-interactive flag that can run it headlessly. Try running the tool's `--help`, look for a `status`/`usage`/`auth status` subcommand, and just try invoking whatever slash command exists via print mode, the way `claude -p "/usage"` does — it may just work.

   This is preferable to reading the tool's OAuth/credential file yourself and hitting an API directly — that's a much bigger trust ask for a third-party tool, and it's usually not necessary once you find the CLI's own headless path.

2. **If there's no such command, fall back to a local data source.** Look for a cache/log/state file the tool already writes on disk — under its config dir (`~/.<tool>/`, `%APPDATA%\<tool>\` on Windows), or session transcripts it logs for its own use. Prefer a file the tool *already* maintains over parsing raw request logs yourself — less to keep in sync if the tool's internal format changes. Be upfront in the UI that this is an estimate, not live quota data — see the `source: 'live' | 'local-estimate'` field on `UsageSnapshot`.
3. **Create `src/main/providers/<id>.ts`** exporting an object matching `AgentProvider`:
   - `id`: stable kebab-case string.
   - `name`: display name shown in the UI.
   - `getUsage()`: run the command or read the file, parse it, return a `UsageSnapshot`. Wrap the call/parse in try/catch — return `{ status: 'not_installed', message }` if the tool isn't found (not installed, or never run), `{ status: 'error', message }` on a parse failure. Never throw.
4. **Register it** in `src/main/providers/registry.ts` by adding it to the `providers` array.
5. **Document what you found**, even if the provider isn't complete — a PR that documents *where* Codex CLI (or any other tool) exposes this, even with a stub `status: 'unsupported'` implementation, is a useful contribution on its own.

## On "time until reset" / remaining quota

`UsageSnapshot` already has `session`/`week` fields (`percentUsed` + `resetsLabel`) for exactly this, populated when `source: 'live'` — see how `claude-code.ts` fills them from `claude -p "/usage"`. If a tool exposes this differently (e.g. a different set of windows, or a `--json` output you don't need to regex), extend `UsageSnapshot` rather than inventing a second interface, and document the source precisely (command / file path, and how you confirmed it reflects the account's actual plan limit — not a guessed constant) in your PR description.

## Testing your provider

`npm run dev` launches the app with your provider live — click the tray icon to see your card render. If your data source needs sample data you don't have (e.g. you're implementing Codex CLI on a machine that only has Claude Code installed), fixture a representative JSON file under a `__fixtures__/` folder next to your provider and point at it behind an env var switch (e.g. `TRAYT_MOCK_CODEX`) rather than committing real personal usage data.
