import { AmbiguousClientError, NotFoundError, ValidationError } from "../errors.js";
import { newId } from "../ids.js";
import type { Clock, DrivePort, SheetsPort } from "../ports.js";
import { deserializeMap, joinList, serializeMap, SheetRepo, splitList } from "../sheet-repo.js";
import { CLIENT_INDEX_SHEET, ensureClientStructure } from "../structure.js";
import type { ClientRecord } from "../types.js";

function serialize(c: ClientRecord): Record<string, string> {
  return {
    client_id: c.client_id,
    name: c.name,
    aliases: joinList(c.aliases),
    segment: c.segment ?? "",
    status: c.status,
    sites: joinList(c.sites),
    social_profiles: joinList(c.social_profiles),
    timezone: c.timezone,
    currency: c.currency,
    current_objective: c.current_objective ?? "",
    main_kpis: joinList(c.main_kpis),
    folder_id: c.folder_id ?? "",
    memory_sheet_id: c.memory_sheet_id ?? "",
    sources_sheet_id: c.sources_sheet_id ?? "",
    external_accounts: serializeMap(c.external_accounts),
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

function deserialize(v: Record<string, string>): ClientRecord {
  return {
    client_id: v.client_id,
    name: v.name,
    aliases: splitList(v.aliases),
    segment: v.segment || undefined,
    status: (v.status as ClientRecord["status"]) || "ativo",
    sites: splitList(v.sites),
    social_profiles: splitList(v.social_profiles),
    timezone: v.timezone || "America/Sao_Paulo",
    currency: v.currency || "BRL",
    current_objective: v.current_objective || undefined,
    main_kpis: splitList(v.main_kpis),
    folder_id: v.folder_id || undefined,
    memory_sheet_id: v.memory_sheet_id || undefined,
    sources_sheet_id: v.sources_sheet_id || undefined,
    external_accounts: deserializeMap(v.external_accounts),
    created_at: v.created_at,
    updated_at: v.updated_at,
  };
}

export function clientsRepo(sheets: SheetsPort, clientIndexSheetId: string) {
  return new SheetRepo<ClientRecord>({
    sheets,
    spreadsheetId: clientIndexSheetId,
    sheetTitle: CLIENT_INDEX_SHEET,
    idField: "client_id",
    versionField: "updated_at",
    serialize,
    deserialize,
  });
}

export type ClientsRepo = ReturnType<typeof clientsRepo>;

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function normalize(s: string): string {
  return s.normalize("NFD").replace(COMBINING_DIACRITICS, "").trim().toLowerCase();
}

/**
 * Resolves a name/alias query to exactly one client. Throws
 * AmbiguousClientError when more than one plausible match exists, rather
 * than guessing — the caller (Claude) must ask the user which one.
 */
export async function findClient(
  repo: ClientsRepo,
  query: { clientId?: string; nameQuery?: string }
): Promise<ClientRecord> {
  if (query.clientId) {
    const byId = await repo.findById(query.clientId);
    if (!byId) throw new NotFoundError(`Cliente com id "${query.clientId}" não encontrado.`);
    return byId;
  }

  if (!query.nameQuery || !query.nameQuery.trim()) {
    throw new ValidationError("Informe client_id ou um nome/alias para buscar.");
  }

  const needle = normalize(query.nameQuery);
  const all = await repo.list();

  const exact = all.filter(
    (c) => normalize(c.name) === needle || c.aliases.some((a) => normalize(a) === needle)
  );
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    throw new AmbiguousClientError(exact.map((c) => ({ client_id: c.client_id, name: c.name })));
  }

  const partial = all.filter(
    (c) => normalize(c.name).includes(needle) || c.aliases.some((a) => normalize(a).includes(needle))
  );
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    throw new AmbiguousClientError(partial.map((c) => ({ client_id: c.client_id, name: c.name })));
  }

  throw new NotFoundError(`Nenhum cliente encontrado para "${query.nameQuery}".`);
}

export interface CreateClientInput {
  name: string;
  aliases?: string[];
  segment?: string;
  sites?: string[];
  social_profiles?: string[];
  timezone?: string;
  currency?: string;
  current_objective?: string;
  main_kpis?: string[];
  external_accounts?: Record<string, string>;
}

/** Creates a new client: index row + its Drive folder/sheets. Rejects near-duplicate names instead of silently merging. */
export async function createClient(
  repo: ClientsRepo,
  drive: DrivePort,
  sheets: SheetsPort,
  clientsRootFolderId: string,
  clock: Clock,
  input: CreateClientInput
): Promise<ClientRecord> {
  const needle = normalize(input.name);
  const all = await repo.list();
  const collision = all.find((c) => normalize(c.name) === needle);
  if (collision) {
    throw new ValidationError(
      `Já existe um cliente chamado "${collision.name}" (${collision.client_id}). Use um alias ou confirme antes de criar um duplicado.`
    );
  }

  const clientId = newId("client");
  const structure = await ensureClientStructure(drive, sheets, clientsRootFolderId, clientId, input.name);
  const now = clock.nowIso();

  const record: ClientRecord = {
    client_id: clientId,
    name: input.name,
    aliases: input.aliases ?? [],
    segment: input.segment,
    status: "ativo",
    sites: input.sites ?? [],
    social_profiles: input.social_profiles ?? [],
    timezone: input.timezone ?? "America/Sao_Paulo",
    currency: input.currency ?? "BRL",
    current_objective: input.current_objective,
    main_kpis: input.main_kpis ?? [],
    folder_id: structure.clientFolderId,
    memory_sheet_id: structure.memorySheetId,
    sources_sheet_id: structure.sourcesSheetId,
    external_accounts: input.external_accounts ?? {},
    created_at: now,
    updated_at: now,
  };

  await repo.create(record);
  return record;
}
