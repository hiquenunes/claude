# Arquitetura da Jarvis

## Diagnóstico e pivô

Duas versões desta implementação existiram nesta sessão. A primeira construiu um serviço TypeScript, um servidor MCP e um painel web, todos exigindo criar um OAuth client no Google Cloud e configurar variáveis de ambiente. O Henrique pediu explicitamente o oposto: **tudo feito diretamente pelo Claude, sem criar nada em lugar nenhum**. Esse código foi removido. O que segue é a arquitetura atual.

## Como funciona

Não há código, não há servidor, não há credencial para configurar. A memória de trabalho é uma estrutura de pastas e documentos no seu Google Drive real, e o próprio Claude (nesta ou em qualquer conversa futura com o Google Drive conectado) lê e escreve nela diretamente, usando o conector de Drive que você já autorizou — o mesmo que esta sessão já usa.

A pasta raiz **"Jarvis"** já foi criada no seu Drive: https://drive.google.com/drive/folders/1YZSPdJSLy-1hHUuj_rgNsj8D1Q2Q-Dk_

Dentro dela, um documento **"Como isso funciona"** explica a convenção completa em linguagem simples — serve tanto para você quanto para qualquer conversa nova do Claude reconstruir o entendimento, mesmo sem `docs/OPERATING_INSTRUCTIONS.md` colado.

## Restrição real descoberta e como ela moldou o design

O conector de Google Drive do Claude permite criar, ler, renomear/mover, copiar, compartilhar e mover para a lixeira arquivos — **mas não tem uma operação para editar o conteúdo de um arquivo já existente**. Isso descartou a ideia original de planilhas com linhas editáveis (que exigiriam a API do Sheets, fora do conector nativo).

A solução: **cada registro de memória é o seu próprio arquivo, nunca editado depois de criado.** Mudança de status (vigente → substituído, aberta → concluída) é uma renomeação de título (`update_file` suporta título e pasta-pai), não uma edição de conteúdo. Isso, por acaso, é uma restrição saudável: torna impossível sobrescrever silenciosamente um fato antigo, e o histórico fica automaticamente preservado como uma sequência de arquivos, sem nenhuma lógica extra de versionamento.

## Estrutura no Drive

```
Jarvis/
├── Como isso funciona          (doc — convenção completa, escrita em pt-BR)
├── Configuração/                (registros de memória globais, mesma convenção)
├── Modelos de Entrega/          (exemplos de reports/mensagens aprovados)
└── Clientes/
    └── <Nome do Cliente>/       (o ID desta pasta no Drive é o identificador
                                   estável do cliente — renomear não quebra nada)
        ├── Memória/             (um arquivo por fato/preferência/objetivo/
                                   decisão/hipótese/correção)
        ├── Fontes/               (um arquivo por reunião/relatório/página
                                   registrada — referência, não o conteúdo
                                   inteiro)
        ├── Tarefas/              (um arquivo por tarefa)
        └── Entregas/             (um arquivo por entrega: resumo de reunião,
                                   relatório, mensagem de WhatsApp, pesquisa)
```

Convenção de título por pasta (o texto completo em `docs/OPERATING_INSTRUCTIONS.md` e no documento "Como isso funciona"):

| Pasta | Formato do título | Exemplo |
|---|---|---|
| Memória/ | `[STATUS] tipo — resumo` | `[VIGENTE] objetivo — Meta de CPL R$ 80 desde 10/09/2026` |
| Fontes/ | `[FONTE] provedor:id_externo — descrição (data)` | `[FONTE] granola:abc123 — Reunião quinzenal (08/09/2026)` |
| Tarefas/ | `[STATUS] descrição — origem` | `[ABERTA] Enviar nova proposta de criativo — reuniao:08/09/2026` |
| Entregas/ | `[TIPO] resumo (data)` | `[RELATORIO] Semana 36 (08/09/2026)` |

## Idempotência e histórico, sem nenhum código

- **Evitar duplicar uma fonte/tarefa ao reimportar**: antes de criar, busca por `provedor:id_externo` (fontes) ou por descrição+origem (tarefas) dentro da pasta certa. Se já existir, não cria de novo.
- **Corrigir um fato sem perder o anterior**: cria o novo registro `[VIGENTE]`, depois renomeia o antigo para `[SUBSTITUIDO]` — nunca apaga, nunca edita o conteúdo.
- **Hipótese nunca vira decisão sozinha**: nasce como `[PENDENTE]`; só vira `[VIGENTE]` com confirmação explícita, num novo registro.
- **Concorrência**: antes de renomear um registro como substituído, relê o título atual — se alguém já mudou, para e avisa em vez de sobrescrever.

## Validação real (feita nesta sessão, não simulada)

Criei um cliente de teste na sua pasta real, validei ponta a ponta e depois removi (mandei para a lixeira, reversível):

1. Estrutura de pastas (Memória/Fontes/Tarefas/Entregas) criada com sucesso.
2. Registro `[VIGENTE] objetivo — Meta de CPL R$ 60` criado; busca por `[VIGENTE]` encontrou exatamente ele.
3. Corrigido para R$ 80: novo `[VIGENTE]` criado referenciando o antigo; antigo renomeado para `[SUBSTITUIDO]` via `update_file` — conteúdo original intacto, nada apagado.
4. Tarefa `[ABERTA] Enviar nova proposta de criativo — reuniao:08/09/2026` criada; busca por descrição+origem encontrou a mesma tarefa, confirmando que reimportar não duplicaria.

## Custo incremental

| Item | Categoria |
|---|---|
| Conversa com o Claude | Incluída na sua assinatura atual — sem chamada de API paga. |
| Google Drive | Gratuito, dentro das cotas padrão do Google. |
| Qualquer servidor, deploy ou credencial nova | Não existe — nada para manter. |

## O que ainda depende de você

1. (Opcional) Colar `docs/OPERATING_INSTRUCTIONS.md` como instrução personalizada do Claude, para não depender de repetir o contexto em cada conversa nova. Sem isso, uma conversa nova ainda funciona, só que precisa ser lembrada de abrir a pasta "Jarvis" e ler "Como isso funciona" primeiro.
2. Nada mais. Não há OAuth, não há deploy, não há variável de ambiente.
