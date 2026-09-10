"use client";

import { ErrorBanner } from "@/components/states";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-4">
      <ErrorBanner message="Não foi possível carregar esta página." detail={error.message} />
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        Tentar novamente
      </button>
    </div>
  );
}
