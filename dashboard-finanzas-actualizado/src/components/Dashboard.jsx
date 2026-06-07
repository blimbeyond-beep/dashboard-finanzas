"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import TransactionInput from "@/components/TransactionInput";
import MetricsPanel from "@/components/MetricsPanel";
import TransactionTable from "@/components/TransactionTable";
import SubscriptionsPanel from "@/components/SubscriptionsPanel";

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold tracking-wide text-muted">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Dashboard() {
  const supabase = useMemo(() => {
    try {
      return getSupabase();
    } catch (e) {
      return null;
    }
  }, []);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [authMode, setAuthMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [dataBusy, setDataBusy] = useState(false);
  const syncRef = useRef({ monthKey: null, ranForUserId: null });

  const user = session?.user ?? null;
  const currency = useMemo(() => profile?.currency ?? "MXN", [profile?.currency]);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      setLoading(true);
      if (!supabase) {
        setError(
          "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
        );
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    }

    boot();

    const { data: subscription } = supabase
      ? supabase.auth.onAuthStateChange((_event, newSession) => {
          setSession(newSession);
        })
      : { data: null };

    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, [supabase]);

  useEffect(() => {
    if (!user) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function toISODateLocal(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function monthKeyFor(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }

  async function syncMonthlyPayments(subscriptionsOverride) {
    if (!supabase || !user) return;

    const now = new Date();
    const mk = monthKeyFor(now);

    // Evita re-ejecutar en la misma sesión para el mismo usuario/mes.
    if (
      syncRef.current.monthKey === mk &&
      syncRef.current.ranForUserId === user.id
    ) {
      return;
    }
    syncRef.current.monthKey = mk;
    syncRef.current.ranForUserId = user.id;

    try {
      const subs =
        subscriptionsOverride ??
        (
          await supabase
            .from("subscriptions")
            .select("id, name, amount, category, start_date, end_date, day_of_month")
            .order("created_at", { ascending: true })
            .limit(500)
        ).data;

      if (!subs || subs.length === 0) return;

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const subIds = subs.map((s) => s.id);
      const { data: existingTx, error: existingErr } = await supabase
        .from("transactions")
        .select("subscription_id")
        .eq("month", mk)
        .in("subscription_id", subIds)
        .limit(500);

      if (existingErr) throw existingErr;

      const existingSet = new Set(
        (existingTx ?? []).map((t) => t.subscription_id).filter(Boolean)
      );

      const toCreate = [];
      for (const s of subs) {
        if (!s?.id) continue;
        if (existingSet.has(s.id)) continue;

        const startDate = s.start_date ? new Date(s.start_date) : null;
        const endDate = s.end_date ? new Date(s.end_date) : null;

        // Activo en el mes actual
        if (startDate && startDate > monthEnd) continue;
        if (endDate && endDate < monthStart) continue;

        const lastDay = monthEnd.getDate();
        const dueDay = Math.min(Number(s.day_of_month) || 1, lastDay);
        const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);

        // Si todavía no llega el día de cobro, no lo registramos (no está pendiente)
        if (dueDate > now) continue;
        // Si el start_date es después del dueDate de este mes, lo empezamos a cobrar el siguiente mes
        if (startDate && startDate > dueDate) continue;
        // Si ya terminó antes del dueDate
        if (endDate && endDate < dueDate) continue;

        toCreate.push({
          type: "expense",
          amount: Number(s.amount),
          category: s.category ?? "Pagos Mensuales",
          note: `Pago mensual: ${s.name}`,
          date: toISODateLocal(dueDate),
          subscription_id: s.id,
        });
      }

      if (toCreate.length === 0) return;

      const created = [];
      for (const tx of toCreate) {
        const { data, error: err } = await supabase
          .from("transactions")
          .insert(tx)
          .select("id, user_id, type, amount, category, note, date, created_at, subscription_id, month")
          .single();

        // Si ya existía (unique index), ignoramos para evitar duplicados.
        if (err) {
          if (err.code === "23505") continue;
          throw err;
        }
        created.push(data);
      }

      if (created.length > 0) {
        setTransactions((prev) => [...created, ...prev]);
      }
    } catch (e) {
      // No bloquea la app: mostramos error pero dejamos que el dashboard cargue.
      setError(e?.message ?? "Error al sincronizar pagos mensuales.");
    }
  }

  async function refreshAll() {
    setDataBusy(true);
    setError("");
    try {
      await Promise.all([loadProfile(), loadTransactions(), loadSubscriptions()]);
      // Sincroniza pagos mensuales (si aplica) al entrar.
      await syncMonthlyPayments();
    } catch (e) {
      setError(e?.message ?? "Error desconocido al cargar datos.");
    } finally {
      setDataBusy(false);
    }
  }

  async function loadProfile() {
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("profiles")
      .select("user_id, birthdate, initial_capital, currency, created_at, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (err) throw err;
    setProfile(data ?? null);
  }

  async function loadTransactions() {
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("transactions")
      .select(
        "id, user_id, type, amount, category, note, date, created_at, subscription_id, month"
      )
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(250);

    if (err) throw err;
    setTransactions(data ?? []);
  }

  async function loadSubscriptions() {
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("subscriptions")
      .select(
        "id, user_id, name, amount, category, start_date, end_date, day_of_month, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (err) throw err;
    setSubscriptions(data ?? []);
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setError("");
    setAuthBusy(true);
    try {
      if (!supabase) {
        throw new Error(
          "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
        );
      }
      const payload = { email: email.trim(), password };
      const res =
        authMode === "signup"
          ? await supabase.auth.signUp(payload)
          : await supabase.auth.signInWithPassword(payload);

      if (res.error) throw res.error;

      // En signup, si tu proyecto requiere confirmación por email,
      // el usuario deberá confirmar antes de poder iniciar sesión.
    } catch (e) {
      setError(e?.message ?? "Error de autenticación.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setError("");
    await supabase?.auth.signOut();
    setProfile(null);
    setTransactions([]);
  }

  async function handleCreateTransaction(tx) {
    setError("");
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("transactions")
      .insert(tx)
      .select()
      .single();

    if (err) {
      setError(err.message);
      return;
    }
    setTransactions((prev) => [data, ...prev]);
  }

  async function handleCreateSubscription(subscription) {
    setError("");
    if (!supabase) return;

    const { data, error: err } = await supabase
      .from("subscriptions")
      .insert(subscription)
      .select()
      .single();

    if (err) {
      setError(err.message);
      return;
    }

    setSubscriptions((prev) => [data, ...prev]);

    // Después de crear una suscripción, intenta registrar el pago del mes actual si ya está "vencido".
    await syncMonthlyPayments([data, ...subscriptions]);
  }

  async function handleDeleteTransaction(t) {
    if (!confirm("¿Eliminar esta transacción?")) return;
    setError("");
    if (!supabase) return;
    const { error: err } = await supabase
      .from("transactions")
      .delete()
      .eq("id", t.id);
    if (err) {
      setError(err.message);
      return;
    }
    setTransactions((prev) => prev.filter((x) => x.id !== t.id));
  }

  async function handleDeleteSubscription(s) {
    if (!confirm("¿Eliminar este pago recurrente?")) return;
    setError("");
    if (!supabase) return;

    const { error: err } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", s.id);

    if (err) {
      setError(err.message);
      return;
    }

    setSubscriptions((prev) => prev.filter((x) => x.id !== s.id));
  }

  async function handleSaveProfile(nextProfile) {
    setError("");
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          ...nextProfile,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (err) {
      setError(err.message);
      return;
    }
    setProfile(data);
  }

  return (
    <div className="min-h-full flex-1 bg-bg text-text">
      <header className="border-b border-border bg-black/30">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <div className="text-xs tracking-[0.35em] text-gold uppercase">
              Private
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Dashboard Financiero
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden text-xs text-muted md:block">
                  {user.email}
                </div>
                <button
                  onClick={handleSignOut}
                  className="h-10 rounded-xl border border-border bg-black/25 px-4 text-sm text-muted transition hover:border-gold hover:text-text"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <div className="text-xs text-muted">
                Inicia sesión para ver tu dashboard.
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        {error ? (
          <div className="mb-5 rounded-2xl border border-danger/40 bg-black/30 p-4 text-sm text-danger">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-muted">Cargando...</div>
        ) : !user ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Acceso">
              <form onSubmit={handleAuthSubmit} className="grid gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setAuthMode("signin")}
                    className={[
                      "rounded-full px-3 py-1.5 border transition",
                      authMode === "signin"
                        ? "border-gold text-gold bg-black/30"
                        : "border-border text-muted hover:text-text",
                    ].join(" ")}
                    disabled={authBusy}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("signup")}
                    className={[
                      "rounded-full px-3 py-1.5 border transition",
                      authMode === "signup"
                        ? "border-gold text-gold bg-black/30"
                        : "border-border text-muted hover:text-text",
                    ].join(" ")}
                    disabled={authBusy}
                  >
                    Crear cuenta
                  </button>
                </div>

                <label className="grid gap-1">
                  <span className="text-xs text-muted">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl border border-border bg-black/30 px-3 outline-none focus:border-gold"
                    required
                    disabled={authBusy}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-muted">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl border border-border bg-black/30 px-3 outline-none focus:border-gold"
                    required
                    disabled={authBusy}
                  />
                </label>

                <button
                  type="submit"
                  className="mt-1 h-11 rounded-xl bg-gold px-4 font-semibold text-black transition hover:bg-gold2 disabled:opacity-50"
                  disabled={authBusy}
                >
                  {authBusy
                    ? "Procesando..."
                    : authMode === "signup"
                    ? "Crear cuenta"
                    : "Entrar"}
                </button>

                <p className="text-xs text-muted">
                  Requiere configurar Supabase Auth (Email/Password) y las
                  variables de entorno del proyecto.
                </p>
              </form>
            </Card>

            <Card title="Checklist rápido (Supabase)">
              <ol className="list-decimal pl-5 text-sm text-muted space-y-2">
                <li>Crea un proyecto en Supabase.</li>
                <li>
                  Ejecuta el SQL del archivo <code>supabase_schema.sql</code>.
                </li>
                <li>Activa Auth → Email (Email/Password).</li>
                <li>
                  Configura <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
                  <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
                </li>
              </ol>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6">
            <MetricsPanel
              transactions={transactions}
              profile={profile}
              onSaveProfile={handleSaveProfile}
              disabled={dataBusy}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <TransactionInput
                onCreateTransaction={handleCreateTransaction}
                onCreateSubscription={handleCreateSubscription}
                disabled={dataBusy}
              />

              <Card title="Acciones">
                <div className="grid gap-2 text-sm text-muted">
                  <button
                    type="button"
                    className="h-11 rounded-xl border border-border bg-black/25 px-4 text-sm text-muted transition hover:border-gold hover:text-text disabled:opacity-50"
                    onClick={refreshAll}
                    disabled={dataBusy}
                  >
                    {dataBusy ? "Actualizando..." : "Refrescar datos"}
                  </button>

                  <div className="text-xs text-muted">
                    Nota: la proyección usa tu neto mensual promedio (por mes con
                    movimiento) y lo extrapola hasta los 18.
                  </div>
                </div>
              </Card>
            </div>

            <SubscriptionsPanel
              subscriptions={subscriptions}
              currency={currency}
              onDelete={handleDeleteSubscription}
              disabled={dataBusy}
            />

            <TransactionTable
              transactions={transactions}
              currency={currency}
              onDelete={handleDeleteTransaction}
              disabled={dataBusy}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-border/70 bg-black/30">
        <div className="mx-auto w-full max-w-6xl px-6 py-6 text-xs text-muted">
          Hecho con Next.js + Tailwind + Supabase. Tema: Dark Luxury.
        </div>
      </footer>
    </div>
  );
}
