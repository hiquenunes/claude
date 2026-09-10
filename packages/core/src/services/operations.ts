import { newId } from "../ids.js";
import type { Clock, SheetsPort } from "../ports.js";
import { OPERATIONS_HEADERS, OPERATIONS_SHEET } from "../structure.js";
import { joinList, SheetRepo, splitList } from "../sheet-repo.js";
import type { OperationRecord, OperationState } from "../types.js";

function serialize(op: OperationRecord): Record<string, string> {
  return {
    operation_id: op.operation_id,
    idempotency_key: op.idempotency_key,
    type: op.type,
    client_id: op.client_id ?? "",
    state: op.state,
    affected_records: joinList(op.affected_records),
    created_at: op.created_at,
    updated_at: op.updated_at,
    error: op.error ?? "",
  };
}

function deserialize(values: Record<string, string>): OperationRecord {
  return {
    operation_id: values.operation_id,
    idempotency_key: values.idempotency_key,
    type: values.type,
    client_id: values.client_id || undefined,
    state: (values.state as OperationState) || "pendente",
    affected_records: splitList(values.affected_records),
    created_at: values.created_at,
    updated_at: values.updated_at,
    error: values.error || undefined,
  };
}

export function operationsRepo(sheets: SheetsPort, operationsSheetId: string) {
  return new SheetRepo<OperationRecord>({
    sheets,
    spreadsheetId: operationsSheetId,
    sheetTitle: OPERATIONS_SHEET,
    idField: "operation_id",
    versionField: "updated_at",
    serialize,
    deserialize,
  });
}

export type OperationsRepo = ReturnType<typeof operationsRepo>;

/**
 * Idempotency guard for multi-step writes (e.g. importing a meeting once,
 * even if the caller retries after a timeout). Returns `done: true` with the
 * prior result when the same idempotencyKey already completed successfully;
 * otherwise opens (or reuses) a pending operation for the caller to complete.
 */
export async function beginOperation(
  repo: OperationsRepo,
  clock: Clock,
  input: { type: string; clientId?: string; idempotencyKey: string }
): Promise<{ done: true; operation: OperationRecord } | { done: false; operation: OperationRecord }> {
  const existing = await repo.query((v) => v.idempotency_key === input.idempotencyKey);
  const priorSuccess = existing.find((op) => op.state === "concluida");
  if (priorSuccess) {
    return { done: true, operation: priorSuccess };
  }

  const priorPending = existing.find((op) => op.state === "pendente" || op.state === "falhou");
  if (priorPending) {
    return { done: false, operation: priorPending };
  }

  const now = clock.nowIso();
  const operation: OperationRecord = {
    operation_id: newId("op"),
    idempotency_key: input.idempotencyKey,
    type: input.type,
    client_id: input.clientId,
    state: "pendente",
    affected_records: [],
    created_at: now,
    updated_at: now,
  };
  await repo.create(operation);
  return { done: false, operation };
}

export async function completeOperation(
  repo: OperationsRepo,
  clock: Clock,
  operation: OperationRecord,
  affectedRecords: string[]
): Promise<OperationRecord> {
  const updated: OperationRecord = {
    ...operation,
    state: "concluida",
    affected_records: affectedRecords,
    updated_at: clock.nowIso(),
  };
  return repo.update(operation.operation_id, updated, operation.updated_at);
}

export async function failOperation(
  repo: OperationsRepo,
  clock: Clock,
  operation: OperationRecord,
  sanitizedError: string
): Promise<OperationRecord> {
  const updated: OperationRecord = {
    ...operation,
    state: "falhou",
    error: sanitizedError,
    updated_at: clock.nowIso(),
  };
  return repo.update(operation.operation_id, updated, operation.updated_at);
}

export async function getOperationStatus(
  repo: OperationsRepo,
  operationId: string
): Promise<OperationRecord | null> {
  return repo.findById(operationId);
}
