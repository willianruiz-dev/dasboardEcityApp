import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AnalyticsQueryService } from './services/analytics-query.service';
import { formatMoney } from '../../core/logic/format.logic';
import type { StatCard } from '../../core/models/dashboard.model';
import type { DateRange } from '../../core/logic/date-range.logic';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { ChartComponent } from '../../shared/ui/chart/chart.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/ui/error-state/error-state.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../shared/ui/panel/panel.component';
import { RangePickerComponent, type RangeSelection } from '../../shared/ui/range-picker/range-picker.component';
import { StatsCardComponent } from '../../shared/ui/stats-card/stats-card.component';
import { UiDatePipe } from '../../shared/pipes/datetime.pipe';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Reportes y análisis: heatmap hora×día, mix de producto/medio y concentración por máquina. */
@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [BadgeComponent, ChartComponent, EmptyStateComponent, ErrorStateComponent, IconComponent, PageHeaderComponent, PanelComponent, RangePickerComponent, StatsCardComponent, UiDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './analytics-dashboard.component.html',
  providers: [AnalyticsQueryService]
})
export class AnalyticsDashboardComponent {
  protected readonly analytics = inject(AnalyticsQueryService);
  protected readonly weekdays = WEEKDAYS;

  protected readonly heatRows = computed(() => {
    const heat = this.analytics.heat();
    return WEEKDAYS.map((label, weekday) => ({
      label,
      cells: Array.from({ length: 24 }, (_, hour) => heat.find((c) => c.weekday === weekday && c.hour === hour) ?? { weekday, hour, count: 0, amount: 0, intensity: 0 })
    }));
  });

  protected readonly trendLabels = computed(() => this.analytics.summary().trend.map((p) => p.label));
  protected readonly trendSeries = computed(() => [
    { label: 'Transacciones', data: this.analytics.summary().trend.map((p) => p.count), area: true }
  ]);
  protected readonly productLabels = computed(() => this.analytics.productMix().map((b) => b.label));
  protected readonly productSeries = computed(() => [{ label: 'Monto', data: this.analytics.productMix().map((b) => b.total) }]);
  protected readonly paymentLabels = computed(() => this.analytics.paymentMix().map((b) => b.label));
  protected readonly paymentSeries = computed(() => [{ label: 'Monto por medio', data: this.analytics.paymentMix().map((b) => b.total) }]);

  protected readonly kpis = computed<StatCard[]>(() => {
    const summary = this.analytics.summary();
    const top3 = summary.machines.slice(0, 3).reduce((acc, m) => acc + m.billed, 0);
    return [
      { label: 'Transacciones', value: summary.transactions.length, format: 'number', icon: 'receipt', hint: `${summary.trend.length} días con actividad` },
      { label: 'Monto consultado', value: summary.totalBilled, format: 'money', icon: 'cash', hint: `ticket medio ${formatMoney(summary.average)}` },
      { label: 'Concentración top 3', value: summary.totalBilled === 0 ? 0 : Math.round((top3 / summary.totalBilled) * 1000) / 10, format: 'percent', icon: 'trend', hint: 'del total facturado' },
      { label: 'Devoluciones', value: summary.totalReturned, format: 'money', icon: 'alert', hint: 'anuladas + rechazadas' }
    ];
  });

  protected readonly money = formatMoney;

  protected onRange(selection: RangeSelection): void {
    this.analytics.applyRange(selection.range);
  }

  protected heatClass(intensity: number): string {
    if (intensity === 0) return 'bg-slate-100 dark:bg-slate-800/60';
    if (intensity < 0.2) return 'bg-brand-100 dark:bg-brand-500/20';
    if (intensity < 0.45) return 'bg-brand-300 dark:bg-brand-500/45';
    if (intensity < 0.7) return 'bg-brand-500 dark:bg-brand-500/70';
    return 'bg-brand-700 dark:bg-brand-400';
  }
}
