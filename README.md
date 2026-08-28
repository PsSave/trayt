# trayt

🇧🇷 [Ler em Português](README.pt-BR.md)

A system tray dashboard for AI coding agent usage — Claude Code, Codex CLI, and (eventually) others — for **Linux and Windows**.

**Purpose:** give you an at-a-glance view, right from your tray, of how much of your current session and weekly quota you've used — and exactly when it resets — instead of digging through logs or a web dashboard every time you want to check.

## What it actually shows today

**Claude Code** — live, real account data, not an estimate. `claude` (the Claude Code CLI) has a `/usage` slash command; it turns out that also runs headlessly via `claude -p "/usage"`, and prints exactly what the interactive REPL would show:

```
Current session: 8% used · resets Aug 28, 11:50pm (America/Sao_Paulo)
Current week (all models): 30% used · resets Aug 30, 8am (America/Sao_Paulo)
```

trayt shells out to that command and parses those two lines — this is Anthropic's actual rolling 5-hour and weekly usage windows, read straight from your account, not a guess or a local computation. If that call fails for any reason (CLI not on PATH, not logged in, an older version without `/usage`), it falls back to a local estimate built from `~/.claude/stats-cache.json` (Claude Code's own historical cache) so the card degrades gracefully instead of going blank. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full reasoning, including why we don't hit Anthropic's API directly.

**Codex CLI** — parked for now, not a priority for the current milestone. If you use Codex CLI and want to find its equivalent of `/usage`, see [docs/ADDING_A_PROVIDER.md](docs/ADDING_A_PROVIDER.md) — this is the best first contribution once someone picks it up.

## Stack

Electron + React + TypeScript (via [electron-vite](https://electron-vite.org)). See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for why, and for the tradeoff against Tauri.

## Development

```bash
npm install
npm run dev
```

This opens the app in the tray — click the icon to toggle the usage popover.

```bash
npm run build:linux   # AppImage + .deb
npm run build:win     # NSIS installer
```

## Project status

Early / pre-alpha. Architecture and the provider interface are the current focus — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Contributions welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
