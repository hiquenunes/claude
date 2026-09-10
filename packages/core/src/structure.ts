import type { DrivePort, SheetsPort } from "./ports.js";

/**
 * Everything here is idempotent: re-running setup must never duplicate a
 * folder, sheet or doc. Identity is tracked via Drive `appProperties`
 * (queryable, invisible to the human browsing Drive), never by name alone —
 * the user is free to rename things in Drive without breaking links.
 */

export const APP_TAG = "jarvis";

export const ROLE = {
  root: "root",
  config: "config",
  profile: "profile",
  clientIndex: "client_index",
  globalMemory: "global_memory",
  templates: "templates",
  clientsRoot: "clients_root",
  tasksIndex: "tasks_index",
  operationsLog: "operations_log",
  client: "client",
  clientMemory: "client_memory",
  clientSources: "client_sources",
  clientDeliverablesIndex: "client_deliverables_index",
  clientDeliverablesFolder: "client_deliverables_folder",
} as const;

export const CLIENT_INDEX_SHEET = "Clientes";
export const CLIENT_INDEX_HEADERS = [
  "client_id",
  "name",
  "aliases",
  "segment",
  "status",
  "sites",
  "social_profiles",
  "timezone",
  "currency",
  "current_objective",
  "main_kpis",
  "folder_id",
  "memory_sheet_id",
  "sources_sheet_id",
  "external_accounts",
  "created_at",
  "updated_at",
];

export const MEMORY_SHEET = "Memória";
export const MEMORY_HEADERS = [
  "memory_id",
  "scope",
  "client_id",
  "type",
  "content",
  "status",
  "source",
  "record_date",
  "valid_from",
  "updated_at",
  "supersedes",
  "superseded_by",
];

export const SOURCES_SHEET = "Fontes";
export const SOURCES_HEADERS = [
  "source_id",
  "client_id",
  "provider",
  "external_id",
  "url",
  "event_date",
  "import_date",
  "period_start",
  "period_end",
  "version_or_hash",
  "evidence_location",
];

export const DELIVERABLES_SHEET = "Entregas";
export const DELIVERABLES_HEADERS = [
  "artifact_id",
  "client_id",
  "type",
  "source_ids",
  "period_start",
  "period_end",
  "content",
  "link",
  "generation_state",
  "persistence_state",
  "created_at",
];

export const TASKS_SHEET = "Pendências";
export const TASKS_HEADERS = [
  "task_id",
  "client_id",
  "description",
  "origin",
  "owner",
  "due_date",
  "status",
  "updated_at",
];

export const OPERATIONS_SHEET = "Operações";
export const OPERATIONS_HEADERS = [
  "operation_id",
  "idempotency_key",
  "type",
  "client_id",
  "state",
  "affected_records",
  "created_at",
  "updated_at",
  "error",
];

export interface JarvisRootStructure {
  rootFolderId: string;
  configFolderId: string;
  profileDocId: string;
  clientIndexSheetId: string;
  globalMemorySheetId: string;
  templatesFolderId: string;
  clientsRootFolderId: string;
  tasksSheetId: string;
  operationsSheetId: string;
}

export interface ClientStructure {
  clientFolderId: string;
  memorySheetId: string;
  sourcesSheetId: string;
  deliverablesSheetId: string;
  deliverablesFolderId: string;
}

async function findOrCreateFolder(
  drive: DrivePort,
  name: string,
  parentId: string | undefined,
  appProperties: Record<string, string>
): Promise<string> {
  const existing = await drive.findFile({ appProperties, mimeType: "application/vnd.google-apps.folder" });
  if (existing) return existing.id;
  const created = await drive.createFolder(name, parentId, appProperties);
  return created.id;
}

async function findOrCreateDoc(
  drive: DrivePort,
  name: string,
  parentId: string,
  appProperties: Record<string, string>,
  initialParagraph?: string
): Promise<string> {
  const existing = await drive.findFile({
    appProperties,
    mimeType: "application/vnd.google-apps.document",
  });
  if (existing) return existing.id;
  const created = await drive.createDoc(name, parentId, appProperties);
  if (initialParagraph) {
    await drive.appendDocParagraph(created.id, initialParagraph);
  }
  return created.id;
}

async function findOrCreateSheet(
  drive: DrivePort,
  sheets: SheetsPort,
  name: string,
  parentId: string,
  appProperties: Record<string, string>,
  sheetTitle: string,
  headers: string[]
): Promise<string> {
  const existing = await drive.findFile({
    appProperties,
    mimeType: "application/vnd.google-apps.spreadsheet",
  });
  const id = existing ? existing.id : (await drive.createSpreadsheet(name, parentId, appProperties)).id;
  await sheets.ensureSheet(id, sheetTitle, headers);
  return id;
}

