# trayt

🇺🇸 [Read in English](README.md)

Um dashboard de bandeja (system tray) para uso de agentes de codificação com IA — Claude Code, Codex CLI e, eventualmente, outros — para **Linux e Windows**.

**Propósito:** te dar uma visão rápida, direto da bandeja, de quanto da sua cota de sessão e semanal você já usou — e exatamente quando ela reseta — em vez de precisar vasculhar logs ou um dashboard web toda vez que quiser checar.

## O que ele mostra hoje, de fato

**Claude Code** — dado real da conta, ao vivo, não é uma estimativa. O `claude` (CLI do Claude Code) tem um slash command `/usage`; descobrimos que ele também roda em modo não-interativo via `claude -p "/usage"`, e imprime exatamente o que o modo interativo mostraria:

```
Current session: 8% used · resets Aug 28, 11:50pm (America/Sao_Paulo)
Current week (all models): 30% used · resets Aug 30, 8am (America/Sao_Paulo)
```

O trayt executa esse comando e faz o parse dessas duas linhas — são as janelas reais de 5 horas (rolling) e semanal que a Anthropic aplica de fato, lidas direto da sua conta, não um chute ou um cálculo local nosso. Se essa chamada falhar por qualquer motivo (CLI fora do PATH, não logado, versão antiga sem `/usage`), ele cai pra uma estimativa local baseada no `~/.claude/stats-cache.json` (o próprio cache histórico do Claude Code), pra o card degradar com elegância em vez de ficar em branco. Veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pra entender o raciocínio completo, incluindo por que não batemos direto na API da Anthropic.

**Codex CLI** — engavetado por enquanto, não é prioridade no momento atual. Se você usa o Codex CLI e quiser achar o equivalente do `/usage` dele, veja [docs/ADDING_A_PROVIDER.md](docs/ADDING_A_PROVIDER.md) — essa é a melhor primeira contribuição assim que alguém pegar essa frente.

## Stack

Electron + React + TypeScript (via [electron-vite](https://electron-vite.org)). Veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para entender o porquê, e o tradeoff em relação ao Tauri.

## Desenvolvimento

```bash
npm install
npm run dev
```

Isso abre o app na bandeja do sistema — clique no ícone para abrir/fechar o popover de uso.

```bash
npm run build:linux   # gera AppImage + .deb
npm run build:win     # gera instalador NSIS
```

## Status do projeto

Início / pré-alfa. O foco atual é a arquitetura e a interface de providers — veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Contribuições são bem-vindas; veja [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

MIT — veja [LICENSE](LICENSE).
