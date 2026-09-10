import { auth, signIn } from "@/auth";
import { Card, StatusPill } from "@/components/states";

export default async function IntegracoesPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Integrações</h1>

      <Card title="Google Drive / Sheets / Docs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-800 dark:text-neutral-100">{session?.user?.email}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Usado para toda a memória (clientes, fatos, tarefas, entregas). Este painel só lê/grava na pasta &ldquo;Jarvis&rdquo; que ele mesmo cria.
            </p>
          </div>
          <StatusPill status={session?.accessToken || session?.refreshToken ? "vigente" : "falhou"} />
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/integracoes" });
          }}
          className="mt-3"
        >
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Reconectar / renovar permissões
          </button>
        </form>
      </Card>

      <Card title="Granola (reuniões)">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Não conectado a este painel. O Claude acessa o Granola diretamente na conversa (conector já autorizado na sua conta
          Claude) e usa as ferramentas do Jarvis para salvar o resumo, decisões e tarefas de cada reunião.
        </p>
      </Card>

      <Card title="Reportei (relatórios de campanha)">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Não conectado a este painel, pelo mesmo motivo: o Claude consulta o Reportei diretamente na conversa e grava o
          resultado (fontes, métricas calculadas, mensagem para WhatsApp) através das ferramentas do Jarvis.
        </p>
      </Card>

      <Card title="Assistente de IA (chat)">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          A conversa acontece no Claude (claude.ai ou Claude Code), não neste painel — sem custo incremental de API. Este
          painel serve para navegar, corrigir e conferir o que foi salvo.
        </p>
      </Card>
    </div>
  );
}
