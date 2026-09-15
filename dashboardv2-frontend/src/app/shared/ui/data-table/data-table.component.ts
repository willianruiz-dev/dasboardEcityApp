import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { paginate, searchRows, sortRows, type SortState } from '../../../core/logic/table.logic';
import { formatMoney } from '../../../core/logic/format.logic';
import { BadgeComponent } from '../badge/badge.component';
import { TableFooterComponent } from './table-footer.component';
import { IconComponent } from '../icon/icon.component';
import { UiDatePipe } from '../../pipes/datetime.pipe';
import type { TableColumn } from './table.model';

/**
 * Grilla de consulta reutilizable: búsqueda, orden, paginación, selección y fila vacía.
 * Trabaja con cualquier `T` y NO conoce el dominio: las columnas se declaran en la feature.
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [IconComponent, BadgeComponent, UiDatePipe, TableFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-table.component.html'
})
export class DataTableComponent<T extends object> {
  readonly rows = input<readonly T[]>([]);
  readonly columns = input<readonly TableColumn<T>[]>([]);
  readonly loading = input(false);
  readonly selectable = input(false);
  readonly clickable = input(false);
  readonly pageSize = input(25);
  readonly searchKeys = input<readonly string[]>([]);
  readonly idKey = input('id');
  readonly emptyTitle = input('Sin resultados');
  readonly emptyHint = input<string | null>(null);
  readonly stickyFirst = input(false);

  readonly rowClick = output<T>();
  readonly selectionChange = output<readonly T[]>();

  protected readonly query = signal('');
  protected readonly sort = signal<SortState<string> | null>(null);
  protected readonly page = signal(1);
  protected readonly size = signal(this.pageSize());
  protected readonly selected = signal<ReadonlySet<string | number>>(new Set());

  protected readonly searched = computed(() => {
    const filtered = searchRows(this.rows(), this.query(), [...this.searchKeys()]);
    return sortRows(filtered, this.sort());
  });

  protected readonly view = computed(() => paginate(this.searched(), { page: this.page(), size: this.size() }));
  protected readonly selectedRows = computed(() => {
    const ids = this.selected();
    return this.rows().filter((row) => ids.has(this.rowId(row)));
  });
  protected readonly allOnPageSelected = computed(() => {
    const rows = this.view().rows;
    return rows.length > 0 && rows.every((row) => this.selected().has(this.rowId(row)));
  });

  protected trackBy(index: number, row: T): string | number {
    return this.rowId(row);
  }

  protected rowId(row: T): string | number {
    const value = (row as Record<string, unknown>)[this.idKey()];
    return typeof value === 'number' || typeof value === 'string' ? value : JSON.stringify(value);
  }

  protected cell(row: T, column: TableColumn<T>): string {
    const value = (row as Record<string, unknown>)[column.key];
    if (value == null || value === '') return '—';
    switch (column.type) {
      case 'money':
        return formatMoney(Number(value));
      case 'number':
        return new Intl.NumberFormat('es-CO').format(Number(value));
      case 'percent':
        return `${Number(value).toFixed(1)}%`;
      case 'id':
        return `#${value}`;
      case 'badge':
        return String(value);
      default:
        return String(value);
    }
  }

  protected badgeTone(row: T, column: TableColumn<T>): 'neutral' | 'positive' | 'negative' | 'warning' | 'info' | 'brand' {
    return column.toneFor?.((row as Record<string, unknown>)[column.key], row) ?? 'neutral';
  }

  protected cellClass(column: TableColumn<T>): string {
    return [
      column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left',
      column.hideBelow ? `hidden ${breakpointHidden(column.hideBelow)}` : '',
      column.truncate ? 'max-w-[240px] truncate' : ''
    ].join(' ');
  }

  protected headClass(column: TableColumn<T>): string {
    return [
      column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left',
      column.hideBelow ? `hidden ${breakpointHidden(column.hideBelow)}` : '',
      column.sortable === false ? '' : 'cursor-pointer select-none'
    ].join(' ');
  }

  protected isSorted(column: TableColumn<T>): boolean {
    return this.sort()?.key === column.key;
  }

  protected toggleSort(column: TableColumn<T>): void {
    if (column.sortable === false) return;
    const current = this.sort();
    const direction = current?.key === column.key && current.direction === 'desc' ? 'asc' : 'desc';
    this.sort.set({ key: column.key, direction } as SortState<string>);
    this.page.set(1);
  }

  protected onSearch(value: string): void {
    this.query.set(value);
    this.page.set(1);
  }

  protected clearSearch(): void {
    this.query.set('');
    this.page.set(1);
  }

  protected go(page: number | '…'): void {
    if (page === '…') return;
    this.page.set(page);
  }

  protected changeSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.size.set(Number.isFinite(value) && value > 0 ? value : this.pageSize());
    this.page.set(1);
  }

  protected isRowSelected(row: T): boolean {
    return this.selected().has(this.rowId(row));
  }

  protected toggleRow(row: T): void {
    if (!this.selectable()) return;
    const id = this.rowId(row);
    const next = new Set(this.selected());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selected.set(next);
    this.selectionChange.emit(this.selectedRows());
  }

  protected toggleAll(): void {
    const rows = this.view().rows;
    const base = this.selected();
    const next = new Set(base);
    const select = !this.allOnPageSelected();
    rows.forEach((row) => {
      const id = this.rowId(row);
      if (select) next.add(id);
      else next.delete(id);
    });
    this.selected.set(next);
    this.selectionChange.emit(this.selectedRows());
  }

  protected onRowClick(row: T): void {
    if (this.clickable()) this.rowClick.emit(row);
  }

  protected readonly hasSearch = computed(() => this.searchKeys().length > 0);
  protected readonly isSearching = computed(() => this.query().trim().length > 0);
}

function breakpointHidden(breakpoint: 'sm' | 'md' | 'lg' | 'xl'): string {
  const map = { sm: 'sm:table-cell', md: 'md:table-cell', lg: 'lg:table-cell', xl: 'xl:table-cell' } as const;
  return map[breakpoint];
}
