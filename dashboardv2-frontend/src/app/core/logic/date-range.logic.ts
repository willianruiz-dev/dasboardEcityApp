export interface DateRange {
  from: Date;
  to: Date;
}

export type RangePresetKey = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'prevMonth' | '90d' | 'custom';

export interface RangePreset {
  key: RangePresetKey;
  label: string;
  resolve: (now: Date) => DateRange;
}

const startOfDay = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
const endOfDay = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
const addDays = (d: Date, days: number): Date => new Date(d.getTime() + days * 86_400_000);

/** Presets de rango. Todos en UTC: `GetByDate` compara contra `DateCreated` en UTC. */
export const RANGE_PRESETS: readonly RangePreset[] = [
  { key: 'today', label: 'Hoy', resolve: (n) => ({ from: startOfDay(n), to: endOfDay(n) }) },
  { key: 'yesterday', label: 'Ayer', resolve: (n) => ({ from: startOfDay(addDays(n, -1)), to: endOfDay(addDays(n, -1)) }) },
  { key: '7d', label: 'Últimos 7 días', resolve: (n) => ({ from: startOfDay(addDays(n, -6)), to: endOfDay(n) }) },
  { key: '30d', label: 'Últimos 30 días', resolve: (n) => ({ from: startOfDay(addDays(n, -29)), to: endOfDay(n) }) },
  { key: '90d', label: 'Últimos 90 días', resolve: (n) => ({ from: startOfDay(addDays(n, -89)), to: endOfDay(n) }) },
  {
    key: 'month',
    label: 'Mes en curso',
    resolve: (n) => ({ from: startOfDay(new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1))), to: endOfDay(n) })
  },
  {
    key: 'prevMonth',
    label: 'Mes anterior',
    resolve: (n) => ({
      from: startOfDay(new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - 1, 1))),
      to: endOfDay(new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 0)))
    })
  },
  { key: 'custom', label: 'Personalizado', resolve: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) }
];

export function presetRange(key: RangePresetKey, now: Date = new Date()): DateRange {
  return (RANGE_PRESETS.find((p) => p.key === key) ?? RANGE_PRESETS[3]).resolve(now);
}

/** `yyyy-MM-ddTHH:mm:ss.fffZ` — formato EXACTO que exige `DateTime.ParseExact`. */
export function toApiDate(date: Date): string {
  const pad = (n: number, size = 2): string => String(Math.floor(Math.abs(n))).padStart(size, '0');
  return (
    `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}Z`
  );
}

export function toInputDate(date: Date): string {
  return `${date.getUTCFullYear().toString().padStart(4, '0')}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date
    .getUTCDate()
    .toString()
    .padStart(2, '0')}`;
}

export function fromInputDate(value: string, endOfDayValue = false): Date {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return endOfDayValue ? new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)) : new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

/** Días cubiertos por el rango (para anualizar promedios y calcular variaciones). */
/** Días incluidos en el rango (extremos inclusives: `floor` porque `to` es 23:59:59.999). */
export function rangeInDays(range: DateRange): number {
  return Math.max(1, Math.floor((range.to.getTime() - range.from.getTime()) / 86_400_000) + 1);
}

/** Rango inmediatamente anterior, misma longitud. */
export function previousRange(range: DateRange): DateRange {
  const span = range.to.getTime() - range.from.getTime() + 1;
  return { from: new Date(range.from.getTime() - span), to: new Date(range.from.getTime() - 1) };
}

export function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`;
}

export function shortDayLabel(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(date);
}
