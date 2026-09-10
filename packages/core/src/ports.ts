// Ports abstract away the Google APIs so the service layer can be unit
// tested with in-memory fakes, and so Drive/Sheets are the only place that
// knows about googleapis wire formats.

export interface DriveFileRef {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
}

export interface DriveFindQuery {
  name?: string;
  parentId?: string;
  appProperties?: Record<string, string>;
  mimeType?: string;
  trashed?: boolean;
}

export interface DrivePort {
  findFile(query: DriveFindQuery): Promise<DriveFileRef | null>;
  findFiles(query: DriveFindQuery): Promise<DriveFileRef[]>;
  createFolder(
    name: string,
    parentId: string | undefined,
    appProperties?: Record<string, string>
  ): Promise<DriveFileRef>;
  createSpreadsheet(
    name: string,
    parentId: string,
    appProperties?: Record<string, string>
  ): Promise<DriveFileRef>;
  createDoc(
    name: string,
    parentId: string,
    appProperties?: Record<string, string>
  ): Promise<DriveFileRef>;
  getFile(fileId: string): Promise<DriveFileRef | null>;
  /** Append-only: adds a paragraph at the end of the doc. Never rewrites existing content. */
  appendDocParagraph(fileId: string, text: string): Promise<void>;
  listFilesInFolder(parentId: string): Promise<DriveFileRef[]>;
}

export interface SheetRow {
  rowNumber: number; // 1-indexed absolute row in the sheet (header is row 1)
  values: Record<string, string>;
}

export interface UpdateRowOptions {
  /** Column name used as the optimistic-concurrency token (e.g. "updated_at"). */
  versionField?: string;
  /** Value the caller last observed for versionField; mismatch -> ConflictError. */
  expectedVersion?: string;
}

export interface SheetsPort {
  /** Creates the sheet/tab with the given headers if it doesn't exist yet. Idempotent. */
  ensureSheet(spreadsheetId: string, sheetTitle: string, headers: string[]): Promise<void>;
  listRows(spreadsheetId: string, sheetTitle: string): Promise<SheetRow[]>;
  appendRow(
    spreadsheetId: string,
    sheetTitle: string,
    values: Record<string, string>
  ): Promise<{ rowNumber: number }>;
  updateRow(
    spreadsheetId: string,
    sheetTitle: string,
    rowNumber: number,
    values: Record<string, string>,
    options?: UpdateRowOptions
  ): Promise<void>;
}

export interface Clock {
  nowIso(): string;
}

export const systemClock: Clock = {
  nowIso: () => new Date().toISOString(),
};
