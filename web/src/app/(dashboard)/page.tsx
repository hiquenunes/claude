import Link from "next/link";
import { getJarvisServiceForSession } from "@/lib/jarvis-server";
import { describeError } from "@/lib/errors";
import { Card, EmptyState, ErrorBanner, StatusPill } from "@/components/states";

export default async function OverviewPage() {
  let clients: Awaited<ReturnType<typeof loadOverview>>["clients"] = [];
  let openTasks: Awaited<ReturnType<typeof loadOverview>>["openTasks"] = [];
  let deliverables: Awaited<ReturnType<typeof loadOverview>>["deliverables"] = [];
  let loadError: string | null = null;

  try {
    const data = await loadOverview();
    clients = data.clients;
    openTasks = data.openTasks;
    deliverables = data.deliverables;
  } catch (err) {
    loadError = describeError(err).message;
  }

  if (loadError) {
    return <ErrorBanner message="Não foi possível carregar a visão geral." detail={loadError} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Visão geral</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {clients.length} cliente{clients.length === 1 ? "" : "s"} · {openTasks.length} tarefa
          {openTasks.length === 1 ? "" : "s"} aberta{openTasks.length === 1 ? "" : "s"}
        </p>
      </div>

      <Card title="Clientes recentes" action={<Link href="/clientes" className="text-xs text-neutral-500 hover:underline dark:text-neutral-400">ver todos</Link>}>
        {clients.length === 0 ? (
          <EmptyState
            title="Nenhum cliente cadastrado ainda"
            description="Peça para o Claude cadastrar um cliente, ou crie um em Clientes → Novo cliente."
          />
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {clients.slice(0, 6).map((c) => (
              <li key={c.client_id} className="flex items-center justify-between gap-2 py-2">
                <Link href={`/clientes/${c.client_id}`} className="text-sm font-medium text-neutral-800 hover:underline dark:text-neutral-100">
                  {c.name}
                </Link>
                <div className="flex items-center gap-2">
                  {c.current_objective ? (
                    <span className="hidden text-xs text-neutral-500 sm:inline dark:text-neutral-400">{c.current_objective}</span>
                  ) : null}
                  <StatusPill status={c.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Tarefas pendentes">
        {openTasks.length === 0 ? (
          <EmptyState title="Nenhuma tarefa aberta" />
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {openTasks.slice(0, 8).map((t) => (
              <li key={t.task_id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-sm text-neutral-800 dark:text-neutral-100">{t.description}</span>
                <StatusPill status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Últimas entregas">
        {deliverables.length === 0 ? (
          <EmptyState title="Nenhuma entrega salva ainda" />
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {deliverables.map((d) => (
              <li key={d.artifact_id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm text-neutral-800 dark:text-neutral-100">
                    {d.type.replace(/_/g, " ")} · {d.client_name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{new Date(d.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <StatusPill status={d.persistence_state} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

async function loadOverview() {
  const { jarvis } = await getJarvisServiceForSession();
  const [clients, openTasks, deliverables] = await Promise.all([
    jarvis.listClients(),
    jarvis.list_all_open_tasks(),
    jarvis.list_recent_deliverables_across_clients(5),
  ]);
  return { clients, openTasks, deliverables };
}
