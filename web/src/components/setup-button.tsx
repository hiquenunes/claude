"use client";

import { useActionState } from "react";
import { runSetupAction, type ActionResult } from "@/app/actions/jarvis-actions";
import { ErrorBanner } from "@/components/states";

const initialState: ActionResult = { ok: true };

export function SetupButton() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async () => runSetupAction(), initialState);

  return (
    <form action={formAction} className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        {pending ? "Confirmando…" : "Confirmar estrutura no Drive"}
      </button>
      {!state.ok && state.error ? <ErrorBanner message="Falha ao confirmar a estrutura." detail={state.error.message} /> : null}
    </form>
  );
}
