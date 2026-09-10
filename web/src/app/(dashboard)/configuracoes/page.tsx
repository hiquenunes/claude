import { getJarvisServiceForSession } from "@/lib/jarvis-server";
import { describeError } from "@/lib/errors";
import { Card, ErrorBanner } from "@/components/states";
import { SetupButton } from "@/components/setup-button";

function envStatus(name: string): string {
  return process.env[name] ? "configurado" : "não configurado";
}

export default async function ConfiguracoesPage() {
  let structureLinks: { label: string; id: string }[] = [];
  let loadError: string | null = null;

  try {
    const { jarvis } = await getJarvisServiceForSession();
    const structure = jarvis.lastKnownStructure ?? (await jarvis.setup());
    structureLinks = [
      { label: "Pasta raiz (Jarvis)", id: structure.rootFolderId },
      { label: "Índice de clientes", id: structure.clientIndexSheetId },
      { label: "Pendências", id: structure.tasksSheetId },
      { label: "Operações", id: structure.operationsSheetId },
    ];
  } catch (err) {
    loadError = describeError(err).message;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Configurações</h1>

      <Card title="Estrutura no Drive">
        {loadError ? (
          <ErrorBanner message="Não foi possível confirmar a estrutura no Drive." detail={loadError} />
        ) : (
          <ul className="space-y-1 text-sm">
            {structureLinks.map((s) => (
              <li key={s.id}>
                <a
                  href={`https://drive.google.com/open?id=${s.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-700 hover:underline dark:text-neutral-300"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <SetupButton />
        </div>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Pasta raiz configurável via a variável de ambiente JARVIS_ROOT_FOLDER_NAME (padrão: &ldquo;Jarvis&rdquo;). Rodar de
          novo nunca duplica pastas ou planilhas.
        </p>
      </Card>

      <Card title="Variáveis de ambiente (status, não valores)">
        <ul className="space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
          <li>AUTH_GOOGLE_ID: {envStatus("AUTH_GOOGLE_ID")}</li>
          <li>AUTH_GOOGLE_SECRET: {envStatus("AUTH_GOOGLE_SECRET")}</li>
          <li>AUTH_SECRET: {envStatus("AUTH_SECRET")}</li>
          <li>ALLOWED_EMAIL: {envStatus("ALLOWED_EMAIL")}</li>
        </ul>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Veja docs/SETUP.md para como configurar cada uma.</p>
      </Card>
    </div>
  );
}
