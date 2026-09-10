import { test } from "node:test";
import assert from "node:assert/strict";
import { OPERATIONS_HEADERS, OPERATIONS_SHEET } from "../structure.js";
import { beginOperation, completeOperation, failOperation, operationsRepo } from "../services/operations.js";
import { FakeClock, FakeSheetsPort } from "./fakes.js";

async function setup() {
  const sheets = new FakeSheetsPort();
  const clock = new FakeClock();
  await sheets.ensureSheet("ops-sheet-1", OPERATIONS_SHEET, OPERATIONS_HEADERS);
  const repo = operationsRepo(sheets, "ops-sheet-1");
  return { clock, repo };
}

test("a retried operation with the same idempotency key does not redo the work", async () => {
  const { clock, repo } = await setup();
  const key = "import:granola:meeting-abc";

  const first = await beginOperation(repo, clock, { type: "save_deliverable", idempotencyKey: key });
  assert.equal(first.done, false);
  await completeOperation(repo, clock, first.operation, ["artifact-1"]);

  const second = await beginOperation(repo, clock, { type: "save_deliverable", idempotencyKey: key });
  assert.equal(second.done, true);
  if (second.done) {
    assert.deepEqual(second.operation.affected_records, ["artifact-1"]);
  }
});

test("a failed operation can be retried instead of being stuck pendente forever", async () => {
  const { clock, repo } = await setup();
  const key = "import:granola:meeting-xyz";

  const first = await beginOperation(repo, clock, { type: "save_deliverable", idempotencyKey: key });
  await failOperation(repo, clock, first.operation, "timeout ao gravar planilha");

  const retry = await beginOperation(repo, clock, { type: "save_deliverable", idempotencyKey: key });
  assert.equal(retry.done, false);
  assert.equal(retry.operation.operation_id, first.operation.operation_id);

  await completeOperation(repo, clock, retry.operation, ["artifact-2"]);
  const third = await beginOperation(repo, clock, { type: "save_deliverable", idempotencyKey: key });
  assert.equal(third.done, true);
});
