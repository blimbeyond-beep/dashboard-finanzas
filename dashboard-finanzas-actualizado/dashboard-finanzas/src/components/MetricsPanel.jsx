"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatCurrency,
  projectCapitalTo18,
  summarizeTransactions,
} from "@/lib/finance";

const CURRENCIES = [
  { code: "MXN", label: "MXN" },
  { code: "USD", label: "USD" },
  { code: "EUR", label: "EUR" },
];

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-border bg-black/25 p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export default function MetricsPanel({
  transactions,
  profile,
  onSaveProfile,
  disabled,
}) {
  const [birthdate, setBirthdate] = useState(profile?.birthdate ?? "");
  const [initialCapital, setInitialCapital] = useState(
    profile?.initial_capital ?? 0
  );
  const [currency, setCurrency] = useState(profile?.currency ?? "MXN");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Mantener inputs editables sincronizados cuando llega el perfil desde Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBirthdate(profile?.birthdate ?? "");
    setInitialCapital(profile?.initial_capital ?? 0);
    setCurrency(profile?.currency ?? "MXN");
  }, [profile?.birthdate, profile?.initial_capital, profile?.currency]);

  const summary = useMemo(
    () => summarizeTransactions(transactions),
    [transactions]
  );

  const projection = useMemo(
    () =>
      projectCapitalTo18({
        birthdate,
        initialCapital,
        transactions,
      }),
    [birthdate, initialCapital, transactions]
  );

  async function handleSave() {
    if (!onSaveProfile) return;
    setSaving(true);
    try {
      await onSaveProfile({
        birthdate: birthdate || null,
        initial_capital: Number(initialCapital) || 0,
        currency,
      });
    } finally {
      setSaving(false);
    }
  }

  const currentCapital =
    projection.currentCapital == null ? null : projection.currentCapital;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted">
          Métricas
        </h2>
        <div className="text-xs text-muted">
          Última actualización: {new Date().toLocaleString("es-MX")}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Stat
          label="Ingresos"
          value={formatCurrency(summary.income, currency)}
        />
        <Stat
          label="Gastos"
          value={formatCurrency(summary.expense, currency)}
        />
        <Stat
          label="Neto"
          value={formatCurrency(summary.net, currency)}
          hint="Ingresos - Gastos"
        />
        <Stat
          label="Capital actual"
          value={
            currentCapital == null
              ? "Configura tu perfil"
              : formatCurrency(currentCapital, currency)
          }
          hint="Capital inicial + neto"
        />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Stat
          label="Contador de Libertad (días para los 18)"
          value={
            projection.daysLeft == null
              ? "—"
              : `${projection.daysLeft.toLocaleString("es-MX")} días`
          }
          hint={
            projection.daysLeft === 0
              ? "Si ya tienes 18+, esto se mantiene en 0."
              : "Calculado desde tu fecha de nacimiento."
          }
        />
        <Stat
          label="Proyección de capital a los 18"
          value={
            projection.projectedCapital == null
              ? "—"
              : formatCurrency(projection.projectedCapital, currency)
          }
          hint={
            projection.avgMonthlyNet == null
              ? "Basado en tu neto mensual promedio."
              : `Neto mensual promedio: ${formatCurrency(
                  projection.avgMonthlyNet,
                  currency
                )}`
          }
        />
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-black/25 p-4">
        <div className="text-xs font-semibold tracking-wide text-muted">
          Perfil (para el contador y la proyección)
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-xs text-muted">Fecha de nacimiento</span>
            <input
              type="date"
              value={birthdate || ""}
              onChange={(e) => setBirthdate(e.target.value)}
              className="h-11 rounded-xl border border-border bg-black/30 px-3 outline-none focus:border-gold"
              disabled={disabled || saving}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-muted">Capital inicial</span>
            <input
              inputMode="decimal"
              value={String(initialCapital ?? 0)}
              onChange={(e) => setInitialCapital(e.target.value)}
              className="h-11 rounded-xl border border-border bg-black/30 px-3 outline-none focus:border-gold"
              disabled={disabled || saving}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-muted">Moneda</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-11 rounded-xl border border-border bg-black/30 px-3 outline-none focus:border-gold"
              disabled={disabled || saving}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="mt-3 h-11 rounded-xl border border-gold bg-black/30 px-4 font-semibold text-gold transition hover:bg-black/45 disabled:opacity-50"
          disabled={disabled || saving}
        >
          {saving ? "Guardando..." : "Guardar perfil"}
        </button>
      </div>
    </section>
  );
}
