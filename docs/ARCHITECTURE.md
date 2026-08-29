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
- `src/renderer/` — React UI for the popover. Pure presentation: it calls `getUsage()`, polls it every 60s, and renders a `ProviderRow` per provider. It has no filesystem access and knows nothing about *how* usage data is obtained — that's the point of the provider boundary below.

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

## How live quota data actually works (Claude Code)

There is no local file with "percent used / resets at" for Claude Code — `~/.claude/stats-cache.json` is a historical aggregate (tokens/sessions/messages per day), and `~/.claude/policy-limits.json` is org policy toggles, unrelated to usage quota. Both were dead ends.

What does work: Claude Code's interactive `/usage` slash command also runs headlessly, via `claude -p "/usage"`. It prints real, live account data — the actual rolling 5-hour session window and weekly cap Anthropic enforces, plus the exact reset time — because it's calling the same thing the interactive REPL does, just non-interactively. `src/main/providers/claude-code.ts` shells out to it and parses the two summary lines.

This is deliberately **not** "call Anthropic's API directly with the account's OAuth token" — that token lives in `~/.claude/.credentials.json`, and a third-party tool reading and using someone's auth credential to hit a private/undocumented endpoint is a meaningfully bigger trust ask than shelling out to a CLI the user already trusts and already has authenticated. `claude -p "/usage"` gets us the same real data through the interface the tool itself exposes for this purpose.

Trade-off we're accepting: this parses human-readable CLI text output, not a stable API contract, so a Claude Code update that changes the wording of those two lines can silently break parsing (`parseUsageOutput` in `claude-code.ts` returns `null` on a mismatch, which is treated as "CLI unusable" and triggers the stats-cache fallback below — it won't crash, but it will silently under-report until someone notices and updates the regex). If Anthropic ever ships a stable machine-readable form of this (a `--json` flag, say), switch to it.

**Fallback:** if the CLI call fails for any reason (not installed, not logged in, timed out, or output didn't parse), the provider falls back to computing today's tokens/sessions/messages from `~/.claude/stats-cache.json`. That fallback is clearly a different, lower-fidelity kind of data (a local historical estimate, not a live quota check) — `UsageSnapshot.source` (`'live' | 'local-estimate'`) exists specifically so the UI can be honest about which one it's showing, and `ProviderRow.tsx` renders each source differently. Don't collapse that distinction to make the UI simpler; a user who thinks they're seeing a live quota when they're actually seeing yesterday's cache would be worse off than the card just saying so.

**Codex CLI:** parked (see README) — no local install was available to check whether it has an equivalent to `/usage`. If you pick this up, look for an interactive slash/status command in Codex CLI first and test whether it also runs non-interactively, the same pattern that worked here — see [ADDING_A_PROVIDER.md](ADDING_A_PROVIDER.md).

## The popover: a transparent, dynamically-sized HUD card

`src/main/index.ts` creates a frameless, transparent `BrowserWindow` — the rounded card look is entirely CSS (`.card-shell` in `styles.css`), not a native window shape. Two things about it aren't obvious from the code alone:

**Positioning has no reliable signal on Linux Wayland.** `tray.getBounds()` — and the bounds Electron's 'click' event hands you — report an all-zero rectangle on most Wayland sessions (confirmed on KDE Plasma + Wayland via `TRAYT_DEBUG_ANCHOR=1`): the AppIndicator/StatusNotifierItem tray backend Electron uses on Linux doesn't expose icon geometry to the client at all. The natural fallback, `screen.getCursorScreenPoint()`, is *also* unreliable there — Wayland deliberately hides the real global cursor position from clients, and on a multi-monitor setup it can report a point on the wrong monitor entirely. `anchorPoint()` in `src/main/index.ts` handles this by branching on `isWayland`: on X11 and Windows (where bounds and/or cursor position are trustworthy), the existing bounds→cursor logic is used unchanged; only when both signals are known-unreliable (Wayland with no usable bounds) does it fall back to a fixed corner of the *primary* display. That fallback is a documented platform limitation, not a bug to keep chasing — there is currently no Electron API on Wayland that reports which physical monitor hosts the tray icon.

**Window height is measured from content, not hardcoded.** The card's height depends on how many providers are shown and which state each one is in (two quota bars vs. a one-line note vs. a dimmed placeholder) — a fixed window height either clips the rounded top/bottom corner when content is taller than guessed, or leaves dead space when it's shorter. `App.tsx` attaches a `ResizeObserver` to `.card-shell` and reports its `borderBoxSize` (not `contentRect` — that excludes the card's own padding and under-reports the height, which re-introduces the clipping bug) via `window.trayt.resize()`; `resizePopoverTo()` in the main process resizes the window and recomputes its position from the anchor recorded when it was shown, so the edge it's anchored to (e.g. sitting just above a bottom panel) stays fixed while the opposite edge moves. A first measurement is sent synchronously from the ref callback (via `offsetHeight`) rather than waiting for the observer's first async callback, so the window doesn't briefly sit at its initial guessed height on the very first open.

One more thing this rules out on purpose: don't animate the window itself (position/size/opacity via Electron APIs) to smooth this out — Electron window transitions are visibly janky on Linux. The 170ms pop-in animation is CSS transform/opacity on the *content* inside an already-positioned window; the resize above is a single discrete jump, not an animated transition.
