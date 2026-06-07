"use client";

import { formatCurrency } from "@/lib/finance";

export default function SubscriptionsPanel({
  subscriptions,
  currency = "MXN",
  onDelete,
  disabled,
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted">
          Pagos Recurrentes
        </h2>
        <div className="text-xs text-muted">
          {subscriptions?.length ?? 0} suscripciones
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-border/70">
              <th className="py-2 pr-3 font-medium">Nombre</th>
              <th className="py-2 pr-3 font-medium">Categoría</th>
              <th className="py-2 pr-3 font-medium">Día</th>
              <th className="py-2 pr-3 font-medium">Inicio</th>
              <th className="py-2 pr-3 font-medium">Fin</th>
              <th className="py-2 pr-3 font-medium text-right">Monto</th>
              <th className="py-2 pr-0 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody>
            {(subscriptions ?? []).map((s) => (
              <tr key={s.id} className="border-b border-border/40">
                <td className="py-3 pr-3 whitespace-nowrap text-text/90">
                  {s.name}
                </td>
                <td className="py-3 pr-3 text-text/90">{s.category ?? "—"}</td>
                <td className="py-3 pr-3 text-text/90">
                  {s.day_of_month ?? "—"}
                </td>
                <td className="py-3 pr-3 text-muted">{s.start_date ?? "—"}</td>
                <td className="py-3 pr-3 text-muted">{s.end_date ?? "—"}</td>
                <td className="py-3 pr-3 text-right font-semibold">
                  {formatCurrency(s.amount, currency)}
                </td>
                <td className="py-3 pr-0 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete?.(s)}
                    disabled={disabled}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-text hover:border-gold disabled:opacity-50"
                    title="Eliminar suscripción"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}

            {(!subscriptions || subscriptions.length === 0) && (
              <tr>
                <td className="py-6 text-muted" colSpan={7}>
                  No tienes pagos recurrentes. Activa “¿Es un pago
                  mensual/recurrente?” al crear una transacción para registrarlo
                  como suscripción.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-muted">
        Tip: al iniciar sesión, el sistema revisa si hay pagos del mes pendientes
        (sin duplicados) y los registra en tu historial automáticamente.
      </div>
    </section>
  );
}

