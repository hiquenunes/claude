import type { Clock, DrivePort, SheetsPort } from "./ports.js";
import { systemClock } from "./ports.js";
import { ensureJarvisStructure, type JarvisRootStructure } from "./structure.js";
import {
  clientsRepo,
  createClient,
  findClient,
  type CreateClientInput,
} from "./services/clients.js";
import {
  archiveMemory,
  getClientMemoryContext,
  getMemoryHistory,
  memoryRepo,
  recordDecision,
  saveMemoryChange,
  type RecordDecisionInput,
  type SaveMemoryChangeInput,
} from "./services/memory.js";
import {
  readSource,
  registerSource,
  searchClientSources,
  sourcesRepo,
  type RegisterSourceInput,
  type SearchSourcesFilter,
} from "./services/sources.js";
import { listClientTasks, tasksRepo, upsertTask, type UpsertTaskInput } from "./services/tasks.js";
import {
  deliverablesRepo,
  listClientDeliverables,
  saveDeliverable,
  type SaveDeliverableInput,
} from "./services/deliverables.js";
import {
  beginOperation,
  completeOperation,
  failOperation,
  getOperationStatus,
  operationsRepo,
} from "./services/operations.js";
import type { ClientRecord } from "./types.js";

export interface JarvisServiceOptions {
  drive: DrivePort;
  sheets: SheetsPort;
  clock?: Clock;
  rootFolderName?: string;
  /** Skips re-walking the Drive tree when the caller already knows the ids (e.g. a process-memory cache keyed by user). */
  knownStructure?: JarvisRootStructure;
}

/**
 * Single entry point exposing exactly the tool surface described in the
 * briefing (section 11): find_client, get_client_context,
 * search_client_sources, read_source, save_memory_change, record_decision,
 * upsert_task, save_deliverable, get_operation_status. Both the MCP server
 * and the dashboard's API routes call through this class so they can never
 * diverge on memory rules.
 */
export class JarvisService {
  private readonly drive: DrivePort;
  private readonly sheets: SheetsPort;
  private readonly clock: Clock;
  private readonly rootFolderName: string;
  private structure: JarvisRootStructure | null = null;

  constructor(options: JarvisServiceOptions) {
    this.drive = options.drive;
    this.sheets = options.sheets;
    this.clock = options.clock ?? systemClock;
    this.rootFolderName = options.rootFolderName ?? "Jarvis";
    this.structure = options.knownStructure ?? null;
  }

  /** Ids resolved so far in this instance, if any — cache these keyed by user to skip re-walking the Drive tree on the next request. */
  get lastKnownStructure(): JarvisRootStructure | null {
    return this.structure;
  }

  /** Idempotent: creates the Drive structure on first run, reuses it after. */
  async setup(): Promise<JarvisRootStructure> {
    this.structure = await ensureJarvisStructure(this.drive, this.sheets, this.rootFolderName);
    return this.structure;
  }

  private async getStructure(): Promise<JarvisRootStructure> {
    if (!this.structure) {
      return this.setup();
    }
    return this.structure;
  }

  private async clientsRepo() {
    const s = await this.getStructure();
    return clientsRepo(this.sheets, s.clientIndexSheetId);
  }

  private async tasksRepo() {
    const s = await this.getStructure();
    return tasksRepo(this.sheets, s.tasksSheetId);
  }

  private async operationsRepo() {
    const s = await this.getStructure();
    return operationsRepo(this.sheets, s.operationsSheetId);
  }

  private async memoryRepoFor(client: ClientRecord) {
    if (!client.memory_sheet_id) {
      throw new Error(`Cliente "${client.name}" não tem planilha de memória associada.`);
    }
    return memoryRepo(this.sheets, client.memory_sheet_id);
  }

  private async sourcesRepoFor(client: ClientRecord) {
    if (!client.sources_sheet_id) {
      throw new Error(`Cliente "${client.name}" não tem planilha de fontes associada.`);
    }
    return sourcesRepo(this.sheets, client.sources_sheet_id);
  }

  // ---- clients -----------------------------------------------------

  async createClient(input: CreateClientInput): Promise<ClientRecord> {
    const s = await this.getStructure();
    const repo = await this.clientsRepo();
    return createClient(repo, this.drive, this.sheets, s.clientsRootFolderId, this.clock, input);
  }

  async listClients(): Promise<ClientRecord[]> {
    const repo = await this.clientsRepo();
    return repo.list();
  }

  async find_client(query: { clientId?: string; nameQuery?: string }): Promise<ClientRecord> {
    const repo = await this.clientsRepo();
    return findClient(repo, query);
  }

  async get_client_context(clientId: string) {
    const repo = await this.clientsRepo();
    const client = await findClient(repo, { clientId });
    const mRepo = await this.memoryRepoFor(client);
    const memory = await getClientMemoryContext(mRepo, clientId);
    const tRepo = await this.tasksRepo();
    const openTasks = (await listClientTasks(tRepo, clientId)).filter(
      (t) => t.status === "aberta" || t.status === "em_andamento"
    );
    return { client, memory, openTasks };
  }

  async get_memory_history(clientId: string) {
    const repo = await this.clientsRepo();
    const client = await findClient(repo, { clientId });
    const mRepo = await this.memoryRepoFor(client);
    return getMemoryHistory(mRepo, clientId);
  }

  // ---- memory --------------------------------------------------------

  async save_memory_change(input: SaveMemoryChangeInput) {
    let mRepo;
    if (input.scope === "client") {
      const repo = await this.clientsRepo();
      const client = await findClient(repo, { clientId: input.clientId });
      mRepo = await this.memoryRepoFor(client);
    } else {
      const s = await this.getStructure();
      mRepo = memoryRepo(this.sheets, s.globalMemorySheetId);
    }
    return saveMemoryChange(mRepo, this.clock, input);
  }

