/** Motor de tablas: orden, filtro y paginación deterministas y testeables. */

export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string = string> {
  key: K;
  direction: SortDirection;
}

export interface Pagination {
  page: number;
  size: number;
}

export interface TableResult<T> {
  rows: T[];
  totalRows: number;
  totalPages: number;
  page: number;
  from: number;
  to: number;
}

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

export function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return collator.compare(String(a), String(b));
}

export function sortRows<T extends object>(rows: readonly T[], sort: SortState<string> | null): T[] {
  if (!sort) return [...rows];
  const factor = sort.direction === 'asc' ? 1 : -1;
  const pick = (row: T): unknown => (row as Record<string, unknown>)[sort.key];
  return [...rows].sort((a, b) => compareValues(pick(a), pick(b)) * factor || compareValues(idOf(a), idOf(b)));
}

function idOf(row: object): unknown {
  return (row as Record<string, unknown>)['id'];
}

/** Búsqueda "todo el texto" sobre las columnas indicadas, insensible a acentos y mayúsculas. */
export function searchRows<T extends object>(rows: readonly T[], term: string, keys: readonly string[]): T[] {
  const needle = normalizeText(term.trim());
  if (needle.length === 0) return [...rows];
  return rows.filter((row) => {
    const record = row as Record<string, unknown>;
    return keys.some((key) => normalizeText(stringify(record[key])).includes(needle));
  });
}

export function paginate<T>(rows: readonly T[], pagination: Pagination): TableResult<T> {
  const size = Math.max(1, pagination.size);
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(Math.max(1, pagination.page), totalPages);
  const start = (page - 1) * size;
  return {
    rows: rows.slice(start, start + size),
    totalRows: rows.length,
    totalPages,
    page,
    from: rows.length === 0 ? 0 : start + 1,
    to: Math.min(start + size, rows.length)
  };
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function stringify(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return String(value);
  return String(value);
}

/** Ventanas de paginación tipo "1 … 4 5 6 … 20". */
export function pageWindow(current: number, total: number, size = 5): Array<number | '…'> {
  if (total <= size + 2) return Array.from({ length: total }, (_, i) => i + 1);
  const half = Math.floor(size / 2);
  const start = Math.max(2, current - half);
  const end = Math.min(total - 1, current + half);
  const out: Array<number | '…'> = [1];
  if (start > 2) out.push('…');
  for (let i = start; i <= end; i += 1) out.push(i);
  if (end < total - 1) out.push('…');
  out.push(total);
  return out;
}
