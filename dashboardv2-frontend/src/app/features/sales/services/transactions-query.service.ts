import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AppConfigService } from '../../../core/config/app-config.service';
import { Resource } from '../../../core/http/resource';
import { deltaPercent, isSettled, summarize } from '../../../core/logic/aggregate.logic';
import { presetRange, previousRange, rangeInDays, toApiDate, type DateRange, type RangePresetKey } from '../../../core/logic/date-range.logic';
import { TRANSACTION_STATES, stateTone } from '../../../core/logic/format.logic';
import type { MachineMetric, StatCard, TransactionRow } from '../../../core/models/dashboard.model';
import type { Transaction } from '../../../core/models/transactions.model';
import { TransactionsPort } from '../../../core/ports/transactions.port';
import { MachineCatalogService } from '../../../core/services/machine-catalog.service';
import { NotificationService } from '../../../core/services/notification.service';

/** `id = 0` significa "todas las máquinas" (el SP de producción filtra por paypad). */
export const ALL_MACHINES = 0;

/**
 * ORQUESTADOR DE LA CONSULTA "transacciones por máquina".
 *
 * Todo el conocimiento del backend vive aquí: cómo se pide el rango, qué pasa
 * cuando `id = 0`, cómo se arma el `MachineDateRangeQuery` y cómo se agregan en
 * memoria los KPIs (la API no expone agregaciones y no se le puede pedir que las
 * calcule: este dashboard es de solo lectura).
 */
