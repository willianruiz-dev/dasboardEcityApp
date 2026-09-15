import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';

import { ALL_MACHINES, TransactionsQueryService } from './services/transactions-query.service';
import { stateTone } from '../../core/logic/format.logic';
import type { RangeSelection } from '../../shared/ui/range-picker/range-picker.component';
import type { TransactionRow } from '../../core/models/dashboard.model';
import type { Transaction } from '../../core/models/transactions.model';
import { TransactionChartsComponent } from './components/transaction-charts.component';
import { DataTableComponent } from '../../shared/ui/data-table/data-table.component';
import type { TableColumn } from '../../shared/ui/data-table/table.model';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/ui/error-state/error-state.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { RangePickerComponent } from '../../shared/ui/range-picker/range-picker.component';
import { SelectComponent, type SelectOption } from '../../shared/ui/select/select.component';
import { StatsCardComponent } from '../../shared/ui/stats-card/stats-card.component';
import { MachineCatalogService } from '../../core/services/machine-catalog.service';
import { TransactionDetailDrawerComponent } from './components/transaction-detail-drawer.component';


/**
 * VISTA PRINCIPAL: transacciones por máquina (`Transaction/GetByDate`).
 *
 * No hay un solo control de edición: anular, reprocesar o ajustar arqueos sigue
 * en el dashboard administrativo. Aquí sólo se leen datos de producción.
 */
@Component({
  selector: 'app-sales-dashboard',
  standalone: true,
  imports: [
    DataTableComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    PageHeaderComponent,
    RangePickerComponent,
    SelectComponent,
    StatsCardComponent,
    TransactionChartsComponent,
    TransactionDetailDrawerComponent
  ],
  providers: [TransactionsQueryService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sales-dashboard.component.html'
})
export class SalesDashboardComponent {
  /** `?machine=7` (query binding) — llega desde el tablero de máquinas y del overview. */
  readonly machine = input<string | number | null>(null);

  protected readonly query = inject(TransactionsQueryService);
  protected readonly catalog = inject(MachineCatalogService);

  protected readonly open = signal<TransactionRow | null>(null);
  protected readonly exportIds = signal<readonly number[]>([]);

  constructor() {
    // Un solo efecto de enlace: aplica el query param la primera vez que llega.
    let applied = false;
    effect(() => {
      const raw = this.machine();
      if (applied || raw == null || raw === '') return;
      applied = true;
      const id = Number(raw);
      if (Number.isFinite(id) && id > 0 && id !== this.query.machineId()) this.query.selectMachine(id);
    });
  }

  protected readonly machineValue = computed<number | null>(() =>
    this.query.machineId() === ALL_MACHINES ? null : this.query.machineId()
  );

  protected readonly machineOptions = computed<readonly SelectOption<number>[]>(() => [
    { value: ALL_MACHINES, label: 'Todas las máquinas', hint: `${this.catalog.machines().length} equipos` },
    ...this.catalog.options().map((option) => ({ value: option.value, label: option.label, hint: option.hint }))
  ]);

  protected readonly stateOptions = computed<readonly SelectOption<string | null>[]>(() => [
    { value: null, label: 'Todos los estados' },
    ...this.query.stateOptions().map((option) => ({ value: option.value as string, label: option.label }))
  ]);

  protected readonly paymentOptions = computed<readonly SelectOption<string | null>[]>(() => [
    { value: null, label: 'Todos los medios' },
    ...this.query.paymentTypes().map((type) => ({ value: type, label: type }))
  ]);

  protected readonly columns = computed<readonly TableColumn<TransactionRow>[]>(() => [
    { key: 'id', label: 'ID', type: 'id', sortable: true, width: 'w-[86px]' },
    { key: 'dateCreated', label: 'Fecha (UTC)', type: 'datetime', sortable: true, width: 'w-[170px]' },
    { key: 'machineLabel', label: 'Máquina', sortable: true, truncate: true },
    { key: 'product', label: 'Producto', sortable: true, hideBelow: 'md', truncate: true },
    { key: 'typePayment', label: 'Medio', sortable: true, hideBelow: 'lg' },
    { key: 'stateTransaction', label: 'Estado', type: 'badge', sortable: true, toneFor: (value) => stateTone(String(value)) },
    { key: 'totalAmount', label: 'Total', type: 'money', align: 'right', sortable: true },
    { key: 'incomeAmount', label: 'Neto', type: 'money', align: 'right', sortable: true, hideBelow: 'xl' },
    { key: 'returnAmount', label: 'Devuelto', type: 'money', align: 'right', sortable: true, hideBelow: 'xl' },
    { key: 'reference', label: 'Referencia', type: 'mono', hideBelow: 'xl', truncate: true },
    { key: 'userCreated', label: 'Cajero', hideBelow: 'lg' }
  ]);

  protected readonly searchKeys = ['reference', 'document', 'product', 'machineLabel', 'userCreated', 'id'];

  protected onRange(selection: RangeSelection): void {
    this.query.setRange(selection.range, selection.preset);
  }

  protected onMachine(value: number | null): void {
    this.query.selectMachine(value ?? ALL_MACHINES);
  }

  protected onState(value: string | null): void {
    this.query.stateFilter.set(value);
  }

  protected onPayment(value: string | null): void {
    this.query.typeFilter.set(value);
  }

  protected onSelection(rows: readonly Transaction[]): void {
    this.exportIds.set(rows.map((row) => row.id));
  }

  protected toggleCompare(event: Event): void {
    this.query.toggleCompare((event.target as HTMLInputElement).checked);
  }

  protected export(): void {
    const ids = this.exportIds();
    this.query.export(ids.length > 0 ? ids : this.query.rows().slice(0, 500).map((row) => row.id));
  }
}
