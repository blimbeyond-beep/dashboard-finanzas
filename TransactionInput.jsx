"use client";

import { useMemo, useState } from "react";

const DEFAULT_CATEGORIES = [
  "Sueldo",
  "Negocio",
  "Inversión",
  "Renta",
  "Comida",
  "Transporte",
  "Salud",
  "Entretenimiento",
  "Educación",
  "Otros",
];

export default function TransactionInput({
  onCreateTransaction,
  onCreateSubscription,
  disabled,
}) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Comida");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isDisabled = disabled || submitting;

  const amountNumber = useMemo(() => Number(amount), [amount]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (isRecurring && !onCreateSubscription) return;
    if (!isRecurring && !onCreateTransaction) return;

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      alert("Ingresa un monto válido (> 0).");
      return;
    }

    setSubmitting(true);
    try {
      if (isRecurring) {
        // Guardar en tabla subscriptions
        const name = note.trim();
        if (!name) {
          alert("Para un pago mensual, la Nota se usa como 'Nombre'. Es obligatoria.");
          return;
        }
        const dom = Number(dayOfMonth);
        if (!Number.isInteger(dom) || dom < 1 || dom > 31) {
          alert("Día del mes inválido (1-31).");
          return;
        }

        await onCreateSubscription({
          name,
          amount: amountNumber,
          category,
          start_date: date,
          end_date: endDate || null,
          day_of_month: dom,
        });

        setAmount("");
        setNote("");
        setEndDate("");
        setDayOfMonth("1");
      } else {
        // Guardar en tabla transactions
        await onCreateTransaction({
          type,
          amount: amountNumber,
          category,
          date,
          note: note.trim() || null,
        });

        setAmount("");
        setNote("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted">
          Nueva transacción
        </h2>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-2 select-none text-muted">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => {
                const next = e.target.checked;
                setIsRecurring(next);
                // Pagos mensuales: normalmente son gastos.
                if (next) setType("expense");
              }}
              disabled={isDisabled}
              className="accent-[var(--gold)]"
            />
            ¿Es un pago mensual/recurrente?
          </label>

          {!isRecurring ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={[
                  "rounded-full px-3 py-1.5 border transition",
                  type === "expense"
                    ? "border-gold text-gold bg-black/30"
                    : "border-border text-muted hover:text-text",
                ].join(" ")}
                disabled={isDisabled}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={[
                  "rounded-full px-3 py-1.5 border transition",
                  type === "income"
                    ? "border-gold text-gold bg-black/30"
                    : "border-border text-muted hover:text-text",
                ].join(" ")}
                disabled={isDisabled}
              >
                Ingreso
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-muted">Monto</span>
            <input
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 rounded-xl border border-border bg-black/30 px-3 outline-none focus:border-gold"
              disabled={isDisabled}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-muted">
              {isRecurring ? "Fecha inicio" : "Fecha"}
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 rounded-xl border border-border bg-black/30 px-3 outline-none focus:border-gold"
              disabled={isDisabled}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-muted">Categoría</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 rounded-xl border border-border bg-black/30 px-3 outline-none focus:border-gold"
              disabled={isDisabled}
            >
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-muted">
              {isRecurring ? "Nombre del pago (obligatorio)" : "Nota (opcional)"}
            </span>
            <input
              placeholder={
                isRecurring ? "Ej. Netflix, Renta, Agua..." : "Ej. Uber, supermercado..."
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-11 rounded-xl border border-border bg-black/30 px-3 outline-none focus:border-gold"
              disabled={isDisabled}
            />
          </label>
        </div>

        {isRecurring ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-muted">Día del mes</span>
              <input
                inputMode="numeric"
                value={String(dayOfMonth)}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="h-11 rounded-xl border border-border bg-black/30 px-3 outline-none focus:border-gold"
                disabled={isDisabled}
                placeholder="1-31"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-muted">Fecha fin (opcional)</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 rounded-xl border border-border bg-black/30 px-3 outline-none focus:border-gold"
                disabled={isDisabled}
              />
            </label>
          </div>
        ) : null}

        <button
          type="submit"
          className="mt-1 h-11 rounded-xl bg-gold px-4 font-semibold text-black transition hover:bg-gold2 disabled:opacity-50"
          disabled={isDisabled}
        >
          {submitting
            ? "Guardando..."
            : isRecurring
            ? "Guardar pago mensual"
            : "Guardar transacción"}
        </button>
      </form>
    </section>
  );
}
