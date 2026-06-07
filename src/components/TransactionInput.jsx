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

export default function TransactionInput({ onCreate, disabled }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Comida");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isDisabled = disabled || submitting;

  const amountNumber = useMemo(() => Number(amount), [amount]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!onCreate) return;

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      alert("Ingresa un monto válido (> 0).");
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        type,
        amount: amountNumber,
        category,
        date,
        note: note.trim() || null,
      });

      setAmount("");
      setNote("");
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
        <div className="flex items-center gap-2 text-xs">
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
            <span className="text-xs text-muted">Fecha</span>
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
            <span className="text-xs text-muted">Nota (opcional)</span>
            <input
              placeholder="Ej. Uber, supermercado..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-11 rounded-xl border border-border bg-black/30 px-3 outline-none focus:border-gold"
              disabled={isDisabled}
            />
          </label>
        </div>

        <button
          type="submit"
          className="mt-1 h-11 rounded-xl bg-gold px-4 font-semibold text-black transition hover:bg-gold2 disabled:opacity-50"
          disabled={isDisabled}
        >
          {submitting ? "Guardando..." : "Guardar transacción"}
        </button>
      </form>
    </section>
  );
}