/**
 * Creates (or reuses) the full "Jarvis" folder tree in the user's Drive.
 * Safe to call on every app start / setup click: nothing is duplicated.
 */
export async function ensureJarvisStructure(
  drive: DrivePort,
  sheets: SheetsPort,
  rootFolderName = "Jarvis"
): Promise<JarvisRootStructure> {
  const rootFolderId = await findOrCreateFolder(drive, rootFolderName, undefined, {
    app: APP_TAG,
    role: ROLE.root,
  });

  const configFolderId = await findOrCreateFolder(drive, "Configuração", rootFolderId, {
    app: APP_TAG,
    role: ROLE.config,
  });

  const profileDocId = await findOrCreateDoc(
    drive,
    "Perfil e Preferências",
    configFolderId,
    { app: APP_TAG, role: ROLE.profile },
    "Registro de preferências e regras operacionais. Cada atualização é adicionada abaixo, nunca sobrescrita."
  );

  const clientIndexSheetId = await findOrCreateSheet(
    drive,
    sheets,
    "Índice de Clientes",
    configFolderId,
    { app: APP_TAG, role: ROLE.clientIndex },
    CLIENT_INDEX_SHEET,
    CLIENT_INDEX_HEADERS
  );

  const globalMemorySheetId = await findOrCreateSheet(
    drive,
    sheets,
    "Memória Global",
    configFolderId,
    { app: APP_TAG, role: ROLE.globalMemory },
    MEMORY_SHEET,
    MEMORY_HEADERS
  );

  const templatesFolderId = await findOrCreateFolder(drive, "Modelos de Entrega", rootFolderId, {
    app: APP_TAG,
    role: ROLE.templates,
  });

  const clientsRootFolderId = await findOrCreateFolder(drive, "Clientes", rootFolderId, {
    app: APP_TAG,
    role: ROLE.clientsRoot,
  });

  const tasksSheetId = await findOrCreateSheet(
    drive,
    sheets,
    "Pendências",
    rootFolderId,
    { app: APP_TAG, role: ROLE.tasksIndex },
    TASKS_SHEET,
    TASKS_HEADERS
  );

  const operationsSheetId = await findOrCreateSheet(
    drive,
    sheets,
    "Operações",
    rootFolderId,
    { app: APP_TAG, role: ROLE.operationsLog },
    OPERATIONS_SHEET,
    OPERATIONS_HEADERS
  );

  return {
    rootFolderId,
    configFolderId,
    profileDocId,
    clientIndexSheetId,
    globalMemorySheetId,
    templatesFolderId,
    clientsRootFolderId,
    tasksSheetId,
    operationsSheetId,
  };
}

/** Creates (or reuses) the per-client folder + Memoria/Fontes/Entregas sheets. Idempotent by client_id. */
export async function ensureClientStructure(
  drive: DrivePort,
  sheets: SheetsPort,
  clientsRootFolderId: string,
  clientId: string,
  clientName: string
): Promise<ClientStructure> {
  const clientFolderId = await findOrCreateFolder(drive, clientName, clientsRootFolderId, {
    app: APP_TAG,
    role: ROLE.client,
    client_id: clientId,
  });

  const memorySheetId = await findOrCreateSheet(
    drive,
    sheets,
    "Memória",
    clientFolderId,
    { app: APP_TAG, role: ROLE.clientMemory, client_id: clientId },
    MEMORY_SHEET,
    MEMORY_HEADERS
  );

  const sourcesSheetId = await findOrCreateSheet(
    drive,
    sheets,
    "Fontes",
    clientFolderId,
    { app: APP_TAG, role: ROLE.clientSources, client_id: clientId },
    SOURCES_SHEET,
    SOURCES_HEADERS
  );

  const deliverablesSheetId = await findOrCreateSheet(
    drive,
    sheets,
    "Índice de Entregas",
    clientFolderId,
    { app: APP_TAG, role: ROLE.clientDeliverablesIndex, client_id: clientId },
    DELIVERABLES_SHEET,
    DELIVERABLES_HEADERS
  );

  const deliverablesFolderId = await findOrCreateFolder(drive, "Entregas", clientFolderId, {
    app: APP_TAG,
    role: ROLE.clientDeliverablesFolder,
    client_id: clientId,
  });

  return { clientFolderId, memorySheetId, sourcesSheetId, deliverablesSheetId, deliverablesFolderId };
}
