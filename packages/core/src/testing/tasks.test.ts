import { test } from "node:test";
import assert from "node:assert/strict";
import { tasksRepo, upsertTask, listClientTasks } from "../services/tasks.js";
import { TASKS_HEADERS, TASKS_SHEET } from "../structure.js";
import { FakeClock, FakeSheetsPort } from "./fakes.js";

async function setup() {
  const sheets = new FakeSheetsPort();
  const clock = new FakeClock();
  await sheets.ensureSheet("tasks-sheet-1", TASKS_SHEET, TASKS_HEADERS);
  const repo = tasksRepo(sheets, "tasks-sheet-1");
  return { clock, repo };
}

test("reimporting the same meeting does not duplicate its tasks", async () => {
  const { clock, repo } = await setup();
  const origin = "reuniao:2026-09-08";

  const first = await upsertTask(repo, clock, {
    clientId: "client-1",
    description: "Enviar proposta de novo criativo",
    origin,
  });
  assert.equal(first.created, true);

  const second = await upsertTask(repo, clock, {
    clientId: "client-1",
    description: "Enviar proposta de novo criativo",
    origin,
  });
  assert.equal(second.created, false);
  assert.equal(second.task.task_id, first.task.task_id);

  const all = await listClientTasks(repo, "client-1");
  assert.equal(all.length, 1);
});

test("upsertTask never invents an owner or due date when none was mentioned", async () => {
  const { clock, repo } = await setup();
  const { task } = await upsertTask(repo, clock, {
    clientId: "client-1",
    description: "Revisar copy do anúncio",
    origin: "manual",
  });
  assert.equal(task.owner, undefined);
  assert.equal(task.due_date, undefined);
  assert.equal(task.status, "aberta");
});
