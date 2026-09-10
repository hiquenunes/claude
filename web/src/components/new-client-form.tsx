"use client";

import { useActionState } from "react";
import { createClientAction, type ActionResult } from "@/app/actions/jarvis-actions";
import { ErrorBanner } from "@/components/states";

const initialState: ActionResult = { ok: true };

export function NewClientForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => createClientAction(formData),
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Nome do cliente
        </label>
        <input
          id="name"
          name="name"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
      </div>
      <div>
        <label htmlFor="aliases" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Apelidos (separados por vírgula, opcional)
        </label>
        <input
          id="aliases"
          name="aliases"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
      </div>
      <div>
        <label htmlFor="current_objective" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Objetivo atual (opcional)
        </label>
        <input
          id="current_objective"
          name="current_objective"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
      </div>
      {!state.ok && state.error ? <ErrorBanner message="Não foi possível criar o cliente." detail={state.error.message} /> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {pending ? "Criando…" : "Criar cliente"}
      </button>
    </form>
  );
}
