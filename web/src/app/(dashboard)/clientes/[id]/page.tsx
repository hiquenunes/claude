import Link from "next/link";
import { notFound } from "next/navigation";
import { getJarvisServiceForSession } from "@/lib/jarvis-server";
import { describeError } from "@/lib/errors";
import { Card, EmptyState, ErrorBanner, StatusPill } from "@/components/states";
import { archiveMemoryAction, updateTaskStatusAction } from "@/app/actions/jarvis-actions";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let context: Awaited<ReturnType<typeof loadClient>>["context"] | null = null;
  let deliverables: Awaited<ReturnType<typeof loadClient>>["deliverables"] = [];
  let loadError: ReturnType<typeof describeError> | null = null;

  try {
    const data = await loadClient(id);
    context = data.context;
    deliverables = data.deliverables;
  } catch (err) {
    loadError = describeError(err);
  }

  if (loadError) {
    if (loadError.code === "not_found") notFound();
    return <ErrorBanner message="Não foi possível carregar este cliente." detail={loadError.message} />;
  }

  const { client, memory, openTasks } = context!;

  return (
    <div className="space-y-6">
        <div>
          <Link href="/clientes" className="text-xs text-neutral-500 hover:underline dark:text-neutral-400">
            ← Clientes
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{client.name}</h1>
            <StatusPill status={client.status} />
          </div>
          {client.aliases.length > 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Também conhecido como: {client.aliases.join(", ")}</p>
          ) : null}
        </div>

        <Card title="Contexto atual">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Objetivo atual</dt>
              <dd className="text-neutral-900 dark:text-neutral-100">{client.current_objective || "—"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Principais KPIs</dt>
              <dd className="text-neutral-900 dark:text-neutral-100">{client.main_kpis.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Sites</dt>
              <dd className="text-neutral-900 dark:text-neutral-100">{client.sites.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Fuso / Moeda</dt>
              <dd className="text-neutral-900 dark:text-neutral-100">{client.timezone} · {client.currency}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Memória vigente" action={<Link href={`/clientes/${id}/memoria`} className="text-xs text-neutral-500 hover:underline dark:text-neutral-400">ver histórico completo</Link>}>
          {memory.vigente.length === 0 ? (
            <EmptyState title="Nenhuma memória vigente registrada ainda" />
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {memory.vigente.map((m) => (
                <li key={m.memory_id} className="flex items-start justify-between gap-3 py-2">
                  <div>
                    <p className="text-sm text-neutral-800 dark:text-neutral-100">{m.content}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {m.type} · desde {m.valid_from ? new Date(m.valid_from).toLocaleDateString("pt-BR") : "—"}
                      {m.source ? ` · fonte: ${m.source}` : ""}
                    </p>
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await archiveMemoryAction(id, m.memory_id, m.updated_at);
                    }}
                  >
                    <button
                      type="submit"
                      className="shrink-0 rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Arquivar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {memory.pendenteConfirmacao.length > 0 ? (
            <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
              <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">Hipóteses pendentes de confirmação</p>
              <ul className="space-y-1">
                {memory.pendenteConfirmacao.map((m) => (
                  <li key={m.memory_id} className="text-sm text-neutral-700 dark:text-neutral-300">
                    {m.content}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <Card title="Tarefas">
          {openTasks.length === 0 ? (
            <EmptyState title="Nenhuma tarefa aberta" />
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {openTasks.map((t) => (
                <li key={t.task_id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="text-sm text-neutral-800 dark:text-neutral-100">{t.description}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {t.owner ? `${t.owner} · ` : ""}
                      {t.due_date ? `prazo ${new Date(t.due_date).toLocaleDateString("pt-BR")}` : "sem prazo definido"}
                    </p>
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await updateTaskStatusAction(id, t.task_id, t.description, t.origin, "concluida");
                    }}
                  >
                    <button
                      type="submit"
                      className="shrink-0 rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Concluir
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Entregas">
          {deliverables.length === 0 ? (
            <EmptyState title="Nenhuma entrega salva ainda" />
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {deliverables.map((d) => (
                <li key={d.artifact_id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="text-sm text-neutral-800 dark:text-neutral-100">{d.type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{new Date(d.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={d.persistence_state} />
                    {d.link ? (
                      <a href={d.link} target="_blank" rel="noreferrer" className="text-xs text-neutral-600 hover:underline dark:text-neutral-300">
                        Abrir fonte
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
  );
}

async function loadClient(id: string) {
  const { jarvis } = await getJarvisServiceForSession();
  const [context, deliverables] = await Promise.all([
    jarvis.get_client_context(id),
    jarvis.list_client_deliverables(id),
  ]);
  return { context, deliverables };
}
