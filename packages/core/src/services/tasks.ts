import { newId } from "../ids.js";
import type { Clock, SheetsPort } from "../ports.js";
import { SheetRepo } from "../sheet-repo.js";
import { TASKS_SHEET } from "../structure.js";
import type { TaskRecord, TaskStatus } from "../types.js";

function serialize(t: TaskRecord): Record<string, string> {
  return {
    task_id: t.task_id,
    client_id: t.client_id,
    description: t.description,
    origin: t.origin,
    owner: t.owner ?? "",
    due_date: t.due_date ?? "",
    status: t.status,
    updated_at: t.updated_at,
  };
}

function deserialize(v: Record<string, string>): TaskRecord {
  return {
    task_id: v.task_id,
    client_id: v.client_id,
    description: v.description,
    origin: v.origin,
    owner: v.owner || undefined,
    due_date: v.due_date || undefined,
    status: (v.status as TaskStatus) || "aberta",
    updated_at: v.updated_at,
  };
}

export function tasksRepo(sheets: SheetsPort, tasksSheetId: string) {
  return new SheetRepo<TaskRecord>({
    sheets,
    spreadsheetId: tasksSheetId,
    sheetTitle: TASKS_SHEET,
    idField: "task_id",
    versionField: "updated_at",
    serialize,
    deserialize,
  });
}

export type TasksRepo = ReturnType<typeof tasksRepo>;

export interface UpsertTaskInput {
  clientId: string;
  description: string;
  origin: string;
  owner?: string;
  dueDate?: string;
  status?: TaskStatus;
}

/**
 * Creates a task, or updates the matching open one if the same
 * (client_id, origin, description) was already recorded — so re-importing
 * the same meeting/report never duplicates its action items.
 */
export async function upsertTask(
  repo: TasksRepo,
  clock: Clock,
  input: UpsertTaskInput
): Promise<{ task: TaskRecord; created: boolean }> {
  const existing = await repo.query(
    (v) =>
      v.client_id === input.clientId &&
      v.origin === input.origin &&
      v.description === input.description &&
      v.status !== "cancelada"
  );

  const now = clock.nowIso();

  if (existing.length > 0) {
    const current = existing[0];
    const updated: TaskRecord = {
      ...current,
      owner: input.owner ?? current.owner,
      due_date: input.dueDate ?? current.due_date,
      status: input.status ?? current.status,
      updated_at: now,
    };
    await repo.update(current.task_id, updated, current.updated_at);
    return { task: updated, created: false };
  }

  const task: TaskRecord = {
    task_id: newId("task"),
    client_id: input.clientId,
    description: input.description,
    origin: input.origin,
    owner: input.owner,
    due_date: input.dueDate,
    status: input.status ?? "aberta",
    updated_at: now,
  };
  await repo.create(task);
  return { task, created: true };
}

export async function listClientTasks(repo: TasksRepo, clientId: string): Promise<TaskRecord[]> {
  return repo.query((v) => v.client_id === clientId);
}
