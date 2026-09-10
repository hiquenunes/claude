#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  GoogleDrivePort,
  GoogleSheetsPort,
  JarvisError,
  JarvisService,
  cpl,
  cpm,
  cpcLink,
  ctrLink,
  leadConversionRate,
  pageViewToLinkClickRatio,
  percentChange,
  percentagePointDiff,
  weightedCpl,
  type MetricResult,
} from "@jarvis/core";
import { getAuthorizedClient } from "./oauth.js";

const oauthClient = getAuthorizedClient();
const drive = new GoogleDrivePort(oauthClient);
const sheets = new GoogleSheetsPort(oauthClient);
const jarvis = new JarvisService({
  drive,
  sheets,
  rootFolderName: process.env.JARVIS_ROOT_FOLDER_NAME || "Jarvis",
});

const server = new McpServer({ name: "jarvis", version: "0.1.0" });

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(err: unknown) {
  if (err instanceof JarvisError) {
    const payload: Record<string, unknown> = { error: { code: err.code, message: err.message } };
    if ("candidates" in err) {
      payload.error = { ...payload.error as object, candidates: (err as { candidates: unknown }).candidates };
    }
    return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { isError: true, content: [{ type: "text" as const, text: JSON.stringify({ error: { code: "internal_error", message } }, null, 2) }] };
}

server.tool(
  "jarvis_setup",
  "Cria (ou reaproveita, de forma idempotente) a estrutura de pastas e planilhas do Jarvis no Google Drive. Rode ao configurar pela primeira vez, ou sempre que quiser confirmar que a estrutura existe.",
  {},
  async () => {
    try {
      const structure = await jarvis.setup();
      return ok(structure);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_list_clients",
  "Lista todos os clientes cadastrados (visão compacta: id, nome, status, objetivo atual).",
  {},
  async () => {
    try {
      const clients = await jarvis.listClients();
      return ok(
        clients.map((c) => ({
          client_id: c.client_id,
          name: c.name,
          status: c.status,
          current_objective: c.current_objective,
        }))
      );
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_create_client",
  "Cadastra um novo cliente e cria sua pasta e planilhas no Drive. Rejeita nomes iguais a um cliente já existente em vez de duplicar.",
  {
    name: z.string().min(1),
    aliases: z.array(z.string()).optional(),
    segment: z.string().optional(),
    sites: z.array(z.string()).optional(),
    social_profiles: z.array(z.string()).optional(),
    timezone: z.string().optional(),
    currency: z.string().optional(),
    current_objective: z.string().optional(),
    main_kpis: z.array(z.string()).optional(),
    external_accounts: z.record(z.string()).optional(),
  },
  async (input) => {
    try {
      const client = await jarvis.createClient(input);
      return ok(client);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_find_client",
  "Resolve um nome/alias para exatamente um cliente. Se houver mais de um candidato plausível, retorna erro 'ambiguous_client' com a lista de candidatos — pergunte ao usuário antes de continuar.",
  { client_id: z.string().optional(), name_query: z.string().optional() },
  async ({ client_id, name_query }) => {
    try {
      const client = await jarvis.find_client({ clientId: client_id, nameQuery: name_query });
      return ok(client);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_get_client_context",
  "Retorna o contexto vigente e compacto de um cliente: dados cadastrais, memórias vigentes, hipóteses pendentes de confirmação e tarefas abertas. Use isto antes de responder a um pedido sobre o cliente.",
  { client_id: z.string() },
  async ({ client_id }) => {
    try {
      const context = await jarvis.get_client_context(client_id);
      return ok(context);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_get_memory_history",
  "Retorna o histórico completo de memória de um cliente (incluindo registros substituídos/arquivados), para auditar como um fato ou objetivo mudou ao longo do tempo.",
  { client_id: z.string() },
  async ({ client_id }) => {
    try {
      return ok(await jarvis.get_memory_history(client_id));
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_archive_memory",
  "Arquiva um registro de memória (ex.: não é mais relevante) sem apagá-lo do histórico.",
  { client_id: z.string(), memory_id: z.string(), expected_version: z.string().optional() },
  async ({ client_id, memory_id, expected_version }) => {
    try {
      return ok(await jarvis.archive_memory(client_id, memory_id, expected_version));
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_get_global_memory_context",
  "Retorna preferências e regras globais (não específicas de um cliente).",
  {},
  async () => {
    try {
      return ok(await jarvis.get_global_memory_context());
    } catch (err) {
      return fail(err);
    }
  }
);

const memoryTypeEnum = z.enum(["preferencia", "fato", "objetivo", "restricao", "decisao", "hipotese", "correcao"]);

server.tool(
  "jarvis_save_memory_change",
  "Grava uma mudança de memória validada e versionada. Uma 'hipotese' nunca vira vigente automaticamente — fica pendente_confirmacao. Para corrigir um fato/objetivo vigente, passe supersedes_memory_id (e expected_superseded_version, se você o releu antes) para preservar o histórico em vez de sobrescrever.",
  {
    scope: z.enum(["global", "client"]),
    client_id: z.string().optional(),
    type: memoryTypeEnum,
    content: z.string().min(1),
    source: z.string().optional(),
    valid_from: z.string().optional(),
    supersedes_memory_id: z.string().optional(),
    expected_superseded_version: z.string().optional(),
  },
  async (input) => {
    try {
      const record = await jarvis.save_memory_change({
        scope: input.scope,
        clientId: input.client_id,
        type: input.type,
        content: input.content,
        source: input.source,
        validFrom: input.valid_from,
        supersedesMemoryId: input.supersedes_memory_id,
        expectedSupersededVersion: input.expected_superseded_version,
      });
      return ok(record);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_record_decision",
  "Registra uma decisão inequívoca do cliente com origem e vigência, preservando qualquer decisão anterior no histórico.",
  {
    client_id: z.string(),
    content: z.string().min(1),
    source: z.string().min(1),
    valid_from: z.string().optional(),
    supersedes_memory_id: z.string().optional(),
    expected_superseded_version: z.string().optional(),
  },
  async (input) => {
    try {
      const record = await jarvis.record_decision({
        clientId: input.client_id,
        content: input.content,
        source: input.source,
        validFrom: input.valid_from,
        supersedesMemoryId: input.supersedes_memory_id,
        expectedSupersededVersion: input.expected_superseded_version,
      });
      return ok(record);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_register_source",
  "Registra uma fonte (reunião, relatório, página) associada a um cliente. Reimportar a mesma fonte (mesmo provider + external_id) não duplica — retorna a existente.",
  {
    client_id: z.string(),
    provider: z.string(),
    external_id: z.string().optional(),
    url: z.string().optional(),
    event_date: z.string().optional(),
    period_start: z.string().optional(),
    period_end: z.string().optional(),
    version_or_hash: z.string().optional(),
    evidence_location: z.string().optional(),
  },
  async (input) => {
    try {
      const result = await jarvis.register_source({
        clientId: input.client_id,
        provider: input.provider,
        externalId: input.external_id,
        url: input.url,
        eventDate: input.event_date,
        periodStart: input.period_start,
        periodEnd: input.period_end,
        versionOrHash: input.version_or_hash,
        evidenceLocation: input.evidence_location,
      });
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_search_client_sources",
  "Busca fontes de um cliente com filtros (provider, período) e paginação. Nunca traz todas as fontes de uma vez.",
  {
    client_id: z.string(),
    provider: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    page: z.number().int().min(1).optional(),
    page_size: z.number().int().min(1).max(100).optional(),
  },
  async (input) => {
    try {
      const result = await jarvis.search_client_sources({
        clientId: input.client_id,
        provider: input.provider,
        dateFrom: input.date_from,
        dateTo: input.date_to,
        page: input.page,
        pageSize: input.page_size,
      });
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_read_source",
  "Lê os metadados de uma fonte específica (link/localização da evidência). Para o conteúdo completo, abra o link com sua própria ferramenta de Drive/Granola/Reportei.",
  { client_id: z.string(), source_id: z.string() },
  async ({ client_id, source_id }) => {
    try {
      return ok(await jarvis.read_source(client_id, source_id));
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_upsert_task",
  "Cria ou atualiza uma tarefa. Reimportar a mesma reunião/relatório com a mesma descrição e origem atualiza a tarefa existente em vez de duplicar. Nunca invente owner ou due_date — só passe se foi mencionado explicitamente.",
  {
    client_id: z.string(),
    description: z.string().min(1),
    origin: z.string().min(1),
    owner: z.string().optional(),
    due_date: z.string().optional(),
    status: z.enum(["aberta", "em_andamento", "concluida", "cancelada"]).optional(),
  },
  async (input) => {
    try {
      const result = await jarvis.upsert_task({
        clientId: input.client_id,
        description: input.description,
        origin: input.origin,
        owner: input.owner,
        dueDate: input.due_date,
        status: input.status,
      });
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_list_client_tasks",
  "Lista todas as tarefas de um cliente.",
  { client_id: z.string() },
  async ({ client_id }) => {
    try {
      return ok(await jarvis.list_client_tasks(client_id));
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_save_deliverable",
  "Persiste uma entrega (resumo de reunião, relatório, mensagem de WhatsApp, pesquisa) e suas referências de fonte. Só retorna sucesso se a gravação foi confirmada pelo Drive.",
  {
    client_id: z.string(),
    type: z.enum(["reuniao", "relatorio", "mensagem_whatsapp", "pesquisa", "outro"]),
    source_ids: z.array(z.string()),
    period_start: z.string().optional(),
    period_end: z.string().optional(),
    content: z.string().optional(),
    link: z.string().optional(),
    generation_state: z.enum(["gerado", "parcial", "falhou"]),
  },
  async (input) => {
    try {
      const record = await jarvis.save_deliverable({
        clientId: input.client_id,
        type: input.type,
        sourceIds: input.source_ids,
        periodStart: input.period_start,
        periodEnd: input.period_end,
        content: input.content,
        link: input.link,
        generationState: input.generation_state,
      });
      return ok(record);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_list_client_deliverables",
  "Lista as entregas salvas de um cliente, mais recentes primeiro.",
  { client_id: z.string() },
  async ({ client_id }) => {
    try {
      return ok(await jarvis.list_client_deliverables(client_id));
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "jarvis_get_operation_status",
  "Consulta o estado de uma operação (útil para confirmar se uma gravação anterior foi concluída antes de repetir).",
  { operation_id: z.string() },
  async ({ operation_id }) => {
    try {
      return ok(await jarvis.get_operation_status(operation_id));
    } catch (err) {
      return fail(err);
    }
  }
);

const metricEnum = z.enum([
  "cpm",
  "ctr_link",
  "cpc_link",
  "cpl",
  "page_view_to_link_click_ratio",
  "lead_conversion_rate",
  "percent_change",
  "percentage_point_diff",
  "weighted_cpl",
]);

server.tool(
  "jarvis_compute_metric",
  "Calcula uma métrica de campanha em código (nunca por aritmética manual), com denominador zero tratado como indisponível em vez de infinito ou inventado. Métricas: cpm(spend,impressions), ctr_link(link_clicks,impressions), cpc_link(spend,link_clicks), cpl(spend,leads), page_view_to_link_click_ratio(page_views,link_clicks), lead_conversion_rate(leads,page_views), percent_change(current,previous), percentage_point_diff(current_pct,previous_pct), weighted_cpl(campaigns:[{spend,leads}]).",
  {
    metric: metricEnum,
    a: z.number().optional(),
    b: z.number().optional(),
    campaigns: z.array(z.object({ spend: z.number(), leads: z.number() })).optional(),
  },
  async ({ metric, a, b, campaigns }) => {
    try {
      let result: MetricResult | number;
      switch (metric) {
        case "cpm":
          result = cpm(a!, b!);
          break;
        case "ctr_link":
          result = ctrLink(a!, b!);
          break;
        case "cpc_link":
          result = cpcLink(a!, b!);
          break;
        case "cpl":
          result = cpl(a!, b!);
          break;
        case "page_view_to_link_click_ratio":
          result = pageViewToLinkClickRatio(a!, b!);
          break;
        case "lead_conversion_rate":
          result = leadConversionRate(a!, b!);
          break;
        case "percent_change":
          result = percentChange(a!, b!);
          break;
        case "percentage_point_diff":
          result = percentagePointDiff(a!, b!);
          break;
        case "weighted_cpl":
          result = weightedCpl(campaigns ?? []);
          break;
      }
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
