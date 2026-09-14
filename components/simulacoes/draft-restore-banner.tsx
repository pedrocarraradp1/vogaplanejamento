"use client"

export function DraftRestoreBanner({
  savedAt,
  onRestore,
  onDiscard,
}: {
  savedAt: Date | null
  onRestore: () => void
  onDiscard: () => void
}) {
  const quando = savedAt
    ? savedAt.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "agora pouco"

  return (
    <div
      className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-md text-sm px-3 py-2 flex flex-wrap items-center gap-3 text-foreground"
    >
      <span className="min-w-0">
        Encontramos um rascunho não salvo de {quando}.
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          className="font-medium text-[var(--accent)] underline underline-offset-2"
          onClick={onRestore}
        >
          Restaurar
        </button>
        <button
          type="button"
          className="text-muted-foreground underline underline-offset-2"
          onClick={onDiscard}
        >
          Descartar
        </button>
      </div>
    </div>
  )
}
