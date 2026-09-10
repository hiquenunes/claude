import Link from "next/link";
import { signOut } from "@/auth";

const links = [
  { href: "/", label: "Visão geral" },
  { href: "/clientes", label: "Clientes" },
  { href: "/integracoes", label: "Integrações" },
  { href: "/configuracoes", label: "Configurações" },
];

export function Nav({ userEmail }: { userEmail?: string | null }) {
  return (
    <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-1 sm:gap-4">
          <span className="pr-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">Jarvis</span>
          <nav className="flex flex-wrap gap-1 sm:gap-2" aria-label="Navegação principal">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2.5 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {userEmail ? (
            <span className="hidden text-xs text-neutral-500 sm:inline dark:text-neutral-400">{userEmail}</span>
          ) : null}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-md px-2.5 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
