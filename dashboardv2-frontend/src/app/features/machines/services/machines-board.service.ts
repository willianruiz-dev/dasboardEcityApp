import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { of } from 'rxjs';

import { Resource } from '../../../core/http/resource';
import type { Load, Machine, MachineStorageLine, Subscription, Tonnage } from '../../../core/models/machines.model';
import type { Transaction } from '../../../core/models/transactions.model';
import { MachinesPort } from '../../../core/ports/machines.port';
import { TransactionsPort } from '../../../core/ports/transactions.port';
import { MachineCatalogService } from '../../../core/services/machine-catalog.service';
import { machineStatusOf } from '../../../core/logic/format.logic';

/** Estado de UNA máquina: catálogo + contenido + arqueos/cargues + últimos movimientos. */
@Injectable()
export class MachinesBoardService {
  private readonly machines = inject(MachinesPort);
  private readonly transactions = inject(TransactionsPort);
  private readonly catalog = inject(MachineCatalogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly selectedId = signal<number | null>(null);

  readonly list = computed(() =>
    this.catalog.machines().map((machine) => ({
      machine,
      status: machineStatusOf(machine.status),
      office: machine.office ?? 'Sin oficina'
    }))
  );

  readonly selected = computed<Machine | null>(() => {
    const id = this.selectedId();
    if (id == null) return null;
    return this.catalog.machines().find((machine) => machine.id === id) ?? null;
  });

  readonly storage = new Resource<MachineStorageLine[]>(
    () => (this.selectedId() == null ? of([]) : this.machines.storage(this.selectedId()!)),
    [],
    this.destroyRef
  );

  readonly tonnages = new Resource<Tonnage[]>(() => (this.selectedId() == null ? of([]) : this.machines.tonnages(this.selectedId()!)), [], this.destroyRef);
  readonly loads = new Resource<Load[]>(() => (this.selectedId() == null ? of([]) : this.machines.loads(this.selectedId()!)), [], this.destroyRef);
  readonly recent = new Resource<Transaction[]>(() => (this.selectedId() == null ? of([]) : this.transactions.byMachine(this.selectedId()!)), [], this.destroyRef);
  readonly subscriptions = new Resource<Subscription[]>(
    () => (this.selectedId() == null ? of([]) : this.machines.subscriptions(this.selectedId()!)),
    [],
    this.destroyRef
  );

  readonly storageTotal = computed(() => this.storage.data().reduce((acc, line) => acc + line.total, 0));
  readonly capacityRisk = computed(() => {
    const lines = this.storage.data();
    if (lines.length === 0) return null;
    const critical = lines.filter((line) => line.minDpQuantity > 0 && line.quantityStored < line.minDpQuantity);
    return critical.length > 0 ? critical : null;
  });

  select(id: number | null): void {
    this.selectedId.set(id);
    if (id == null) return;
    this.storage.reload();
    this.tonnages.reload();
    this.loads.reload();
    this.recent.reload();
    this.subscriptions.reload();
  }
}
