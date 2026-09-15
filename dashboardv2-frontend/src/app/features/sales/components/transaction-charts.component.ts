import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { TransactionsQueryService } from '../services/transactions-query.service';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ChartComponent, type ChartSeries } from '../../../shared/ui/chart/chart.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';

/**
 * Bloque de gráficos de la consulta. Componente aparte para que la vista principal
 * quede en ~150 líneas y para poder diferirlo (`@defer`) sin arrastrar `chart.js`
 * en el render inicial.
 */
@Component({
  selector: 'app-transaction-charts',
  standalone: true,
  imports: [BadgeComponent, ChartComponent, DecimalPipe, PanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-3 xl:grid-cols-3">
      <ui-panel class="xl:col-span-2" title="Evolución diaria" subtitle="Monto facturado y volumen por día (UTC)" icon="trend" [loading]="query.loading()">
        <ui-chart kind="line" [labels]="trendLabels()" [series]="trendSeries()" [height]="252" [moneyAxis]="true" [loading]="query.loading()" emptyHint="Selecciona un rango con al menos dos días con movimientos." />
      </ui-panel>

      <ui-panel title="Composición por estado" subtitle="Suma de montos consultados" icon="chart" [loading]="query.loading()">
        <ui-chart kind="doughnut" [labels]="stateLabels()" [series]="stateSeries()" [height]="222" [moneyAxis]="true" [loading]="query.loading()" />
        @if (!query.loading()) {
          <ul class="mt-3 space-y-1.5">
            @for (bucket of query.stateBreakdown(); track bucket.label) {
              <li class="flex items-center justify-between gap-2 text-xs">
                <ui-badge [label]="bucket.label" [tone]="bucket.tone" />
                <span class="tabular text-slate-500 dark:text-slate-400">{{ bucket.count }} op. · {{ bucket.total | number: '1.0-0' }} COP</span>
              </li>
            }
          </ul>
        }
      </ui-panel>

      <ui-panel class="xl:col-span-2" title="Ranking de máquinas" subtitle="Top 8 por monto facturado en la consulta" icon="machine" [loading]="query.loading()">
        <ui-chart kind="bar" [labels]="machineLabels()" [series]="machineSeries()" [height]="230" [moneyAxis]="true" [legend]="false" [loading]="query.loading()" />
      </ui-panel>

      <ui-panel title="Demanda por hora" subtitle="Franjas de 60 min en UTC" icon="clock" [loading]="query.loading()">
        <ui-chart kind="bar" [labels]="hourLabels()" [series]="hourSeries()" [height]="230" [moneyAxis]="true" [legend]="false" [loading]="query.loading()" />
      </ui-panel>
    </div>
  `
})
export class TransactionChartsComponent {
  protected readonly query = inject(TransactionsQueryService);

  protected readonly trendLabels = computed(() => this.query.summary().trend.map((point) => point.label));

  /** La serie de volumen se escala al orden del dinero para que ambos ejes convivan sin un `y1` engañoso. */
  protected readonly trendSeries = computed<ChartSeries[]>(() => {
    const trend = this.query.summary().trend;
    const maxAmount = Math.max(1, ...trend.map((p) => p.amount));
    const maxCount = Math.max(1, ...trend.map((p) => p.count));
    return [
      { label: 'Facturado', data: trend.map((p) => p.amount), area: true },
      { label: 'Transacciones (escala)', data: trend.map((p) => (p.count / maxCount) * maxAmount) }
    ];
  });

  private readonly topMachines = computed(() => this.query.summary().machines.slice(0, 8));
  protected readonly machineLabels = computed(() => this.topMachines().map((m) => m.label.replace(/^PAYP-?/i, '')));
  protected readonly machineSeries = computed<ChartSeries[]>(() => [{ label: 'Facturado', data: this.topMachines().map((m) => m.billed) }]);
  protected readonly stateLabels = computed(() => this.query.stateBreakdown().map((bucket) => bucket.label));
  protected readonly stateSeries = computed<ChartSeries[]>(() => [{ label: 'Monto por estado', data: this.query.stateBreakdown().map((b) => b.total) }]);
  protected readonly hourLabels = computed(() => this.query.summary().byHour.map((b) => b.label));
  protected readonly hourSeries = computed<ChartSeries[]>(() => [{ label: 'Facturado por hora (UTC)', data: this.query.summary().byHour.map((b) => b.total) }]);
}
