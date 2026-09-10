import { NotFoundError } from "../errors.js";
import { newId } from "../ids.js";
import type { Clock, SheetsPort } from "../ports.js";
import { SheetRepo } from "../sheet-repo.js";
import { SOURCES_SHEET } from "../structure.js";
import type { SourceRecord } from "../types.js";

function serialize(s: SourceRecord): Record<string, string> {
  return {
    source_id: s.source_id,
    client_id: s.client_id,
    provider: s.provider,
    external_id: s.external_id ?? "",
    url: s.url ?? "",
    event_date: s.event_date ?? "",
    import_date: s.import_date,
    period_start: s.period_start ?? "",
    period_end: s.period_end ?? "",
    version_or_hash: s.version_or_hash ?? "",
    evidence_location: s.evidence_location ?? "",
  };
}

function deserialize(v: Record<string, string>): SourceRecord {
  return {
    source_id: v.source_id,
    client_id: v.client_id,
    provider: v.provider,
    external_id: v.external_id || undefined,
    url: v.url || undefined,
    event_date: v.event_date || undefined,
    import_date: v.import_date,
    period_start: v.period_start || undefined,
    period_end: v.period_end || undefined,
    version_or_hash: v.version_or_hash || undefined,
    evidence_location: v.evidence_location || undefined,
  };
}

export function sourcesRepo(sheets: SheetsPort, sourcesSheetId: string) {
  return new SheetRepo<SourceRecord>({
    sheets,
    spreadsheetId: sourcesSheetId,
    sheetTitle: SOURCES_SHEET,
    idField: "source_id",
    serialize,
    deserialize,
  });
}

export type SourcesRepo = ReturnType<typeof sourcesRepo>;

export interface RegisterSourceInput {
  clientId: string;
  provider: string;
  externalId?: string;
  url?: string;
  eventDate?: string;
  periodStart?: string;
  periodEnd?: string;
  versionOrHash?: string;
  evidenceLocation?: string;
}

/**
 * Registers a source, deduplicating on (provider, external_id) so
 * re-importing the same meeting/report is a no-op that returns the existing
 * record instead of creating a duplicate.
 */
export async function registerSource(
  repo: SourcesRepo,
  clock: Clock,
  input: RegisterSourceInput
): Promise<{ source: SourceRecord; alreadyExisted: boolean }> {
  if (input.externalId) {
    const existing = await repo.query(
      (v) => v.client_id === input.clientId && v.provider === input.provider && v.external_id === input.externalId
    );
    if (existing.length > 0) {
      return { source: existing[0], alreadyExisted: true };
    }
  }

  const source: SourceRecord = {
    source_id: newId("src"),
    client_id: input.clientId,
    provider: input.provider,
    external_id: input.externalId,
    url: input.url,
    event_date: input.eventDate,
    import_date: clock.nowIso(),
    period_start: input.periodStart,
    period_end: input.periodEnd,
    version_or_hash: input.versionOrHash,
    evidence_location: input.evidenceLocation,
  };
  await repo.create(source);
  return { source, alreadyExisted: false };
}

export interface SearchSourcesFilter {
  clientId: string;
  provider?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchSourcesResult {
  items: SourceRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export async function searchClientSources(
  repo: SourcesRepo,
  filter: SearchSourcesFilter
): Promise<SearchSourcesResult> {
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 20;

  const matches = await repo.query((v) => {
    if (v.client_id !== filter.clientId) return false;
    if (filter.provider && v.provider !== filter.provider) return false;
    const ref = v.event_date || v.import_date;
    if (filter.dateFrom && ref < filter.dateFrom) return false;
    if (filter.dateTo && ref > filter.dateTo) return false;
    return true;
  });

  matches.sort((a, b) => (b.event_date ?? b.import_date).localeCompare(a.event_date ?? a.import_date));
  const start = (page - 1) * pageSize;
  return {
    items: matches.slice(start, start + pageSize),
    page,
    pageSize,
    total: matches.length,
  };
}

export async function readSource(repo: SourcesRepo, sourceId: string): Promise<SourceRecord> {
  const source = await repo.findById(sourceId);
  if (!source) throw new NotFoundError(`Fonte "${sourceId}" não encontrada.`);
  return source;
}