  async archive_memory(clientId: string, memoryId: string, expectedVersion?: string) {
    const repo = await this.clientsRepo();
    const client = await findClient(repo, { clientId });
    const mRepo = await this.memoryRepoFor(client);
    return archiveMemory(mRepo, this.clock, memoryId, expectedVersion);
  }

  async get_global_memory_context() {
    const s = await this.getStructure();
    const mRepo = memoryRepo(this.sheets, s.globalMemorySheetId);
    return getClientMemoryContext(mRepo, "__global__");
  }

  async record_decision(input: RecordDecisionInput) {
    const repo = await this.clientsRepo();
    const client = await findClient(repo, { clientId: input.clientId });
    const mRepo = await this.memoryRepoFor(client);
    return recordDecision(mRepo, this.clock, input);
  }

  // ---- sources ---------------------------------------------------------

  async register_source(input: RegisterSourceInput) {
    const repo = await this.clientsRepo();
    const client = await findClient(repo, { clientId: input.clientId });
    const sRepo = await this.sourcesRepoFor(client);
    return registerSource(sRepo, this.clock, input);
  }

  async search_client_sources(filter: SearchSourcesFilter) {
    const repo = await this.clientsRepo();
    const client = await findClient(repo, { clientId: filter.clientId });
    const sRepo = await this.sourcesRepoFor(client);
    return searchClientSources(sRepo, filter);
  }

  async read_source(clientId: string, sourceId: string) {
    const repo = await this.clientsRepo();
    const client = await findClient(repo, { clientId });
    const sRepo = await this.sourcesRepoFor(client);
    return readSource(sRepo, sourceId);
  }

  // ---- tasks -------------------------------------------------------

  async upsert_task(input: UpsertTaskInput) {
    const repo = await this.tasksRepo();
    return upsertTask(repo, this.clock, input);
  }

  async list_client_tasks(clientId: string) {
    const repo = await this.tasksRepo();
    return listClientTasks(repo, clientId);
  }

  /** All open/in-progress tasks across every client — cheap because Pendências is one shared sheet. */
  async list_all_open_tasks() {
    const repo = await this.tasksRepo();
    const all = await repo.list();
    return all.filter((t) => t.status === "aberta" || t.status === "em_andamento");
  }

  // ---- deliverables --------------------------------------------------

  async save_deliverable(input: SaveDeliverableInput) {
    const repo = await this.clientsRepo();
    const client = await findClient(repo, { clientId: input.clientId });
    if (!client.folder_id) throw new Error("Cliente sem pasta associada.");
    const dRepo = deliverablesRepo(this.sheets, (await this.clientDeliverablesSheetId(client)));
    return saveDeliverable(dRepo, this.clock, input);
  }

  async list_client_deliverables(clientId: string) {
    const repo = await this.clientsRepo();
    const client = await findClient(repo, { clientId });
    const dRepo = deliverablesRepo(this.sheets, await this.clientDeliverablesSheetId(client));
    return listClientDeliverables(dRepo, clientId);
  }

  /**
   * Best-effort recent deliverables across all clients, for the overview
   * screen. Iterates client folders (one Drive lookup each) — fine at the
   * scale of a handful of clients; not meant for large portfolios.
   */
  async list_recent_deliverables_across_clients(limit = 8) {
    const clients = await this.listClients();
    const results: Array<Awaited<ReturnType<typeof listClientDeliverables>>[number] & { client_name: string }> = [];
    for (const client of clients) {
      try {
        const sheetId = await this.clientDeliverablesSheetId(client);
        const items = await listClientDeliverables(deliverablesRepo(this.sheets, sheetId), client.client_id);
        for (const item of items) {
          results.push({ ...item, client_name: client.name });
        }
      } catch {
        // client folder not fully set up yet — skip rather than fail the whole overview
      }
    }
    results.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return results.slice(0, limit);
  }

  private async clientDeliverablesSheetId(client: ClientRecord): Promise<string> {
    // The deliverables index sheet lives inside the client folder; we look
    // it up via the appProperties marker rather than storing yet another id
    // on the client row, so renames never break the link.
    const found = await this.drive.findFile({
      appProperties: { app: "jarvis", role: "client_deliverables_index", client_id: client.client_id },
      mimeType: "application/vnd.google-apps.spreadsheet",
    });
    if (!found) {
      throw new Error(`Planilha de entregas do cliente "${client.name}" não encontrada.`);
    }
    return found.id;
  }

  // ---- operations (idempotency) --------------------------------------

  async get_operation_status(operationId: string) {
    const repo = await this.operationsRepo();
    return getOperationStatus(repo, operationId);
  }

  /** Exposed for services that need to wrap a multi-step write in an idempotency guard. */
  async withIdempotency<T>(
    input: { type: string; clientId?: string; idempotencyKey: string },
    run: () => Promise<{ result: T; affectedRecords: string[] }>
  ): Promise<{ result: T; alreadyDone: boolean }> {
    const repo = await this.operationsRepo();
    const begin = await beginOperation(repo, this.clock, input);
    if (begin.done) {
      return { result: begin.operation.affected_records as unknown as T, alreadyDone: true };
    }
    try {
      const { result, affectedRecords } = await run();
      await completeOperation(repo, this.clock, begin.operation, affectedRecords);
      return { result, alreadyDone: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : "erro desconhecido";
      await failOperation(repo, this.clock, begin.operation, message);
      throw err;
    }
  }
}
