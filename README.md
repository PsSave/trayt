# trayt

🇧🇷 [Ler em Português](README.pt-BR.md)

A system tray dashboard for AI coding agent usage — Claude Code, Codex CLI, and (eventually) others — for **Linux and Windows**.

**Purpose:** give you an at-a-glance view, right from your tray, of how many tokens you've spent and how much you have left — daily and weekly — instead of digging through logs or a web dashboard every time you want to check.

## What it actually shows today

**Important, read this before filing an issue:** neither Claude Code nor Codex CLI expose a local "X messages/tokens left until your limit resets" number anywhere on disk, and there is no public API for it on a subscription plan. So v0.1 is **not** a countdown timer — it's a **usage dashboard**: tokens, sessions and messages per day, read from each tool's own local cache. A real "time until reset" feature is tracked as future work and depends on Anthropic/OpenAI exposing that data (see [Adding a provider](docs/ADDING_A_PROVIDER.md) and open issues).

Current providers:
- **Claude Code** — reads `~/.claude/stats-cache.json` (already aggregated locally by Claude Code itself).
- **Codex CLI** — not implemented yet. We didn't have a local Codex CLI install to inspect its data files while scaffolding this. If you do, see [docs/ADDING_A_PROVIDER.md](docs/ADDING_A_PROVIDER.md) — this is the best first contribution.

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
