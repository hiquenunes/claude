# Arquitetura da Jarvis

## Diagnóstico do ponto de partida

O repositório `hiquenunes/claude` estava vazio (sem commits, sem branches) quando este trabalho começou — não havia plataforma anterior para reaproveitar. Em compensação, esta sessão do Claude já tinha conectores autorizados para Google Drive, Granola e Reportei (entre outros). Essas duas constatações definiram a arquitetura: construir do zero, mas em cima do Claude-com-conectores como interface de conversa, em vez de embutir um chat próprio.

## Decisão sobre o modo de IA

**Modo A adaptado**: a conversa acontece no Claude (claude.ai ou Claude Code), não em um chat dentro do painel. Isso evita custo incremental de API e reaproveita algo que você já usa. A diferença em relação ao briefing original (que descrevia isso para o ChatGPT) é que os conectores já ativos nesta conta são do Claude, não do ChatGPT — confirmado com você antes de implementar.

O painel web (`web/`) não tem nenhum backend de IA. Ele só lê/escreve a mesma estrutura de memória no Drive, através da mesma camada de serviço que o Claude usa via MCP — por isso as regras de memória nunca divergem entre os dois.

## Componentes

```
claude/
├── packages/core/    → camada de serviço (TypeScript), sem dependência de transporte:
│                        Drive/Sheets como "ports" testáveis, estrutura idempotente,
│                        memória versionada, tarefas, entregas, operações (idempotência),
│                        métricas de campanha (divisão seguro por zero).
├── mcp-server/       → servidor MCP que expõe a mesma camada de serviço como
│                        ferramentas (jarvis_find_client, jarvis_save_memory_change, …)
│                        para o Claude Desktop/Code chamar diretamente na conversa.
├── web/              → painel Next.js (App Router): visão geral, clientes, memória,
│                        integrações, configurações. Autenticado com o Google (NextAuth),
│                        sem IA embutida.
└── docs/             → este arquivo, SETUP.md, OPERATING_INSTRUCTIONS.md.
```

Responsabilidades:
- **Google Drive/Sheets/Docs**: toda a memória de negócio (clientes, fatos, decisões, tarefas, entregas, fontes, operações). Fonte da verdade.
- **`@jarvis/core`**: valida e versiona cada escrita; garante idempotência; nunca deixa o chamador confundir hipótese com decisão confirmada.
- **Servidor MCP**: transporte para o Claude. Guarda só um refresh token local (`~/.jarvis/credentials.json`, permissão 600) — nunca um token de longa duração exposto a terceiros.
- **Painel web**: transporte para navegação/edição manual. Autenticação Google também concede o acesso ao Drive (mesmo login).
- **Granola / Reportei**: usados diretamente pelo Claude via conectores já autorizados na sua conta — não há código de integração dedicado neste repositório para eles. O Claude busca o conteúdo real e grava o resultado através das ferramentas `jarvis_*` (`jarvis_register_source`, `jarvis_save_deliverable`, `jarvis_upsert_task`).

## Estrutura no Drive (idempotente)

Identidade dos arquivos é por `appProperties` (marcador invisível, não pelo nome) — renomear qualquer pasta/planilha no Drive não quebra nada.

```
Jarvis/                                  (appProperties: app=jarvis, role=root)
├── Configuração/
│   ├── Perfil e Preferências (doc, append-only)
│   ├── Índice de Clientes (sheet)
│   └── Memória Global (sheet)
├── Modelos de Entrega/
├── Clientes/
│   └── <Nome do Cliente>/               (role=client, client_id=…)
│       ├── Memória (sheet)
│       ├── Fontes (sheet)
│       ├── Índice de Entregas (sheet)
│       └── Entregas/
├── Pendências (sheet — tarefas de todos os clientes, com client_id)
└── Operações (sheet — log de idempotência, sem segredos)
```

Rodar o setup de novo (botão em Configurações, ou automático no primeiro acesso) nunca duplica nada — cada `ensureX` procura por `appProperties` antes de criar.

## Esquema de dados

Implementado em `packages/core/src/types.ts`, refletindo a seção 6 do briefing: `ClientRecord`, `MemoryRecord` (com `status`: vigente / pendente_confirmacao / substituido / arquivado), `SourceRecord`, `DeliverableRecord`, `TaskRecord`, `OperationRecord`. Datas ficam como ISO 8601; apresentação em pt-BR (`toLocaleString("pt-BR")`); fuso comercial padrão `America/Sao_Paulo`, configurável por cliente.

## Idempotência e concorrência

