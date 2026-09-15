import { DestroyRef, Injectable, computed, inject } from '@angular/core';

import { Resource } from '../../../core/http/resource';
import { deltaPercent, summarize } from '../../../core/logic/aggregate.logic';
import { EMPTY_SUMMARY, type QuerySummary, type StatCard } from '../../../core/models/dashboard.model';
import type { Machine } from '../../../core/models/machines.model';
import type { Transaction } from '../../../core/models/transactions.model';
import { MachineCatalogService } from '../../../core/services/machine-catalog.service';
import { TransactionsPort } from '../../../core/ports/transactions.port';

const DAY = 86_400_000;

/**
 * Panorama general: `GET api/Transaction` + catálogo de máquinas. Todos los cortes
 * (hoy / 7 / 30 días) se calculan en memoria sobre esa única respuesta.
 * Costo de API: 2 GET, sin importar cuántos KPIs se pinten.
 */
@Injectable()
export class OverviewQueryService {
  private readonly transactions = inject(TransactionsPort);
  private readonly catalog = inject(MachineCatalogService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly resource = new Resource<Transaction[]>(() => this.transactions.all(), [], this.destroyRef, (data) => data.length === 0);

  constructor() {
    this.catalog.reload();
  }

  readonly loading = this.resource.loading;
  readonly error = this.resource.error;
  readonly isEmpty = this.resource.isEmpty;
  readonly fetchedAt = this.resource.fetchedAt;

  readonly all = computed(() => this.resource.data());
  readonly machines = computed(() => this.catalog.machines());

  readonly window30 = computed(() => this.slice(30));
  readonly window7 = computed(() => this.slice(7));
  readonly today = computed(() => this.slice(1));

  /** Máquinas sin movimientos recientes o inactivas: la lista que el operador revisa primero. */
  readonly attention = computed(() => {
    const recent = new Map<number, { count: number; amount: number }>();
    this.window7().forEach((t) => {
      const entry = recent.get(t.idPayPad) ?? { count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += t.totalAmount || 0;
      recent.set(t.idPayPad, entry);
    });

    return this.machines()
      .map((machine) => {
        const seen = recent.get(machine.id);
        const idleDays = idleSinceDays(machine, this.all());
        return {
          machine,
          transactions7d: seen?.count ?? 0,
          amount7d: seen?.amount ?? 0,
          idleDays,
          risk: machine.status === 0 ? ('inactive' as const) : idleDays >= 7 ? ('silent' as const) : idleDays >= 2 ? ('slow' as const) : ('ok' as const)
        };
      })
      .sort((a, b) => b.idleDays - a.idleDays);
  });

  readonly summary = computed<QuerySummary>(() => (this.window30().length === 0 ? EMPTY_SUMMARY : summarize(this.window30(), this.catalog.aggregateMap())));
  readonly trend30 = computed(() => this.summary().trend.slice(-30));

  readonly kpis = computed<StatCard[]>(() => {
    const month = this.summary();
    const week = this.sliceSummary(7);
    const previousWeek = this.sliceSummary(14, 7);
    const day = this.sliceSummary(1);

    return [
      {
        label: 'Movimientos hoy',
        value: day.transactions.length,
        hint: day.lastDate ? `último ${new Date(day.lastDate).toISOString().slice(11, 16)} UTC` : 'aún sin movimientos hoy',
        format: 'number',
        icon: 'receipt',
        tone: 'neutral'
      },
      {
        label: 'Facturado 7 días',
        value: week.totalBilled,
        delta: deltaPercent(week.totalBilled, previousWeek.totalBilled),
        hint: `${week.transactions.length} transacciones`,
        format: 'money',
        icon: 'cash',
        tone: 'neutral',
        series: week.trend.map((p) => p.amount)
      },
      {
        label: 'Efectividad 30 días',
        value: successRate(month.transactions),
        hint: `${month.byState.find((s) => s.label.toLowerCase().includes('anul'))?.count ?? 0} anuladas`,
        format: 'percent',
        icon: 'check',
        tone: 'positive'
      },
      {
        label: 'Máquinas con actividad',
        value: `${week.machines.length}/${this.machines().length}`,
        hint: `${this.machines().filter((m) => m.status === 1).length} activas en catálogo`,
        format: 'text',
        icon: 'machine',
        tone: 'neutral'
      },
      {
        label: 'Máquina líder',
        value: month.bestMachine ? month.bestMachine.label.replace(/^PAYP-?/i, '') : '—',
        hint: month.bestMachine ? `${new Intl.NumberFormat('es-CO', { notation: 'compact' }).format(month.bestMachine.billed)} COP en 30 días` : 'sin datos',
        format: 'text',
        icon: 'trend',
        tone: 'neutral'
      },
      {
        label: 'Máquinas en silencio',
        value: this.attention().filter((row) => row.risk === 'silent' || row.risk === 'inactive').length,
        hint: 'sin movimientos ≥ 7 días o inactivas',
        format: 'number',
        icon: 'alert',
        tone: 'warning'
      }
    ];
  });

  reload(): void {
    this.resource.reload();
    this.catalog.reload();
  }

  private slice(days: number, offset = 0): Transaction[] {
    const end = Date.now() + 12 * 3_600_000 + offset * DAY;
    const start = end - days * DAY;
    return this.all().filter((t) => {
      const when = t.dateCreated ? Date.parse(t.dateCreated) : NaN;
      return !Number.isNaN(when) && when >= start && when <= end;
    });
  }

  private sliceSummary(days: number, offset = 0): QuerySummary {
    const rows = this.slice(days, offset);
    return rows.length === 0 ? EMPTY_SUMMARY : summarize(rows, this.catalog.aggregateMap());
  }
}

function idleSinceDays(machine: Machine, all: readonly Transaction[]): number {
  let last = 0;
  for (const t of all) {
    if (t.idPayPad !== machine.id) continue;
    const when = t.dateCreated ? Date.parse(t.dateCreated) : 0;
    if (when > last) last = when;
  }
  if (last === 0) return 999;
  return Math.floor((Date.now() - last) / DAY);
}

function successRate(rows: readonly Transaction[]): number {
  if (rows.length === 0) return 0;
  const settled = rows.filter((t) => {
    const state = (t.stateTransaction ?? '').toLowerCase();
    return !state.includes('anul') && !state.includes('rechaz') && !state.includes('fallid');
  }).length;
  return Math.round((settled / rows.length) * 1000) / 10;
}
