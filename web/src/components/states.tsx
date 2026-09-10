export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
      ) : null}
    </div>
  );
}

export function ErrorBanner({
  message,
  detail,
}: {
  message: string;
  detail?: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      <p className="font-medium">{message}</p>
      {detail ? <p className="mt-1 text-red-700/80 dark:text-red-300/80">{detail}</p> : null}
    </div>
  );
}

export function Card({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    vigente: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    pendente_confirmacao: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    substituido: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    arquivado: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    ativo: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    pausado: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    encerrado: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    aberta: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    em_andamento: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    concluida: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    cancelada: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    salvo: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    pendente: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    falhou: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
