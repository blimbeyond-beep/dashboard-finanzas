export function clampNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function formatCurrency(amount, currency = "MXN") {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function daysUntil18(birthdate) {
  if (!birthdate) return null;

  const birth = new Date(birthdate);
  if (Number.isNaN(birth.getTime())) return null;

  const target = new Date(birth);
  target.setFullYear(target.getFullYear() + 18);

  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function summarizeTransactions(transactions = []) {
  let income = 0;
  let expense = 0;

  for (const t of transactions) {
    const amount = clampNumber(t.amount, 0);
    if (t.type === "income") income += amount;
    else if (t.type === "expense") expense += amount;
  }

  return {
    income,
    expense,
    net: income - expense,
  };
}

function monthKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function averageMonthlyNet(transactions = []) {
  // Agrupa por mes y promedia el neto mensual.
  const byMonth = new Map();

  for (const t of transactions) {
    const key = monthKey(t.date ?? t.created_at);
    if (!key) continue;
    const amount = clampNumber(t.amount, 0);
    const signed = t.type === "expense" ? -amount : amount;
    byMonth.set(key, (byMonth.get(key) ?? 0) + signed);
  }

  const months = Array.from(byMonth.values());
  if (months.length === 0) return 0;
  const sum = months.reduce((a, b) => a + b, 0);
  return sum / months.length;
}

export function averageMonthlyNetLastMonths(transactions = [], monthsBack = 3) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - monthsBack);

  const filtered = (transactions ?? []).filter((t) => {
    const d = new Date(t.date ?? t.created_at);
    if (Number.isNaN(d.getTime())) return false;
    return d >= cutoff;
  });

  return averageMonthlyNet(filtered);
}

export function projectCapitalTo18({
  birthdate,
  initialCapital = 0,
  transactions = [],
}) {
  const daysLeft = daysUntil18(birthdate);
  if (daysLeft === null) {
    return {
      daysLeft: null,
      monthsLeft: null,
      currentCapital: null,
      avgMonthlyNet: null,
      projectedCapital: null,
    };
  }

  const { net } = summarizeTransactions(transactions);
  const currentCapital = clampNumber(initialCapital, 0) + net;

  // Proyección: usa el neto mensual promedio de los últimos 3 meses (no todo el historial).
  const avgMonthlyNet = averageMonthlyNetLastMonths(transactions, 3);
  const monthsLeft = daysLeft / 30.437; // promedio de días por mes
  const projectedCapital = currentCapital + avgMonthlyNet * monthsLeft;

  return {
    daysLeft,
    monthsLeft,
    currentCapital,
    avgMonthlyNet,
    projectedCapital,
  };
}
