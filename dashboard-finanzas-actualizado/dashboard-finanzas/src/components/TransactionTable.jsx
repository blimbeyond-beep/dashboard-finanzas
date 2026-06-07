"use client";

import { formatCurrency } from "@/lib/finance";

function Pill({ children, variant = "neutral" }) {
  const cls =
    variant === "income"
      ? "border-success text-success bg-black/25"
      : variant === "expense"
      ? "border-danger text-danger bg-black/25"
      : "border-border text-muted bg-black/25";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${cls}`}>
      {children}
    </span>
  );
}

export default function TransactionTable({
  transactions,
  currency = "MXN",
  onDelete,
  disabled,
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted">
          Historial
        </h2>
        <div className="text-xs text-muted">
          {transactions?.length ?? 0} transacciones
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-border/70">
              <th className="py-2 pr-3 font-medium">Fecha</th>
              <th className="py-2 pr-3 font-medium">Tipo</th>
              <th className="py-2 pr-3 font-medium">Categoría</th>
              <th className="py-2 pr-3 font-medium">Nota</th>
              <th className="py-2 pr-3 font-medium text-right">Monto</th>
              <th className="py-2 pr-3 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody>
            {(transactions ?? []).map((t) => (
              <tr key={t.id} className="border-b border-border/40">
                <td className="py-3 pr-3 whitespace-nowrap text-text/90">
                  {t.date}
                </td>
                <td className="py-3 pr-3">
                  <Pill variant={t.type}>
                    {t.type === "income" ? "Ingreso" : "Gasto"}
                  </Pill>
                </td>
                <td className="py-3 pr-3 text-text/90">{t.category ?? "—"}</td>
                <td className="py-3 pr-3 text-muted">{t.note ?? "—"}</td>
                <td className="py-3 pr-3 text-right font-semibold">
                  {formatCurrency(t.amount, currency)}
                </td>
                <td className="py-3 pr-0 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete?.(t)}
                    disabled={disabled}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-text hover:border-gold disabled:opacity-50"
                    title="Eliminar"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}

            {(!transactions || transactions.length === 0) && (
              <tr>
                <td className="py-6 text-muted" colSpan={6}>
                  Aún no tienes transacciones. Agrega la primera para empezar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

