import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { map } from 'rxjs';

import { Resource } from '../../../core/http/resource';
import { isSettled, summarize } from '../../../core/logic/aggregate.logic';
import { EMPTY_SUMMARY, type QuerySummary } from '../../../core/models/dashboard.model';
import type { Transaction } from '../../../core/models/transactions.model';
import { TransactionsPort } from '../../../core/ports/transactions.port';
import { MachineCatalogService } from '../../../core/services/machine-catalog.service';
import { NotificationService } from '../../../core/services/notification.service';
import { presetRange, type DateRange } from '../../../core/logic/date-range.logic';

export interface HeatCell {
  weekday: number;
  hour: number;
  count: number;
  amount: number;
  intensity: number;
}

/**
 * Analítica de lectura: toma la misma respuesta de `Transaction/all` y la corta por
 * hora/día-producto/medio de pago. Se agrega en el navegador para no pedirle al
 * backend (producción) ningún job nuevo.
 */
@Injectable()
export class AnalyticsQueryService {
  private readonly transactions = inject(TransactionsPort);
  private readonly catalog = inject(MachineCatalogService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly range = signal<DateRange>(presetRange('30d'));

  private readonly resource = new Resource<Transaction[]>(
    () =>
      this.transactions.all().pipe(
        map((rows) => {
          const from = this.range().from.getTime();
          const to = this.range().to.getTime();
          return rows.filter((t) => {
            const when = t.dateCreated ? Date.parse(t.dateCreated) : NaN;
            return !Number.isNaN(when) && when >= from && when <= to;
          });
        })
      ),
    [],
    this.destroyRef,
    (data) => data.length === 0
  );

  readonly loading = this.resource.loading;
  readonly error = this.resource.error;
  readonly isEmpty = this.resource.isEmpty;
  readonly fetchedAt = this.resource.fetchedAt;
  readonly rows = computed(() => this.resource.data());

  readonly summary = computed<QuerySummary>(() =>
    this.rows().length === 0 ? EMPTY_SUMMARY : summarize(this.rows(), this.catalog.aggregateMap())
  );

  readonly heat = computed<HeatCell[]>(() => {
    const grid = new Map<string, HeatCell>();
    this.rows().forEach((t) => {
      if (!t.dateCreated) return;
      const date = new Date(t.dateCreated);
      if (Number.isNaN(date.getTime())) return;
      const weekday = date.getUTCDay();
      const hour = date.getUTCHours();
      const key = `${weekday}-${hour}`;
      const cell = grid.get(key) ?? { weekday, hour, count: 0, amount: 0, intensity: 0 };
      cell.count += 1;
      if (isSettled(t)) cell.amount += t.totalAmount || 0;
      grid.set(key, cell);
    });

    const cells = [...grid.values()];
    const max = Math.max(1, ...cells.map((c) => c.count));
    cells.forEach((cell) => (cell.intensity = cell.count / max));

    return Array.from({ length: 7 }, (_, weekday) =>
      Array.from({ length: 24 }, (_, hour) => cells.find((c) => c.weekday === weekday && c.hour === hour) ?? { weekday, hour, count: 0, amount: 0, intensity: 0 })
    ).flat();
  });

  readonly productMix = computed(() => this.summary().byProduct.slice(0, 8));
  readonly paymentMix = computed(() => this.summary().byPaymentType);
  readonly concentration = computed(() => {
    const machines = this.summary().machines;
    const total = machines.reduce((acc, m) => acc + m.billed, 0);
    const sorted = [...machines].sort((a, b) => b.billed - a.billed);
    let acc = 0;
    return sorted.map((machine, index) => {
      acc += machine.billed;
      return { ...machine, rank: index + 1, cumulative: total === 0 ? 0 : Math.round((acc / total) * 1000) / 10 };
    });
  });

  readonly hoursByWeekday = computed(() => {
    const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return labels.map((label, weekday) => ({
      label,
      value: this.heat().filter((cell) => cell.weekday === weekday).reduce((acc, cell) => acc + cell.count, 0)
    }));
  });

  applyRange(range: DateRange): void {
    this.range.set(range);
    this.resource.reload();
  }

  /** CSV de la agregación (no sale del navegador: cero impacto en la API). */
  exportAggregates(): void {
    const lines = ['tipo,clave,total,count'];
    this.summary().byState.forEach((b) => lines.push(`estado,${b.label},${b.total},${b.count}`));
    this.summary().byPaymentType.forEach((b) => lines.push(`medio_pago,${b.label},${b.total},${b.count}`));
    this.summary().byProduct.forEach((b) => lines.push(`producto,${b.label},${b.total},${b.count}`));
    this.summary().machines.forEach((m) => lines.push(`maquina,"${m.label}",${m.billed},${m.transactions}`));

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `analitica-transacciones-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.notifications.success('Agregados exportados', 'El CSV se generó en el navegador; la API no recibió ninguna escritura.');
  }
}
