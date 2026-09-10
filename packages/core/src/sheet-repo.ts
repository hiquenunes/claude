import { NotFoundError } from "./errors.js";
import type { SheetsPort } from "./ports.js";

export function joinList(items: string[] | undefined): string {
  return (items ?? []).join("; ");
}

export function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeMap(map: Record<string, string> | undefined): string {
  return JSON.stringify(map ?? {});
}

export function deserializeMap(value: string | undefined): Record<string, string> {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
}

export interface SheetRepoConfig<T> {
  sheets: SheetsPort;
  spreadsheetId: string;
  sheetTitle: string;
  idField: string;
  versionField?: string;
  serialize: (record: T) => Record<string, string>;
  deserialize: (values: Record<string, string>) => T;
}

/** Thin generic CRUD layer over one "table" tab of a spreadsheet, keyed by an id column. */
export class SheetRepo<T> {
  constructor(private readonly config: SheetRepoConfig<T>) {}

  async list(): Promise<T[]> {
    const rows = await this.config.sheets.listRows(this.config.spreadsheetId, this.config.sheetTitle);
    return rows.map((r) => this.config.deserialize(r.values));
  }

  async query(predicate: (values: Record<string, string>) => boolean): Promise<T[]> {
    const rows = await this.config.sheets.listRows(this.config.spreadsheetId, this.config.sheetTitle);
    return rows.filter((r) => predicate(r.values)).map((r) => this.config.deserialize(r.values));
  }

  async findById(id: string): Promise<T | null> {
    const rows = await this.config.sheets.listRows(this.config.spreadsheetId, this.config.sheetTitle);
    const row = rows.find((r) => r.values[this.config.idField] === id);
    return row ? this.config.deserialize(row.values) : null;
  }

  async create(record: T): Promise<T> {
    await this.config.sheets.appendRow(
      this.config.spreadsheetId,
      this.config.sheetTitle,
      this.config.serialize(record)
    );
    return record;
  }

  /** Full-row replace, with optional optimistic-concurrency check against versionField. */
  async update(id: string, updated: T, expectedVersion?: string): Promise<T> {
    const rows = await this.config.sheets.listRows(this.config.spreadsheetId, this.config.sheetTitle);
    const row = rows.find((r) => r.values[this.config.idField] === id);
    if (!row) {
      throw new NotFoundError(`Registro "${id}" não encontrado em "${this.config.sheetTitle}".`);
    }
    await this.config.sheets.updateRow(
      this.config.spreadsheetId,
      this.config.sheetTitle,
      row.rowNumber,
      this.config.serialize(updated),
      this.config.versionField ? { versionField: this.config.versionField, expectedVersion } : undefined
    );
    return updated;
  }
}
