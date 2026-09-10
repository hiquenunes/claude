import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureJarvisStructure, ensureClientStructure } from "../structure.js";
import { FakeDrivePort, FakeSheetsPort } from "./fakes.js";

test("ensureJarvisStructure is idempotent: rerunning setup does not duplicate anything", async () => {
  const drive = new FakeDrivePort();
  const sheets = new FakeSheetsPort();

  const first = await ensureJarvisStructure(drive, sheets);
  const second = await ensureJarvisStructure(drive, sheets);

  assert.equal(first.rootFolderId, second.rootFolderId);
  assert.equal(first.clientIndexSheetId, second.clientIndexSheetId);
  assert.equal(first.tasksSheetId, second.tasksSheetId);
  assert.equal(first.operationsSheetId, second.operationsSheetId);
  assert.equal(first.globalMemorySheetId, second.globalMemorySheetId);

  assert.equal(drive.countByAppProperties({ app: "jarvis", role: "root" }), 1);
  assert.equal(drive.countByAppProperties({ app: "jarvis", role: "client_index" }), 1);
  assert.equal(drive.countByAppProperties({ app: "jarvis", role: "operations_log" }), 1);
});

test("ensureClientStructure is idempotent per client_id", async () => {
  const drive = new FakeDrivePort();
  const sheets = new FakeSheetsPort();
  const root = await ensureJarvisStructure(drive, sheets);

  const first = await ensureClientStructure(drive, sheets, root.clientsRootFolderId, "client-1", "Cliente Exemplo");
  const second = await ensureClientStructure(drive, sheets, root.clientsRootFolderId, "client-1", "Cliente Exemplo");

  assert.equal(first.clientFolderId, second.clientFolderId);
  assert.equal(first.memorySheetId, second.memorySheetId);
  assert.equal(drive.countByAppProperties({ app: "jarvis", role: "client", client_id: "client-1" }), 1);
});