- **Estrutura**: idempotente por `appProperties` (ver acima).
- **Tarefas**: `upsert_task` casa por `(client_id, origin, description)` — reimportar a mesma reunião atualiza, não duplica.
- **Fontes**: `register_source` casa por `(client_id, provider, external_id)`.
- **Memória**: `save_memory_change` nunca sobrescreve — cria um novo registro e marca o anterior como `substituido` (com `supersedes`/`superseded_by`), preservando histórico. Uma "hipótese" nunca vira `vigente` sozinha.
- **Concorrência otimista**: toda atualização de linha pode exigir `expected_version` (o `updated_at` que o chamador leu por último); se alguém mudou a linha nesse meio-tempo, a gravação falha com `ConflictError` em vez de sobrescrever silenciosamente.
- **Operações longas/compostas**: `packages/core/src/services/operations.ts` guarda uma chave de idempotência por operação (`pendente` → `concluida`/`falhou`), permitindo retomar uma escrita interrompida sem duplicar.

## Testes

`packages/core`: 17 testes automatizados (`node --test`), com Drive/Sheets simulados em memória (mesma semântica de concorrência do Google real). Cobrem, entre outros, os critérios da seção 21 do briefing:

| Critério | Coberto por |
|---|---|
| Setup repetido não duplica | `structure.test.ts` |
| Clientes com nomes parecidos não se confundem | `clients.test.ts` |
| Reimportar não duplica tarefas | `tasks.test.ts` |
| Corrigir meta preserva histórico | `memory.test.ts` |
| Hipótese não vira decisão | `memory.test.ts` |
| Edição concorrente não é sobrescrita | `memory.test.ts` |
| Retry de operação não repete o trabalho | `operations.test.ts` |
| Métrica com denominador zero | `metrics.test.ts` |
| Pontos percentuais ≠ variação percentual | `metrics.test.ts` |
| Média de CPL não é ingênua (usa totais) | `metrics.test.ts` |

Rodar: `npm run build:core && npm run test -w @jarvis/core`.

**Não coberto por teste automatizado** (precisa de credenciais reais, ver seção seguinte): chamadas de verdade ao Google Drive/Sheets/Docs, o fluxo OAuth do painel e do servidor MCP, e os fluxos de Granola/Reportei (que rodam do lado do Claude, fora deste repositório).

## Classificação de cada parte

- **Implementado e validado** (build + lint + testes automatizados passando): camada de serviço (`@jarvis/core`), estrutura idempotente, versionamento de memória, tarefas/entregas/operações, métricas de campanha, servidor MCP (compila e recusa rodar sem credencial, com mensagem clara), painel web (compila, tipagem e lint limpos, todas as rotas geradas).
- **Implementado, aguardando credencial para teste real de ponta a ponta**: qualquer chamada real ao Google (Drive/Sheets/Docs) — depende de você criar o OAuth client (`docs/SETUP.md`, passo 1) e autorizar (passo 2/3). O código foi escrito contra a API real do `googleapis`, não um mock — só não pôde ser exercitado de ponta a ponta nesta sessão por falta de credenciais.
- **Aguardando autorização/decisão sua**: publicar o painel web em algum host (não é obrigatório; funciona local); qualquer serviço pago novo.
- **Fora do escopo desta primeira versão** (conforme seção 19 do briefing): envio automático de WhatsApp, alteração de campanhas, gravação própria de reuniões, voz em tempo real, monitoramento contínuo, múltiplas assinaturas novas, comercialização para terceiros.

## Custo incremental

| Item | Categoria |
|---|---|
| Conversa com o Claude (interface principal) | Incluído na sua assinatura atual do Claude — sem custo por chamada de ferramenta MCP. |
| Google Drive/Sheets/Docs API | Gratuito, sujeito às cotas padrão do Google Cloud (a maioria bem acima do uso de uma pessoa). |
| Servidor MCP (`mcp-server/`) | Roda local na sua máquina — sem custo de hospedagem. |
| Painel web (`web/`) | Rodando local (`npm run dev:web`): sem custo. Publicado em um host (Vercel ou similar): normalmente dentro do plano gratuito para uso de uma pessoa, mas confirme os limites/preços atuais do host antes de publicar — não incluído/ativado por esta implementação. |
| Granola / Reportei | Cobrados pelas suas assinaturas existentes desses serviços, não por esta implementação. |
| Qualquer API de IA paga (OpenAI/Anthropic) | Não usada — variável opcional, não ativada. |

## Pendências que dependem de você

1. Criar o OAuth client no Google Cloud e preencher os `.env` (`docs/SETUP.md`, passos 1–3) — sem isso, nem o painel nem o servidor MCP conseguem acessar o Drive.
2. Rodar `npm run authorize` em `mcp-server/` uma vez, na sua máquina.
3. Adicionar o servidor MCP na configuração do Claude Desktop/Code (`docs/SETUP.md`, passo 3).
4. Colar `docs/OPERATING_INSTRUCTIONS.md` como instrução personalizada do Claude.
5. Decidir se/onde publicar o painel web (opcional).
