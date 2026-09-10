import { ConflictError, NotFoundError, ValidationError } from "../errors.js";
import { newId } from "../ids.js";
import type { Clock, SheetsPort } from "../ports.js";
import { SheetRepo } from "../sheet-repo.js";
import { MEMORY_SHEET } from "../structure.js";
import type { MemoryRecord, MemoryScope, MemoryStatus, MemoryType } from "../types.js";

function serialize(m: MemoryRecord): Record<string, string> {
  return {
    memory_id: m.memory_id,
    scope: m.scope,
    client_id: m.client_id ?? "",
    type: m.type,
    content: m.content,
    status: m.status,
    source: m.source ?? "",
    record_date: m.record_date,
    valid_from: m.valid_from ?? "",
    updated_at: m.updated_at,
    supersedes: m.supersedes ?? "",
    superseded_by: m.superseded_by ?? "",
  };
}

function deserialize(v: Record<string, string>): MemoryRecord {
  return {
    memory_id: v.memory_id,
    scope: (v.scope as MemoryScope) || "client",
    client_id: v.client_id || undefined,
    type: v.type as MemoryType,
    content: v.content,
    status: v.status as MemoryStatus,
    source: v.source || undefined,
    record_date: v.record_date,
    valid_from: v.valid_from || undefined,
    updated_at: v.updated_at,
    supersedes: v.supersedes || undefined,
    superseded_by: v.superseded_by || undefined,
  };
}

export function memoryRepo(sheets: SheetsPort, memorySheetId: string) {
  return new SheetRepo<MemoryRecord>({
    sheets,
    spreadsheetId: memorySheetId,
    sheetTitle: MEMORY_SHEET,
    idField: "memory_id",
    versionField: "updated_at",
    serialize,
    deserialize,
  });
}

export type MemoryRepo = ReturnType<typeof memoryRepo>;

/** Types that can become the current, vigente fact/rule. A hypothesis never can — see saveMemoryChange. */
const CONFIRMABLE_TYPES: MemoryType[] = ["preferencia", "fato", "objetivo", "restricao", "decisao", "correcao"];

export interface SaveMemoryChangeInput {
  scope: MemoryScope;
  clientId?: string;
  type: MemoryType;
  content: string;
  source?: string;
  validFrom?: string;
  /** memory_id of the record this one replaces as the current truth, if any. */
  supersedesMemoryId?: string;
  /** Caller-observed updated_at of the record being superseded, for optimistic concurrency. */
  expectedSupersededVersion?: string;
}

/**
 * Applies one memory change: writes a new versioned record and, if it
 * supersedes a prior one, marks that prior record substituido without
 * deleting it. A "hipotese" is stored as pendente_confirmacao and can never
 * directly become vigente through this path — promoting it requires an
 * explicit, separate confirmation (a fresh saveMemoryChange with a
 * confirmable type, referencing the hypothesis as its source).
 */
export async function saveMemoryChange(
  repo: MemoryRepo,
  clock: Clock,
  input: SaveMemoryChangeInput
): Promise<MemoryRecord> {
  if (input.scope === "client" && !input.clientId) {
    throw new ValidationError("client_id é obrigatório quando scope é 'client'.");
  }
  if (!input.content.trim()) {
    throw new ValidationError("content não pode ser vazio.");
  }

  const now = clock.nowIso();
  const status: MemoryStatus =
    input.type === "hipotese" ? "pendente_confirmacao" : "vigente";

  if (!CONFIRMABLE_TYPES.includes(input.type) && input.type !== "hipotese") {
    throw new ValidationError(`Tipo de memória inválido: ${input.type}`);
  }

  if (input.supersedesMemoryId) {
    const prior = await repo.findById(input.supersedesMemoryId);
    if (!prior) {
      throw new NotFoundError(`Registro de memória "${input.supersedesMemoryId}" não encontrado.`);
    }
    if (prior.status === "substituido" || prior.status === "arquivado") {
      throw new ConflictError(
        `O registro "${input.supersedesMemoryId}" já não está vigente (status: ${prior.status}). Releia o contexto atual antes de substituir.`
      );
    }
    const newRecord: MemoryRecord = {
      memory_id: newId("mem"),
      scope: input.scope,
      client_id: input.clientId,
      type: input.type,
      content: input.content,
      status,
      source: input.source,
      record_date: now,
      valid_from: input.validFrom ?? now,
      updated_at: now,
      supersedes: prior.memory_id,
    };
    await repo.create(newRecord);

    const updatedPrior: MemoryRecord = {
      ...prior,
      status: "substituido",
      superseded_by: newRecord.memory_id,
      updated_at: now,
    };
    await repo.update(prior.memory_id, updatedPrior, input.expectedSupersededVersion ?? prior.updated_at);

    return newRecord;
  }

  const newRecord: MemoryRecord = {
    memory_id: newId("mem"),
    scope: input.scope,
    client_id: input.clientId,
    type: input.type,
    content: input.content,
    status,
    source: input.source,
    record_date: now,
    valid_from: input.validFrom ?? now,
    updated_at: now,
  };
  await repo.create(newRecord);
  return newRecord;
}

export interface RecordDecisionInput {
  clientId: string;
  content: string;
  source: string;
  validFrom?: string;
  supersedesMemoryId?: string;
  expectedSupersededVersion?: string;
}

/** A decision is always confirmable (never a hypothesis) and always scoped to one client. */
export async function recordDecision(
  repo: MemoryRepo,
  clock: Clock,
  input: RecordDecisionInput
): Promise<MemoryRecord> {
  return saveMemoryChange(repo, clock, {
    scope: "client",
    clientId: input.clientId,
    type: "decisao",
    content: input.content,
    source: input.source,
    validFrom: input.validFrom,
    supersedesMemoryId: input.supersedesMemoryId,
    expectedSupersededVersion: input.expectedSupersededVersion,
  });
}

export interface ClientContext {
  vigente: MemoryRecord[];
  pendenteConfirmacao: MemoryRecord[];
}

/** Compact "what's true right now" for a client: vigente records plus open hypotheses, newest first. Excludes superseded/archived history — fetch the full list separately when history is needed. */
export async function getClientMemoryContext(
  repo: MemoryRepo,
  clientId: string
): Promise<ClientContext> {
  const all = await repo.query((v) => v.client_id === clientId || v.scope === "global");
  const byDateDesc = (a: MemoryRecord, b: MemoryRecord) => b.updated_at.localeCompare(a.updated_at);
  return {
    vigente: all.filter((m) => m.status === "vigente").sort(byDateDesc),
    pendenteConfirmacao: all.filter((m) => m.status === "pendente_confirmacao").sort(byDateDesc),
  };
}

/** Archives a memory record (e.g. no longer relevant) without deleting it — it stays visible in history. */
export async function archiveMemory(
  repo: MemoryRepo,
  clock: Clock,
  memoryId: string,
  expectedVersion?: string
): Promise<MemoryRecord> {
  const record = await repo.findById(memoryId);
  if (!record) throw new NotFoundError(`Registro de memória "${memoryId}" não encontrado.`);
  const updated: MemoryRecord = { ...record, status: "arquivado", updated_at: clock.nowIso() };
  return repo.update(memoryId, updated, expectedVersion ?? record.updated_at);
}

export async function getMemoryHistory(repo: MemoryRepo, clientId: string): Promise<MemoryRecord[]> {
  const all = await repo.query((v) => v.client_id === clientId || v.scope === "global");
  return all.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
