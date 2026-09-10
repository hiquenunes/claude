"use server";

import { revalidatePath } from "next/cache";
import { getJarvisServiceForSession } from "@/lib/jarvis-server";
import { describeError, type DisplayError } from "@/lib/errors";

export interface ActionResult {
  ok: boolean;
  error?: DisplayError;
}

export async function runSetupAction(): Promise<ActionResult> {
  try {
    const { jarvis } = await getJarvisServiceForSession();
    await jarvis.setup();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: describeError(err) };
  }
}

export async function createClientAction(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: { code: "invalid_input", message: "Informe o nome do cliente." } };

  const aliasesRaw = String(formData.get("aliases") ?? "").trim();
  const objective = String(formData.get("current_objective") ?? "").trim();

  try {
    const { jarvis } = await getJarvisServiceForSession();
    await jarvis.createClient({
      name,
      aliases: aliasesRaw ? aliasesRaw.split(",").map((a) => a.trim()).filter(Boolean) : [],
      current_objective: objective || undefined,
    });
    revalidatePath("/clientes");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: describeError(err) };
  }
}

export async function archiveMemoryAction(
  clientId: string,
  memoryId: string,
  expectedVersion: string
): Promise<ActionResult> {
  try {
    const { jarvis } = await getJarvisServiceForSession();
    await jarvis.archive_memory(clientId, memoryId, expectedVersion);
    revalidatePath(`/clientes/${clientId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: describeError(err) };
  }
}

export async function updateTaskStatusAction(
  clientId: string,
  taskId: string,
  description: string,
  origin: string,
  status: "aberta" | "em_andamento" | "concluida" | "cancelada"
): Promise<ActionResult> {
  try {
    const { jarvis } = await getJarvisServiceForSession();
    await jarvis.upsert_task({ clientId, description, origin, status });
    revalidatePath(`/clientes/${clientId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: describeError(err) };
  }
}
