# Contributing

trayt is early — the priorities right now, roughly in order:

1. **A monochrome/template tray icon variant.** `resources/tray-icon.png` is the real owl mark now, but it's full-color — some Linux panels recolor/invert tray icons and expect a simpler monochrome silhouette variant. Worth checking how it actually looks across a few DEs.
2. **Packaging polish.** `npm run build:linux` / `build:win` work but haven't been tested across distros (Wayland vs. X11 tray protocols vary) or Windows versions — bug reports with your OS/DE details are useful even without a fix attached.
3. **Codex CLI support.** Currently parked, not the current milestone's focus — but it's a stub (`src/main/providers/codex.ts`) waiting for someone who has it installed. See [docs/ADDING_A_PROVIDER.md](docs/ADDING_A_PROVIDER.md).

Also worth knowing: the Claude Code provider parses `claude -p "/usage"`'s human-readable text output (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)), which is inherently a bit fragile — if a Claude Code update changes that wording, please open an issue with the new output.

## Workflow

- Fork, branch, PR against `main`.
- `npm run typecheck` and `npm run lint` before opening a PR.
- Keep PRs scoped to one provider/feature — easier to review, easier to revert if a specific data source assumption turns out wrong on someone else's machine.
- If your change touches how usage numbers are computed, say in the PR description exactly which local file/field you're reading and why you believe it's reliable across installs, not just on your machine.

## Reporting a provider data source that changed

Claude Code, Codex CLI, etc. are moving targets — if a provider breaks because the underlying tool changed its local file format, please open an issue with the tool's version and (redacted, if needed) example of the new format, rather than just "it's broken."
