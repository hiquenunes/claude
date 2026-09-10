import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryRepo, saveMemoryChange, getClientMemoryContext, getMemoryHistory } from "../services/memory.js";
import { ConflictError } from "../errors.js";
import { FakeClock, FakeSheetsPort } from "./fakes.js";

async function setup() {
  const sheets = new FakeSheetsPort();
  const clock = new FakeClock();
  await sheets.ensureSheet("mem-sheet-1", "Memória", [
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
  ]);
  const repo = memoryRepo(sheets, "mem-sheet-1");
  return { sheets, clock, repo };
}

test("a corrected goal supersedes the old one and preserves history", async () => {
  const { clock, repo } = await setup();

  const original = await saveMemoryChange(repo, clock, {
    scope: "client",
    clientId: "client-1",
    type: "objetivo",
    content: "Meta de CPL: R$ 60",
    source: "conversa",
  });

  const corrected = await saveMemoryChange(repo, clock, {
    scope: "client",
    clientId: "client-1",
    type: "objetivo",
    content: "Meta de CPL: R$ 80",
    source: "conversa",
    supersedesMemoryId: original.memory_id,
  });

  const context = await getClientMemoryContext(repo, "client-1");
  assert.equal(context.vigente.length, 1);
  assert.equal(context.vigente[0].memory_id, corrected.memory_id);
  assert.equal(context.vigente[0].content, "Meta de CPL: R$ 80");

  const history = await getMemoryHistory(repo, "client-1");
  assert.equal(history.length, 2);
  const oldRecord = history.find((h) => h.memory_id === original.memory_id)!;
  assert.equal(oldRecord.status, "substituido");
  assert.equal(oldRecord.superseded_by, corrected.memory_id);
  assert.equal(oldRecord.content, "Meta de CPL: R$ 60"); // history not erased
});

test("a hypothesis never becomes vigente automatically", async () => {
  const { clock, repo } = await setup();

  const hypothesis = await saveMemoryChange(repo, clock, {
    scope: "client",
    clientId: "client-1",
    type: "hipotese",
    content: "Talvez mudar o foco para leads",
    source: "conversa",
  });

  assert.equal(hypothesis.status, "pendente_confirmacao");

  const context = await getClientMemoryContext(repo, "client-1");
  assert.equal(context.vigente.length, 0);
  assert.equal(context.pendenteConfirmacao.length, 1);
  assert.equal(context.pendenteConfirmacao[0].memory_id, hypothesis.memory_id);
});

test("superseding with a stale expected version raises ConflictError instead of silently overwriting", async () => {
  const { clock, repo } = await setup();

  const original = await saveMemoryChange(repo, clock, {
    scope: "client",
    clientId: "client-1",
    type: "preferencia",
    content: "Não usa emojis nos reports",
    source: "conversa",
  });
  const staleVersion = original.updated_at;

  // Someone else edits the record concurrently (e.g. a manual Drive edit,
  // or a second assistant session), bumping updated_at.
  const concurrentUpdate = { ...original, content: "edicao concorrente", updated_at: clock.nowIso() };
  await repo.update(original.memory_id, concurrentUpdate, staleVersion);

  await assert.rejects(
    () =>
      saveMemoryChange(repo, clock, {
        scope: "client",
        clientId: "client-1",
        type: "preferencia",
        content: "Não usa emojis em nenhum material",
        source: "conversa",
        supersedesMemoryId: original.memory_id,
        expectedSupersededVersion: staleVersion,
      }),
    ConflictError
  );
});
