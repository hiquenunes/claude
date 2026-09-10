import { ConflictError } from "../errors.js";
import type { Clock, DriveFileRef, DriveFindQuery, DrivePort, SheetsPort, UpdateRowOptions, SheetRow } from "../ports.js";

interface FakeFile extends DriveFileRef {
  parentId?: string;
  appProperties: Record<string, string>;
  docText?: string;
}

/** In-memory Drive double: enough of the real semantics (appProperties lookup, folders, docs) to unit-test the service layer without hitting Google. */
export class FakeDrivePort implements DrivePort {
  private files: FakeFile[] = [];
  private counter = 0;

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${this.counter}`;
  }

  async findFile(query: DriveFindQuery): Promise<DriveFileRef | null> {
    const matches = await this.findFiles(query);
    return matches[0] ?? null;
  }

  async findFiles(query: DriveFindQuery): Promise<DriveFileRef[]> {
    return this.files.filter((f) => {
      if (query.name && f.name !== query.name) return false;
      if (query.parentId && f.parentId !== query.parentId) return false;
      if (query.mimeType && f.mimeType !== query.mimeType) return false;
      if (query.appProperties) {
        for (const [k, v] of Object.entries(query.appProperties)) {
          if (f.appProperties[k] !== v) return false;
        }
      }
      return true;
    });
  }

  async createFolder(
    name: string,
    parentId: string | undefined,
    appProperties: Record<string, string> = {}
  ): Promise<DriveFileRef> {
    const file: FakeFile = {
      id: this.nextId("folder"),
      name,
      mimeType: "application/vnd.google-apps.folder",
      parentId,
      appProperties,
    };
    this.files.push(file);
    return file;
  }

  async createSpreadsheet(
    name: string,
    parentId: string,
    appProperties: Record<string, string> = {}
  ): Promise<DriveFileRef> {
    const file: FakeFile = {
      id: this.nextId("sheet"),
      name,
      mimeType: "application/vnd.google-apps.spreadsheet",
      parentId,
      appProperties,
    };
    this.files.push(file);
    return file;
  }

  async createDoc(
    name: string,
    parentId: string,
    appProperties: Record<string, string> = {}
  ): Promise<DriveFileRef> {
    const file: FakeFile = {
      id: this.nextId("doc"),
      name,
      mimeType: "application/vnd.google-apps.document",
      parentId,
      appProperties,
      docText: "",
    };
    this.files.push(file);
    return file;
  }

  async getFile(fileId: string): Promise<DriveFileRef | null> {
    return this.files.find((f) => f.id === fileId) ?? null;
  }

  async appendDocParagraph(fileId: string, text: string): Promise<void> {
    const file = this.files.find((f) => f.id === fileId);
    if (!file) throw new Error(`doc ${fileId} not found`);
    file.docText = `${file.docText ?? ""}${text}\n`;
  }

  async listFilesInFolder(parentId: string): Promise<DriveFileRef[]> {
    return this.findFiles({ parentId });
  }

  // test helpers
  getDocText(fileId: string): string | undefined {
    return this.files.find((f) => f.id === fileId)?.docText;
  }

  countByAppProperties(appProperties: Record<string, string>): number {
    return this.files.filter((f) =>
      Object.entries(appProperties).every(([k, v]) => f.appProperties[k] === v)
    ).length;
  }
}

interface FakeSheet {
  headers: string[];
  rows: string[][];
}

/** In-memory Sheets double, including the same optimistic-concurrency semantics as the real GoogleSheetsPort. */
export class FakeSheetsPort implements SheetsPort {
  private spreadsheets = new Map<string, Map<string, FakeSheet>>();

  private getOrCreateSpreadsheet(spreadsheetId: string): Map<string, FakeSheet> {
    let sheet = this.spreadsheets.get(spreadsheetId);
    if (!sheet) {
      sheet = new Map();
      this.spreadsheets.set(spreadsheetId, sheet);
    }
    return sheet;
  }

  async ensureSheet(spreadsheetId: string, sheetTitle: string, headers: string[]): Promise<void> {
    const sheets = this.getOrCreateSpreadsheet(spreadsheetId);
    if (!sheets.has(sheetTitle)) {
      sheets.set(sheetTitle, { headers, rows: [] });
    }
  }

  private getSheet(spreadsheetId: string, sheetTitle: string): FakeSheet {
    const sheet = this.spreadsheets.get(spreadsheetId)?.get(sheetTitle);
    if (!sheet) throw new Error(`sheet ${sheetTitle} not found in ${spreadsheetId}`);
    return sheet;
  }

  async listRows(spreadsheetId: string, sheetTitle: string): Promise<SheetRow[]> {
    const sheet = this.getSheet(spreadsheetId, sheetTitle);
    return sheet.rows.map((row, idx) => {
      const values: Record<string, string> = {};
      sheet.headers.forEach((h, i) => (values[h] = row[i] ?? ""));
      return { rowNumber: idx + 2, values };
    });
  }

  async appendRow(
    spreadsheetId: string,
    sheetTitle: string,
    values: Record<string, string>
  ): Promise<{ rowNumber: number }> {
    const sheet = this.getSheet(spreadsheetId, sheetTitle);
    const row = sheet.headers.map((h) => values[h] ?? "");
    sheet.rows.push(row);
    return { rowNumber: sheet.rows.length + 1 };
  }

  async updateRow(
    spreadsheetId: string,
    sheetTitle: string,
    rowNumber: number,
    values: Record<string, string>,
    options?: UpdateRowOptions
  ): Promise<void> {
    const sheet = this.getSheet(spreadsheetId, sheetTitle);
    const idx = rowNumber - 2;
    if (idx < 0 || idx >= sheet.rows.length) throw new Error(`row ${rowNumber} out of range`);

    if (options?.versionField && options.expectedVersion !== undefined) {
      const colIdx = sheet.headers.indexOf(options.versionField);
      const current = colIdx >= 0 ? sheet.rows[idx][colIdx] ?? "" : "";
      if (current !== options.expectedVersion) {
        throw new ConflictError(
          `A linha ${rowNumber} de "${sheetTitle}" foi alterada por outra edição (esperado "${options.expectedVersion}", encontrado "${current}").`
        );
      }
    }

    sheet.rows[idx] = sheet.headers.map((h) => values[h] ?? "");
  }
}

/** Clock that advances by 1ms on every call, so ordering by ISO string is always deterministic in tests. */
export class FakeClock implements Clock {
  private current: number;
  constructor(startIso = "2026-01-01T00:00:00.000Z") {
    this.current = new Date(startIso).getTime();
  }
  nowIso(): string {
    const iso = new Date(this.current).toISOString();
    this.current += 1;
    return iso;
  }
}
