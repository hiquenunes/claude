import { google, sheets_v4 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { ConflictError } from "../errors.js";
import type { SheetRow, SheetsPort, UpdateRowOptions } from "../ports.js";
import { columnLetter, objectToRow, rowsToObjects } from "./sheet-range.js";

export class GoogleSheetsPort implements SheetsPort {
  private sheets: sheets_v4.Sheets;

  constructor(auth: OAuth2Client) {
    this.sheets = google.sheets({ version: "v4", auth });
  }

  async ensureSheet(spreadsheetId: string, sheetTitle: string, headers: string[]): Promise<void> {
    const meta = await this.sheets.spreadsheets.get({ spreadsheetId });
    const existing = meta.data.sheets?.find((s) => s.properties?.title === sheetTitle);

    if (!existing) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetTitle } } }],
        },
      });
    }

    const headerRange = `${quoteSheetTitle(sheetTitle)}!1:1`;
    const headerRes = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });
    const hasHeaders = (headerRes.data.values?.[0]?.length ?? 0) > 0;
    if (!hasHeaders) {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: headerRange,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
    }
  }

  private async getHeaders(spreadsheetId: string, sheetTitle: string): Promise<string[]> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteSheetTitle(sheetTitle)}!1:1`,
    });
    return res.data.values?.[0] ?? [];
  }

  async listRows(spreadsheetId: string, sheetTitle: string): Promise<SheetRow[]> {
    const headers = await this.getHeaders(spreadsheetId, sheetTitle);
    if (headers.length === 0) return [];
    const lastCol = columnLetter(headers.length);
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteSheetTitle(sheetTitle)}!A2:${lastCol}`,
    });
    const rows = (res.data.values ?? []).filter((row) => row.some((cell) => cell !== "" && cell != null));
    return rowsToObjects(headers, rows as string[][], 2);
  }

  async appendRow(
    spreadsheetId: string,
    sheetTitle: string,
    values: Record<string, string>
  ): Promise<{ rowNumber: number }> {
    const headers = await this.getHeaders(spreadsheetId, sheetTitle);
    const row = objectToRow(headers, values);
    const res = await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${quoteSheetTitle(sheetTitle)}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
    const updatedRange = res.data.updates?.updatedRange ?? "";
    const rowNumber = parseRowNumberFromRange(updatedRange);
    return { rowNumber };
  }

  async updateRow(
    spreadsheetId: string,
    sheetTitle: string,
    rowNumber: number,
    values: Record<string, string>,
    options?: UpdateRowOptions
  ): Promise<void> {
    const headers = await this.getHeaders(spreadsheetId, sheetTitle);

    if (options?.versionField && options.expectedVersion !== undefined) {
      const colIdx = headers.indexOf(options.versionField);
      if (colIdx >= 0) {
        const currentRes = await this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${quoteSheetTitle(sheetTitle)}!${columnLetter(colIdx + 1)}${rowNumber}`,
        });
        const currentValue = currentRes.data.values?.[0]?.[0] ?? "";
        if (currentValue !== options.expectedVersion) {
          throw new ConflictError(
            `A linha ${rowNumber} de "${sheetTitle}" foi alterada por outra edição (esperado "${options.expectedVersion}", encontrado "${currentValue}"). Releia antes de tentar novamente.`
          );
        }
      }
    }

    const row = objectToRow(headers, values);
    const lastCol = columnLetter(headers.length);
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteSheetTitle(sheetTitle)}!A${rowNumber}:${lastCol}${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
  }
}

function quoteSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

function parseRowNumberFromRange(range: string): number {
  // e.g. "'Clientes'!A5:H5" -> 5
  const match = range.match(/![A-Z]+(\d+)/);
  return match ? Number(match[1]) : -1;
}
