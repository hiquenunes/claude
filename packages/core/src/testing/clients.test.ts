import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureJarvisStructure } from "../structure.js";
import { clientsRepo, createClient, findClient } from "../services/clients.js";
import { AmbiguousClientError, NotFoundError, ValidationError } from "../errors.js";
import { FakeClock, FakeDrivePort, FakeSheetsPort } from "./fakes.js";

async function setup() {
  const drive = new FakeDrivePort();
  const sheets = new FakeSheetsPort();
  const clock = new FakeClock();
  const root = await ensureJarvisStructure(drive, sheets);
  const repo = clientsRepo(sheets, root.clientIndexSheetId);
  return { drive, sheets, clock, root, repo };
}

test("two clients with similar names do not share data", async () => {
  const { drive, sheets, clock, root, repo } = await setup();

  const a = await createClient(repo, drive, sheets, root.clientsRootFolderId, clock, {
    name: "Studio Bella Estética",
  });
  const b = await createClient(repo, drive, sheets, root.clientsRootFolderId, clock, {
    name: "Bella Odontologia",
  });

  assert.notEqual(a.client_id, b.client_id);
  assert.notEqual(a.folder_id, b.folder_id);
  assert.notEqual(a.memory_sheet_id, b.memory_sheet_id);

  // exact-name lookup must resolve unambiguously
  const foundA = await findClient(repo, { nameQuery: "Studio Bella Estética" });
  assert.equal(foundA.client_id, a.client_id);

  // ambiguous partial match ("Bella") must not silently pick one
  await assert.rejects(() => findClient(repo, { nameQuery: "Bella" }), AmbiguousClientError);
});

test("creating a client with a duplicate name is rejected", async () => {
  const { drive, sheets, clock, root, repo } = await setup();
  await createClient(repo, drive, sheets, root.clientsRootFolderId, clock, { name: "Cliente Exemplo" });
  await assert.rejects(
    () => createClient(repo, drive, sheets, root.clientsRootFolderId, clock, { name: "Cliente Exemplo" }),
    ValidationError
  );
});

test("renaming a client preserves its id-based links", async () => {
  const { drive, sheets, clock, root, repo } = await setup();
  const client = await createClient(repo, drive, sheets, root.clientsRootFolderId, clock, {
    name: "Nome Antigo",
  });
  const originalFolderId = client.folder_id;
  const originalMemorySheetId = client.memory_sheet_id;

  const renamed = { ...client, name: "Nome Novo", updated_at: clock.nowIso() };
  await repo.update(client.client_id, renamed, client.updated_at);

  const found = await findClient(repo, { clientId: client.client_id });
  assert.equal(found.name, "Nome Novo");
  assert.equal(found.folder_id, originalFolderId);
  assert.equal(found.memory_sheet_id, originalMemorySheetId);
});

test("looking up a nonexistent client raises NotFoundError, not a false match", async () => {
  const { repo } = await setup();
  await assert.rejects(() => findClient(repo, { nameQuery: "Nao Existe" }), NotFoundError);
  await assert.rejects(() => findClient(repo, { clientId: "client_doesnotexist" }), NotFoundError);
});
