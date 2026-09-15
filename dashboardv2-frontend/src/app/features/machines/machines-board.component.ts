import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MachinesBoardService } from './services/machines-board.service';
import { formatMoney } from '../../core/logic/format.logic';
import { MachineCatalogService } from '../../core/services/machine-catalog.service';
import type { MachineStorageLine } from '../../core/models/machines.model';
import type { TransactionRow } from '../../core/models/dashboard.model';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { DataTableComponent } from '../../shared/ui/data-table/data-table.component';
import type { TableColumn } from '../../shared/ui/data-table/table.model';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/ui/error-state/error-state.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../shared/ui/panel/panel.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { UiDatePipe } from '../../shared/pipes/datetime.pipe';

/** Inventario físico de cada Pay+: contenido, arqueos, cargues y últimos movimientos. */
@Component({
  selector: 'app-machines-board',
  standalone: true,
  imports: [BadgeComponent, DataTableComponent, EmptyStateComponent, ErrorStateComponent, IconComponent, PageHeaderComponent, PanelComponent, RouterLink, SkeletonComponent, UiDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './machines-board.component.html',
  providers: [MachinesBoardService]
})
export class MachinesBoardComponent {
  protected readonly board = inject(MachinesBoardService);
  protected readonly catalog = inject(MachineCatalogService);
  protected readonly money = formatMoney;


  protected readonly storageColumns = computed<readonly TableColumn<MachineStorageLine>[]>(() => [
    { key: 'denominationValue', label: 'Denominación', type: 'money', sortable: true },
    { key: 'apStored', label: 'Recibidas', type: 'number', align: 'right', sortable: true },
    { key: 'dpStored', label: 'Dispensadas', type: 'number', align: 'right', sortable: true, hideBelow: 'md' },
    { key: 'rjStored', label: 'Rechazadas', type: 'number', align: 'right', sortable: true, hideBelow: 'md' },
    { key: 'quantityStored', label: 'En caja', type: 'number', align: 'right', sortable: true },
    { key: 'total', label: 'Valor en caja', type: 'money', align: 'right', sortable: true }
  ]);

  protected readonly recentColumns = computed<readonly TableColumn<TransactionRow>[]>(() => [
    { key: 'id', label: 'ID', type: 'id' },
    { key: 'dateCreated', label: 'Fecha', type: 'datetime', sortable: true },
    { key: 'product', label: 'Producto' },
    { key: 'stateTransaction', label: 'Estado', type: 'badge' },
    { key: 'totalAmount', label: 'Total', type: 'money', align: 'right', sortable: true }
  ]);

  protected readonly recentRows = computed<TransactionRow[]>(() =>
    this.board.recent.data().slice(0, 12).map((t) => ({
      ...t,
      machineLabel: t.payPad ?? `Pay+ #${t.idPayPad}`,
      office: null,
      minuteOfDay: null
    }))
  );

  protected readonly searchKeys = ['denominationValue', 'idCurrencyDenomination'];

  /** ISO de la última operación del Pay+ seleccionado (`null` si la máquina no se ha movido). */
  protected readonly lastActivity = computed<string | null>(() => this.board.recent.data().at(0)?.dateCreated ?? null);

  protected catalogReload(): void {
    this.catalog.reload();
    this.board.select(null);
  }

  protected badgeTone(value: unknown): 'neutral' | 'positive' | 'negative' | 'warning' {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 'neutral';
    if (numeric === 0) return 'negative';
    return numeric < 10 ? 'warning' : 'positive';
  }
}
