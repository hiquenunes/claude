export default function Loading() {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-neutral-500 dark:text-neutral-400">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600 dark:border-neutral-700 dark:border-t-neutral-300"
        aria-hidden="true"
      />
      Carregando…
    </div>
  );
}
