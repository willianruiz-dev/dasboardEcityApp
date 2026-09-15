import type { QuerySummary, Bucket, MachineMetric, TrendPoint } from '../models/dashboard.model';
import type { Transaction } from '../models/transactions.model';
import { dayKey, shortDayLabel } from './date-range.logic';

export interface MachineLookup {
  label: string;
  office: string | null;
}

/** Estados que NO suman dinero: se cuentan pero no inflan la caja. */
const NON_SETTLED = ['anulada', 'rechazada', 'fallida', 'cancelled', 'rejected', 'failed'];

export const isSettled = (t: Transaction): boolean => {
  const state = (t.stateTransaction ?? '').toLowerCase();
  return state.length === 0 || !NON_SETTLED.some((s) => state.includes(s));
};

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}h`);

function bucketize(values: Array<[string, number, number]>): Bucket[] {
  const acc = new Map<string, { total: number; count: number }>();
  values.forEach(([label, total, count]) => {
    if (!label) return;
    const prev = acc.get(label) ?? { total: 0, count: 0 };
    acc.set(label, { total: prev.total + total, count: prev.count + count });
  });
  return [...acc.entries()]
    .map(([label, v]) => ({ label, total: round2(v.total), count: v.count }))
    .sort((a, b) => b.total - a.total);
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Agrega en memoria la respuesta de `Transaction/GetByDate`.
 * Se hace aquí —y no en la API— porque el backend no expone endpoints de agregación
 * y crearlos implicaría tocar producción, algo que este dashboard no puede hacer.
 */
export function summarize(transactions: Transaction[], machines: ReadonlyMap<number, MachineLookup> = new Map()): QuerySummary {
  const settled = transactions.filter(isSettled);

  const totalBilled = settled.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
  const totalNet = settled.reduce((acc, t) => acc + (t.incomeAmount || t.realAmount || 0), 0);
  const totalReturned = transactions.reduce((acc, t) => acc + (t.returnAmount || 0), 0);

  const byState = bucketize(transactions.map((t) => [t.stateTransaction ?? 'Sin estado', isSettled(t) ? t.totalAmount || 0 : 0, 1]));
  const byPaymentType = bucketize(settled.map((t) => [t.typePayment ?? 'Sin medio', t.totalAmount || 0, 1]));
  const byProduct = bucketize(settled.map((t) => [t.product ?? 'Otros', t.totalAmount || 0, 1]));

  const hourBuckets: Array<[string, number, number]> = [];
  transactions.forEach((t) => {
    const date = t.dateCreated ? new Date(t.dateCreated) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    hourBuckets.push([HOUR_LABELS[date.getUTCHours()] as string, isSettled(t) ? t.totalAmount || 0 : 0, 1]);
  });
  const byHourRaw = bucketize(hourBuckets);
  const byHour = HOUR_LABELS.map((label) => byHourRaw.find((b) => b.label === label) ?? { label, total: 0, count: 0 });

  // Tendencia diaria
  const dayMap = new Map<string, { amount: number; count: number; byState: Record<string, number> }>();
  transactions.forEach((t) => {
    const date = t.dateCreated ? new Date(t.dateCreated) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    const key = dayKey(date);
    const current = dayMap.get(key) ?? { amount: 0, count: 0, byState: {} };
    if (isSettled(t)) current.amount += t.totalAmount || 0;
    current.count += 1;
    const state = t.stateTransaction ?? 'Sin estado';
    current.byState[state] = (current.byState[state] ?? 0) + 1;
    dayMap.set(key, current);
  });
  const trend: TrendPoint[] = [...dayMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([iso, v]) => ({ iso, label: shortDayLabel(new Date(`${iso}T00:00:00Z`)), amount: round2(v.amount), count: v.count, byState: v.byState }));

  // Ranking por máquina
  const perMachine = new Map<number, { count: number; billed: number; net: number; cancelled: number; last: string | null }>();
  transactions.forEach((t) => {
    const entry = perMachine.get(t.idPayPad) ?? { count: 0, billed: 0, net: 0, cancelled: 0, last: null };
    entry.count += 1;
    if (isSettled(t)) {
      entry.billed += t.totalAmount || 0;
      entry.net += t.incomeAmount || t.realAmount || 0;
    } else entry.cancelled += 1;
    if (t.dateCreated && (!entry.last || t.dateCreated > entry.last)) entry.last = t.dateCreated;
    perMachine.set(t.idPayPad, entry);
  });

  const machinesArr: MachineMetric[] = [...perMachine.entries()]
    .map(([id, v]) => {
      const lookup = machines.get(id);
      return {
        id,
        label: lookup?.label ?? `Pay+ #${id}`,
        office: lookup?.office ?? null,
        transactions: v.count,
        billed: round2(v.billed),
        netIncome: round2(v.net),
        cancelled: v.cancelled,
        successRate: v.count === 0 ? 0 : round2(((v.count - v.cancelled) / v.count) * 100),
        lastActivity: v.last,
        share: totalBilled === 0 ? 0 : round2((v.billed / totalBilled) * 100)
      };
    })
    .sort((a, b) => b.billed - a.billed);

  const dates = transactions.map((t) => t.dateCreated).filter((d): d is string => Boolean(d)).sort();

  return {
    transactions,
    totalBilled: round2(totalBilled),
    totalNet: round2(totalNet),
    totalReturned: round2(totalReturned),
    average: settled.length === 0 ? 0 : round2(totalBilled / settled.length),
    byState,
    byPaymentType,
    byProduct,
    byHour,
    trend,
    machines: machinesArr,
    peakHour: byHour.reduce<Bucket | null>((best, b) => (b.total > 0 && (!best || b.total > best.total) ? b : best), null),
    bestMachine: machinesArr[0] ?? null,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null
  };
}

/** Variación % entre dos periodos; `null` si la base es 0 (evita dividir por cero). */
export function deltaPercent(current: number, previous: number): number | undefined {
  if (!previous) return undefined;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}