@Injectable()
export class TransactionsQueryService {
  private readonly transactions = inject(TransactionsPort);
  private readonly catalog = inject(MachineCatalogService);
  private readonly config = inject(AppConfigService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly machineId = signal<number>(ALL_MACHINES);
  readonly preset = signal<RangePresetKey>('30d');
  readonly range = signal<DateRange>(presetRange('30d'));
  readonly stateFilter = signal<string | null>(null);
  readonly typeFilter = signal<string | null>(null);
  readonly comparePrevious = signal(false);
  readonly selection = signal<readonly number[]>([]);
  readonly exporting = signal(false);

  /** Consulta principal. */
  private readonly result = new Resource<Transaction[]>(
    () => this.fetch(this.range()),
    [],
    this.destroyRef,
    (data) => data.length === 0
  );

  /** Consulta del periodo anterior, sólo si el usuario activa la comparación (evita doble carga en producción). */
  private readonly baseline = new Resource<Transaction[]>(() => this.fetch(previousRange(this.range())), [], this.destroyRef, (data) => data.length === 0);

  readonly rows = computed<TransactionRow[]>(() => {
    const state = this.stateFilter();
    const type = this.typeFilter();
    return this.result
      .data()
      .filter((t) => (state ? (t.stateTransaction ?? '') === state : true))
      .filter((t) => (type ? (t.typePayment ?? '') === type : true))
      .map((t) => ({
        ...t,
        machineLabel: t.payPad ?? this.catalog.label(t.idPayPad),
        office: this.catalog.office(t.idPayPad),
        minuteOfDay: minuteOf(t.dateCreated)
      }));
  });

  readonly summary = computed(() => summarize(this.result.data(), this.catalog.aggregateMap()));
  readonly baselineSummary = computed(() => summarize(this.baseline.data(), this.catalog.aggregateMap()));

  readonly state = this.result.state;
  readonly loading = this.result.loading;
  readonly error = this.result.error;
  readonly isEmpty = this.result.isEmpty;
  readonly fetchedAt = this.result.fetchedAt;
  readonly baselineLoading = this.baseline.loading;

  readonly paymentTypes = computed(() => {
    const set = new Set<string>();
    this.result.data().forEach((t) => t.typePayment && set.add(t.typePayment));
    return [...set].sort();
  });

  readonly rangeDays = computed(() => rangeInDays(this.range()));

  readonly kpis = computed<StatCard[]>(() => {
    const current = this.summary();
    const previous = this.baselineSummary();
    const compare = this.comparePrevious();
    const trend = current.trend.map((point) => point.count);

    const delta = (now: number, before: number): number | undefined => (compare ? deltaPercent(now, before) : undefined);

    return [
      {
        label: 'Transacciones',
        value: current.transactions.length,
        hint: `${this.rangeDays()} días consultados`,
        delta: delta(current.transactions.length, previous.transactions.length),
        tone: 'neutral',
        format: 'number',
        icon: 'receipt',
        series: trend
      },
      {
        label: 'Monto facturado',
        value: current.totalBilled,
        hint: current.transactions.length > 0 ? `ticket medio ${formatShort(current.average)}` : 'sin movimientos',
        delta: delta(current.totalBilled, previous.totalBilled),
        tone: 'neutral',
        format: 'money',
        icon: 'cash',
        series: current.trend.map((point) => point.amount)
      },
      {
        label: 'Neto en caja',
        value: current.totalNet,
        hint: current.totalReturned > 0 ? `${formatShort(current.totalReturned)} devueltos` : 'sin devoluciones',
        delta: delta(current.totalNet, previous.totalNet),
        tone: 'positive',
        format: 'money',
        icon: 'trend'
      },
      {
        label: 'Efectividad',
        value: successRate(current.transactions),
        hint: current.bestMachine ? `líder: ${current.bestMachine.label}` : 'sin máquinas con datos',
        tone: 'neutral',
        format: 'percent',
        icon: 'check'
      },
      {
        label: 'Máquinas activas',
        value: current.machines.length,
        hint: `${this.catalog.machines().length} en el catálogo`,
        tone: 'neutral',
        format: 'number',
        icon: 'machine'
      },
      {
        label: 'Hora pico',
        value: current.peakHour?.label ?? '—',
        hint: current.peakHour ? formatShort(current.peakHour.total) : 'sin datos horarios',
        tone: 'warning',
        format: 'text',
        icon: 'clock'
      }
    ];
  });

  /** Ranking por máquina; el tono se usa en la tabla para resaltar máquinas problemáticas. */
  readonly machineRows = computed<Array<MachineMetric & { tone: ReturnType<typeof stateTone> }>>(() =>
    this.summary().machines.map((machine) => ({
      ...machine,
      tone: machine.successRate >= 95 ? ('positive' as const) : machine.successRate >= 80 ? ('warning' as const) : ('negative' as const)
    }))
  );

  readonly stateBreakdown = computed(() => {
    const buckets = this.summary().byState;
    return buckets.map((bucket) => ({ ...bucket, tone: stateTone(bucket.label) }));
  });

  readonly stateOptions = computed(() => {
    const present = new Set<string>();
    this.result.data().forEach((t) => t.stateTransaction && present.add(t.stateTransaction));
    const ordered = [...TRANSACTION_STATES].filter((s) => present.has(s));
    const extra = [...present].filter((s) => !ordered.includes(s as never)).sort();
    return [...ordered, ...extra].map((state) => ({ value: state, label: state }));
  });

  /** Carga inicial + recarga explícita. */
  search(): void {
    this.result.reload();
    if (this.comparePrevious()) this.baseline.reload();
  }

  selectMachine(id: number | null): void {
    this.machineId.set(id ?? ALL_MACHINES);
    this.selection.set([]);
    this.search();
  }

  setRange(range: DateRange, preset?: RangePresetKey): void {
    this.range.set(range);
    if (preset) this.preset.set(preset);
    this.search();
  }

  toggleCompare(enabled: boolean): void {
    this.comparePrevious.set(enabled);
    if (enabled) this.baseline.reload();
  }

  /**
   * `POST Transaction/GetByDate` cuando hay una máquina concreta (lo que el SP soporta);
   * para "todas" se usa `GET Transaction` y el filtro de rango se aplica en memoria,
   * porque el backend no expone un "todas las máquinas por fecha".
   */
  private fetch(range: DateRange): Observable<Transaction[]> {
    const machine = this.machineId();
    const query = { id: machine, from: toApiDate(range.from), to: toApiDate(range.to) };

    if (machine !== ALL_MACHINES) return this.transactions.byMachineAndDate(query);

    return this.transactions.all().pipe(
      map((all) => {
        const from = range.from.getTime();
        const to = range.to.getTime();
        return all
          .filter((t) => {
            const when = t.dateCreated ? Date.parse(t.dateCreated) : NaN;
            return !Number.isNaN(when) && when >= from && when <= to;
          })
          .sort((a, b) => Date.parse(b.dateCreated ?? '0') - Date.parse(a.dateCreated ?? '0'));
      })
    );
  }

  export(ids: readonly number[]): void {
    const machine = this.machineId();
    if (machine === ALL_MACHINES) {
      this.notifications.warn('Selecciona una máquina', 'El Excel del backend (`Transaction/ExcelDoc`) se genera por Pay+.');
      return;
    }
    if (ids.length === 0) {
      this.notifications.warn('Nada que exportar', 'Marca al menos una transacción en la grilla.');
      return;
    }

    const ext = this.config.dataProvider() === 'mock' ? 'csv' : 'xlsx';
    const fileName = `transacciones-pay${machine}-${toApiDate(this.range().from).slice(0, 10)}_a_${toApiDate(this.range().to).slice(0, 10)}.${ext}`;

    this.exporting.set(true);
    this.transactions
      .exportExcel({ paypadId: machine, transactionIds: [...ids], fileName })
      .subscribe({
        next: (blob) => {
          triggerDownload(blob, fileName);
          this.notifications.success('Exportación lista', `${ids.length} transacción(es) en ${fileName}`);
        },
        error: (err: unknown) => this.notifications.error('No se pudo exportar', err instanceof Error ? err.message : String(err)),
        complete: () => this.exporting.set(false)
      });
  }
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function successRate(list: readonly Transaction[]): number {
  if (list.length === 0) return 0;
  const settled = list.filter(isSettled).length;
  return Math.round((settled / list.length) * 1000) / 10;
}

function minuteOf(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getUTCHours() * 60 + date.getUTCMinutes();
}

function formatShort(value: number): string {
  return new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1, style: 'currency', currency: 'COP' }).format(value);
}
