# Architecture

## Why Electron, not Tauri

Both were considered. Electron won for this project specifically because:

- **Lower contribution barrier.** trayt's whole value is community-contributed providers for different agents/tools. Electron keeps the entire stack in TypeScript, so any contributor who can read a JSON file and write a bit of JS can add a provider. Tauri's backend is Rust, which would gate most of that contribution on knowing Rust.
- **No native toolchain required to get started.** Tauri needs a Rust toolchain plus platform build deps (`libwebkit2gtk`, MSVC build tools, etc.) before `npm install` even works. Electron only needs Node.

The tradeoffs we're accepting: a larger install size (~150-200MB vs ~10-20MB) and higher idle RAM use, since Electron bundles Chromium rather than using the OS's native webview. For a tray utility that's rarely the active window, this was judged an acceptable cost for the lower contribution barrier. If that tradeoff stops making sense (e.g. RAM complaints dominate issues), revisit — the provider layer below doesn't depend on Electron and would port cleanly to Tauri.

## Process layout

Standard three-process Electron split, scaffolded with [electron-vite](https://electron-vite.org):

- `src/main/` — Node process. Owns the tray icon (`Tray`), the popover `BrowserWindow`, and every provider. Nothing here is exposed to the renderer directly.
- `src/preload/` — the only bridge between main and renderer, via `contextBridge`. Exposes exactly one call: `window.trayt.getUsage()`.
- `src/renderer/` — React UI for the popover. Pure presentation: it calls `getUsage()`, polls it every 60s, and renders a `ProviderCard` per provider. It has no filesystem access and knows nothing about *how* usage data is obtained — that's the point of the provider boundary below.

## The provider boundary

Everything agent-specific lives behind one interface, `AgentProvider` (`src/main/providers/types.ts`):

```ts
interface AgentProvider {
  id: string
  name: string
  getUsage(): Promise<UsageSnapshot>
}
```

`getUsage()` must never throw — a provider that can't find its data source returns a snapshot with `status: 'not_installed' | 'unsupported' | 'error'` and a `message`, and the UI renders that as a muted card instead of crashing the popover. `src/main/providers/registry.ts` is the single list the main process reads from; adding a provider means writing one file and adding one line there.

This boundary exists so that:
1. A broken or slow provider (e.g. one that shells out to a CLI) can't take down the whole app.
2. The renderer stays agent-agnostic — it has zero knowledge of Claude Code, Codex, or anyone else's file formats.
3. Supporting a new agent is additive, not a refactor.

See [ADDING_A_PROVIDER.md](ADDING_A_PROVIDER.md) for a concrete walkthrough.

## Known limitation: no real quota/reset-time data

We looked for a local file with "requests/tokens remaining until reset" for Claude Code on this machine and it does not exist — `~/.claude/stats-cache.json` is a historical aggregate (tokens/sessions/messages per day), not a live quota. `~/.claude/policy-limits.json` is org policy toggles, unrelated to usage quota. There is no evidence Codex CLI exposes this locally either (untested — no local install was available while scaffolding). Until one of these tools exposes that number somewhere reachable, trayt can only show usage, not remaining quota. Don't accept a PR that fakes this number from guessed plan limits — it'll be wrong for too many users' plans to be trustworthy.
