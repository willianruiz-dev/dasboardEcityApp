/** Tipos de celda soportados por la grilla genérica. */
export type CellType = 'text' | 'number' | 'money' | 'percent' | 'date' | 'datetime' | 'badge' | 'id' | 'mono';

export interface TableColumn<T> {
  key: keyof T & string;
  label: string;
  align?: 'left' | 'right' | 'center';
  type?: CellType;
  sortable?: boolean;
  /** Ancho fijo (Tailwind arbitrary value), p. ej. `w-[120px]`. */
  width?: string;
  /** Oculta la columna desde el breakpoint indicado. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  truncate?: boolean;
  /** Para `badge`: mapea el valor crudo a un tono. */
  toneFor?: (value: unknown, row: T) => 'neutral' | 'positive' | 'negative' | 'warning' | 'info' | 'brand';
}

export interface TableConfig {
  pageSize?: number;
  pageSizeOptions?: number[];
  searchKeys?: string[];
  idKey?: string;
}
