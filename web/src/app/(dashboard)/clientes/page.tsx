import Link from "next/link";
import type { ClientRecord } from "@jarvis/core";
import { getJarvisServiceForSession } from "@/lib/jarvis-server";
import { describeError } from "@/lib/errors";
import { Card, EmptyState, ErrorBanner, StatusPill } from "@/components/states";
import { NewClientForm } from "@/components/new-client-form";

export default async function ClientesPage() {
  let clients: ClientRecord[] = [];
  let loadError: string | null = null;

  try {
    const { jarvis } = await getJarvisServiceForSession();
    clients = await jarvis.listClients();
  } catch (err) {
    loadError = describeError(err).message;
  }

  if (loadError) {
    return <ErrorBanner message="Não foi possível carregar os clientes." detail={loadError} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Clientes</h1>

      <Card title="Todos os clientes">
        {clients.length === 0 ? (
          <EmptyState title="Nenhum cliente cadastrado ainda" description="Use o formulário abaixo para criar o primeiro." />
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {clients.map((c) => (
              <li key={c.client_id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <Link href={`/clientes/${c.client_id}`} className="text-sm font-medium text-neutral-800 hover:underline dark:text-neutral-100">
                    {c.name}
                  </Link>
                  {c.aliases.length > 0 ? (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{c.aliases.join(", ")}</p>
                  ) : null}
                </div>
                <StatusPill status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Novo cliente">
        <NewClientForm />
      </Card>
    </div>
  );
}
