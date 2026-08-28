# trayt

🇺🇸 [Read in English](README.md)

Um dashboard de bandeja (system tray) para uso de agentes de codificação com IA — Claude Code, Codex CLI e, eventualmente, outros — para **Linux e Windows**.

**Propósito:** te dar uma visão rápida, direto da bandeja, de quantos tokens você já gastou e quanto ainda tem disponível — por dia e por semana — em vez de precisar vasculhar logs ou um dashboard web toda vez que quiser checar.

## O que ele mostra hoje, de fato

**Importante, leia antes de abrir uma issue:** nem o Claude Code nem o Codex CLI expõem localmente um número do tipo "faltam X mensagens/tokens até seu limite resetar", e não existe API pública para isso em planos de assinatura. Então a v0.1 **não** é um contador regressivo — é um **dashboard de uso**: tokens, sessões e mensagens por dia, lidos do cache local de cada ferramenta. Um recurso real de "tempo até resetar" está registrado como trabalho futuro e depende da Anthropic/OpenAI exporem esse dado (veja [Adding a provider](docs/ADDING_A_PROVIDER.md) e as issues abertas).

Providers atuais:
- **Claude Code** — lê `~/.claude/stats-cache.json` (já agregado localmente pelo próprio Claude Code).
- **Codex CLI** — ainda não implementado. Não tínhamos uma instalação local do Codex CLI pra inspecionar seus arquivos de dados enquanto montávamos o projeto. Se você tiver, veja [docs/ADDING_A_PROVIDER.md](docs/ADDING_A_PROVIDER.md) — essa é a melhor primeira contribuição possível.

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
