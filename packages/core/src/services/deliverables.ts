import { newId } from "../ids.js";
import type { Clock, SheetsPort } from "../ports.js";
import { joinList, SheetRepo, splitList } from "../sheet-repo.js";
import { DELIVERABLES_SHEET } from "../structure.js";
import type { DeliverableRecord, DeliverableType, GenerationState, PersistenceState } from "../types.js";

function serialize(d: DeliverableRecord): Record<string, string> {
  return {
    artifact_id: d.artifact_id,
    client_id: d.client_id,
    type: d.type,
    source_ids: joinList(d.source_ids),
    period_start: d.period_start ?? "",
    period_end: d.period_end ?? "",
    content: d.content ?? "",
    link: d.link ?? "",
    generation_state: d.generation_state,
    persistence_state: d.persistence_state,
    created_at: d.created_at,
  };
}

function deserialize(v: Record<string, string>): DeliverableRecord {
  return {
    artifact_id: v.artifact_id,
    client_id: v.client_id,
    type: v.type as DeliverableType,
    source_ids: splitList(v.source_ids),
    period_start: v.period_start || undefined,
    period_end: v.period_end || undefined,
    content: v.content || undefined,
    link: v.link || undefined,
    generation_state: (v.generation_state as GenerationState) || "gerado",
    persistence_state: (v.persistence_state as PersistenceState) || "salvo",
    created_at: v.created_at,
  };
}

export function deliverablesRepo(sheets: SheetsPort, deliverablesSheetId: string) {
  return new SheetRepo<DeliverableRecord>({
    sheets,
    spreadsheetId: deliverablesSheetId,
    sheetTitle: DELIVERABLES_SHEET,
    idField: "artifact_id",
    serialize,
    deserialize,
  });
}

export type DeliverablesRepo = ReturnType<typeof deliverablesRepo>;

export interface SaveDeliverableInput {
  clientId: string;
  type: DeliverableType;
  sourceIds: string[];
  periodStart?: string;
  periodEnd?: string;
  content?: string;
  link?: string;
  generationState: GenerationState;
}

/**
 * Persists a deliverable's index row. Only returns with persistence_state
 * "salvo" if the underlying sheet append actually succeeded — a thrown
 * error here means the caller must show "falha ao salvar", never claim
 * success.
 */
export async function saveDeliverable(
  repo: DeliverablesRepo,
  clock: Clock,
  input: SaveDeliverableInput
): Promise<DeliverableRecord> {
  const record: DeliverableRecord = {
    artifact_id: newId("artifact"),
    client_id: input.clientId,
    type: input.type,
    source_ids: input.sourceIds,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    content: input.content,
    link: input.link,
    generation_state: input.generationState,
    persistence_state: "salvo",
    created_at: clock.nowIso(),
  };
  await repo.create(record);
  return record;
}

export async function listClientDeliverables(
  repo: DeliverablesRepo,
  clientId: string
): Promise<DeliverableRecord[]> {
  const items = await repo.query((v) => v.client_id === clientId);
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
