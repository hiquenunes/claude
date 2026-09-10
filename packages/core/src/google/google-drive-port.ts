import { drive_v3, google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { DriveFileRef, DriveFindQuery, DrivePort } from "../ports.js";

const FIELDS = "id,name,mimeType,webViewLink";

function buildQuery(query: DriveFindQuery): string {
  const clauses: string[] = [`trashed = ${query.trashed ? "true" : "false"}`];
  if (query.name) clauses.push(`name = '${escapeQueryValue(query.name)}'`);
  if (query.parentId) clauses.push(`'${escapeQueryValue(query.parentId)}' in parents`);
  if (query.mimeType) clauses.push(`mimeType = '${escapeQueryValue(query.mimeType)}'`);
  if (query.appProperties) {
    for (const [key, value] of Object.entries(query.appProperties)) {
      clauses.push(
        `appProperties has { key='${escapeQueryValue(key)}' and value='${escapeQueryValue(value)}' }`
      );
    }
  }
  return clauses.join(" and ");
}

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function toRef(file: drive_v3.Schema$File): DriveFileRef {
  return {
    id: file.id!,
    name: file.name ?? "",
    mimeType: file.mimeType ?? undefined,
    webViewLink: file.webViewLink ?? undefined,
  };
}

export class GoogleDrivePort implements DrivePort {
  private drive: drive_v3.Drive;
  private docs: ReturnType<typeof google.docs>;

  constructor(auth: OAuth2Client) {
    this.drive = google.drive({ version: "v3", auth });
    this.docs = google.docs({ version: "v1", auth });
  }

  async findFile(query: DriveFindQuery): Promise<DriveFileRef | null> {
    const results = await this.findFiles(query);
    return results[0] ?? null;
  }

  async findFiles(query: DriveFindQuery): Promise<DriveFileRef[]> {
    const res = await this.drive.files.list({
      q: buildQuery(query),
      fields: `files(${FIELDS})`,
      spaces: "drive",
      pageSize: 25,
    });
    return (res.data.files ?? []).map(toRef);
  }

  async createFolder(
    name: string,
    parentId: string | undefined,
    appProperties?: Record<string, string>
  ): Promise<DriveFileRef> {
    const res = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: parentId ? [parentId] : undefined,
        appProperties,
      },
      fields: FIELDS,
    });
    return toRef(res.data);
  }

  async createSpreadsheet(
    name: string,
    parentId: string,
    appProperties?: Record<string, string>
  ): Promise<DriveFileRef> {
    const res = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.spreadsheet",
        parents: [parentId],
        appProperties,
      },
      fields: FIELDS,
    });
    return toRef(res.data);
  }

  async createDoc(
    name: string,
    parentId: string,
    appProperties?: Record<string, string>
  ): Promise<DriveFileRef> {
    const res = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.document",
        parents: [parentId],
        appProperties,
      },
      fields: FIELDS,
    });
    return toRef(res.data);
  }

  async getFile(fileId: string): Promise<DriveFileRef | null> {
    try {
      const res = await this.drive.files.get({ fileId, fields: FIELDS });
      return toRef(res.data);
    } catch (err: unknown) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async appendDocParagraph(fileId: string, text: string): Promise<void> {
    const doc = await this.docs.documents.get({ documentId: fileId });
    const endIndex = doc.data.body?.content?.reduce((max, el) => {
      return el.endIndex && el.endIndex > max ? el.endIndex : max;
    }, 1) ?? 1;
    // Insert before the final newline that Docs always keeps at the end of the body.
    const insertAt = Math.max(1, endIndex - 1);
    await this.docs.documents.batchUpdate({
      documentId: fileId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: insertAt },
              text: `${text}\n`,
            },
          },
        ],
      },
    });
  }

  async listFilesInFolder(parentId: string): Promise<DriveFileRef[]> {
    return this.findFiles({ parentId, trashed: false });
  }
}

function isNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === 404;
}
