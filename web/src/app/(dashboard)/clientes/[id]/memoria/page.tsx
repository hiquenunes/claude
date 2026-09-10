import Link from "next/link";
import type { ClientRecord, MemoryRecord } from "@jarvis/core";
import { getJarvisServiceForSession } from "@/lib/jarvis-server";
import { describeError } from "@/lib/errors";
import { Card, EmptyState, ErrorBanner, StatusPill } from "@/components/states";

export default async function ClientMemoryHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let client: ClientRecord | null = null;
  let history: MemoryRecord[] = [];
  let loadError: string | null = null;

  try {
    const { jarvis } = await getJarvisServiceForSession();
    [client, history] = await Promise.all([jarvis.find_client({ clientId: id }), jarvis.get_memory_history(id)]);
  } catch (err) {
    loadError = describeError(err).message;
  }

  if (loadError || !client) {
    return <ErrorBanner message="Não foi possível carregar o histórico." detail={loadError ?? undefined} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/clientes/${id}`} className="text-xs text-neutral-500 hover:underline dark:text-neutral-400">
          ← {client.name}
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50">Histórico de memória</h1>
      </div>

      <Card>
        {history.length === 0 ? (
          <EmptyState title="Nenhum registro de memória ainda" />
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {history.map((m) => (
              <li key={m.memory_id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-neutral-800 dark:text-neutral-100">{m.content}</p>
                  <StatusPill status={m.status} />
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {m.type} · registrado em {new Date(m.record_date).toLocaleString("pt-BR")}
                  {m.source ? ` · fonte: ${m.source}` : ""}
                  {m.supersedes ? ` · substitui ${m.supersedes}` : ""}
                  {m.superseded_by ? ` · substituído por ${m.superseded_by}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
