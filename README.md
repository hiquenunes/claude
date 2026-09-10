# Jarvis

Segundo cérebro do Henrique: memória de clientes no Google Drive, ferramentas MCP para o Claude usar na conversa, e um painel web para navegar/corrigir o que foi salvo.

- **Como funciona / decisões de arquitetura**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Como configurar (OAuth, variáveis de ambiente, MCP)**: [`docs/SETUP.md`](docs/SETUP.md)
- **O que colar no Claude como instrução**: [`docs/OPERATING_INSTRUCTIONS.md`](docs/OPERATING_INSTRUCTIONS.md)

## Estrutura

```
packages/core/   camada de serviço (Drive/Sheets, memória versionada, idempotência)
mcp-server/      servidor MCP para o Claude Desktop/Code
web/             painel Next.js (sem IA embutida)
docs/            documentação
```

## Comandos

```bash
npm install                 # instala tudo (workspaces)
npm run build                # builda core, web e mcp-server
npm run test                 # roda os testes de packages/core
npm run dev:web               # painel em http://localhost:3000
```

Veja `docs/SETUP.md` antes de rodar pela primeira vez — é preciso configurar um OAuth client do Google.
