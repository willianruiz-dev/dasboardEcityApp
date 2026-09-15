import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { MachinesPort } from '../ports/machines.port';
import type { Machine } from '../models/machines.model';
import { Resource } from '../http/resource';
import type { SelectOption } from '../../shared/ui/select/select.component';
import { machineStatusLabel, machineStatusOf } from '../logic/format.logic';

export interface MachineOption extends SelectOption<number> {
  machine: Machine;
  office: string | null;
  statusLabel: string;
}

/**
 * Catálogo de máquinas (Pay+). Se carga una vez y se comparte: es el insumo de
 * los filtros, de la resolución `idPayPad → nombre` y del mapa de oficinas.
 */
@Injectable({ providedIn: 'root' })
export class MachineCatalogService {
  private readonly port = inject(MachinesPort);

  private readonly resource = new Resource<Machine[]>(() => this.port.all(), [], inject(DestroyRef));

  readonly machines = computed(() => this.resource.data());
  readonly loading = this.resource.loading;
  readonly error = this.resource.error;

  private readonly lookup = computed<Map<number, { label: string; office: string | null }>>(() => {
    const map = new Map<number, { label: string; office: string | null }>();
    this.machines().forEach((machine) => map.set(machine.id, { label: machine.username ?? `Pay+ #${machine.id}`, office: machine.office }));
    return map;
  });

  readonly options = computed<MachineOption[]>(() =>
    this.machines().map((machine) => ({
      value: machine.id,
      label: `${machine.username ?? `Pay+ #${machine.id}`}${machine.office ? ` · ${machine.office}` : ''}`,
      hint: machineStatusLabel(machineStatusOf(machine.status)),
      machine,
      office: machine.office,
      statusLabel: machineStatusLabel(machineStatusOf(machine.status))
    }))
  );

  /** Mapa para `summarize()`; `unknown` se resuelve igual que en la API (id → etiqueta). */
  readonly aggregateMap = computed(() => new Map(this.lookup()));

  readonly byOffice = computed(() => {
    const groups = new Map<string, Machine[]>();
    this.machines().forEach((machine) => {
      const key = machine.office ?? 'Sin oficina';
      const list = groups.get(key) ?? [];
      list.push(machine);
      groups.set(key, list);
    });
    return groups;
  });

  label(id: number): string {
    return this.lookup().get(id)?.label ?? `Pay+ #${id}`;
  }

  office(id: number): string | null {
    return this.lookup().get(id)?.office ?? null;
  }

  reload(): void {
    this.resource.reload();
  }
}
